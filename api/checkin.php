<?php
require __DIR__ . '/db.php';

function checkin_secret(): string
{
    $config = load_env();
    return $config['CHECKIN_SECRET'] ?? 'fitspot-local-checkin-secret';
}

function signed_payload(string $type, int $id, string $date): string
{
    $value = $type . ':' . $id . ':' . $date;
    return 'FITSPOT|' . $value . '|' . hash_hmac('sha256', $value, checkin_secret());
}

function parse_payload(string $payload): array
{
    $parts = explode('|', trim($payload));
    if (count($parts) !== 3 || $parts[0] !== 'FITSPOT') {
        fail('Invalid FitSpot QR code.', 422);
    }
    $valueParts = explode(':', $parts[1]);
    if (count($valueParts) !== 3 || !ctype_digit($valueParts[1])) {
        fail('Invalid FitSpot QR code.', 422);
    }
    if (!hash_equals(hash_hmac('sha256', $parts[1], checkin_secret()), $parts[2])) {
        fail('This QR code is not valid.', 422);
    }
    return [$valueParts[0], (int) $valueParts[1], $valueParts[2]];
}

endpoint(function () {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'GET') {
        $user = require_user();
        $action = $_GET['action'] ?? '';
        if ($action === 'member-qr') {
            json_out(['payload' => signed_payload('member', (int) $user['id'], date('Y-m-d'))]);
        }
        if ($action === 'gym-qr') {
            require_user('admin');
            json_out(['payload' => signed_payload('gym', 0, date('Y-m-d'))]);
        }
        fail('Check-in action is required.');
    }

    if ($method !== 'POST') {
        fail('Method not allowed.', 405);
    }

    $user = require_user();
    $input = json_in();
    [$type, $id, $date] = parse_payload(post_value($input, 'payload'));
    if ($date !== date('Y-m-d')) {
        fail('This QR code has expired. Please generate a new one.', 422);
    }

    $memberId = $type === 'member' ? $id : (int) $user['id'];
    if ($type === 'member' && $user['role'] !== 'admin') {
        fail('Only an administrator can scan a member QR code.', 403);
    }
    if ($type === 'gym' && $user['role'] !== 'member') {
        fail('Only a member can use the gym QR code.', 403);
    }

    $stmt = db()->prepare(
        "SELECT u.id
           FROM users u
           JOIN memberships m ON m.user_id = u.id
          WHERE u.id = ? AND u.role = 'member'
            AND m.status = 'active' AND m.end_date >= CURDATE()
          ORDER BY m.end_date DESC LIMIT 1"
    );
    $stmt->execute([$memberId]);
    if (!$stmt->fetch()) {
        fail('An active membership is required to check in.', 403);
    }

    $pdo = db();
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('SELECT id FROM users WHERE id = ? FOR UPDATE');
        $stmt->execute([$memberId]);

        $stmt = $pdo->prepare(
            'SELECT id FROM attendance WHERE user_id = ? AND DATE(checked_in_at) = CURDATE() LIMIT 1'
        );
        $stmt->execute([$memberId]);
        if ($stmt->fetch()) {
            $pdo->rollBack();
            json_out([
                'checked_in' => false,
                'already_checked_in' => true,
                'message' => 'This member has already checked in today.',
                'member_id' => $memberId,
            ]);
        }

        $stmt = $pdo->prepare('INSERT INTO attendance (user_id, checked_in_at) VALUES (?, NOW())');
        $stmt->execute([$memberId]);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    json_out(['checked_in' => true, 'member_id' => $memberId, 'checked_in_at' => date('Y-m-d H:i:s')], 201);
});

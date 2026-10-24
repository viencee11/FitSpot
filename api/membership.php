<?php
require __DIR__ . '/db.php';

/* POST { member_id, plan_id } -> assign or renew a member plan (admin) */

endpoint(function () {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        fail('Method not allowed.', 405);
    }

    require_user('admin');
    $input = json_in();
    $memberId = (int) ($input['member_id'] ?? 0);
    $planId = (int) ($input['plan_id'] ?? 0);

    if (!$memberId || !$planId) {
        fail('Member id and plan id are required.');
    }

    $stmt = db()->prepare("SELECT id FROM users WHERE id = ? AND role = 'member'");
    $stmt->execute([$memberId]);
    if (!$stmt->fetch()) {
        fail('Member not found.', 404);
    }

    $stmt = db()->prepare(
        'SELECT id, name FROM membership_plans WHERE id = ? AND is_active = 1'
    );
    $stmt->execute([$planId]);
    $plan = $stmt->fetch();
    if (!$plan) {
        fail('That plan is not available.', 404);
    }

    $pdo = db();
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            "SELECT id
               FROM memberships
              WHERE user_id = ?
                AND status = 'active'
                AND end_date >= CURDATE()
              ORDER BY end_date DESC
              LIMIT 1
              FOR UPDATE"
        );
        $stmt->execute([$memberId]);
        if ($stmt->fetch()) {
            $pdo->rollBack();
            fail('This member already has an active plan. It can be changed after expiry or at renewal.', 409);
        }

        $stmt = $pdo->prepare(
            "UPDATE memberships SET status = 'cancelled'
              WHERE user_id = ? AND status = 'active'"
        );
        $stmt->execute([$memberId]);

        $stmt = $pdo->prepare(
            "INSERT INTO memberships (user_id, plan_id, status, start_date, end_date)
             VALUES (?, ?, 'active', CURDATE(), CURDATE() + INTERVAL 1 MONTH)"
        );
        $stmt->execute([$memberId, $planId]);

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    json_out(['plan' => $plan['name'], 'plan_id' => $planId]);
});

<?php
declare(strict_types=1);

/* Align PHP's clock with MySQL's (system, UTC+8) so date math agrees after midnight. */
date_default_timezone_set('Asia/Manila');

/* FitSpot API - shared bootstrap (PDO, sessions, JSON helpers). */

header('Content-Type: application/json; charset=utf-8');

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $config = load_env();
        $host = $config['DB_HOST'] ?? '127.0.0.1';
        $port = $config['DB_PORT'] ?? '3306';
        $database = $config['DB_DATABASE'] ?? 'fitspot';
        $username = $config['DB_USERNAME'] ?? 'root';
        $password = $config['DB_PASSWORD'] ?? '';

        $pdo = new PDO(
            "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4",
            $username,
            $password,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]
        );
    }
    return $pdo;
}

function load_env(): array
{
    $path = dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env';
    if (!is_readable($path)) {
        return [];
    }

    $values = [];
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return [];
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }

        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        if ($key === '') {
            continue;
        }
        if (
            strlen($value) >= 2
            && (($value[0] === '"' && $value[strlen($value) - 1] === '"')
                || ($value[0] === "'" && $value[strlen($value) - 1] === "'"))
        ) {
            $value = substr($value, 1, -1);
        }
        $values[$key] = $value;
    }

    return $values;
}

function start_session(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start([
            'cookie_httponly' => true,
            'cookie_samesite' => 'Lax',
        ]);
    }
}

function json_out(mixed $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function json_in(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw !== false ? $raw : '', true);
    return is_array($data) ? $data : [];
}

function fail(string $message, int $status = 400): never
{
    json_out(['error' => $message], $status);
}

function post_value(array $input, string $key): string
{
    $value = $input[$key] ?? '';
    return is_string($value) ? trim($value) : '';
}

function endpoint(callable $fn): void
{
    try {
        $fn();
    } catch (PDOException $e) {
        error_log('[fitspot] ' . $e->getMessage());
        $sqlState = $e->errorInfo[1] ?? null;
        if ($sqlState === 1062) {
            fail('That record already exists.', 409);
        }
        if ($sqlState === 1451) {
            fail('Cannot delete: other records still reference it.', 409);
        }
        fail('Database error.', 500);
    } catch (Throwable $e) {
        error_log('[fitspot] ' . $e->getMessage());
        fail('Server error.', 500);
    }
}

function current_user(): ?array
{
    start_session();
    if (empty($_SESSION['uid'])) {
        return null;
    }
    $stmt = db()->prepare(
        'SELECT id, full_name, email, role, phone, address, is_active, created_at
           FROM users WHERE id = ?'
    );
    $stmt->execute([$_SESSION['uid']]);
    $user = $stmt->fetch();
    if (!$user || !(int) $user['is_active']) {
        unset($_SESSION['uid']);
        return null;
    }
    return $user;
}

function require_user(string $role = ''): array
{
    $user = current_user();
    if ($user === null) {
        fail('Please log in first.', 401);
    }
    if ($role !== '' && $user['role'] !== $role) {
        fail('You do not have access to this action.', 403);
    }
    return $user;
}

function schedule_label(string $date, string $start, string $end): string
{
    $d = new DateTime($date);
    $s = new DateTime($start);
    $e = new DateTime($end);
    return $d->format('D, M j') . ' | ' . $s->format('g:i A') . ' - ' . $e->format('g:i A');
}

function status_badge(string $status): array
{
    $map = [
        'pending'   => ['Pending',  'badge-orange'],
        'confirmed' => ['Confirmed', 'badge-green'],
        'cancelled' => ['Cancelled', 'badge-gray'],
    ];
    return $map[$status] ?? [$status, 'badge-gray'];
}

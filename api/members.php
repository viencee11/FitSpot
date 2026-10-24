<?php
require __DIR__ . '/db.php';

/* GET    -> members with their current plan and membership status (admin)
   DELETE -> remove a member account (admin, cascades memberships + bookings) */

endpoint(function () {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'GET') {
        require_user('admin');

        $rows = db()->query(
            "SELECT u.id, u.full_name, u.email, u.is_active,
                    p.name AS plan_name, m.status AS membership_status, m.end_date
               FROM users u
               LEFT JOIN memberships m ON m.user_id = u.id
                    AND m.end_date = (SELECT MAX(m2.end_date) FROM memberships m2
                                       WHERE m2.user_id = u.id)
               LEFT JOIN membership_plans p ON p.id = m.plan_id
              WHERE u.role = 'member'
              ORDER BY u.full_name"
        )->fetchAll();

        $today = new DateTime('today');
        $result = [];
        foreach ($rows as $row) {
            if ($row['plan_name'] === null) {
                $badge = ['No Plan', 'badge-gray'];
            } elseif ($row['membership_status'] === 'active'
                && $row['end_date'] !== null
                && new DateTime($row['end_date']) >= $today) {
                $badge = ['Active', 'badge-green'];
            } else {
                $badge = ['Expired', 'badge-gray'];
            }

            $result[] = [
                'id'           => (int) $row['id'],
                'full_name'    => $row['full_name'],
                'email'        => $row['email'],
                'plan'         => $row['plan_name'] ?? 'No plan',
                'status_label' => $badge[0],
                'status_color' => $badge[1],
                'can_assign_plan' => $badge[0] !== 'Active',
            ];
        }

        json_out(['members' => $result]);
    }

    $user = require_user('admin');
    $input = json_in();

    if ($method === 'DELETE') {
        $id = (int) ($input['id'] ?? 0);
        if (!$id) {
            fail('Member id is required.');
        }
        if ($id === (int) $user['id']) {
            fail('You cannot remove your own account.', 409);
        }

        $stmt = db()->prepare('SELECT role FROM users WHERE id = ?');
        $stmt->execute([$id]);
        $target = $stmt->fetch();
        if (!$target) {
            fail('Member not found.', 404);
        }
        if ($target['role'] === 'admin') {
            fail('Cannot remove an admin account.', 409);
        }

        $stmt = db()->prepare('DELETE FROM users WHERE id = ?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) {
            fail('Member not found.', 404);
        }
        json_out(['id' => $id]);
    }

    fail('Method not allowed.', 405);
});

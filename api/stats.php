<?php
require __DIR__ . '/db.php';

/* GET -> dashboard counters + latest reservations (admin) */

endpoint(function () {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
        fail('Method not allowed.', 405);
    }

    require_user('admin');

    $counts = db()->query(
        "SELECT
            (SELECT COUNT(*) FROM users WHERE role = 'member') AS total_members,
            (SELECT COUNT(*) FROM membership_plans WHERE is_active = 1) AS total_plans,
            (SELECT COUNT(*) FROM fitness_classes WHERE is_active = 1) AS total_classes,
            (SELECT COUNT(*) FROM bookings WHERE status = 'pending') AS pending_reservations"
    )->fetch();

    $page = max(1, (int) ($_GET['page'] ?? 1));
    $pageSize = 5;
    $offset = ($page - 1) * $pageSize;

    $stmt = db()->prepare(
        "SELECT b.id, b.status,
                u.full_name AS member,
                c.name AS class_name,
                s.schedule_date, s.start_time, s.end_time
           FROM bookings b
           JOIN users u ON u.id = b.user_id
           JOIN class_schedules s ON s.id = b.schedule_id
           JOIN fitness_classes c ON c.id = s.class_id
          ORDER BY b.booked_at DESC, b.id DESC
          LIMIT :page_size_plus_one OFFSET :offset"
    );
    $stmt->bindValue(':page_size_plus_one', $pageSize + 1, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $recent = $stmt->fetchAll();
    $hasMore = count($recent) > $pageSize;
    if ($hasMore) {
        array_pop($recent);
    }

    $result = [];
    foreach ($recent as $row) {
        $badge = status_badge($row['status']);
        $result[] = [
            'id'           => (int) $row['id'],
            'member'       => $row['member'],
            'class_name'   => $row['class_name'],
            'schedule'     => schedule_label($row['schedule_date'], $row['start_time'], $row['end_time']),
            'status'       => $row['status'],
            'status_label' => $badge[0],
            'status_color' => $badge[1],
        ];
    }

    json_out([
        'stats' => [
            'total_members'       => (int) $counts['total_members'],
            'total_plans'         => (int) $counts['total_plans'],
            'total_classes'       => (int) $counts['total_classes'],
            'pending_reservations'=> (int) $counts['pending_reservations'],
        ],
        'recent' => $result,
        'recent_page' => $page,
        'recent_has_more' => $hasMore,
    ]);
});

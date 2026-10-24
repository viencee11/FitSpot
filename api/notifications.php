<?php
require __DIR__ . '/db.php';

/* GET -> current notifications for the logged-in administrator or member. */

endpoint(function () {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
        fail('Method not allowed.', 405);
    }

    $user = require_user();
    $notifications = [];

    if ($user['role'] === 'admin') {
        $stmt = db()->query(
            "SELECT u.full_name, c.name AS class_name, s.schedule_date,
                    s.start_time, s.end_time
               FROM bookings b
               JOIN users u ON u.id = b.user_id
               JOIN class_schedules s ON s.id = b.schedule_id
               JOIN fitness_classes c ON c.id = s.class_id
              WHERE b.status = 'pending'
                AND b.booked_at >= NOW() - INTERVAL 1 DAY
              ORDER BY b.booked_at DESC
              LIMIT 10"
        );
        foreach ($stmt->fetchAll() as $row) {
            $notifications[] = [
                'type' => 'booking',
                'message' => $row['full_name'] . ' booked ' . $row['class_name'] . '.',
                'detail' => schedule_label($row['schedule_date'], $row['start_time'], $row['end_time']),
            ];
        }

        $stmt = db()->query(
            "SELECT c.name AS class_name, s.schedule_date, s.start_time, s.end_time,
                    s.capacity - (
                        SELECT COUNT(*) FROM bookings b
                         WHERE b.schedule_id = s.id
                           AND b.status IN ('pending', 'confirmed')
                    ) AS remaining
               FROM class_schedules s
               JOIN fitness_classes c ON c.id = s.class_id
              WHERE s.schedule_date >= CURDATE()
                AND s.status = 'open'
                AND s.capacity - (
                    SELECT COUNT(*) FROM bookings b
                     WHERE b.schedule_id = s.id
                       AND b.status IN ('pending', 'confirmed')
                ) BETWEEN 1 AND 3
              ORDER BY s.schedule_date, s.start_time
              LIMIT 10"
        );
        foreach ($stmt->fetchAll() as $row) {
            $notifications[] = [
                'type' => 'low-slots',
                'message' => $row['class_name'] . ' has only ' . $row['remaining'] . ' slot(s) left.',
                'detail' => schedule_label($row['schedule_date'], $row['start_time'], $row['end_time']),
            ];
        }
    } else {
        $stmt = db()->prepare(
            "SELECT c.name AS class_name, s.schedule_date, s.start_time, s.end_time
               FROM bookings b
               JOIN class_schedules s ON s.id = b.schedule_id
               JOIN fitness_classes c ON c.id = s.class_id
              WHERE b.user_id = ?
                AND b.status = 'confirmed'
                AND s.schedule_date >= CURDATE()
              ORDER BY s.schedule_date, s.start_time
              LIMIT 10"
        );
        $stmt->execute([(int) $user['id']]);
        foreach ($stmt->fetchAll() as $row) {
            $notifications[] = [
                'type' => 'confirmed',
                'message' => 'Your ' . $row['class_name'] . ' booking is confirmed.',
                'detail' => schedule_label($row['schedule_date'], $row['start_time'], $row['end_time']),
            ];
        }
    }

    json_out(['notifications' => $notifications]);
});

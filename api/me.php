<?php
require __DIR__ . '/db.php';

/* GET -> the currently logged-in user (401 when not logged in). */

endpoint(function () {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
        fail('Method not allowed.', 405);
    }

    $user = require_user();
    json_out([
        'id'         => (int) $user['id'],
        'full_name'  => $user['full_name'],
        'email'      => $user['email'],
        'role'       => $user['role'],
        'phone'      => $user['phone'],
        'address'    => $user['address'],
        'created_at' => $user['created_at'],
        'csrf'       => csrf_token(),
    ]);
});

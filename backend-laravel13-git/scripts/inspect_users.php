<?php

$database = __DIR__.'/../database/database.sqlite';

$pdo = new PDO('sqlite:'.$database);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$count = $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
echo "count=".$count.PHP_EOL;

$statement = $pdo->query('SELECT id, name, email, role, account_status, is_active FROM users ORDER BY id');

foreach ($statement->fetchAll(PDO::FETCH_ASSOC) as $row) {
    echo json_encode($row, JSON_UNESCAPED_UNICODE).PHP_EOL;
}

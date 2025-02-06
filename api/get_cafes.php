<?php
require_once 'config.php';

try {
    $stmt = $pdo->query("SELECT * FROM cafes ORDER BY created_at DESC");
    $cafes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'cafes' => $cafes
    ]);
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
<?php
require_once 'config.php';

try {
    // Add viewport-based filtering
    $viewport = isset($_GET['viewport']) ? json_decode($_GET['viewport'], true) : null;
    
    if ($viewport) {
        $stmt = $pdo->prepare("
            SELECT * FROM cafes 
            WHERE latitude BETWEEN :south AND :north 
            AND longitude BETWEEN :west AND :east 
            ORDER BY created_at DESC
        ");
        
        $stmt->execute([
            ':south' => $viewport['south'],
            ':north' => $viewport['north'],
            ':west' => $viewport['west'],
            ':east' => $viewport['east']
        ]);
    } else {
        // Fallback to limited results
        $stmt = $pdo->prepare("SELECT * FROM cafes ORDER BY created_at DESC LIMIT 100");
        $stmt->execute();
    }
    
    $cafes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Add cache headers
    header('Cache-Control: public, max-age=300'); // 5 minutes cache
    header('Content-Type: application/json');
    
    echo json_encode([
        'success' => true,
        'cafes' => $cafes
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error'
    ]);
}
?>
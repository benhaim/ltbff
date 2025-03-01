<?php

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'config.php';

// Get the cafe ID from POST
$cafeId = $_POST['id'] ?? null;
error_log("Received cafe ID: " . print_r($cafeId, true));

if (!$cafeId) {
    echo json_encode([
        'success' => false,
        'error' => 'No cafe ID provided'
    ]);
    exit;
}

try {
    // Log the SQL query for debugging
    error_log("Attempting to delete cafe with ID: $cafeId");
    
    // Delete the cafe from the database
    $stmt = $pdo->prepare("DELETE FROM cafes WHERE id = ?");
    $success = $stmt->execute([$cafeId]);
    
    // Log the result
    error_log("Delete execution result: " . ($success ? 'true' : 'false'));
    error_log("Rows affected: " . $stmt->rowCount());

    if ($success && $stmt->rowCount() > 0) {
        echo json_encode([
            'success' => true
        ]);
    } else {
        error_log("Failed to delete cafe: " . print_r($stmt->errorInfo(), true));
        echo json_encode([
            'success' => false,
            'error' => 'Failed to delete cafe - ID not found or already deleted'
        ]);
    }
} catch (PDOException $e) {
    error_log("Database error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage()
    ]);
} 
<?php
require_once 'config.php';

// At the top after require_once
error_log("=== START NEW REQUEST ===");
error_log("Raw POST data: " . file_get_contents('php://input'));

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // After json_decode
    error_log("Decoded data structure: " . print_r($data, true));
    
    try {
        // First check if place exists
        $checkStmt = $pdo->prepare("
            SELECT id, total_ratings, 
                   wifi_rating, power_rating, quiet_rating, 
                   coffee_rating, food_rating 
            FROM cafes 
            WHERE latitude = :lat AND longitude = :lng
        ");
        
        $checkStmt->execute([
            'lat' => $data['lat'],
            'lng' => $data['lng']
        ]);
        
        $existingPlace = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existingPlace) {
            // Update existing place with running average
            $stmt = $pdo->prepare("
                UPDATE cafes 
                SET 
                    wifi_rating = ((wifi_rating * total_ratings) + :wifi) / (total_ratings + 1),
                    power_rating = ((power_rating * total_ratings) + :power) / (total_ratings + 1),
                    quiet_rating = ((quiet_rating * total_ratings) + :quiet) / (total_ratings + 1),
                    coffee_rating = ((coffee_rating * total_ratings) + :coffee) / (total_ratings + 1),
                    food_rating = ((food_rating * total_ratings) + :food) / (total_ratings + 1),
                    total_ratings = total_ratings + 1
                WHERE id = :id
            ");
            
            $result = $stmt->execute([
                'id' => $existingPlace['id'],
                'wifi' => $data['ratings']['wifi'],
                'power' => $data['ratings']['power'],
                'quiet' => $data['ratings']['quiet'],
                'coffee' => $data['ratings']['coffee'],
                'food' => $data['ratings']['food']
            ]);

            // Get updated ratings
            if ($result) {
                $getUpdated = $pdo->prepare("
                    SELECT * FROM cafes WHERE id = :id
                ");
                $getUpdated->execute(['id' => $existingPlace['id']]);
                $updatedPlace = $getUpdated->fetch(PDO::FETCH_ASSOC);
                
                $data['ratings'] = [
                    'wifi' => round(floatval($updatedPlace['wifi_rating'])),
                    'power' => round(floatval($updatedPlace['power_rating'])),
                    'quiet' => round(floatval($updatedPlace['quiet_rating'])),
                    'coffee' => round(floatval($updatedPlace['coffee_rating'])),
                    'food' => round(floatval($updatedPlace['food_rating']))
                ];
                $data['total_ratings'] = $updatedPlace['total_ratings'];
            }
        } else {
            // Insert new place
            $stmt = $pdo->prepare("
                INSERT INTO cafes (
                    name, latitude, longitude, address, 
                    wifi_rating, power_rating, quiet_rating, 
                    coffee_rating, food_rating, total_ratings
                ) VALUES (
                    :name, :lat, :lng, :address,
                    :wifi, :power, :quiet,
                    :coffee, :food, 1
                )
            ");
            
            // Before INSERT
            error_log("Attempting INSERT with data: " . print_r([
                'name' => $data['name'],
                'lat' => $data['lat'],
                'lng' => $data['lng'],
                'address' => $data['address'],
                'wifi' => $data['ratings']['wifi'],
                'power' => $data['ratings']['power'],
                'quiet' => $data['ratings']['quiet'],
                'coffee' => $data['ratings']['coffee'],
                'food' => $data['ratings']['food']
            ], true));
            
            $result = $stmt->execute([
                'name' => $data['name'],
                'lat' => $data['lat'],
                'lng' => $data['lng'],
                'address' => $data['address'],
                'wifi' => $data['ratings']['wifi'],
                'power' => $data['ratings']['power'],
                'quiet' => $data['ratings']['quiet'],
                'coffee' => $data['ratings']['coffee'],
                'food' => $data['ratings']['food']
            ]);

            // After execute
            error_log("SQL execution result: " . ($result ? 'true' : 'false'));
            if (!$result) {
                error_log("PDO Error Info: " . print_r($stmt->errorInfo(), true));
            }
        }
        
        if ($result) {
            echo json_encode([
                'success' => true,
                'id' => $existingPlace ? $existingPlace['id'] : $pdo->lastInsertId(),
                'savedData' => $data,
                'isNewPlace' => !$existingPlace
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'error' => 'Failed to save to database'
            ]);
        }
    } catch (Exception $e) {
        error_log("Database error: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'error' => 'Server error',
            'sqlError' => $e->getMessage()
        ]);
    }
} else {
    error_log("Invalid request method: " . $_SERVER['REQUEST_METHOD']);
    echo json_encode(['success' => false, 'error' => 'Invalid request method']);
}
?> 
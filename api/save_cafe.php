<?php
require_once 'config.php';

// At the top after require_once
error_log("=== NEW SUBMISSION START ===");
error_log("Raw input: " . file_get_contents('php://input'));

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    error_log("Decoded data: " . print_r($data, true));
    
    try {
        // First check if place exists
        $checkStmt = $pdo->prepare("
            SELECT id, total_ratings FROM cafes 
            WHERE latitude = :lat AND longitude = :lng
        ");
        
        $checkValues = [
            'lat' => $data['lat'],
            'lng' => $data['lng']
        ];
        error_log("Checking existing with values: " . print_r($checkValues, true));
        
        $checkStmt->execute($checkValues);
        $existingPlace = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existingPlace) {
            error_log("Updating existing place ID: " . $existingPlace['id']);
            // Update existing place with running average
            $stmt = $pdo->prepare("
                UPDATE cafes 
                SET 
                    wifi_rating = ROUND(((wifi_rating * total_ratings) + :wifi) / (total_ratings + 1), 1),
                    power_rating = ROUND(((power_rating * total_ratings) + :power) / (total_ratings + 1), 1),
                    quiet_rating = ROUND(((quiet_rating * total_ratings) + :quiet) / (total_ratings + 1), 1),
                    coffee_rating = ROUND(((coffee_rating * total_ratings) + :coffee) / (total_ratings + 1), 1),
                    food_rating = ROUND(((food_rating * total_ratings) + :food) / (total_ratings + 1), 1),
                    total_ratings = total_ratings + 1
                WHERE id = :id
            ");
            
            $result = $stmt->execute([
                'id' => $existingPlace['id'],
                'wifi' => floatval($data['ratings']['wifi']),
                'power' => floatval($data['ratings']['power']),
                'quiet' => floatval($data['ratings']['quiet']),
                'coffee' => floatval($data['ratings']['coffee']),
                'food' => floatval($data['ratings']['food'])
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
            error_log("Inserting new place");
            // Insert new place
            $stmt = $pdo->prepare("
                INSERT INTO cafes (
                    name, latitude, longitude, address, 
                    wifi_rating, power_rating, quiet_rating, 
                    coffee_rating, food_rating
                ) VALUES (
                    :name, :lat, :lng, :address,
                    :wifi, :power, :quiet,
                    :coffee, :food
                )
            ");
            
            $insertValues = [
                'name' => $data['name'],
                'lat' => $data['lat'],
                'lng' => $data['lng'],
                'address' => $data['address'],
                'wifi' => (float)$data['ratings']['wifi'],
                'power' => (float)$data['ratings']['power'],
                'quiet' => (float)$data['ratings']['quiet'],
                'coffee' => (float)$data['ratings']['coffee'],
                'food' => (float)$data['ratings']['food']
            ];
            error_log("Insert values: " . print_r($insertValues, true));
            
            $result = $stmt->execute($insertValues);
            error_log("Insert result: " . ($result ? 'success' : 'failed'));
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
        error_log("Exception caught: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
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
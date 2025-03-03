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
            $updateFields = [];
            $params = ['id' => $existingPlace['id']];

            // Only include ratings that were submitted
            foreach (['wifi', 'power', 'quiet', 'coffee', 'food'] as $ratingType) {
                if (isset($data['ratings'][$ratingType])) {
                    $updateFields[] = "{$ratingType}_rating = (({$ratingType}_rating * total_ratings) + :{$ratingType}) / (total_ratings + 1)";
                    $params[$ratingType] = floatval($data['ratings'][$ratingType]);
                }
            }

            // Handle wifi password if provided
            if (!empty($data['wifi_password'])) {
                $updateFields[] = "wifi_password = :wifi_password";
                $params['wifi_password'] = $data['wifi_password'];
            }

            // Only increment total_ratings if at least one rating was submitted
            if (!empty($updateFields)) {
                $updateFields[] = "total_ratings = total_ratings + 1";
            }

            $stmt = $pdo->prepare("
                UPDATE cafes 
                SET " . implode(", ", $updateFields) . "
                WHERE id = :id
            ");

            $result = $stmt->execute($params);

            // Get updated ratings
            if ($result) {
                $getUpdated = $pdo->prepare("
                    SELECT * FROM cafes WHERE id = :id
                ");
                $getUpdated->execute(['id' => $existingPlace['id']]);
                $updatedPlace = $getUpdated->fetch(PDO::FETCH_ASSOC);
                
                $data['ratings'] = [
                    'wifi' => floatval($updatedPlace['wifi_rating']),
                    'power' => floatval($updatedPlace['power_rating']),
                    'quiet' => floatval($updatedPlace['quiet_rating']),
                    'coffee' => floatval($updatedPlace['coffee_rating']),
                    'food' => floatval($updatedPlace['food_rating'])
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
                    coffee_rating, food_rating, wifi_password
                ) VALUES (
                    :name, :lat, :lng, :address,
                    :wifi, :power, :quiet,
                    :coffee, :food, :wifi_password
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
                'food' => (float)$data['ratings']['food'],
                'wifi_password' => $data['wifi_password'] ?? null
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
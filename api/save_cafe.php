<?php
require_once 'config.php';

// Log incoming data
error_log("Received POST request: " . file_get_contents('php://input'));

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Log decoded data
    error_log("Decoded data: " . print_r($data, true));
    
    try {
        // First check if place exists
        $checkStmt = $pdo->prepare("
            SELECT id, total_ratings FROM cafes 
            WHERE latitude = :lat AND longitude = :lng
        ");
        
        $checkStmt->execute([
            'lat' => $data['lat'],
            'lng' => $data['lng']
        ]);
        
        $existingPlace = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existingPlace) {
            // Update existing place
            $stmt = $pdo->prepare("
                UPDATE cafes 
                SET 
                    wifi_rating = ((wifi_rating * total_ratings) + :new_wifi) / (total_ratings + 1),
                    power_rating = ((power_rating * total_ratings) + :new_power) / (total_ratings + 1),
                    quiet_rating = ((quiet_rating * total_ratings) + :new_quiet) / (total_ratings + 1),
                    coffee_rating = ((coffee_rating * total_ratings) + :new_coffee) / (total_ratings + 1),
                    food_rating = ((food_rating * total_ratings) + :new_food) / (total_ratings + 1),
                    total_ratings = total_ratings + 1
                WHERE id = :place_id
            ");
            
            $result = $stmt->execute([
                'place_id' => $existingPlace['id'],
                'new_wifi' => $data['ratings']['wifi'],
                'new_power' => $data['ratings']['power'],
                'new_quiet' => $data['ratings']['quiet'],
                'new_coffee' => $data['ratings']['coffee'],
                'new_food' => $data['ratings']['food']
            ]);
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
        }
        
        if ($result) {
            $data['total_ratings'] = $existingPlace ? $existingPlace['total_ratings'] + 1 : 1;
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
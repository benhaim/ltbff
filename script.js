console.log('Script loading...');

// Global variables
let map;
let service;
let infoWindow;
let autocomplete;
let selectedPlace = null;

// Keep the same rating labels and icons from the original version
const ratingLabels = {
    wifi: ['Basic', 'Fast', 'Rocket 🚀'],
    power: ['Rare', 'Available', 'Abundant'],
    quiet: ['Lively', 'Chill', 'Silent'],
    coffee: ['Basic', 'Good', 'Amazing'],
    food: ['None', 'Snacks', 'Full Menu']
};

const categoryIcons = {
    wifi: 'fa-wifi',
    power: 'fa-plug',
    quiet: 'fa-volume-low',
    coffee: 'fa-mug-hot',
    food: 'fa-utensils'
};

// Main initialization function
async function initMap() {
    console.log('Initializing map...');
    
    // Default to Chiang Mai coordinates (only used if geolocation fails)
    const defaultLocation = { lat: 18.7883, lng: 98.9853 };
    
    try {
        // Get location first
        const location = await new Promise((resolve, reject) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const userLocation = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        };
                        
                        resolve(userLocation);
                    },
                    () => {
                        console.log('Geolocation failed, using default location');
                        resolve(defaultLocation);
                    }
                );
            } else {
                console.log('Geolocation not available, using default location');
                resolve(defaultLocation);
            }
        });

        // Now create the map with the correct initial location
        map = new google.maps.Map(document.getElementById("map"), {
            zoom: 17,
            center: location,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            mapId: 'd798b01898fb267b',
            gestureHandling: 'greedy',
            zoomControl: false,
            locationButton: true,
            controlSize: 32,
            clickableIcons: true,
            mapTypeControlOptions: {
                position: google.maps.ControlPosition.TOP_RIGHT
            },
            zoomControlOptions: {
                position: google.maps.ControlPosition.RIGHT_CENTER
            }
        });

        // Add user location marker after map is initialized
        if (location !== defaultLocation) {
            const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
            const userMarkerDiv = document.createElement('div');
            userMarkerDiv.className = 'user-location-marker';
            
            new AdvancedMarkerElement({
                map,
                position: location,
                content: userMarkerDiv,
                title: 'Your Location'
            });
        }

        // Create InfoWindow for markers
        infoWindow = new google.maps.InfoWindow({
            pixelOffset: new google.maps.Size(0, -5),  // Adjust the vertical offset
        });

        // Add this right after creating the InfoWindow
        google.maps.event.addListener(infoWindow, 'domready', () => {
            // Hide close button after InfoWindow is ready
            const closeButtons = document.querySelectorAll('.gm-ui-hover-effect');
            closeButtons.forEach(button => {
                button.style.display = 'none';
            });
        });

        // Initialize Places Service
        const placeDiv = document.createElement('div');
        service = new google.maps.places.PlacesService(placeDiv);

        // Load existing cafes
        loadExistingCafes();

        // Initialize UI elements
        initializeUI();
        
        // Add this in initMap after creating the map
        map.addListener('click', (e) => {
            // If clicking on a place
            if (e.placeId) {
                e.stop();  // Prevent default info window
                
                // Get place details
                const request = {
                    placeId: e.placeId,
                    fields: ['name', 'formatted_address', 'geometry', 'types']
                };

                service.getDetails(request, (place, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK) {
                        const content = generatePopupContent(place);

                        infoWindow.setContent(content);
                        infoWindow.setPosition(e.latLng);
                        infoWindow.open(map);

                        // Add click handler for rate button
                        setTimeout(() => {
                            const rateBtn = document.querySelector('.rate-btn');
                            if (rateBtn) {
                                rateBtn.addEventListener('click', () => {
                                    selectedPlace = {
                                        name: place.name,
                                        lat: place.geometry.location.lat(),
                                        lng: place.geometry.location.lng(),
                                        address: place.formatted_address
                                    };
                                    showRatingForm(selectedPlace);
                                });
                            }
                        }, 100);
                    }
                });
            } else {
                // If clicking anywhere else on the map, close the info window
                infoWindow.close();
            }
        });

    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

// Initialize UI elements
function initializeUI() {
    // Add location button handler
    const locationBtn = document.getElementById('locationBtn');
    if (locationBtn) {
        locationBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                locationBtn.classList.add('loading');
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const pos = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        };
                        map.setCenter(pos);
                        map.setZoom(17);
                        locationBtn.classList.remove('loading');
                    },
                    () => {
                        locationBtn.classList.remove('loading');
                        alert('Could not get your location');
                    }
                );
            }
        });
    }

    // Initialize form submission
    const cafeForm = document.getElementById('cafeForm');
    if (cafeForm) {
        generateRatingGroups();
        cafeForm.onsubmit = submitCafeForm;
    }

    // Initialize autocomplete immediately since search is always visible
    initializeAutocomplete();

    // Add cancel button handler
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            const addCafeForm = document.getElementById('addCafeForm');
            addCafeForm.classList.add('hidden');
            addCafeForm.classList.remove('visible');
        });
    }
}

// Add these functions that were in the original version
function generateRatingGroups() {
    const container = document.querySelector('.ratings-container');
    if (container) {
        console.log('Generating rating groups...');
        container.innerHTML = ''; // Clear existing content

        Object.keys(ratingLabels).forEach(category => {
            const group = document.createElement('div');
            group.className = 'rating-group';
            group.innerHTML = `
                <i class="fa-solid ${categoryIcons[category]}"></i>
                <div class="rating-options" data-rating="${category}">
                    ${ratingLabels[category].map((label, index) => `
                        <label class="rating-option">
                            <input type="radio" name="${category}" value="${index + 1}">
                            <span class="rating-label">${label}</span>
                        </label>
                    `).join('')}
                </div>
            `;
            container.appendChild(group);
        });
    } else {
        console.error('Ratings container not found');
    }
}

// Add this function to handle form submission
function submitCafeForm(event) {
    event.preventDefault();
    
    if (!selectedPlace) {
        alert('Please select a place from the suggestions');
        return;
    }

    if (!validateForm()) {
        alert('Please fill out all ratings before submitting.');
        return;
    }

    // Get all the ratings
    const ratings = {};
    const requiredFields = ['wifi', 'power', 'quiet', 'coffee', 'food'];
    requiredFields.forEach(field => {
        const selectedOption = document.querySelector(`input[name="${field}"]:checked`);
        ratings[field] = selectedOption.value;
    });

    const data = {
        name: selectedPlace.name,
        lat: selectedPlace.lat,
        lng: selectedPlace.lng,
        address: selectedPlace.address,
        ratings: ratings
    };

    console.log('Submitting data:', data);
    
    fetch('api/save_cafe.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('success', 'Rating saved successfully');
            
            // Close and reset the form
            const addCafeForm = document.getElementById('addCafeForm');
            const cafeForm = document.getElementById('cafeForm');
            if (addCafeForm) {
                addCafeForm.classList.add('hidden');
                addCafeForm.classList.remove('visible');
                cafeForm.reset();
            }
            
            // Update or add marker
            if (data.savedData && data.savedData.lat && data.savedData.lng) {
                const savedPlace = {
                    name: data.savedData.name,
                    lat: data.savedData.lat,
                    lng: data.savedData.lng,
                    address: data.savedData.address,
                    ratings: data.savedData.ratings || ratings,
                    total_ratings: data.isNewPlace ? 1 : (data.savedData.total_ratings || 1)
                };
                
                createRatedCafeMarker(savedPlace);
            }
        } else {
            showNotification('error', data.error || 'Error saving rating');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('error', 'Failed to save place');
    });
}

// Add this function to load existing cafes
function loadExistingCafes() {
    console.log('Loading existing cafés...');
    fetch('api/get_cafes.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Loaded cafés:', data.cafes.length);
                data.cafes.forEach(async cafe => {  // Make this async
                    const cafeData = {
                        name: cafe.name,
                        address: cafe.address,
                        lat: parseFloat(cafe.latitude),
                        lng: parseFloat(cafe.longitude),
                        total_ratings: parseInt(cafe.total_ratings) || 1,
                        ratings: {
                            wifi: Math.round(parseFloat(cafe.wifi_rating)) || 1,
                            power: Math.round(parseFloat(cafe.power_rating)) || 1,
                            quiet: Math.round(parseFloat(cafe.quiet_rating)) || 1,
                            coffee: Math.round(parseFloat(cafe.coffee_rating)) || 1,
                            food: Math.round(parseFloat(cafe.food_rating)) || 1
                        }
                    };
                    
                    await createRatedCafeMarker(cafeData);  // Wait for marker creation
                });
            } else {
                console.error('Error loading cafés:', data.error);
            }
        })
        .catch(error => console.error('Error:', error));
}

// Update the createRatedCafeMarker function
async function createRatedCafeMarker(cafe) {
    // Import the marker library
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

    // Create a custom element for the marker
    const markerContent = document.createElement('div');
    markerContent.className = 'custom-marker';
    markerContent.innerHTML = '<i class="fa-solid fa-laptop"></i>';

    // Create the marker with custom element
    const marker = new AdvancedMarkerElement({
        map,
        position: { lat: cafe.lat, lng: cafe.lng },
        title: cafe.name,
        content: markerContent
    });

    // Add click listener
    marker.addListener('click', (e) => {
        e.stop();
        
        // Get place details from Google
        const request = {
            query: cafe.name + ' ' + cafe.address,
            fields: ['name', 'formatted_address', 'geometry', 'types']
        };
        
        service.textSearch(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results[0]) {
                // Merge our cafe data with Google's place types
                const enrichedCafe = {
                    ...cafe,
                    types: results[0].types
                };
                const content = generatePopupContent(enrichedCafe);
                infoWindow.setContent(content);
                infoWindow.setPosition({ lat: cafe.lat, lng: cafe.lng });
                infoWindow.open(map);
            } else {
                // Fallback to our cafe data if Google search fails
                const content = generatePopupContent(cafe);
                infoWindow.setContent(content);
                infoWindow.setPosition({ lat: cafe.lat, lng: cafe.lng });
                infoWindow.open(map);
            }
        });
    });
}

// Update the initializeAutocomplete function
async function initializeAutocomplete() {
    console.log('Initializing autocomplete...');
    const input = document.querySelector('#searchBox input');  // Updated selector
    
    if (!input) {
        console.error('Search input not found');
        return;
    }

    try {
        let searchTimeout;
        let resultsContainer;

        // Create results container if it doesn't exist
        if (!document.querySelector('.search-results')) {
            resultsContainer = document.createElement('div');
            resultsContainer.className = 'search-results';
            input.parentNode.appendChild(resultsContainer);
        } else {
            resultsContainer = document.querySelector('.search-results');
        }

        input.addEventListener('input', function() {
            const searchText = this.value;

            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }

            if (!searchText || searchText.length < 2) {
                resultsContainer.style.display = 'none';
                return;
            }

            searchTimeout = setTimeout(() => {
                const request = {
                    query: searchText,
                    bounds: map.getBounds()
                };

                service.textSearch(request, (results, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                        showResults(results.slice(0, 5), resultsContainer);
                    } else {
                        resultsContainer.innerHTML = '<div class="search-result-item">No results found</div>';
                        resultsContainer.style.display = 'block';
                    }
                });
            }, 300);
        });

        function showResults(places, container) {
            container.innerHTML = '';
            container.style.display = 'block';

            places.forEach(place => {
                const div = document.createElement('div');
                div.className = 'search-result-item';
                
                div.innerHTML = `
                    <div class="place-name">${place.name}</div>
                    <div class="place-address">${place.formatted_address || ''}</div>
                `;
                
                div.onclick = (e) => {
                    input.value = place.name;
                    container.style.display = 'none';

                    // Store place data
                    selectedPlace = {
                        name: place.name,
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng(),
                        address: place.formatted_address
                    };

                    // Pan to location
                    map.panTo(selectedPlace);
                    map.setZoom(17);

                    // Show info window for the place
                    const content = generatePopupContent(selectedPlace);

                    // Stop any existing info windows
                    infoWindow.close();
                    
                    infoWindow.setContent(content);
                    infoWindow.setPosition({ lat: selectedPlace.lat, lng: selectedPlace.lng });
                    infoWindow.open(map);

                    // Prevent the click from reaching the map
                    e.stopPropagation();

                    // Add click handler for rate button
                    setTimeout(() => {
                        const rateBtn = document.querySelector('.rate-btn');
                        if (rateBtn) {
                            rateBtn.addEventListener('click', () => {
                                showRatingForm(selectedPlace);
                            });
                        }
                    }, 100);
                };

                container.appendChild(div);
            });
        }

        // Close results when clicking outside
        document.addEventListener('click', function(e) {
            if (!input.contains(e.target) && !resultsContainer.contains(e.target)) {
                resultsContainer.style.display = 'none';
            }
        });

        // Add to initializeAutocomplete
        const clearButton = document.querySelector('.clear-button');
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                input.value = '';
                input.focus();
                resultsContainer.style.display = 'none';
            });
        }

    } catch (error) {
        console.error('Error initializing search:', error);
    }
}

function showRatingForm(cafe = null) {
    const addCafeForm = document.getElementById('addCafeForm');
    const cafeForm = document.getElementById('cafeForm');
    const formTitle = addCafeForm.querySelector('h2');

    // Reset form state completely
    cafeForm.reset();

    // Update form appearance based on whether we're rating existing or adding new
    if (cafe) {
        formTitle.textContent = `Rate ${cafe.name}`;
        // Store the cafe data for submission
        selectedPlace = {
            name: cafe.name,
            lat: cafe.lat,
            lng: cafe.lng,
            address: cafe.address
        };
    } else {
        formTitle.textContent = 'Add New Place';
        selectedPlace = null;
    }

    // Show the form
    addCafeForm.classList.remove('hidden');
    addCafeForm.classList.add('visible');

    // Close any existing details panel
    const existingPanel = document.querySelector('.details-panel');
    if (existingPanel) {
        existingPanel.remove();
    }
    
    // Remove any existing panel overlay
    const existingOverlay = document.querySelector('.panel-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
}

// Add validation function
function validateForm() {
    const requiredFields = ['wifi', 'power', 'quiet', 'coffee', 'food'];
    for (const field of requiredFields) {
        const selectedOption = document.querySelector(`input[name="${field}"]:checked`);
        if (!selectedOption) {
            return false; // If any field is not filled, return false
        }
    }
    return true; // All fields are filled
}

// This is the main notification function we're using
function showNotification(type, message) {
    // Remove any existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        ${message}
    `;

    // Add to DOM
    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => notification.classList.add('show'), 10);

    // Remove after delay
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add this helper function at the top with other utility functions
function generatePopupContent(place) {
    // Helper function to get a friendly place type
    function getPlaceType(place) {
        if (place.types && place.types.length > 0) {
            // Format the first type nicely
            return place.types[0].split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }
        return 'Place';  // Default fallback
    }

    return `
        <div class="popup-content">
            <div class="popup-header">
                <h3>${place.name}</h3>
                <a href="https://www.google.com/maps/search/${place.place_id ? 
                    `place/?q=place_id:${place.place_id}` : 
                    encodeURIComponent(place.name)}" 
                   target="_blank" 
                   class="map-link"
                   title="Open in Google Maps">
                    <i class="fa-solid fa-map-location-dot"></i>
                </a>
            </div>
            <p class="place-type">${getPlaceType(place)}</p>
            ${place.ratings ? `
                <div class="quick-ratings">
                    ${Object.entries(place.ratings).map(([category, rating]) => `
                        <div class="rating-item" title="${category}">
                            <i class="fa-solid ${categoryIcons[category]}"></i>
                            <span class="rating-value rating-level-${rating}">${rating}/3</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            <button class="rate-btn">
                <i class="fa-solid fa-star"></i> Rate This Place
            </button>
        </div>
    `;
}
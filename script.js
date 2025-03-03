// Global variables
let map;
let service;
let infoWindow;
let autocomplete;
let selectedPlace = null;
let allMarkers = [];

// Update the rating options object
const ratingOptions = {
    wifi: ['Basic', 'Rocket 🚀'],
    power: ['Rare', 'Abundant'],
    vibe: ['Library', 'Lively'],
    coffee: ['Good', 'Amazing'],
    food: ['No', 'Yes']
};

// Update the category icons with pairs for each state [0, 1]
const categoryIcons = {
    wifi: ['fa-wifi', 'fa-wifi fa-rocket'],  // For wifi, we'll handle the rocket separately
    power: ['fa-plug-circle-xmark', 'fa-plug-circle-check'],
    vibe: ['fa-book', 'fa-comments'],
    coffee: ['fa-mug-saucer', 'fa-mug-hot'],
    food: ['fa-burger', 'fa-burger']  // For food, we'll handle the slash separately
};

// Add these style constants at the top of the file
const DEFAULT_STYLE = [
    {
        elementType: "geometry",
        stylers: [{ color: "#242f3e" }],
    },
    {
        elementType: "labels.text.fill",
        stylers: [{ color: "#746855" }],
    },
    {
        elementType: "labels.text.stroke",
        stylers: [{ color: "#242f3e" }],
    },
    {
        featureType: "administrative.locality",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
    },
    {
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "off" }]  // Hide all POIs by default
    },
    {
        featureType: "poi.park",
        elementType: "geometry",
        stylers: [{ color: "#263c3f" }],
    },
    {
        featureType: "poi.park",
        elementType: "labels.text.fill",
        stylers: [{ color: "#6b9a76" }],
    },
    {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#38414e" }],
    },
    {
        featureType: "road",
        elementType: "geometry.stroke",
        stylers: [{ color: "#212a37" }],
    },
    {
        featureType: "road",
        elementType: "labels.text.fill",
        stylers: [{ color: "#9ca5b3" }],
    },
    {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#17263c" }],
    },
    {
        featureType: "water",
        elementType: "labels.text.fill",
        stylers: [{ color: "#515c6d" }],
    },
    {
        featureType: "water",
        elementType: "labels.text.stroke",
        stylers: [{ color: "#17263c" }],
    },
    {
        featureType: "road.highway",
        elementType: "labels",
        stylers: [{"visibility": "off"}]
    },
    {
        featureType: "poi.business",
        elementType: "labels",
        stylers: [{ visibility: "off" }]  // Hide businesses when zoomed out
    },
    {
        featureType: "poi.government",
        elementType: "labels",
        stylers: [{ visibility: "off" }]  // Hide government buildings
    },
    {
        featureType: "poi.medical",
        elementType: "labels",
        stylers: [{ visibility: "off" }]  // Hide medical facilities
    },
    {
        featureType: "poi.school",
        elementType: "labels",
        stylers: [{ visibility: "off" }]  // Hide schools
    },
    {
        featureType: "poi.sports_complex",
        elementType: "labels",
        stylers: [{ visibility: "off" }]  // Hide sports complexes
    },
    {
        featureType: "poi.place_of_worship",
        elementType: "labels",
        stylers: [{ visibility: "off" }]  // Hide religious places
    }
];

const ZOOMED_STYLE = [
    {
        elementType: "geometry",
        stylers: [{ color: "#242f3e" }],
    },
    {
        elementType: "labels.text.fill",
        stylers: [{ color: "#746855" }],
    },
    {
        elementType: "labels.text.stroke",
        stylers: [{ color: "#242f3e" }],
    },
    {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#38414e" }],
    },
    {
        featureType: "road",
        elementType: "geometry.stroke",
        stylers: [{ color: "#212a37" }],
    },
    {
        featureType: "road",
        elementType: "labels.text.fill",
        stylers: [{ color: "#9ca5b3" }],
    },
    {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#17263c" }],
    },
    {
        featureType: "water",
        elementType: "labels.text.fill",
        stylers: [{ color: "#515c6d" }],
    },
    {
        featureType: "water",
        elementType: "labels.text.stroke",
        stylers: [{ color: "#17263c" }],
    },
    {
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "on" }]  // Show POIs when zoomed in
    },
    {
        featureType: "poi.business",
        elementType: "labels",
        stylers: [{ visibility: "on" }]  // Show businesses when zoomed in
    }
];

// Add at the top with other constants
const DEFAULT_ZOOM = 15;
const MAX_ZOOM = 20;
const MIN_ZOOM = 3;

// Main initialization function
async function initMap() {
    try {
        // Start loading everything
        const locationPromise = new Promise((resolve, reject) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        });
                    },
                    () => {
                        console.log('Geolocation failed, using default location');
                        resolve({ lat: 18.7883, lng: 98.9853 });
                    }
                );
            } else {
                console.log('Geolocation not available, using default location');
                resolve({ lat: 18.7883, lng: 98.9853 });
            }
        });

        // Create map with location
        const location = await locationPromise;
        map = new google.maps.Map(document.getElementById("map"), {
            zoom: DEFAULT_ZOOM,
            center: location,
            disableDefaultUI: true,
            zoomControl: true,
            zoomControlOptions: {
                position: google.maps.ControlPosition.RIGHT_CENTER,
              },
            gestureHandling: "greedy",
            scrollwheel: true,
            draggable: true,
            keyboardShortcuts: false,
            minZoom: MIN_ZOOM,
            maxZoom: MAX_ZOOM,
            styles: DEFAULT_STYLE
        });

        // Add user location marker after map is initialized
        const defaultLocation = { lat: 18.7883, lng: 98.9853 };
        if (location.lat !== defaultLocation.lat || location.lng !== defaultLocation.lng) {
            class UserLocationMarker extends google.maps.OverlayView {
                constructor(position) {
                    super();
                    this.position = position;
                    this.div = null;
                }
            
                onAdd() {
                    this.div = document.createElement('div');
                    this.div.className = 'user-location-marker';
                    const panes = this.getPanes();
                    panes.overlayLayer.appendChild(this.div);
                }
            
                draw() {
                    const overlayProjection = this.getProjection();
                    const point = overlayProjection.fromLatLngToDivPixel(this.position);
                    
                    if (this.div) {
                        this.div.style.left = (point.x - 8) + 'px';  // Center horizontally (16/2)
                        this.div.style.top = (point.y - 8) + 'px';   // Center vertically (16/2)
                    }
                }
            
                onRemove() {
                    if (this.div) {
                        this.div.parentNode.removeChild(this.div);
                        this.div = null;
                    }
                }
            }
            
            const userMarker = new UserLocationMarker(new google.maps.LatLng(location.lat, location.lng));
            userMarker.setMap(map);
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
        service = new google.maps.places.PlacesService(map);

        // Initialize other components
        await Promise.all([
            initializeUI(),
            loadExistingCafes()
        ]);

        // Everything is loaded, enable the splash button
        const splash = document.getElementById('splashScreen');
        const splashButton = splash.querySelector('.splash-button');
        const buttonText = splash.querySelector('.button-text');
        splash.classList.add('ready');
        splashButton.disabled = false;
        buttonText.classList.remove('hidden');  // Remove hidden class from text

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

        // Add this in initMap after creating the map
        map.addListener('zoom_changed', () => {
            const currentZoom = map.getZoom();
            console.log('Current zoom level:', currentZoom);
            
            if (currentZoom >= DEFAULT_ZOOM) {
                map.setOptions({ styles: ZOOMED_STYLE });
            } else {
                map.setOptions({ styles: DEFAULT_STYLE });
            }
        });

    } catch (error) {
        console.error('Error initializing map:', error);
        showNotification('error', 'Failed to initialize map');
    }

    // Update the info button creation
    const infoBtn = document.createElement('button');
    infoBtn.className = 'location-btn info-btn';  // Use location-btn as base class
    infoBtn.innerHTML = '<i class="fa-solid fa-circle-info"></i>';
    infoBtn.onclick = showInfoScreen;
    document.body.appendChild(infoBtn);

    // Add location button handler
    const locationBtn = document.getElementById('locationBtn');
    if (locationBtn) {
        locationBtn.addEventListener('click', () => {
            if (locationBtn.disabled) {
                return;
            }

            if (navigator.geolocation) {
                locationBtn.disabled = true;  // Disable while getting location
                
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const pos = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        };

                        // First pan smoothly to the location
                        map.panTo(pos);
                        
                        // Then zoom in after a short delay
                        setTimeout(() => {
                            const currentZoom = map.getZoom();
                            if (currentZoom < 17) {
                                map.setZoom(17);
                            }
                            locationBtn.disabled = false;
                        }, 300);
                    },
                    (error) => {
                        console.error('Geolocation error:', error);
                        showNotification('error', 'Could not get your location');
                        locationBtn.disabled = false;
                    }
                );
            }
        });
    }
}

// Update initializeUI to remove location functionality
function initializeUI() {
    // Initialize autocomplete immediately since search is always visible
    initializeAutocomplete();
}

// Update the submitCafeForm function
function submitCafeForm(event) {
    event.preventDefault();
    
    if (!selectedPlace) {
        alert('Please select a place from the suggestions');
        return;
    }

    // Get all the ratings (now optional)
    const ratings = {};
    const ratingFields = ['wifi', 'power', 'vibe', 'coffee', 'food'];
    ratingFields.forEach(field => {
        const selectedOption = document.querySelector(`input[name="${field}"]:checked`);
        // Only include rating if it was selected
        if (selectedOption) {
            ratings[field] = selectedOption.value;  // Now directly using 0 or 1
        }
    });

    // Get WiFi password
    const wifiPassword = document.querySelector('#wifi_password').value.trim();

    const data = {
        name: selectedPlace.name,
        lat: selectedPlace.lat,
        lng: selectedPlace.lng,
        address: selectedPlace.address,
        ratings: ratings,
        wifi_password: wifiPassword
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
            
            // Create or update marker
            if (data.isNewPlace) {
                // Create new marker with properly structured data
                const cafeData = {
                    id: data.id,
                    name: data.savedData.name,
                    address: data.savedData.address,
                    lat: data.savedData.lat,
                    lng: data.savedData.lng,
                    ratings: data.savedData.ratings,
                    total_ratings: 1
                };
                
                // Create new marker
                createRatedCafeMarker(cafeData).then(marker => {
                    marker.cafeId = data.id;
                    allMarkers.push(marker);
                    // Store the marker reference in selectedPlace
                    selectedPlace = {
                        ...cafeData,
                        marker: marker
                    };
                    // Close any existing info window
                    infoWindow.close();
                    
                    // Pan to the new marker
                    map.panTo({ lat: cafeData.lat, lng: cafeData.lng });
                    
                    // Reopen popup after a short delay
                    setTimeout(() => {
                        google.maps.event.trigger(marker, 'click');
                    }, 300);
                });
            } else {
                // Update existing marker
                const existingMarker = allMarkers.find(m => m.cafeId === data.id);
                if (existingMarker) {
                    // Update marker info window content
                    google.maps.event.trigger(existingMarker, 'click');
                }
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

// Update the loadExistingCafes function
function loadExistingCafes() {
    // Clear all existing markers
    allMarkers.forEach(marker => {
        marker.setMap(null);
    });
    allMarkers = [];
    
    console.log('Loading existing cafés...');
    fetch('api/get_cafes.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Loaded cafés:', data.cafes.length);
                data.cafes.forEach(async cafe => {
                    const cafeData = {
                        id: cafe.id,
                        name: cafe.name,
                        address: cafe.address,
                        lat: parseFloat(cafe.latitude),
                        lng: parseFloat(cafe.longitude),
                        total_ratings: parseInt(cafe.total_ratings) || 0,
                        wifi_password: cafe.wifi_password,
                        ratings: {
                            wifi: cafe.wifi_rating,
                            power: cafe.power_rating,
                            vibe: cafe.quiet_rating,
                            coffee: cafe.coffee_rating,
                            food: cafe.food_rating
                        }
                    };
                    
                    const marker = await createRatedCafeMarker(cafeData);
                    marker.cafeId = cafe.id;
                    allMarkers.push(marker);
                });
            } else {
                console.error('Error loading cafés:', data.error);
            }
        })
        .catch(error => console.error('Error:', error));
}

// Update the createRatedCafeMarker function
async function createRatedCafeMarker(cafe) {
    // Create the marker with custom element
    const marker = new google.maps.Marker({
        map,
        position: { lat: cafe.lat, lng: cafe.lng },
        title: cafe.name,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: '#1a73e8',
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#ffffff',
            scale: 14,
            labelOrigin: new google.maps.Point(0, 0)
        },
        label: {
            text: '\uf109',  // Font Awesome laptop icon
            fontFamily: 'FontAwesome',
            color: '#ffffff',
            fontSize: '14px'
        }
    });

    // Add click listener
    marker.addListener('click', (e) => {
        // Store the marker reference in the cafe object
        cafe.marker = marker;
        
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
                    marker: marker,  // Include marker reference
                    types: results[0].types
                };
                const content = generatePopupContent(enrichedCafe);
                infoWindow.setContent(content);
                infoWindow.setPosition({ lat: cafe.lat, lng: cafe.lng });
                infoWindow.open(map);
                
                // Add click handler for rate button
                setTimeout(() => {
                    const rateBtn = document.querySelector('.rate-btn');
                    if (rateBtn) {
                        rateBtn.addEventListener('click', () => {
                            showRatingForm(enrichedCafe);
                        });
                    }
                }, 100);
            } else {
                // Fallback to our cafe data if Google search fails
                const content = generatePopupContent(cafe);
                infoWindow.setContent(content);
                infoWindow.setPosition({ lat: cafe.lat, lng: cafe.lng });
                infoWindow.open(map);
            }
        });
    });

    return marker; // Return the marker so we can track it
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
                // Get current map center
                const center = map.getCenter();
                
                // Create a 30-meter radius bounds
                const circle = new google.maps.Circle({
                    center: center,
                    radius: 30  // meters
                });
                
                const request = {
                    query: searchText,
                    bounds: circle.getBounds(),
                    locationBias: {
                        radius: 30,
                        center: center
                    }
                };

                service.textSearch(request, (results, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                        // Sort results by distance from center
                        results.sort((a, b) => {
                            const distA = google.maps.geometry.spherical.computeDistanceBetween(
                                center, 
                                a.geometry.location
                            );
                            const distB = google.maps.geometry.spherical.computeDistanceBetween(
                                center, 
                                b.geometry.location
                            );
                            return distA - distB;
                        });
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

// Update the showRatingForm function
function showRatingForm(cafe) {
    const form = document.querySelector('.ratings-form');
    if (!form) return;

    // Enable all radio inputs and show all options
    form.querySelectorAll('.rating-options-stack').forEach(stack => {
        stack.classList.add('rating');
        // Uncheck all radio inputs in this stack
        stack.querySelectorAll('input[type="radio"]').forEach(input => {
            input.checked = false;
            input.disabled = false;
        });
    });

    // Handle WiFi password field
    let wifiInput = form.querySelector('input[name="wifi_password"]');
    if (wifiInput) {
        // Make existing field editable
        wifiInput.readOnly = false;
        wifiInput.classList.remove('readonly-input');
        const copyIcon = form.querySelector('.copy-icon');
        if (copyIcon) {
            copyIcon.remove();
        }
    } else {
        // Create new WiFi field if it doesn't exist
        const wifiInfo = document.createElement('div');
        wifiInfo.className = 'wifi-info';
        wifiInfo.innerHTML = `
            <div class="wifi-password-input">
                <i class="fa-solid fa-key"></i>
                <input type="text" 
                       name="wifi_password" 
                       placeholder="WiFi Password"
                       maxlength="255">
            </div>
        `;
        const rateBtn = form.querySelector('.rate-btn');
        if (rateBtn) {
            form.insertBefore(wifiInfo, rateBtn);
        }
    }

    // Replace rate button with submit button
    const actionButtons = document.createElement('div');
    actionButtons.className = 'rating-actions';
    actionButtons.innerHTML = `
        <button type="button" class="submit-rating">Submit</button>
    `;
    
    const rateBtn = form.querySelector('.rate-btn');
    if (rateBtn) {
        rateBtn.replaceWith(actionButtons);
    }

    // Add event listener for submit
    const submitBtn = form.querySelector('.submit-rating');
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            // Get the ratings and submit them
            const ratings = {};
            const ratingFields = ['wifi', 'power', 'vibe', 'coffee', 'food'];
            ratingFields.forEach(field => {
                const selectedOption = form.querySelector(`input[name="${field}"]:checked`);
                if (selectedOption) {
                    ratings[field] = selectedOption.value;
                }
            });

            const wifiPassword = form.querySelector('input[name="wifi_password"]').value.trim();

            const data = {
                name: cafe.name,
                lat: cafe.lat,
                lng: cafe.lng,
                address: cafe.address,
                ratings: ratings,
                wifi_password: wifiPassword
            };

            submitRating(data, () => {
                loadExistingCafes();
                infoWindow.close();
            });
        });
    }
}

// Add this helper function to handle the submission
function submitRating(data, onSuccess) {
    fetch('api/save_cafe.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showNotification('success', 'Rating saved successfully');
            if (onSuccess) onSuccess();
        } else {
            showNotification('error', result.error || 'Failed to save rating');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('error', 'Failed to save rating');
    });
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

// Update the generatePopupContent function
function generatePopupContent(place) {
    // Helper function to get rating display value (0 or 1)
    function getRatingDisplay(rating) {
        return parseFloat(rating) >= 0.5 ? 1 : 0;
    }

    const placeId = place.id || (place.marker && place.marker.cafeId);
    
    return `
        <div class="popup-content">
            <div class="popup-header">
                <h3>${place.name}</h3>
                <div class="map-actions">
                    ${place.ratings ? `
                        <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place.name)}" 
                           target="_blank" class="map-link">
                            <i class="fa-solid fa-route"></i>
                        </a>
                        <button class="delete-btn" onclick="showDeleteConfirmation('${placeId}', '${place.name.replace(/'/g, "\\'")}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    ` : `
                        <a href="https://www.google.com/maps/search/${encodeURIComponent(place.name)}" 
                           target="_blank" class="map-link">
                            <i class="fa-solid fa-map-location-dot"></i>
                        </a>
                    `}
                </div>
            </div>
            <form class="ratings-form">
                <div class="rating-icons">
                    ${Object.entries(ratingOptions).map(([category, labels]) => `
                        <div class="rating-group" data-rating="${category}">
                            <div class="rating-options-stack">
                                <div class="rating-option ${place.ratings && getRatingDisplay(place.ratings[category]) === 1 ? 'selected' : ''}">
                                    <input type="radio" name="${category}" value="1" id="${category}_1"
                                           ${place.ratings && getRatingDisplay(place.ratings[category]) === 1 ? 'checked disabled' : ''}>
                                    <label for="${category}_1">
                                        ${category === 'wifi' ? `
                                            <i class="fa-solid fa-wifi"></i><i class="fa-solid fa-rocket"></i>
                                        ` : `
                                            <i class="fa-solid ${categoryIcons[category][1]}"></i>
                                        `}
                                    </label>
                                </div>
                                <div class="rating-option ${place.ratings && getRatingDisplay(place.ratings[category]) === 0 ? 'selected' : ''}">
                                    <input type="radio" name="${category}" value="0" id="${category}_0"
                                           ${place.ratings && getRatingDisplay(place.ratings[category]) === 0 ? 'checked disabled' : ''}>
                                    <label for="${category}_0">
                                        ${category === 'food' ? `
                                            <span class="fa-layers fa-fw">
                                                <i class="fa-solid fa-burger"></i>
                                                <i class="fa-solid fa-slash"></i>
                                            </span>
                                        ` : `
                                            <i class="fa-solid ${categoryIcons[category][0]}"></i>
                                        `}
                                    </label>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                ${place.ratings && place.wifi_password ? `
                    <div class="wifi-info">
                        <div class="wifi-password-input">
                            <i class="fa-solid fa-key"></i>
                            <input type="text" 
                                   name="wifi_password" 
                                   value="${place.wifi_password}"
                                   readonly
                                   class="readonly-input">
                            <i class="fa-regular fa-copy copy-icon" onclick="copyWifiPassword(this, '${place.wifi_password}')"></i>
                        </div>
                    </div>
                ` : ''}
                <button type="button" class="rate-btn">
                    <i class="fa-solid fa-star"></i> Rate This Place
                </button>
            </form>
        </div>
    `;
}

// Check if the app is running in standalone mode
function isRunningStandalone() {
    return (window.navigator.standalone === true) || // iOS
           (window.matchMedia('(display-mode: standalone)').matches); // Other browsers
}

// Show/hide install prompt
function updateInstallPrompt() {
    const prompt = document.getElementById('installPrompt');
    if (prompt) {
        if (!isRunningStandalone() && (isIOS() || isAndroid())) {
            prompt.classList.remove('hidden');
        } else {
            prompt.classList.add('hidden');
        }
    }
}

// Call this when the page loads
document.addEventListener('DOMContentLoaded', updateInstallPrompt);

function showInstallInstructions() {
    document.getElementById('installInstructions').classList.remove('hidden');
}

function hideInstallInstructions() {
    document.getElementById('installInstructions').classList.add('hidden');
}

function isIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isAndroid() {
    return /Android/i.test(navigator.userAgent);
}

function isSafari() {
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isChrome = ua.includes('CriOS');
    const isFirefox = ua.includes('FxiOS');
    const isEdge = ua.includes('EdgiOS');
    const isOtherBrowser = isChrome || isFirefox || isEdge;
    return isIOS && !isOtherBrowser;
}

function isOtherIOSBrowser() {
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isChrome = ua.includes('CriOS');
    const isFirefox = ua.includes('FxiOS');
    const isEdge = ua.includes('EdgiOS');
    return isIOS && (isFirefox || isEdge);  // Exclude Chrome since it can install
}

function handleInstallClick() {
    if (isAndroid()) {
        showInstallInstructions();
        document.getElementById('safariInstructions').classList.add('hidden');
        document.getElementById('nonSafariInstructions').classList.add('hidden');
        document.getElementById('chromeInstructions').classList.add('hidden');
        document.getElementById('androidInstructions').classList.remove('hidden');
    } else if (isIOS()) {
        const isChrome = /CriOS/.test(navigator.userAgent);
        showInstallInstructions();
        document.getElementById('safariInstructions').classList.toggle(!isChrome);
        document.getElementById('chromeInstructions').classList.toggle(isChrome);
        document.getElementById('nonSafariInstructions').classList.add('hidden');
        document.getElementById('androidInstructions').classList.add('hidden');
    } else if (isOtherIOSBrowser()) {
        showInstallInstructions();
        document.getElementById('safariInstructions').classList.add('hidden');
        document.getElementById('chromeInstructions').classList.add('hidden');
        document.getElementById('nonSafariInstructions').classList.remove('hidden');
        document.getElementById('androidInstructions').classList.add('hidden');
    }
}

function copyUrl() {
    navigator.clipboard.writeText('https://www.pleasant-tech.com/ltbff/')
        .then(() => {
            const copyButton = document.querySelector('.copy-button i');
            const originalIcon = copyButton.className;
            
            // Change to checkmark
            copyButton.className = 'fa-solid fa-check';
            
            // Change back after 1.5 seconds
            setTimeout(() => {
                copyButton.className = originalIcon;
            }, 1500);
            
            showNotification('success', 'URL copied to clipboard');
        })
        .catch(() => {
            showNotification('error', 'Could not copy URL');
        });
}

function showDeleteConfirmation(placeId, placeName) {
    console.log("Showing delete confirmation for place:", placeId, placeName);
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.innerHTML = `
        <h3>Remove ${placeName}?</h3>
        <p>This action cannot be undone.</p>
        <div class="actions">
            <button class="cancel-btn" onclick="this.closest('.confirm-dialog').remove()">Cancel</button>
            <button class="delete-btn" onclick="deletePlace(${placeId})">Remove</button>
        </div>
    `;
    document.body.appendChild(dialog);
}

function deletePlace(placeId) {
    console.log("Attempting to delete place:", placeId);
    
    const formData = new FormData();
    formData.append('id', placeId);

    fetch('api/delete_cafe.php', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        console.log("Raw response:", response);
        return response.json();
    })
    .then(data => {
        console.log("Delete response:", data);
        if (data.success) {
            document.querySelector('.confirm-dialog').remove();
            infoWindow.close();
            
            // Remove the marker from the map
            if (selectedPlace && selectedPlace.marker) {
                console.log("Removing marker from map");
                selectedPlace.marker.setMap(null);
                selectedPlace = null;
            }
            
            // Force reload of cafes
            loadExistingCafes();
            
            showNotification('success', 'Place removed successfully');
        } else {
            showNotification('error', data.error || 'Failed to remove place');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('error', 'Failed to remove place');
    });
}

// Add this function to check browser support
function supportsAnimation() {
    const elem = document.createElement('div');
    const supported = typeof elem.style.transform !== 'undefined' && 
                      typeof elem.style.transition !== 'undefined';
    return supported;
}


// Add this after the supportsAnimation check
window.addEventListener('load', () => {
    const splash = document.getElementById('splashScreen');
    if (supportsAnimation()) {
        splash.style.transform = 'scale(1) rotate(0)';
        splash.style.opacity = '1';
        splash.style.transformOrigin = '48px calc(100% - 58px)';
        splash.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
    }
});

// Update the showInfoScreen function
function showInfoScreen() {
    const splash = document.getElementById('splashScreen');
    const infoBtn = document.querySelector('.info-btn');
    
    if (supportsAnimation()) {
        // First set initial state
        splash.style.transformOrigin = '48px calc(100% - 58px)';
        splash.style.transform = 'scale(0)';
        
        // Force a reflow to ensure initial state is applied
        splash.offsetHeight;
        
        // Set transition
        splash.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        
        // Then remove hidden class
        splash.classList.remove('hidden');
        
        // Finally, set the final state
        requestAnimationFrame(() => {
            splash.style.transform = 'scale(1)';
        });
        
        infoBtn.classList.add('active');
    }
}

// Update the hideSplashScreen function
function hideSplashScreen() {
    const splash = document.getElementById('splashScreen');
    const infoBtn = document.querySelector('.info-btn');
    
    if (supportsAnimation()) {
        splash.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        splash.style.transform = 'scale(0)';
        
        setTimeout(() => {
            splash.classList.add('hidden');
        }, 400);
    } else {
        splash.classList.add('hidden');
    }
    
    infoBtn.classList.remove('active');
}

// Add helper function to copy WiFi password
function copyWifiPassword(element, password) {
    navigator.clipboard.writeText(password).then(() => {
        const copyIcon = element.querySelector('i');
        copyIcon.className = 'fa-solid fa-check';
        setTimeout(() => {
            copyIcon.className = 'fa-regular fa-copy';
        }, 1500);
        showNotification('success', 'WiFi password copied to clipboard');
    }).catch(() => {
        showNotification('error', 'Failed to copy WiFi password');
    });
}
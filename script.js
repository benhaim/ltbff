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
            zoom: 19,
            center: location,
            disableDefaultUI: true,
            zoomControl: false,
            gestureHandling: "greedy",
            scrollwheel: true,
            draggable: true,
            keyboardShortcuts: false,
            minZoom: 3,
            maxZoom: 20,
            styles: [
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
                    elementType: "labels.text.fill",
                    stylers: [{ color: "#d59563" }],
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
                    featureType: "poi",
                    elementType: "labels",
                    stylers: [{ visibility: "off" }]  // Hide all POIs by default
                },
                {
                    featureType: "poi.business",
                    elementType: "labels",
                    stylers: [{ visibility: "on" }]  // Show businesses
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
                    stylers: [{ visibility: "off" }]  // Hide religious places
                }
            ]
        });

        // Add user location marker after map is initialized
        if (location !== defaultLocation) {
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
            // If button is disabled, ignore the click
            if (locationBtn.disabled) {
                return;
            }
            
            if (navigator.geolocation) {
                locationBtn.disabled = true;  // Disable button during geolocation
                
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const pos = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        };
                        // First pan to location
                        map.panTo(pos);
                        
                        // Wait for pan to complete before zooming
                        google.maps.event.addListenerOnce(map, 'idle', () => {
                            if (map.getZoom() !== 19) {
                                map.setZoom(19);
                            }
                            locationBtn.disabled = false;
                        });
                    },
                    () => {
                        locationBtn.disabled = false;
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
                <div class="map-actions">
                    ${!place.ratings ? `
                    <a href="https://www.google.com/maps/search/${place.place_id ? 
                        `place/?q=place_id:${place.place_id}` : 
                        encodeURIComponent(place.name)}" 
                       target="_blank" 
                       class="map-link"
                       title="Open in Google Maps">
                        <i class="fa-solid fa-map-location-dot"></i>
                    </a>
                    ` : ''}
                    ${place.ratings ? `
                    <a href="https://www.google.com/maps/dir/?api=1&destination=${
                        encodeURIComponent(place.name)}&destination_place_id=${place.place_id || ''}" 
                       target="_blank"
                       class="map-link"
                       title="Get Directions">
                        <i class="fa-solid fa-route"></i>
                    </a>
                    ` : ''}
                </div>
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

function handleInstallClick() {
    if (isAndroid()) {
        showInstallInstructions();
        document.getElementById('safariInstructions').classList.add('hidden');
        document.getElementById('nonSafariInstructions').classList.add('hidden');
        document.getElementById('androidInstructions').classList.remove('hidden');
    } else if (isSafari()) {
        showInstallInstructions();
        document.getElementById('safariInstructions').classList.remove('hidden');
        document.getElementById('nonSafariInstructions').classList.add('hidden');
        document.getElementById('androidInstructions').classList.add('hidden');
    } else if (isIOS()) {
        showInstallInstructions();
        document.getElementById('safariInstructions').classList.add('hidden');
        document.getElementById('nonSafariInstructions').classList.remove('hidden');
        document.getElementById('androidInstructions').classList.add('hidden');
        
        // Display the current URL
        const urlDisplay = document.getElementById('urlToCopy');
        if (urlDisplay) {
            const safariUrl = 'https://www.pleasant-tech.com/ltbff/';
            urlDisplay.textContent = safariUrl;
        }
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
// Global variables
let map;
let service;
let infoWindow;
let autocomplete;
let selectedPlace = null;
let allMarkers = [];

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
            zoomControl: false,
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

    // Add after initMap is done initializing
    document.getElementById('addBtn').addEventListener('click', () => {
        if (!service) {
            console.error('Places service not initialized');
            return;
        }

        const center = map.getCenter();
        
        const request = {
            query: 'cafe',
            fields: ['name', 'geometry', 'formatted_address', 'types'],
            locationBias: {
                center: center,
                radius: 100  // Search within 100 meters
            }
        };

        try {
            service.findPlaceFromQuery(request, (results, status) => {
                console.log('Search status:', status);
                console.log('Results:', results);
                
                if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                    // Get the nearest place
                    const nearestPlace = results[0];
                    
                    // Zoom and pan to it
                    map.setZoom(20);  // Maximum zoom
                    map.panTo(nearestPlace.geometry.location);
                    
                    // Show place details in info window
                    infoWindow.setContent(generatePopupContent(nearestPlace));
                    infoWindow.setPosition(nearestPlace.geometry.location);
                    infoWindow.open(map);
                } else {
                    console.log('No places found or service error');
                    showNotification('error', 'No places found nearby');
                }
            });
        } catch (error) {
            console.error('Places API error:', error);
            showNotification('error', 'Failed to search nearby places');
        }
    });

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

// Update the generateRatingGroups function
function generateRatingGroups() {
    const container = document.querySelector('.ratings-container');
    if (container) {
        console.log('Generating rating groups...');
        container.innerHTML = ''; // Clear existing content

        // First add all rating groups
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

        // Add WiFi password input at the bottom
        const wifiPasswordGroup = document.createElement('div');
        wifiPasswordGroup.className = 'wifi-password-group';
        wifiPasswordGroup.innerHTML = `
            <div class="wifi-password-input">
                <i class="fa-solid fa-key"></i>
                <input type="text" 
                       name="wifi_password" 
                       id="wifi_password" 
                       placeholder="WiFi Password"
                       maxlength="255">
            </div>
        `;
        container.appendChild(wifiPasswordGroup);
    } else {
        console.error('Ratings container not found');
    }
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
    const ratingFields = ['wifi', 'power', 'quiet', 'coffee', 'food'];
    ratingFields.forEach(field => {
        const selectedOption = document.querySelector(`input[name="${field}"]:checked`);
        // Only include rating if it was selected
        if (selectedOption) {
            ratings[field] = selectedOption.value;
        } else {
            ratings[field] = "1";  // Default value if not rated
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
                        total_ratings: parseInt(cafe.total_ratings) || 1,
                        wifi_password: cafe.wifi_password,
                        ratings: {
                            wifi: Math.round(parseFloat(cafe.wifi_rating)) || 1,
                            power: Math.round(parseFloat(cafe.power_rating)) || 1,
                            quiet: Math.round(parseFloat(cafe.quiet_rating)) || 1,
                            coffee: Math.round(parseFloat(cafe.coffee_rating)) || 1,
                            food: Math.round(parseFloat(cafe.food_rating)) || 1
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

    // Add close button to form header
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'form-close-btn';
    closeBtn.innerHTML = '<i class="fa-solid fa-times"></i>';
    closeBtn.onclick = () => {
        addCafeForm.classList.add('hidden');
        addCafeForm.classList.remove('visible');
    };

    // Add close button to form header
    const formHeader = addCafeForm.querySelector('h2').parentElement;
    formHeader.style.position = 'relative';
    formHeader.appendChild(closeBtn);

    // Update submit button
    const submitBtn = cafeForm.querySelector('button[type="submit"]');
    submitBtn.className = 'form-submit-btn';
    submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';

    // Remove existing cancel button
    const existingCancelBtn = document.getElementById('cancelBtn');
    if (existingCancelBtn) {
        existingCancelBtn.remove();
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
    // Helper function to get a friendly place type
    function getPlaceType(place) {
        if (place.types && place.types.length > 0) {
            return place.types[0].split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }
        return 'Place';
    }

    // Get the ID from the database record if it exists
    const placeId = place.id || (place.marker && place.marker.cafeId);
    
    console.log("Generating popup content for place:", place);
    console.log("Place ID:", placeId);

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
                    <button class="delete-btn" onclick="showDeleteConfirmation('${placeId}', '${place.name.replace(/'/g, "\\'")}')" title="Remove this place">
                        <i class="fa-solid fa-trash"></i>
                    </button>
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
            ${place.ratings && place.wifi_password ? `
                <div class="wifi-info">
                    <span class="wifi-password" onclick="copyWifiPassword(this, '${place.wifi_password}')" title="Click to copy">
                        <i class="fa-solid fa-key"></i>
                        ${place.wifi_password}
                        <i class="fa-regular fa-copy"></i>
                    </span>
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
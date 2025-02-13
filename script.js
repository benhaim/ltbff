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
function initMap() {
    console.log('Initializing map...');
    
    // Default to Chiang Mai coordinates
    const defaultLocation = { lat: 18.7883, lng: 98.9853 };
    
    try {
        // Create the map with custom styling
        map = new google.maps.Map(document.getElementById("map"), {
            zoom: 15,
            center: defaultLocation,
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

        // Create InfoWindow for markers
        infoWindow = new google.maps.InfoWindow({
            pixelOffset: new google.maps.Size(0, -5),  // Adjust the vertical offset
            disableAutoPan: true
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

        // Try to get user's location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    console.log('Got user location:', pos);
                    map.setCenter(pos);
                    // Temporarily disable places search
                    // searchNearbyCafes(pos);
                },
                () => {
                    console.log('Geolocation failed, using default location');
                    // Temporarily disable places search
                    // searchNearbyCafes(defaultLocation);
                }
            );
        } else {
            console.log('Geolocation not available, using default location');
            // Temporarily disable places search
            // searchNearbyCafes(defaultLocation);
        }

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
                    fields: ['name', 'formatted_address', 'geometry']
                };

                service.getDetails(request, (place, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK) {
                        // Create our custom popup
                        const content = `
                            <div class="popup-content">
                                <h3>${place.name}</h3>
                                <p>${place.formatted_address}</p>
                                <button class="rate-btn">
                                    <i class="fa-solid fa-star"></i> Rate This Place
                                </button>
                            </div>
                        `;

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

        // Add info icon
        const infoIcon = document.createElement('div');
        infoIcon.className = 'info-icon';
        infoIcon.innerHTML = `<i class="fa-solid fa-info-circle"></i>`;
        infoIcon.addEventListener('click', () => {
            alert('WiFi: Rate the quality of WiFi\nPower: Rate the availability of power outlets\nQuiet: Rate the quietness of the place\nCoffee: Rate the quality of coffee\nFood: Rate the food options available');
        });
        container.appendChild(infoIcon);
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

// Add this function to create markers for our rated cafes
async function createRatedCafeMarker(cafe) {
    // Import the marker library
    const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");

    // Create a custom pin element
    const pinElement = new PinElement({
        background: "#4CAF50",
        borderColor: "#3d8b40",
        glyphColor: "white",
        scale: 1.2
    });

    // Create the marker
    const marker = new AdvancedMarkerElement({
        map,
        position: { lat: cafe.lat, lng: cafe.lng },
        title: cafe.name,
        content: pinElement.element
    });

    // Add click listener
    marker.addListener('click', (e) => {
        e.stop();
        
        const content = `
            <div class="popup-content">
                <h3>${cafe.name}</h3>
                <p>${cafe.address}</p>
                <div class="quick-ratings">
                    ${Object.entries(cafe.ratings).map(([category, rating]) => `
                        <div class="rating-item" title="${category}">
                            <i class="fa-solid ${categoryIcons[category]}"></i>
                            <span class="rating-value rating-level-${rating}">${rating}/3</span>
                        </div>
                    `).join('')}
                </div>
                <button class="rate-btn">
                    <i class="fa-solid fa-star"></i> Rate This Place
                </button>
            </div>
        `;

        infoWindow.setContent(content);
        infoWindow.setPosition({ lat: cafe.lat, lng: cafe.lng });
        infoWindow.open(map);

        // Add click handler for rate button
        setTimeout(() => {
            const rateBtn = document.querySelector('.rate-btn');
            if (rateBtn) {
                rateBtn.addEventListener('click', () => {
                    showRatingForm(cafe);
                });
            }
        }, 100);
    });
}

// Add this function to show detailed ratings
function showDetailedRatings(cafe) {
    console.log('Showing detailed ratings for:', cafe);
    
    // Remove any existing panel first
    const existingPanel = document.querySelector('.details-panel');
    if (existingPanel) {
        existingPanel.remove();
    }

    // Create overlay for outside clicks
    const overlay = document.createElement('div');
    overlay.className = 'panel-overlay';
    
    const panel = document.createElement('div');
    panel.className = 'details-panel';
    
    panel.innerHTML = `
        <div class="panel-header">
            <button class="back-btn">
                <i class="fa-solid fa-chevron-right"></i>
            </button>
            <h2>${cafe.name}</h2>
        </div>
        <div class="panel-content">
            <p class="cafe-address">${cafe.address || 'No address provided'}</p>
            
            <div class="detailed-ratings">
                ${Object.entries(cafe.ratings).map(([category, rating]) => `
                    <div class="rating-detail">
                        <div class="rating-header">
                            <i class="fa-solid ${categoryIcons[category]}"></i>
                            <span class="category-name">${category}: ${ratingLabels[category][Math.round(rating)-1]}</span>
                        </div>
                        <div class="rating-value rating-level-${Math.round(rating)}">
                            ${rating}/3
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="rating-footer">
                <i class="fa-solid fa-chart-simple"></i>
                Based on ${cafe.total_ratings || 1} rating${cafe.total_ratings !== 1 ? 's' : ''}
            </div>

            <button class="rate-btn">
                <i class="fa-solid fa-star"></i> Rate This Place
            </button>
        </div>
    `;
    
    // Add to DOM
    document.body.appendChild(overlay);
    document.body.appendChild(panel);
    
    function closePanel() {
        panel.classList.add('slide-out');
        overlay.classList.add('fade-out');
        setTimeout(() => {
            panel.remove();
            overlay.remove();
        }, 300);
    }
    
    // Close handlers
    overlay.addEventListener('click', closePanel);
    panel.querySelector('.back-btn').addEventListener('click', closePanel);
    
    // Add rate button handler
    panel.querySelector('.rate-btn').onclick = () => {
        showRatingForm(cafe);
    };

    // Force a reflow to trigger animation
    panel.offsetHeight;
    overlay.offsetHeight;
    panel.style.transform = 'translateX(0)';
    overlay.style.opacity = '1';
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
                    const content = `
                        <div class="popup-content">
                            <h3>${selectedPlace.name}</h3>
                            <p>${selectedPlace.address}</p>
                            <button class="rate-btn">
                                <i class="fa-solid fa-star"></i> Rate This Place
                            </button>
                        </div>
                    `;

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

        // Add to initializeAutocomplete
        const backButton = document.querySelector('.back-button');
        if (backButton) {
            backButton.addEventListener('click', () => {
                document.getElementById('searchBox').classList.add('hidden');
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
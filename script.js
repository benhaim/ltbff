console.log('=== MAPBOX VERSION 7 ===');
console.log('Script loaded at:', new Date().toISOString());
 
// First, declare variables we'll need globally (only once)
let map;
const cafes = [];

// Add this near the top with other global variables
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

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing elements');
    
    // Get DOM elements
    const addCafeBtn = document.getElementById('addCafeBtn');
    const addCafeForm = document.getElementById('addCafeForm');
    const cafeForm = document.getElementById('cafeForm');
    const cancelBtn = document.getElementById('cancelBtn');

    console.log('Elements found:', {
        addCafeBtn: !!addCafeBtn,
        addCafeForm: !!addCafeForm,
        cafeForm: !!cafeForm,
        cancelBtn: !!cancelBtn
    });

    // Initialize form controls
    if (addCafeBtn && addCafeForm) {
        addCafeBtn.addEventListener('click', () => {
            console.log('Add button clicked');
            addCafeForm.classList.remove('hidden');
            addCafeForm.classList.add('visible');
        });
    }

    if (cancelBtn && addCafeForm) {
        cancelBtn.addEventListener('click', () => {
            console.log('Cancel button clicked');
            addCafeForm.classList.add('hidden');
            addCafeForm.classList.remove('visible');
            // Clear the form
            if (cafeForm) cafeForm.reset();
        });
    }

    // Initialize star ratings
    initializeStarRatings();

    // Initialize form submission
    if (cafeForm) {
        cafeForm.onsubmit = function(e) {
            e.preventDefault();
            console.log('Form submitted!');
            
            // Get the selected place data
            const selectedPlaceData = cafeForm.dataset.selectedPlace;
            if (!selectedPlaceData) {
                alert('Please select a place from the search results');
                return;
            }

            const selectedPlace = JSON.parse(selectedPlaceData);
            
            // Get all ratings
            const ratings = {};
            document.querySelectorAll('.star-rating').forEach(container => {
                const ratingType = container.dataset.rating;
                ratings[ratingType] = parseInt(container.dataset.currentRating || 0);
            });

            const newCafe = {
                name: selectedPlace.name,
                lat: selectedPlace.lat,
                lng: selectedPlace.lng,
                address: selectedPlace.address,
                ratings: ratings
            };

            console.log('Sending place data:', newCafe);

            // Send to server
            fetch('api/save_cafe.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newCafe)
            })
            .then(response => response.json())
            .then(data => {
                console.log('Server response:', data);
                if (data.success) {
                    // Create success popup
                    showSuccessPopup(data);
                    
                    // Add marker
                    const marker = L.marker([newCafe.lat, newCafe.lng])
                        .bindPopup(createPopupContent(newCafe))
                        .addTo(map);
                    
                    // Close form
                    cancelBtn.click();
                } else {
                    showErrorPopup(data);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error adding café. Please try again.');
            });
        };
    }
});

// This function will be called when libraries are loaded
window.initializeMap = function() {
    console.log('Initializing map...');
    
    try {
        // Initialize the map
        map = L.map('map');
        console.log('Map object created');

        L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
            attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a>',
            id: 'mapbox/light-v10',  // Clean, minimal style
            tileSize: 512,
            zoomOffset: -1,
            accessToken: 'pk.eyJ1IjoiYmVuaGFpbSIsImEiOiJjbTZzOG5zcG0wNWs0MmtwbXczdzNoa2VyIn0.jrguuuUfDMXs9vbMTk7kKg'
        }).addTo(map);
        console.log('Tile layer added');

        // Get user's location and center map
        if ("geolocation" in navigator) {
            console.log('Getting user location...');
            navigator.geolocation.getCurrentPosition(
                position => {
                    const { latitude, longitude } = position.coords;
                    console.log('User location:', latitude, longitude);
                    map.setView([latitude, longitude], 15);
                },
                error => {
                    console.log('Geolocation error:', error);
                    // Default to Chiang Mai if geolocation fails
                    map.setView([18.7883, 98.9853], 15);
                }
            );
        } else {
            console.log('Geolocation not available');
            map.setView([18.7883, 98.9853], 15);
        }

        console.log('Map initialization complete');
        
        // Load existing cafes after map is initialized
        loadExistingCafes();
        
        // Initialize autocomplete after map is ready
        initAutocomplete();
    } catch (error) {
        console.error('Error initializing map:', error);
    }
};

// Initialize star ratings
function initializeStarRatings() {
    document.querySelectorAll('.star-rating').forEach(container => {
        // Clear existing stars first
        container.innerHTML = '';
        
        // Add 3 stars instead of 5
        for (let i = 1; i <= 3; i++) {
            const star = document.createElement('span');
            star.className = 'star';
            star.innerHTML = '☆';
            star.dataset.value = i;
            
            star.onclick = function() {
                const stars = this.parentElement.children;
                let rating = this.dataset.value;
                
                // Update stars display
                Array.from(stars).forEach(s => {
                    s.innerHTML = s.dataset.value <= rating ? '★' : '☆';
                    s.classList.toggle('active', s.dataset.value <= rating);
                });
                
                // Store rating value
                this.parentElement.dataset.currentRating = rating;
            };
            
            container.appendChild(star);
        }
    });
}

function initAutocomplete() {
    console.log('Initializing autocomplete...');
    const input = document.getElementById('cafeName');
    console.log('Input element:', input);
    
    if (!window.google || !google.maps || !google.maps.places) {
        console.error('Google Places API not loaded');
        return;
    }

    try {
        const service = new google.maps.places.PlacesService(document.createElement('div'));
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
            console.log('Search text:', searchText);

            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }

            if (!searchText || searchText.length < 2) {
                resultsContainer.style.display = 'none';
                return;
            }

            searchTimeout = setTimeout(() => {
                const location = map.getCenter();
                
                const request = {
                    query: searchText,
                    location: new google.maps.LatLng(location.lat, location.lng),
                    radius: 10000
                };

                service.textSearch(request, (results, status) => {
                    console.log('Search status:', status);
                    console.log('Results:', results);

                    if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                        showResults(results, resultsContainer);
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

            places.slice(0, 5).forEach(place => {
                const div = document.createElement('div');
                div.className = 'search-result-item';
                
                div.innerHTML = `
                    <div class="place-name">${place.name}</div>
                    <div class="place-address">${place.formatted_address || ''}</div>
                `;
                
                div.onclick = () => {
                    input.value = place.name;
                    container.style.display = 'none';

                    const selectedPlace = {
                        name: place.name,
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng(),
                        address: place.formatted_address
                    };

                    document.getElementById('cafeForm').dataset.selectedPlace = JSON.stringify(selectedPlace);
                    
                    // Center map on selected place
                    map.setView([selectedPlace.lat, selectedPlace.lng], 18);

                    // Add temporary marker
                    if (window.tempMarker) {
                        map.removeLayer(window.tempMarker);
                    }
                    window.tempMarker = L.marker([selectedPlace.lat, selectedPlace.lng])
                        .addTo(map)
                        .bindPopup(selectedPlace.name)
                        .openPopup();
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

    } catch (error) {
        console.error('Error initializing search:', error);
        console.error('Error details:', error.message);
    }
}

function createPopupContent(cafe) {
    const popupContent = document.createElement('div');
    popupContent.className = 'popup-content';
    
    popupContent.innerHTML = `
        <h3>${cafe.name}</h3>
        <div class="quick-ratings">
            ${Object.entries(cafe.ratings).map(([category, rating]) => `
                <div class="rating-item" title="${category}">
                    <i class="fa-solid ${categoryIcons[category]}"></i>
                    <span class="rating-value rating-level-${rating}">${rating}/3</span>
                </div>
            `).join('')}
        </div>
        <button class="details-btn">
            <i class="fa-solid fa-circle-info"></i> More Details
        </button>
    `;
    
    // Add click handler to the button
    const detailsBtn = popupContent.querySelector('.details-btn');
    detailsBtn.addEventListener('click', () => showDetailedRatings(cafe));
    
    return popupContent;
}

// Separate detailed view in a side panel
function showDetailedRatings(cafe) {
    // Remove any existing panel first
    const existingPanel = document.querySelector('.details-panel');
    if (existingPanel) existingPanel.remove();

    const panel = document.createElement('div');
    panel.className = 'details-panel';
    panel.innerHTML = `
        <div class="panel-header">
            <h2>${cafe.name}</h2>
            <button class="close-btn">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
        <div class="panel-content">
            <p class="cafe-address">${cafe.address || 'No address provided'}</p>
            
            <div class="detailed-ratings">
                ${Object.entries(cafe.ratings).map(([category, rating]) => `
                    <div class="rating-detail">
                        <div class="rating-header">
                            <i class="fa-solid ${categoryIcons[category]}"></i>
                            <span class="category-name">${ratingLabels[category][rating-1]}</span>
                        </div>
                        <div class="rating-value rating-level-${rating}">
                            ${rating}/3
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="rating-footer">
                <i class="fa-solid fa-chart-simple"></i>
                Based on ${cafe.total_ratings || 1} rating${cafe.total_ratings !== 1 ? 's' : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(panel);
    
    // Add close button handler
    panel.querySelector('.close-btn').onclick = () => {
        panel.classList.add('slide-out');
        setTimeout(() => panel.remove(), 300); // Match animation duration
    };
}

function showSuccessPopup(data) {
    // Update the marker's popup content for the rated place
    if (window.tempMarker) {
        map.removeLayer(window.tempMarker);
    }

    // Find and update the existing marker
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
            const markerLatLng = layer.getLatLng();
            if (markerLatLng.lat === data.savedData.lat && 
                markerLatLng.lng === data.savedData.lng) {
                // Update popup content
                layer.setPopupContent(createPopupContent(data.savedData));
                if (layer.isPopupOpen()) {
                    layer.openPopup();
                }
            }
        }
    });

    // Show success notification
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.innerHTML = `
        <i class="fa-solid fa-check"></i>
        Rating saved successfully
    `;
    
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remove after animation
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

function showErrorPopup(data) {
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.innerHTML = `
        <i class="fa-solid fa-xmark"></i>
        ${data.error || 'Error saving rating'}
    `;
    
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remove after animation
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Add this function near your other helper functions
function loadExistingCafes() {
    console.log('Loading existing cafés...');
    fetch('api/get_cafes.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Loaded cafés:', data.cafes.length);
                data.cafes.forEach(cafe => {
                    const cafeData = {
                        name: cafe.name,
                        address: cafe.address,
                        lat: cafe.latitude,  // Add these for re-rating
                        lng: cafe.longitude, // Add these for re-rating
                        total_ratings: parseInt(cafe.total_ratings) || 1,
                        ratings: {
                            wifi: Math.round(parseFloat(cafe.wifi_rating)) || 1,
                            power: Math.round(parseFloat(cafe.power_rating)) || 1,
                            quiet: Math.round(parseFloat(cafe.quiet_rating)) || 1,
                            coffee: Math.round(parseFloat(cafe.coffee_rating)) || 1,
                            food: Math.round(parseFloat(cafe.food_rating)) || 1
                        }
                    };
                    
                    const marker = L.marker([cafe.latitude, cafe.longitude])
                        .bindPopup(createPopupContent(cafeData))
                        .addTo(map);
                });
            } else {
                console.error('Error loading cafés:', data.error);
            }
        })
        .catch(error => console.error('Error:', error));
}
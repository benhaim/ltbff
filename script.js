console.log('=== MAPBOX VERSION 7 ===');
console.log('Script loaded at:', new Date().toISOString());
 
// First, declare variables we'll need globally (only once)
let map;
const cafes = [];

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
            addCafeForm.classList.remove('hidden');
            addCafeForm.classList.add('visible');
        });
    }

    if (cancelBtn && addCafeForm) {
        cancelBtn.addEventListener('click', () => {
            addCafeForm.classList.add('hidden');
            addCafeForm.classList.remove('visible');
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
        
        // Add 5 stars
        for (let i = 1; i <= 5; i++) {
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

        input.addEventListener('input', function() {
            const searchText = this.value;

            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }

            if (!searchText || searchText.length < 2) {
                resultsContainer.style.display = 'none';
                return;
            }

            input.classList.add('loading');

            searchTimeout = setTimeout(() => {
                const location = { lat: 18.7883, lng: 98.9853 }; // Chiang Mai coordinates
                
                const request = {
                    query: searchText,
                    location: new google.maps.LatLng(location.lat, location.lng),
                    radius: 10000
                };

                service.textSearch(request, (results, status) => {
                    input.classList.remove('loading');
                    console.log('Search status:', status);
                    console.log('Results:', results);

                    if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                        showResults(results);
                    } else {
                        resultsContainer.innerHTML = '<div class="search-result-item">No results found</div>';
                        resultsContainer.style.display = 'block';
                    }
                });
            }, 300);
        });

        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'search-results';
        input.parentNode.appendChild(resultsContainer);

        function showResults(places) {
            resultsContainer.innerHTML = '';
            resultsContainer.style.display = 'block';

            if (places.length === 0) {
                resultsContainer.innerHTML = '<div class="search-result-item">No results found</div>';
                return;
            }

            places.slice(0, 5).forEach(place => {
                const div = document.createElement('div');
                div.className = 'search-result-item';
                
                div.innerHTML = `
                    <div class="place-name">${place.name}</div>
                    <div class="place-address">${place.formatted_address || ''}</div>
                `;
                
                div.onclick = () => {
                    input.value = place.name;
                    resultsContainer.style.display = 'none';

                    const selectedPlace = {
                        name: place.name,
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng(),
                        address: place.formatted_address
                    };

                    cafeForm.dataset.selectedPlace = JSON.stringify(selectedPlace);
                    map.setView([selectedPlace.lat, selectedPlace.lng], 18);

                    L.marker([selectedPlace.lat, selectedPlace.lng])
                        .addTo(map)
                        .bindPopup(selectedPlace.name)
                        .openPopup();
                };

                resultsContainer.appendChild(div);
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
    const stars = (rating) => '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
    
    return `
        <div class="popup-content">
            <h3>${cafe.name}</h3>
            ${cafe.address ? `<p>${cafe.address}</p>` : ''}
            <div class="ratings">
                <p>WiFi: ${stars(cafe.ratings.wifi)} (${cafe.ratings.wifi.toFixed(1)})</p>
                <p>Power: ${stars(cafe.ratings.power)} (${cafe.ratings.power.toFixed(1)})</p>
                <p>Quiet: ${stars(cafe.ratings.quiet)} (${cafe.ratings.quiet.toFixed(1)})</p>
                <p>Coffee: ${stars(cafe.ratings.coffee)} (${cafe.ratings.coffee.toFixed(1)})</p>
                <p>Food: ${stars(cafe.ratings.food)} (${cafe.ratings.food.toFixed(1)})</p>
            </div>
            <p class="total-ratings">Based on ${cafe.total_ratings || 1} rating${cafe.total_ratings !== 1 ? 's' : ''}</p>
        </div>
    `;
}

function showSuccessPopup(data) {
    const successPopup = document.createElement('div');
    successPopup.style.position = 'fixed';
    successPopup.style.top = '50%';
    successPopup.style.left = '50%';
    successPopup.style.transform = 'translate(-50%, -50%)';
    successPopup.style.backgroundColor = '#4CAF50';
    successPopup.style.color = 'white';
    successPopup.style.padding = '20px';
    successPopup.style.borderRadius = '10px';
    successPopup.style.zIndex = '1000';
    successPopup.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    
    successPopup.innerHTML = `
        <h3>✅ Café Saved Successfully!</h3>
        <p><strong>${data.savedData.name}</strong></p>
        <p>${data.savedData.address}</p>
        <p>Ratings:</p>
        <ul>
            <li>WiFi: ${data.savedData.ratings.wifi}⭐</li>
            <li>Power: ${data.savedData.ratings.power}⭐</li>
            <li>Quiet: ${data.savedData.ratings.quiet}⭐</li>
            <li>Coffee: ${data.savedData.ratings.coffee}⭐</li>
            <li>Food: ${data.savedData.ratings.food}⭐</li>
        </ul>
        <p>ID in database: ${data.id}</p>
    `;
    
    document.body.appendChild(successPopup);
    
    setTimeout(() => {
        successPopup.remove();
    }, 5000);
}

function showErrorPopup(data) {
    const errorPopup = document.createElement('div');
    errorPopup.style.position = 'fixed';
    errorPopup.style.top = '50%';
    errorPopup.style.left = '50%';
    errorPopup.style.transform = 'translate(-50%, -50%)';
    errorPopup.style.backgroundColor = '#f44336';
    errorPopup.style.color = 'white';
    errorPopup.style.padding = '20px';
    errorPopup.style.borderRadius = '10px';
    errorPopup.style.zIndex = '1000';
    errorPopup.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    
    errorPopup.innerHTML = `
        <h3>❌ Error Saving Café</h3>
        <p>${data.error || 'Unknown error'}</p>
        ${data.sqlError ? `<p>SQL Error: ${JSON.stringify(data.sqlError)}</p>` : ''}
    `;
    
    document.body.appendChild(errorPopup);
    
    setTimeout(() => {
        errorPopup.remove();
    }, 5000);
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
                        ratings: {
                            wifi: parseInt(cafe.wifi_rating),
                            power: parseInt(cafe.power_rating),
                            quiet: parseInt(cafe.quiet_rating),
                            coffee: parseInt(cafe.coffee_rating),
                            food: parseInt(cafe.food_rating)
                        }
                    };
                    
                    // Update marker creation
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
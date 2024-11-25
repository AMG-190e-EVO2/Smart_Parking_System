require('dotenv').config();
let map;
let marker;

function initMap() {
    // Initialize map
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 0, lng: 0 },
        zoom: 2
    });

    // Add marker placeholder
    marker = new google.maps.Marker({
        map: map
    });

    // Search button event listener
    document.getElementById('search-button').addEventListener('click', function () {
        const searchInput = document.getElementById('search-input').value;
        searchLocation(searchInput);
    });
}

function searchLocation(query) {
    const geocoder = new google.maps.Geocoder();

    geocoder.geocode({ address: query }, function (results, status) {
        if (status === 'OK') {
            const location = results[0].geometry.location;

            // Center map on searched location
            map.setCenter(location);
            map.setZoom(15);

            // Update marker position
            marker.setPosition(location);
            marker.setTitle(results[0].formatted_address);

            // Scroll to map
            document.getElementById('map').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            alert('Geocode was not successful for the following reason: ' + status);
        }
    });
}

// Load Google Maps API script dynamically
function loadGoogleMapsApi() {
    const script = document.createElement('script');
    script.src = "https://maps.googleapis.com/maps/api/js?key=${process.env.GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMap";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
}

// Load the map when the window is ready
window.onload = loadGoogleMapsApi;

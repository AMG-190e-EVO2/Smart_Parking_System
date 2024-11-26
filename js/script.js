require('dotenv').config();
let map;
let marker;
let presidencyMarker;
let jssMarker;

function initMap() {
  // Initialize map
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 0, lng: 0 },
    zoom: 2
  });

  // Automatically fetch user's current location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        map.setCenter(userLocation);
        map.setZoom(15);

        new google.maps.Marker({
          position: userLocation,
          map: map,
          title: 'Your Current Location'
        });

        // Show nearby markers (Presidency University and JSS Public School)
        const presidencyLatLng = { lat: 13.1718, lng: 77.5362 }; // Replace with accurate coordinates
        const jssLatLng = { lat: 13.0258, lng: 77.6282 }; // Replace with accurate coordinates

        // Add markers to the map
        presidencyMarker = new google.maps.Marker({
          position: presidencyLatLng,
          map: map,
          title: 'Presidency Parking',
          icon: {
            url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' // Green marker
          }
        });

        jssMarker = new google.maps.Marker({
          position: jssLatLng,
          map: map,
          title: 'Parking Slot',
          icon: {
            url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' // Green marker
          }
        });

        // Initialize DirectionsService and DirectionsRenderer
        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({ map: map });

        // Add click listeners to markers for directions
        presidencyMarker.addListener('click', () => {
          calculateAndDisplayRoute(presidencyLatLng);
        });

        jssMarker.addListener('click', () => {
          calculateAndDisplayRoute(jssLatLng);
        });
      },
      (error) => {
        console.error('Error fetching current location:', error);
        alert('Unable to fetch your current location. Please ensure location access is enabled.');
      }
    );
  } else {
    alert('Geolocation is not supported by your browser.');
  }

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

      // Show Presidency University marker if the searched location is within a larger bounding box
      const presidencyBounds = new google.maps.LatLngBounds();
      presidencyBounds.extend(presidencyLatLng);
      presidencyBounds.extend({ lat: 13.1, lng: 77.6 }); // Expanded bounds to include nearby areas

      if (presidencyBounds.contains(location)) {
        // Ensure the marker is visible on the map
        presidencyMarker.setVisible(true);
        const infoWindow = new google.maps.InfoWindow({
          content: '<h3>Presidency Parking</h3><p>Presidency University</p>'
        });

        infoWindow.open(map, presidencyMarker);
      } else {
        // Hide the marker if the searched location is too far
        presidencyMarker.setVisible(false);
      }

      // ... (rest of the function)
    } else {
      alert('Geocode was not successful for the following reason: ' + status);
    }
  });
}

function calculateAndDisplayRoute(destination) {
  const origin = map.getCenter(); // Current user location

  const request = {
    origin: origin,
    destination: destination,
    travelMode: google.maps.TravelMode.DRIVING // You can change this to WALKING, BICYCLING, or TRANSIT
  };

  directionsService.route(request, function(response, status) {
    if (status === 'OK') {
      directionsRenderer.setDirections(response);
    } else {
      window.alert('Directions request failed due to ' + status);
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
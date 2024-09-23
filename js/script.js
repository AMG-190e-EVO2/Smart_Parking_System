const locationForm = document.getElementById('location-form');
const resultsContainer = document.getElementById('resultsContainer');
const mapContainer = document.getElementById('mapContainer');

locationForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const locationInput = document.getElementById('locationInput').value;

    // Make API call to your Flask backend
    fetch(`/api/parking?location=${locationInput}`)
        .then(response => response.json())
        .then(data => {
            // Display results in the resultsContainer
            resultsContainer.innerHTML = `
                <h2>Parking Lots Near ${locationInput}</h2>
                <ul class="list-group">
                    ${data.parkingLots.map(lot => `
                        <li class="list-group-item">
                            <strong>${lot.name}</strong>
                            <p>Total Slots: ${lot.totalSlots}</p>
                            <p>Available Slots: ${lot.availableSlots}</p>
                        </li>
                    `).join('')}
                </ul>
            `;

            // Display map using Open Street Map API
            const map = L.map('mapContainer').setView([data.location.latitude, data.location.longitude], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            // Add markers for parking lots
            data.parkingLots.forEach(lot => {
                L.marker([lot.latitude, lot.longitude]).addTo(map)
                    .bindPopup(`<strong>${lot.name}</strong><br>Total Slots: ${lot.totalSlots}<br>Available Slots: ${lot.availableSlots}`);
            });

            // Get directions using OpenRouteService
            const origin = `${data.location.latitude},${data.location.longitude}`;
            const destination = `${lot.latitude},${lot.longitude}`;
            const apiKey = '5b3ce3597851110001cf624868099505def444279b002dbc8a68dc42'; // Replace with your API key

            fetch(`https://api.openrouteservice.org/v2/directions?api_key=${apiKey}&start=${origin}&end=${destination}&profile=driving`)
                .then(response => response.json())
                .then(routeData => {
                    // Draw the route on the map
                    const route = L.polyline(routeData.features[0].geometry.coordinates).addTo(map);
                    map.fitBounds(route.getBounds());
                })
                .catch(error => {
                    console.error('Error fetching route:', error);
                });
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
});

const socket = io({ autoConnect: false });
const markers = {};

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// Haversine Distance
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// UI Elements
if (!currentUser) {
  const authForm = document.getElementById('auth-form');
  const switchBtn = document.getElementById('switch-btn');
  const modalTitle = document.getElementById('modal-title');
  const submitBtn = document.getElementById('submit-btn');
  let isLogin = true;

  const roleGroup = document.getElementById('role-group');

  switchBtn.addEventListener('click', () => {
    isLogin = !isLogin;
    modalTitle.textContent = isLogin ? 'Login' : 'Register';
    submitBtn.textContent = isLogin ? 'Login' : 'Register';
    document.getElementById('switch-text').textContent = isLogin ? "Don't have an account? " : "Already have an account? ";
    switchBtn.textContent = isLogin ? 'Register' : 'Login';
    roleGroup.style.display = isLogin ? 'none' : 'block';
  });

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;

    const endpoint = isLogin ? '/login' : '/register';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role: isLogin ? undefined : role })
      });

      const data = await res.json();
      if (data.success) {
        window.location.reload();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    }
  });
} else {
  // User is logged in, start tracking
  initializeMap();
}

function logout() {
  fetch('/logout', { method: 'POST' })
    .then(() => window.location.reload());
}

function initializeMap() {
  const map = L.map('map').setView([0, 0], 16);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  socket.connect();

  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (latitude === 0 && longitude === 0) return; // Prevent Null Island bug
        socket.emit('send-location', { latitude, longitude });
        map.setView([latitude, longitude]); // Auto-center on self
      },
      (error) => {
        console.error(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  }

  // Draw HQ Geofence (London Eye)
  let hqCircle;
  const updateGeofence = (lat, lng, radius) => {
    if (hqCircle) map.removeLayer(hqCircle);
    hqCircle = L.circle([lat, lng], {
      color: 'red',
      fillColor: '#f03',
      fillOpacity: 0.2,
      radius: radius
    }).addTo(map).bindPopup("HQ Zone (Geofence)");
  };

  socket.on('update-hq', (data) => {
    const { lat, lng, radius } = data;
    updateGeofence(lat, lng, radius);

    // Check proximity if role is driver
    if (currentUser && currentUser.role === 'driver') {
      navigator.geolocation.getCurrentPosition(pos => {
        const dist = getDistance(pos.coords.latitude, pos.coords.longitude, lat, lng);
        if (dist < 500) {
          document.getElementById('proximity-alert').style.display = 'block';
          document.getElementById('alert-msg').innerText = `Near HQ! (${Math.round(dist)}m)`;
        } else {
          document.getElementById('proximity-alert').style.display = 'none';
        }
      });
    }
  });

  // Admin: Click to set HQ
  let settingHq = false;
  if (currentUser && currentUser.role === 'admin') {
    document.getElementById('admin-panel').style.display = 'block';
    const btn = document.getElementById('set-hq-btn');
    const status = document.getElementById('hq-status');

    btn.addEventListener('click', () => {
      settingHq = !settingHq;
      btn.innerText = settingHq ? "Cancel" : "Set HQ Location";
      status.innerText = settingHq ? "Click on map to set new HQ" : "Click map to set HQ";
      map.getContainer().style.cursor = settingHq ? "crosshair" : "";
    });

    map.on('click', (e) => {
      if (settingHq) {
        socket.emit('update-hq', { lat: e.latlng.lat, lng: e.latlng.lng });
        settingHq = false;
        btn.innerText = "Set HQ Location";
        status.innerText = "HQ Updated!";
        map.getContainer().style.cursor = "";
      }
    });

    // Delivery Assignment
    const assignBtn = document.getElementById('assign-delivery-btn');
    assignBtn.addEventListener('click', async () => {
      const driverId = document.getElementById('driver-select').value;
      const customerId = document.getElementById('customer-select').value;

      if (!driverId || !customerId) {
        alert('Please select both a driver and a customer');
        return;
      }

      try {
        const res = await fetch('/api/delivery/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ driverId, customerId })
        });

        const data = await res.json();
        if (data.success) {
          alert('✅ Delivery assigned successfully!');
          document.getElementById('driver-select').value = '';
          document.getElementById('customer-select').value = '';
        } else {
          alert('❌ Error: ' + data.error);
        }
      } catch (err) {
        console.error(err);
        alert('❌ Failed to assign delivery');
      }
    });
  }

  socket.on('receive-location', (data) => {
    const { id, username, role, latitude, longitude } = data;

    // Filter out invalid coordinates (0,0 or outside reasonable bounds)
    if (latitude === 0 && longitude === 0) return;
    if (Math.abs(latitude) < 0.01 || Math.abs(longitude) < 0.01) return; // Too close to 0,0

    // Add Role to popup 
    const popupContent = `<b>${username}</b> (${role || 'driver'})`;

    if (markers[id]) {
      // Update existing marker
      const oldLat = markers[id].marker.getLatLng().lat;
      const oldLng = markers[id].marker.getLatLng().lng;

      // Only update if location actually changed significantly (more than ~10 meters)
      const distance = getDistance(oldLat, oldLng, latitude, longitude);
      if (distance > 10) {
        markers[id].marker.setLatLng([latitude, longitude]).setPopupContent(popupContent);
        markers[id].path.push([latitude, longitude]);
        markers[id].polyline.setLatLngs(markers[id].path);
      }
    } else {
      // Create new marker
      const marker = L.marker([latitude, longitude])
        .bindPopup(popupContent)
        .addTo(map);

      // Create polyline for trail with random color (thinner and more transparent)
      const color = getRandomColor();
      const path = [[latitude, longitude]];
      const polyline = L.polyline(path, {
        color: color,
        weight: 2,        // Thinner line
        opacity: 0.6      // More transparent
      }).addTo(map);

      markers[id] = { marker, polyline, path };
    }

    // Update device count
    document.getElementById('device-count').textContent = Object.keys(markers).length;
  });

  // Handle Geofence Alerts
  socket.on('alert', (data) => {
    const { message } = data;
    alert(`⚠️ ALERT: ${message}`);
  });

  socket.on('user-disconnected', (id) => {
    if (markers[id]) {
      map.removeLayer(markers[id].marker);
      map.removeLayer(markers[id].polyline);
      delete markers[id];
    }

    // Update device count
    document.getElementById('device-count').textContent = Object.keys(markers).length;
  });

  // Handle user list updates
  socket.on('users-update', (users) => {
    const container = document.getElementById('users-container');
    container.innerHTML = '';

    // Update admin dropdowns if admin
    if (currentUser && currentUser.role === 'admin') {
      const driverSelect = document.getElementById('driver-select');
      const customerSelect = document.getElementById('customer-select');

      if (driverSelect && customerSelect) {
        driverSelect.innerHTML = '<option value="">Select Driver</option>';
        customerSelect.innerHTML = '<option value="">Select Customer</option>';

        users.forEach(user => {
          if (user.role === 'driver') {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.username;
            driverSelect.appendChild(option);
          } else if (user.role === 'customer') {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.username;
            customerSelect.appendChild(option);
          }
        });
      }
    }


    users.forEach(user => {
      // Filter based on current user's role
      let shouldShow = true;
      if (currentUser && currentUser.role !== 'admin') {
        // Non-admins don't see admins
        shouldShow = user.role !== 'admin';
      }

      if (shouldShow) {
        const userItem = document.createElement('div');
        userItem.style.cssText = 'padding: 5px; margin: 3px 0; border-radius: 3px; font-size: 12px; display: flex; align-items: center; gap: 8px;';

        // Role badge color
        const roleColors = {
          admin: '#0984e3',
          driver: '#00b894',
          customer: '#fdcb6e'
        };

        const badge = document.createElement('span');
        badge.style.cssText = `background: ${roleColors[user.role] || '#ddd'}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: bold;`;
        badge.textContent = user.role.toUpperCase();

        const username = document.createElement('span');
        username.textContent = user.username;
        username.style.fontWeight = user.id === currentUser._id ? 'bold' : 'normal';

        userItem.appendChild(badge);
        userItem.appendChild(username);

        if (user.id === currentUser._id) {
          const youBadge = document.createElement('span');
          youBadge.textContent = '(You)';
          youBadge.style.cssText = 'color: #888; font-size: 10px;';
          userItem.appendChild(youBadge);
        }

        container.appendChild(userItem);
      }
    });
  });

  // Handle ETA updates
  socket.on('eta-update', (data) => {
    const { eta, distance, driverUsername, customerUsername } = data;
    const etaDisplay = document.getElementById('eta-display');
    const etaMsg = document.getElementById('eta-msg');

    if (currentUser.role === 'driver') {
      etaMsg.textContent = `Delivery to ${customerUsername}: ${eta} min (${distance}m away)`;
    } else if (currentUser.role === 'customer') {
      etaMsg.textContent = `${driverUsername} arriving in ${eta} min (${distance}m away)`;
    }

    etaDisplay.style.display = 'block';
  });

  // Handle delivery assignment
  socket.on('delivery-assigned', (data) => {
    const { driverId, customerId } = data;
    if (currentUser._id === driverId) {
      alert('📦 You have been assigned a new delivery!');
    } else if (currentUser._id === customerId) {
      alert('🚚 A driver has been assigned to your delivery!');
    }
  });
}
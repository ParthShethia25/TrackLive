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

// UI Elements
if (!currentUser) {
  const authForm = document.getElementById('auth-form');
  const switchBtn = document.getElementById('switch-btn');
  const modalTitle = document.getElementById('modal-title');
  const submitBtn = document.getElementById('submit-btn');
  let isLogin = true;

  switchBtn.addEventListener('click', () => {
    isLogin = !isLogin;
    modalTitle.textContent = isLogin ? 'Login' : 'Register';
    submitBtn.textContent = isLogin ? 'Login' : 'Register';
    document.getElementById('switch-text').textContent = isLogin ? "Don't have an account? " : "Already have an account? ";
    switchBtn.textContent = isLogin ? 'Register' : 'Login';
  });

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const endpoint = isLogin ? '/login' : '/register';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
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

  socket.on('receive-location', (data) => {
    const { id, username, latitude, longitude } = data;

    if (markers[id]) {
      // Update existing marker
      markers[id].marker.setLatLng([latitude, longitude]);
      markers[id].path.push([latitude, longitude]);
      markers[id].polyline.setLatLngs(markers[id].path);
    } else {
      // Create new marker
      const marker = L.marker([latitude, longitude])
        .bindPopup(username)
        .addTo(map);

      // Create polyline for trail with random color
      const color = getRandomColor();
      const path = [[latitude, longitude]];
      const polyline = L.polyline(path, { color: color }).addTo(map);

      markers[id] = { marker, polyline, path };
    }

    // Update device count
    document.getElementById('device-count').textContent = Object.keys(markers).length;
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
}
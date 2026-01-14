# 🗺️ Realtime Device Tracker

A real-time location tracking application built with Node.js, Express, Socket.io, and Leaflet.js. Track multiple devices simultaneously on an interactive map with live updates.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)

## 📸 Demo

Track multiple devices in real-time on an interactive map. Perfect for delivery tracking, fleet management, or location-based applications.

## ✨ Features

- 🌍 **Real-time Location Tracking** - Track devices with live GPS updates
- � **User Authentication** - Secure Login and Registration system
- 📜 **Location History** - Persistent tracking with visual movement trails
- �🗺️ **Interactive Maps** - Powered by Leaflet.js with OpenStreetMap tiles
- 🔄 **Live Synchronization** - Instant updates using Socket.io
- 📱 **Multi-Device Support** - Track unlimited devices simultaneously
- 🎯 **Auto-Centering** - Map automatically centers on active locations
- 🎨 **User Identity** - Unique colors and persistent usernames for each device

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Real-time Communication:** Socket.io
- **Frontend:** EJS, Leaflet.js
- **Maps:** OpenStreetMap (free, no API key required)
- **Geolocation:** Browser Geolocation API

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v14.0.0 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [MongoDB](https://www.mongodb.com/try/download/community) (running locally on port 27017)

## 🚀 Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd realtime-tracker
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure Environment**
Create a `.env` file in the root directory:
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/tracklive
JWT_SECRET=your_secure_randomfrom_secret_here
```

4. **Start the server**
```bash
node app.js
```

4. **Open your browser**
```
http://localhost:3000
```

5. **Allow location permissions** when prompted

## 📁 Project Structure

```
realtime-tracker/
├── app.js                 # Express server & Socket.io setup
├── package.json           # Dependencies and scripts
├── public/
│   ├── css/
│   │   └── style.css     # Styling for map and UI
│   └── js/
│       └── script.js     # Client-side Socket.io & Leaflet logic
└── views/
    └── index.ejs         # Main HTML template
```

## 💻 Usage

### Running the Application

```bash
# Development
node app.js

# Or use nodemon for auto-restart
npm install -g nodemon
nodemon app.js
```

### Testing Multi-Device Tracking

1. Open `http://localhost:3000` in your browser
2. Allow location permissions
3. Open the same URL in another browser tab/window or on another device
4. Watch as all devices appear on the map in real-time!

## 🔧 Configuration

### Change Port

Edit `app.js`:
```javascript
const PORT = process.env.PORT || 3000; // Change 3000 to your preferred port
```

### Customize Map Appearance

Edit `public/js/script.js` to change the map tile provider:
```javascript
// Current: OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Alternative: Dark mode
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap contributors © CARTO'
}).addTo(map);
```

## 🎨 Customization Ideas

- **Custom Markers:** Add different icons for different device types (cars, bikes, etc.)
- **User Names:** Display usernames or device IDs on markers
- **Location History:** Draw trails showing movement paths
- **Geofencing:** Add boundaries and alerts
- **Clustering:** Group nearby markers for better performance
- **Google Maps:** Replace Leaflet with Google Maps API
- **Authentication:** Add user login and device registration
- **Database:** Store location history with MongoDB or PostgreSQL

## 🐛 Troubleshooting

### Location Not Working
- Ensure you're accessing via `localhost` or `https://`
- Check that location permissions are granted in browser settings
- Verify GPS/location services are enabled on your device

### Port Already in Use
```bash
# Find and kill process using port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill
```

### Connection Issues
- Check firewall settings
- Ensure Node.js server is running
- Verify no proxy/VPN is blocking WebSocket connections

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

Your Name
- GitHub: [@parthshethia25](https://github.com/parthshethia25)
- LinkedIn: [parthshethia](https://linkedin.com/in/parthshethia)

## 🙏 Acknowledgments

- [Socket.io](https://socket.io/) for real-time communication
- [Leaflet.js](https://leafletjs.com/) for beautiful interactive maps
- [OpenStreetMap](https://www.openstreetmap.org/) for free map tiles
- [Express.js](https://expressjs.com/) for the web framework

## 📞 Support

If you have any questions or need help, please open an issue in the GitHub repository.

---

⭐ **Star this repo if you found it helpful!**

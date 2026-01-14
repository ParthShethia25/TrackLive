# 🗺️ TrackLive - Real-time Device Tracker v3.0

A comprehensive real-time location tracking application with role-based access control, delivery management, and geofencing capabilities. Built with Node.js, Express, Socket.io, MongoDB, and Leaflet.js.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)
![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)

## 🎯 What's New in v3.0

### 🔐 Role-Based Access Control (RBAC)
- **Three user roles**: Admin, Driver, Customer
- **Role-based visibility**: Drivers and customers see each other but not admins; admins see everyone
- **Secure authentication**: JWT-based login/registration with bcrypt password hashing

### 🚚 Delivery Management System
- **Admin delivery assignment**: Assign drivers to customers for deliveries
- **Real-time ETA calculation**: Distance-based time estimates (30 km/h average)
- **Live delivery tracking**: Both driver and customer see real-time updates
- **Delivery status tracking**: Assigned, in-transit, delivered, cancelled

### 📍 Advanced Geofencing
- **Dynamic HQ zones**: Admins can set/move headquarters location
- **Proximity alerts**: Warnings when approaching or leaving zones
- **Customizable radius**: Configurable geofence boundaries

### 👥 Connected Users Display
- **Live user list**: See all connected users with role badges
- **Color-coded roles**: Admin (blue), Driver (green), Customer (orange)
- **Real-time updates**: List updates on connect/disconnect

---

## ✨ Core Features

- 🌍 **Real-time Location Tracking** - Live GPS updates with WebSocket communication
- 🔐 **User Authentication** - Secure login/registration with JWT tokens
- 👤 **Role-Based Access** - Admin, Driver, and Customer roles with different permissions
- 📜 **Location History** - Persistent tracking with MongoDB storage
- 🗺️ **Interactive Maps** - Powered by Leaflet.js with OpenStreetMap tiles
- 🔄 **Live Synchronization** - Instant updates using Socket.io
- 📱 **Multi-Device Support** - Track unlimited devices simultaneously
- 🎨 **Movement Trails** - Visual path history with color-coded polylines
- 🚧 **Geofencing** - Virtual boundaries with entry/exit alerts
- 📊 **Analytics** - Distance tracking and location history APIs

---

## 🛠️ Tech Stack

**Backend:**
- Node.js & Express.js
- Socket.io (WebSocket communication)
- MongoDB & Mongoose (database)
- JWT & bcryptjs (authentication)
- Cookie-parser (session management)

**Frontend:**
- EJS (templating)
- Leaflet.js (interactive maps)
- OpenStreetMap (map tiles)
- Vanilla JavaScript (client-side logic)

---

## 📋 Prerequisites

- [Node.js](https://nodejs.org/) (v14.0.0 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) (running locally or remote)
- Modern web browser with geolocation support

---

## 🚀 Installation

### 1. Clone the repository
```bash
git clone https://github.com/parthshethia25/TrackLive.git
cd TrackLive
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment
Create a `.env` file in the root directory:
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/tracklive
JWT_SECRET=your_super_secret_jwt_key_here_change_this
```

### 4. Start MongoDB
```bash
# Windows
mongod

# Mac/Linux
sudo systemctl start mongod
```

### 5. Start the server
```bash
node app.js
```

### 6. Open your browser
Navigate to `http://localhost:3000`

---

## 📁 Project Structure

```
TrackLive/
├── app.js                      # Main server file with Express & Socket.io
├── package.json                # Dependencies and scripts
├── .env                        # Environment variables (create this)
├── .gitignore                  # Git ignore rules
├── LICENSE                     # MIT License
├── README.md                   # This file
│
├── models/                     # MongoDB schemas
│   ├── User.js                 # User model (username, password, role)
│   ├── Location.js             # Location history model
│   └── Delivery.js             # Delivery assignment model
│
├── utils/                      # Utility functions
│   └── geofence.js             # Geofencing & distance calculations
│
├── public/                     # Static assets
│   ├── css/
│   │   └── style.css           # Styling for map and UI
│   └── js/
│       └── script.js           # Client-side Socket.io & Leaflet logic
│
└── views/                      # EJS templates
    └── index.ejs               # Main HTML template
```

---

## 💻 Usage

### User Roles & Permissions

| Feature | Admin | Driver | Customer |
|---------|-------|--------|----------|
| See all users on map | ✅ | ❌ | ❌ |
| See drivers/customers | ✅ | ✅ | ✅ |
| Assign deliveries | ✅ | ❌ | ❌ |
| Set HQ location | ✅ | ❌ | ❌ |
| View ETA | ✅ | ✅ | ✅ |
| Share location | ❌ | ✅ | ✅ |

### Testing with Multiple Users

1. **Open 3 browser tabs** (or use different browsers)
2. **Tab 1**: Register as `admin` with role **Admin**
3. **Tab 2**: Register as `driver1` with role **Driver**
4. **Tab 3**: Register as `customer1` with role **Customer**
5. **Allow location permissions** in driver and customer tabs
6. **Admin view**: See both driver and customer on map
7. **Assign delivery**: Admin selects driver and customer, clicks "Assign Delivery"
8. **Watch ETA update**: Both driver and customer see real-time delivery time

### Simulating Different Locations (Chrome DevTools)

1. Press `F12` → `Ctrl+Shift+P` → Type "sensors" → Select "Show Sensors"
2. In Location dropdown, select "Other..."
3. Enter custom coordinates:
   - **Driver (Dadar)**: Lat `19.0176`, Lng `72.8561`
   - **Customer (Bandra)**: Lat `19.0596`, Lng `72.8295`
4. Refresh page and allow location

---

## 🔧 API Endpoints

### Authentication
- `POST /register` - Create new user account
- `POST /login` - Login with username/password
- `POST /logout` - Logout and clear session

### Delivery Management (Admin only)
- `POST /api/delivery/assign` - Assign driver to customer
- `GET /api/delivery/active` - Get active deliveries

### Analytics
- `GET /api/devices/:id/history` - Get location history for user
- `GET /api/analytics/distance/:id` - Calculate total distance traveled

---

## 🎨 Configuration

### Change HQ Location
Edit `app.js`:
```javascript
let HQ_ZONE = { 
  lat: 19.0176,      // Latitude
  lng: 72.8561,      // Longitude
  radius: 5000       // Radius in meters
};
```

### Customize Map Style
Edit `public/js/script.js`:
```javascript
// Dark mode map
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap © CARTO'
}).addTo(map);
```

### Adjust ETA Speed
Edit `app.js` (line ~295):
```javascript
const avgSpeed = 30 / 60; // 30 km/h = 0.5 km/min
// Change 30 to your desired speed
```

---

## 🐛 Troubleshooting

### Location Not Working
- Ensure you're accessing via `localhost` or `https://`
- Check location permissions in browser settings
- Verify GPS is enabled on your device

### "Not authorized" Error
- Make sure you're logged in
- Check that your role has permission for the action
- Try logging out and back in

### Markers Not Appearing
- Both users must enable location sharing
- Check browser console for errors
- Ensure coordinates are valid (not 0,0)

### Server Crashes
- Check MongoDB is running: `mongod --version`
- Verify `.env` file exists with correct values
- Check Node.js version: `node --version`

---

## 📊 Database Schema

### User Model
```javascript
{
  username: String (unique),
  password: String (hashed),
  role: String (admin/driver/customer),
  createdAt: Date
}
```

### Location Model
```javascript
{
  userId: ObjectId (ref: User),
  latitude: Number,
  longitude: Number,
  timestamp: Date (auto)
}
```

### Delivery Model
```javascript
{
  customerId: ObjectId (ref: User),
  driverId: ObjectId (ref: User),
  status: String (assigned/in-transit/delivered/cancelled),
  estimatedTime: Number (minutes),
  assignedAt: Date,
  deliveredAt: Date
}
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Parth Shethia**
- GitHub: [@parthshethia25](https://github.com/parthshethia25)
- LinkedIn: [parthshethia](https://linkedin.com/in/parthshethia)

---

## 🙏 Acknowledgments

- [Socket.io](https://socket.io/) - Real-time bidirectional communication
- [Leaflet.js](https://leafletjs.com/) - Interactive map library
- [OpenStreetMap](https://www.openstreetmap.org/) - Free map tiles
- [Express.js](https://expressjs.com/) - Web application framework
- [MongoDB](https://www.mongodb.com/) - NoSQL database

---

## 📞 Support

If you encounter any issues or have questions:
- Open an issue on [GitHub](https://github.com/parthshethia25/TrackLive/issues)
- Check the [Troubleshooting](#-troubleshooting) section

---

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Route optimization
- [ ] Push notifications
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Export location history (CSV/PDF)

---

⭐ **Star this repo if you found it helpful!**

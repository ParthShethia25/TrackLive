require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookie = require('cookie');

const User = require('./models/User');
const Location = require('./models/Location');
const Delivery = require('./models/Delivery');

const server = http.createServer(app);
const io = socketio(server);

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error(err));

// Middleware
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Authentication Middleware
const protect = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    next();
  } catch (err) {
    req.user = null;
    next();
  }
};

// Routes
const { checkGeofence } = require('./utils/geofence');

// Authorization Middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Not authorized to access this route' });
    }
    next();
  };
};

// Routes
app.get('/', protect, (req, res) => {
  // Pass user role to frontend
  res.render('index', { user: req.user });
});

// Analytics API
app.get('/api/devices/:id/history', protect, authorize('admin', 'driver'), async (req, res) => {
  try {
    const { from, to } = req.query;
    const query = { userId: req.params.id };
    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) query.timestamp.$lte = new Date(to);
    }
    const history = await Location.find(query).sort({ timestamp: 1 });
    res.json({ success: true, count: history.length, data: history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/analytics/distance/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const history = await Location.find({ userId: req.params.id }).sort({ timestamp: 1 });
    let totalDistance = 0;
    const { getDistance } = require('./utils/geofence');

    for (let i = 1; i < history.length; i++) {
      totalDistance += getDistance(
        history[i - 1].latitude, history[i - 1].longitude,
        history[i].latitude, history[i].longitude
      );
    }

    res.json({ success: true, userId: req.params.id, totalDistanceMetres: Math.round(totalDistance) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const user = await User.create({ username, password, role: role || 'driver' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.cookie('token', token, { httpOnly: true, sameSite: 'strict' }).status(201).json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.cookie('token', token, { httpOnly: true, sameSite: 'strict' }).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/logout', (req, res) => {
  res.clearCookie('token').json({ success: true });
});

// Delivery endpoints
app.post('/api/delivery/assign', protect, authorize('admin'), async (req, res) => {
  try {
    const { driverId, customerId } = req.body;

    // Check if delivery already exists
    const existing = await Delivery.findOne({
      customerId,
      status: { $in: ['assigned', 'in-transit'] }
    });

    if (existing) {
      return res.status(400).json({ success: false, error: 'Customer already has an active delivery' });
    }

    const delivery = await Delivery.create({ driverId, customerId });

    // Notify driver and customer via socket
    const sockets = await io.fetchSockets();
    for (const socket of sockets) {
      if (socket.user._id.toString() === driverId || socket.user._id.toString() === customerId) {
        socket.emit('delivery-assigned', {
          deliveryId: delivery._id,
          driverId,
          customerId,
          status: delivery.status
        });
      }
    }

    res.json({ success: true, delivery });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/delivery/active', protect, async (req, res) => {
  try {
    let query = { status: { $in: ['assigned', 'in-transit'] } };

    // Filter based on role
    if (req.user.role === 'driver') {
      query.driverId = req.user._id;
    } else if (req.user.role === 'customer') {
      query.customerId = req.user._id;
    }
    // Admin sees all

    const deliveries = await Delivery.find(query)
      .populate('driverId', 'username')
      .populate('customerId', 'username');

    res.json({ success: true, deliveries });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Socket.io Middleware for Auth
io.use(async (socket, next) => {
  const cookies = cookie.parse(socket.handshake.headers.cookie || '');
  const token = cookies.token;

  if (!token) return next(new Error('Authentication error'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = await User.findById(decoded.id).select('-password');
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Geofence Config (HQ: Mumbai - Dadar) - Mutable
let HQ_ZONE = { lat: 19.0176, lng: 72.8561, radius: 5000 }; // 5km radius around Dadar

// Socket Logic
io.on('connection', async (socket) => {
  // Check if user is authenticated
  if (!socket.user) {
    console.log('Unauthenticated connection attempt');
    socket.disconnect();
    return;
  }

  console.log(`User connected: ${socket.user.username} (${socket.user.role})`);

  // Broadcast updated user list to all clients
  const broadcastUserList = async () => {
    const sockets = await io.fetchSockets();
    const users = sockets.map(s => ({
      id: s.user._id.toString(),
      username: s.user.username,
      role: s.user.role
    }));
    io.emit('users-update', users);
  };

  await broadcastUserList();

  // Send current HQ to new user
  socket.emit('update-hq', HQ_ZONE);

  // Admin: Update HQ
  socket.on('update-hq', (newCoords) => {
    if (socket.user.role === 'admin') {
      HQ_ZONE.lat = newCoords.lat;
      HQ_ZONE.lng = newCoords.lng;
      io.emit('update-hq', HQ_ZONE); // Broadcast to all
    }
  });

  // RBAC: If customer, only join room for assigned driver (Skipped for demo simplicity, showing all)

  socket.on('send-location', async (data) => {
    try {
      const { latitude, longitude } = data;

      // Save to DB
      await Location.create({
        userId: socket.user._id,
        latitude,
        longitude
      });

      // Geofencing Check
      const status = checkGeofence(latitude, longitude, HQ_ZONE.lat, HQ_ZONE.lng, HQ_ZONE.radius);
      if (!status.inside) {
        // Emit Alert
        io.emit('alert', {
          userId: socket.user._id,
          username: socket.user.username,
          message: `${socket.user.username} has left the HQ Zone!`
        });
      }

      // Role-based broadcasting
      const locationData = {
        id: socket.user._id,
        username: socket.user.username,
        role: socket.user.role,
        latitude,
        longitude
      };

      // Get all connected sockets
      const sockets = await io.fetchSockets();

      for (const clientSocket of sockets) {
        const shouldReceive =
          // Admins see everyone
          clientSocket.user.role === 'admin' ||
          // Non-admins see other non-admins (drivers and customers see each other)
          (socket.user.role !== 'admin' && clientSocket.user.role !== 'admin');

        if (shouldReceive) {
          clientSocket.emit('receive-location', locationData);
        }
      }

      // Calculate and emit ETA for active deliveries
      const deliveries = await Delivery.find({
        $or: [
          { driverId: socket.user._id },
          { customerId: socket.user._id }
        ],
        status: { $in: ['assigned', 'in-transit'] }
      }).populate('driverId customerId');

      for (const delivery of deliveries) {
        if (socket.user.role === 'driver' && delivery.driverId._id.toString() === socket.user._id.toString()) {
          // Find customer's last location
          const customerLocation = await Location.findOne({ userId: delivery.customerId._id }).sort({ timestamp: -1 });

          if (customerLocation) {
            const { getDistance } = require('./utils/geofence');
            const distance = getDistance(latitude, longitude, customerLocation.latitude, customerLocation.longitude);
            const avgSpeed = 30 / 60; // 30 km/h = 0.5 km/min
            const eta = Math.round((distance / 1000) / avgSpeed); // in minutes

            // Send ETA to both driver and customer
            socket.emit('eta-update', { deliveryId: delivery._id, eta, distance: Math.round(distance), customerUsername: delivery.customerId.username });

            // Find and notify customer
            for (const cs of sockets) {
              if (cs.user._id.toString() === delivery.customerId._id.toString()) {
                cs.emit('eta-update', { deliveryId: delivery._id, eta, distance: Math.round(distance), driverUsername: delivery.driverId.username });
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('disconnect', async () => {
    io.emit('user-disconnected', socket.user._id);
    await broadcastUserList();
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
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
app.get('/', protect, (req, res) => {
  res.render('index', { user: req.user });
});

app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.create({ username, password });
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

// Socket Logic
io.on('connection', async (socket) => {
  console.log(`User connected: ${socket.user.username}`);

  // Send last known locations of all users (history)
  // Logic: Get the latest location for each user
  // This is a bit complex aggregation, for now let's just send "active" users or simple history
  // Simplified: When a user sends location, we save it.
  // For "history" on connect, maybe we don't send anything yet, or we send the last positions of everyone.

  socket.on('send-location', async (data) => {
    try {
      const { latitude, longitude } = data;
      // Save to DB
      await Location.create({
        userId: socket.user._id,
        latitude,
        longitude
      });

      // Emit to all with username
      io.emit('receive-location', {
        id: socket.user._id,
        username: socket.user.username,
        latitude,
        longitude
      });
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('disconnect', () => {
    io.emit('user-disconnected', socket.user._id);
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
// // app.js
// const { Server } = require('socket.io'); // Import Socket.io
// const http = require('http'); // Required for WebSocket
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const config = require('./config');
// const dsaRoutes = require('./routes/dsaRoutes');
// const coachRoutes = require('./routes/coachRoutes');
// const coordinatorRoutes = require('./routes/coordinatorRoutes')
// const studentrepRoutes = require('./routes/studentrepRoutes')
// const captainRoutes = require('./routes/captainRoutes')
// const feedscreen = require('./routes/feedscreen')
// const refRoutes = require('./routes/refRoutes')
// const footballRoutes = require('./routes/footballRoutes')
// const cricketRoutes = require('./routes/cricketRoutes')
// const futsalRoutes = require('./routes/futsalRoutes')
// const basketballRoutes = require('./routes/basketballRoutes')
// const volleyballRoutes = require('./routes/volleyballRoutes')
// const tennisRoutes = require('./routes/tennisRoutes')
// const tabletennisRoutes = require('./routes/tabletennisRoutes')
// const badmintonRoutes = require('./routes/badmintonRoutes')
// const tugofwarRoutes = require('./routes/tugofwarRoutes')
// const snookerRoutes = require('./routes/snookerRoutes')
// const liveRoutes = require('./routes/liveRoutes')




// const app = express();

// const server = http.createServer(app); // Create HTTP Server
// const io = new Server(server, {
//   cors: {
//     origin: config.FRONTEND_URL,
//     credentials: true,
//   },
// });

// // Middleware for CORS and JSON parsing
// app.use(cors({
//   origin: config.FRONTEND_URL,
//   credentials: true,
// }));
// app.use(express.json());

// // MongoDB connection
// mongoose.connect(config.MONGO_URI)
//   .then(() => console.log('MongoDB connected'))
//   .catch(err => console.log(err));


// // Attach Socket.io to the app
// app.use((req, res, next) => {
//   req.io = io; // Attach WebSocket instance to request object
//   next();
// });


// // Route middleware
// app.use('/', dsaRoutes);
// app.use('/', coachRoutes);
// app.use('/', coordinatorRoutes);
// app.use('/', studentrepRoutes);
// app.use('/', captainRoutes);
// app.use('/', feedscreen);
// app.use('/', refRoutes);
// app.use('/', footballRoutes);
// app.use('/', cricketRoutes);
// app.use('/', futsalRoutes);
// app.use('/', basketballRoutes);
// app.use('/', volleyballRoutes);
// app.use('/', tennisRoutes);
// app.use('/', tabletennisRoutes);
// app.use('/', badmintonRoutes);
// app.use('/', tugofwarRoutes);
// app.use('/', snookerRoutes);
// app.use('/', liveRoutes);


// io.on('connection', (socket) => {
//   console.log('A user connected to WebSocket');

//   socket.on('disconnect', () => {
//     console.log('A user disconnected from WebSocket');
//   });
// });

// // Start the server
// app.listen(3002, () => {
//   console.log(`Server running on ${config.FRONTEND_URL}`);
// });


const { Server } = require('socket.io'); // Import Socket.io
const http = require('http'); // Required for WebSocket
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const config = require('./config');
const dsaRoutes = require('./routes/dsaRoutes');
const coachRoutes = require('./routes/coachRoutes');
const coordinatorRoutes = require('./routes/coordinatorRoutes');
const studentrepRoutes = require('./routes/studentrepRoutes');
const captainRoutes = require('./routes/captainRoutes');
const feedscreen = require('./routes/feedscreen');
const refRoutes = require('./routes/refRoutes');
const footballRoutes = require('./routes/footballRoutes');
const cricketRoutes = require('./routes/cricketRoutes');
const futsalRoutes = require('./routes/futsalRoutes');
const basketballRoutes = require('./routes/basketballRoutes');
const volleyballRoutes = require('./routes/volleyballRoutes');
const tennisRoutes = require('./routes/tennisRoutes');
const tabletennisRoutes = require('./routes/tabletennisRoutes');
const badmintonRoutes = require('./routes/badmintonRoutes');
const tugofwarRoutes = require('./routes/tugofwarRoutes');
const snookerRoutes = require('./routes/snookerRoutes');
const liveRoutes = require('./routes/liveRoutes');

const app = express();
const server = http.createServer(app); // Create HTTP Server

// Initialize WebSocket Server
const io = new Server(server, {
  cors: {
    origin: config.FRONTEND_URL, // Ensure this is set correctly
    credentials: true,
  },
});

// Middleware for CORS and JSON parsing
app.use(cors({
  origin: config.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect(config.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.log('❌ MongoDB Connection Error:', err));

// Attach WebSocket instance to request object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Route Middleware
app.use('/', dsaRoutes);
app.use('/', coachRoutes);
app.use('/', coordinatorRoutes);
app.use('/', studentrepRoutes);
app.use('/', captainRoutes);
app.use('/', feedscreen);
app.use('/', refRoutes);
app.use('/', footballRoutes);
app.use('/', cricketRoutes);
app.use('/', futsalRoutes);
app.use('/', basketballRoutes);
app.use('/', volleyballRoutes);
app.use('/', tennisRoutes);
app.use('/', tabletennisRoutes);
app.use('/', badmintonRoutes);
app.use('/', tugofwarRoutes);
app.use('/', snookerRoutes);
app.use('/', liveRoutes);

// WebSocket Events
io.on('connection', (socket) => {
  console.log('✅ A user connected to WebSocket');

  // Debugging - Listen for a test event
  socket.on('test', (data) => {
    console.log('📩 Received test event:', data);
  });

  socket.on('disconnect', () => {
    console.log('❌ A user disconnected from WebSocket');
  });
});

// Start Server (Use server.listen, NOT app.listen)
server.listen(3002, () => {
  console.log(`🚀 Server running at ${config.FRONTEND_URL}`);
});


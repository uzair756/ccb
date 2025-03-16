// app.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const config = require('./config');
const dsaRoutes = require('./routes/dsaRoutes');
const coachRoutes = require('./routes/coachRoutes');
const coordinatorRoutes = require('./routes/coordinatorRoutes')
const studentrepRoutes = require('./routes/studentrepRoutes')
const captainRoutes = require('./routes/captainRoutes')
const feedscreen = require('./routes/feedscreen')
const refRoutes = require('./routes/refRoutes')
const footballRoutes = require('./routes/footballRoutes')
const cricketRoutes = require('./routes/cricketRoutes')
const futsalRoutes = require('./routes/futsalRoutes')
const basketballRoutes = require('./routes/basketballRoutes')
const volleyballRoutes = require('./routes/volleyballRoutes')
const tennisRoutes = require('./routes/tennisRoutes')
const tabletennisRoutes = require('./routes/tabletennisRoutes')
const badmintonRoutes = require('./routes/badmintonRoutes')
const tugofwarRoutes = require('./routes/tugofwarRoutes')
const snookerRoutes = require('./routes/snookerRoutes')




const app = express();

// Middleware for CORS and JSON parsing
app.use(cors({
  origin: config.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());

// MongoDB connection
mongoose.connect(config.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Route middleware
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

// Start the server
app.listen(3002, () => {
  console.log(`Server running on ${config.FRONTEND_URL}`);
});






// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken'); // Import JWT
// const app = express();






// // Middleware to handle CORS and JSON
// app.use(cors({
//   origin: 'http://192.168.1.21:3002', // Frontend URL
//   credentials: true
// }));
// app.use(express.json());







// // MongoDB connection
// mongoose.connect('mongodb://127.0.0.1:27017/campusplay')
//   .then(() => console.log('MongoDB connected'))
//   .catch(err => console.log(err));






// // Define User Schema and Model
// const userSchema = new mongoose.Schema({
//   username: String,
//   email: { type: String, unique: true },
//   password: String
// });




// const DSAUser = mongoose.model('DSAUser', userSchema);
// const SportsCoachUser = mongoose.model('SportsCoachUser', userSchema);




// // JWT Secret Key
// const JWT_SECRET = '4gM8XkFz9pVnR2hQ7wLrY5aC0uJbH3eZ'; // strong, unique key
// // Middleware to verify JWT
// const authenticateJWT = (req, res, next) => {
//   const token = req.headers['authorization']?.split(' ')[1]; // Extract token from Authorization header
//   if (token) {
//     jwt.verify(token, JWT_SECRET, (err, user) => {
//       if (err) return res.sendStatus(403); // Forbidden
//       req.user = user;
//       next();
//     });
//   } else {
//     res.sendStatus(401); // Unauthorized
//   }
// };




// // Handle user registration
// app.post('/dsasignup', async (req, res) => {
//     try {
//       // Check if the email already exists
//       const existingUser = await DSAUser.findOne({ email: req.body.email });
//       if (existingUser) {
//         return res.status(400).json({ error: 'Email already exists' });
//       }
  
//       // Hash the password before saving
//       const hashedPassword = await bcrypt.hash(req.body.password, 10);
//       const user = new DSAUser({ ...req.body, password: hashedPassword });
//       const result = await user.save();
//       res.status(201).send(result); 
//     } catch (error) {
//       console.error('Error:', error);
//       res.status(500).json({ error: 'Error creating account' }); // Return a specific error message
//     }
//   });


// // Handle user login
// app.post('/dsalogin', async (req, res) => {
//   const { email, password } = req.body;

//   if (email && password) {
//     const user = await DSAUser.findOne({ email });
//     if (user && await bcrypt.compare(password, user.password)) {
//       // Generate JWT token
//       const token = jwt.sign({ id: user._id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
//       res.json({ success: true, message: 'Logged in successfully', token });
//     } else {
//       res.json({ success: false, message: 'Invalid credentials' });
//     }
//   } else {
//     res.json({ success: false, message: 'Please provide email and password' });
//   }
// });
// // Handle profile request
// app.get('/dsalandingpage', authenticateJWT, (req, res) => {
//   // req.user will be populated by authenticateJWT middleware
//   res.json({
//     success: true,
//     user: req.user
//   });
// });









  


//   app.post('/dsasportscoachuser', async (req, res) => {
//     try {
//       const existingUser1 = await SportsCoachUser.findOne({ email: req.body.email });
//       if (existingUser1) {
//         return res.status(400).json({ success: false, error: 'Email already exists' });
//       }
  
//       const hashedPassword = await bcrypt.hash(req.body.password, 10);
//       const user = new SportsCoachUser({ ...req.body, password: hashedPassword });
//       const result = await user.save();
//       res.status(201).json({ success: true, user: result }); 
//     } catch (error) {
//       console.error('Error:', error);
//       res.status(500).json({ success: false, error: 'Error creating account' });
//     }
//   });
  


// // Handle user login
// app.post('/sportscoachlogin', async (req, res) => {
//   const { email, password } = req.body;
//   if (email && password) {
//     const user = await SportsCoachUser.findOne({ email });
//     if (user && await bcrypt.compare(password, user.password)) {
//       // Generate JWT token
//       const token = jwt.sign({ id: user._id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
//       res.json({ success: true, message: 'Logged in successfully', token });
//     } else {
//       res.json({ success: false, message: 'Invalid credentials' });
//     }
//   } else {
//     res.json({ success: false, message: 'Please provide email and password' });
//   }
// });




// app.get('/coachlandingpage', authenticateJWT, (req, res) => {
//   // req.user will be populated by authenticateJWT middleware
//   res.json({
//     success: true,
//     user: req.user
//   });
// });








// // Start the server
// app.listen(3002, () => {
//   console.log('Server running on port 3002');
// });
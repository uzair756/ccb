// routes/coordinatorRoutes.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { CoordinatorUser } = require('../models');
const authenticateJWT = require('../middleware');
const config = require('../config');

const router = express.Router();

// Add Coordinator Route
router.post('/addcoordinator', async (req, res) => {
  const { username, email, password, department } = req.body;

  try {
    // Check if a coordinator already exists for the department
    const existingCoordinatorByDepartment = await CoordinatorUser.findOne({ department });
    if (existingCoordinatorByDepartment) {
      return res.status(400).json({
        success: false,
        error: 'CoordinatorExists',
      });
    }

    // Check if a coordinator already exists with the same email
    const existingCoordinatorByEmail = await CoordinatorUser.findOne({ email });
    if (existingCoordinatorByEmail) {
      return res.status(400).json({
        success: false,
        error: 'EmailExists',
      });
    }

    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new coordinator
    const newCoordinator = new CoordinatorUser({
      username,
      email,
      password: hashedPassword,
      department,
    });

    const savedCoordinator = await newCoordinator.save();

    res.status(201).json({ success: true, coordinator: savedCoordinator });
  } catch (error) {
    console.error('Error adding coordinator:', error);
    res.status(500).json({ success: false, error: 'Error adding coordinator' });
  }
});



// Handle user login
router.post('/coordinatorlogin', async (req, res) => {
    const { email, password } = req.body;
    if (email && password) {
      const user = await CoordinatorUser.findOne({ email });
      if (user && await bcrypt.compare(password, user.password)) {
        // Generate JWT token
        const token = jwt.sign({ id: user._id, username: user.username, email: user.email ,department: user.department, loggedin: user.loggedin }, config.JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, message: 'Logged in successfully', token });
      } else {
        res.json({ success: false, message: 'Invalid credentials' });
      }
    } else {
      res.json({ success: false, message: 'Please provide email and password' });
    }
  });
  

// Sports Coordinator landing page route
router.get('/coordinatorlandingpage', authenticateJWT, (req, res) => {
  res.json({ success: true, user: req.user });
});





router.post('/changepasswordcoordinator', authenticateJWT, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    const user = await CoordinatorUser.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Error changing password' });
  }
});



module.exports = router;

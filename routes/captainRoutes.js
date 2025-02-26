// routes/coachRoutes.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { CaptainUser, TrialEvent } = require('../models');
const authenticateJWT = require('../middleware');
const config = require('../config');

const router = express.Router();

// Captain signup route
router.post('/captainsignup', authenticateJWT, async (req, res) => {
    try {
      const { name, email, password, category } = req.body;
  
      if (!name || !email || !password || !category) {
        return res.status(400).json({ success: false, error: 'All fields are required' });
      }
  
      const existingCaptain = await CaptainUser.findOne({
        department: req.user.department,
        category,
      });
  
      if (existingCaptain) {
        return res.status(400).json({
          success: false,
          error: `A captain for ${category} already exists in the ${req.user.department} department.`,
        });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
      const newCaptain = new CaptainUser({
        name,
        email,
        password: hashedPassword,
        category,
        department: req.user.department,
        repId: req.user.id,
        repEmail: req.user.email,
        repName: req.user.username,
      });
  
      const savedCaptain = await newCaptain.save();
      res.status(201).json({ success: true, captain: savedCaptain });
    } catch (error) {
      console.error('Error creating captain account:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });
  


// Handle user login
router.post('/captainlogin', async (req, res) => {
    const { email, password } = req.body;
    if (email && password) {
      const user = await CaptainUser.findOne({ email });
      if (user && await bcrypt.compare(password, user.password)) {
        // Generate JWT token
        const token = jwt.sign(
            {
              id: user._id,
              username: user.name,
              email: user.email,
              department: user.department,  // Check if department is correctly stored in the user document
              category: user.category,      // Ensure category is included here
              repId: user.repId,
              repEmail: user.repEmail,
              repName: user.repName,
              loggedin: user.loggedin
            },
            config.JWT_SECRET,
            { expiresIn: '24h' }
          );
          
        res.json({ success: true, message: 'Logged in successfully', token });
      } else {
        res.json({ success: false, message: 'Invalid credentials' });
      }
    } else {
      res.json({ success: false, message: 'Please provide email and password' });
    }
  });
// Sports Coach landing page route
router.get('/captainlandingpage', authenticateJWT, async (req, res) => {
    try {
      const { department, category } = req.user; // Get department and category from the JWT token
  
      // Fetch events for the captain's department and category
      const events = await TrialEvent.find({
        department: department,
        sportCategory: category,
      });
  
      console.log('Fetched events:', events); // Add this line to check the events
  
      // Return user data along with the events if they match the department and category
      res.json({
        success: true,
        user: req.user,
        events: events.length > 0 ? events : [], // If no events found, send an empty array
      });
    } catch (error) {
      console.error('Error fetching captain landing page data:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });
  




  router.post('/changepasswordcaptain', authenticateJWT, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
  
    try {
      const user = await CaptainUser.findById(userId);
  
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



  router.post('/confirmtrial/:eventId', authenticateJWT, async (req, res) => {
    const { eventId } = req.params;
  
    try {
      const event = await TrialEvent.findById(eventId);
  
      if (!event) {
        return res.status(404).json({ success: false, error: 'Event not found' });
      }
  
      // Toggle the confirmation status
      event.isConfirmed = !event.isConfirmed;  // Toggle the value
  
      // Save the updated event
      await event.save();
  
      return res.status(200).json({ success: true, event });  // Send updated event data
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: 'Server error' });
    }
});

  


  module.exports = router;
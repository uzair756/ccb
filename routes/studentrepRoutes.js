// routes/coachRoutes.js
const PDFDocument = require('pdfkit'); // For PDF generation
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { RepUser, PlayerNominationForm, TrialEvent} = require('../models');
const authenticateJWT = require('../middleware');
const config = require('../config');

const router = express.Router();

// Sports Coach signup route
router.post('/studentrepsignup', async (req, res) => {
  try {
    const { email, department } = req.body;

    // Check if a rep already exists for this department
    const existingRep = await RepUser.findOne({ department });
    if (existingRep) {
      return res.status(400).json({ success: false, error: 'A rep for this department already exists' });
    }

    // Check if email already exists
    const existingUser = await RepUser.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    
    // Create the student rep user with department
    const user = new RepUser({ ...req.body, password: hashedPassword });
    const result = await user.save();

    res.status(201).json({ success: true, user: result });
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ success: false, error: 'Error creating account' });
  }
});



// Handle user login
router.post('/studentreplogin', async (req, res) => {
    const { email, password } = req.body;
    if (email && password) {
      const user = await RepUser.findOne({ email });
      if (user && await bcrypt.compare(password, user.password)) {
        // Generate JWT token
        const token = jwt.sign({ id: user._id, username: user.username, email: user.email, department: user.department, loggedin: user.loggedin }, config.JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, message: 'Logged in successfully', token });
      } else {
        res.json({ success: false, message: 'Invalid credentials' });
      }
    } else {
      res.json({ success: false, message: 'Please provide email and password' });
    }
  });
  

// Sports Coach landing page route
router.get('/studentreplandingpage', authenticateJWT, (req, res) => {
  res.json({ success: true, user: req.user });
});


router.post('/changepasswordrep', authenticateJWT, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    const user = await RepUser.findById(userId);

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


// Route to get the existing nomination form
router.get('/getNominationForm/:sport', authenticateJWT, async (req, res) => {
  const { sport } = req.params;
  const { department } = req.user;  // Assuming department is available in JWT payload

  try {
    const nomination = await PlayerNominationForm.findOne({ sport, department });

    if (nomination) {
      return res.json({ success: true, data: nomination });
    } else {
      return res.json({ success: false, message: 'No nominations found for this sport' });
    }
  } catch (error) {
    console.error('Error fetching nominations:', error);
    res.status(500).json({ success: false, error: 'Error fetching nominations' });
  }
});

// Route to submit the nomination form (initial submission)
router.post('/submitNominationForm/:sport', authenticateJWT, async (req, res) => {
  const { sport } = req.params;
  const { nominations, repId, repName, repEmail, repDepartment, lastUpdatedBy, lastUpdatedAt } = req.body;

  try {
    const nomination = new PlayerNominationForm({
      sport,
      department: repDepartment,
      nominations,
      repId,
      repName,
      repEmail,
      repDepartment,
      lastUpdatedBy,
      lastUpdatedAt,
    });

    await nomination.save();
    return res.json({ success: true, message: 'Nomination submitted successfully' });
  } catch (error) {
    console.error('Error saving nomination:', error);
    res.status(500).json({ success: false, error: 'Error saving nomination' });
  }
});

// Route to update the existing nomination form
router.put('/updateNominationForm/:sport', authenticateJWT, async (req, res) => {
  const { sport } = req.params;
  const { nominations, repId, repName, repEmail, repDepartment, lastUpdatedBy, lastUpdatedAt } = req.body;

  try {
    let nomination = await PlayerNominationForm.findOne({ sport, department: repDepartment });

    if (!nomination) {
      return res.status(404).json({ success: false, message: 'No nomination form found for this sport and department' });
    }

    nomination.nominations = nominations;
    nomination.lastUpdatedBy = lastUpdatedBy;
    nomination.lastUpdatedAt = lastUpdatedAt;
    await nomination.save();

    return res.json({ success: true, message: 'Nomination updated successfully' });
  } catch (error) {
    console.error('Error updating nomination:', error);
    res.status(500).json({ success: false, error: 'Error updating nomination' });
  }
});


// Route to fetch nominations by department
router.get('/getSubmittedForms', authenticateJWT, async (req, res) => {
  const { department } = req.user; // Get department from the logged-in user

  try {
    const submittedForms = await PlayerNominationForm.find({ department });
    return res.json({ success: true, data: submittedForms });
  } catch (error) {
    console.error('Error fetching submitted forms:', error);
    res.status(500).json({ success: false, error: 'Error fetching submitted forms' });
  }
});

// Route to generate and serve the PDF
router.get('/downloadPDF/:sport', authenticateJWT, async (req, res) => {
  const { sport } = req.params;
  const { department } = req.user;

  try {
    const nomination = await PlayerNominationForm.findOne({ sport, department });

    if (!nomination) {
      return res.status(404).json({ success: false, message: 'No nomination form found' });
    }

    // Generate PDF
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${sport}_nominations.pdf`);

    doc.text(`Nominations for ${sport} (${department})`, { align: 'center', underline: true });
    doc.moveDown();

    nomination.nominations.forEach((player, index) => {
      doc.text(
        `Player ${index + 1}: Name: ${player.name}, CNIC: ${player.cnic}, Section: ${player.section}`
      );
      doc.moveDown(0.5);
    });

    doc.pipe(res); // Pipe PDF content to the response
    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ success: false, error: 'Error generating PDF' });
  }
});


router.post('/createTrialEvent', authenticateJWT, async (req, res) => {
  const { sportCategory, hour, minute, time, date } = req.body;
  const repId = req.user.id;
  const repName = req.user.username;
  const department = req.user.department;

  try {
    // Check if an event already exists for this department and sport category
    const existingEvent = await TrialEvent.findOne({ department, sportCategory });
    if (existingEvent) {
      return res.status(400).json({ success: false, message: 'Event already exists for this category in your department.' });
    }

    // Create new trial event
    const newEvent = new TrialEvent({
      sportCategory,
      hour,
      minute,
      time,
      date,
      repId,
      repName,
      department,
    });

    await newEvent.save();

    res.status(201).json({ success: true, message: 'Event created successfully', event: newEvent });
  } catch (error) {
    console.error('Error creating trial event:', error);
    res.status(500).json({ success: false, error: 'Error creating event' });
  }
});

// Delete an event
router.delete('/deleteTrialEvent/:id', authenticateJWT, async (req, res) => {
  try {
    const event = await TrialEvent.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.repId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only delete your own events' });
    }

    // Use deleteOne or findByIdAndDelete
    await TrialEvent.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ success: false, error: 'Error deleting event' });
  }
});


// Get all events for the logged-in user
router.get('/getMyTrialEvents', authenticateJWT, async (req, res) => {
  try {
    const events = await TrialEvent.find({ department: req.user.department });

    res.json({ success: true, events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ success: false, error: 'Error fetching events' });
  }
});






module.exports = router;

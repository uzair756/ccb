// routes/coachRoutes.js
const PDFDocument = require('pdfkit'); // For PDF generation
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { RepUser, PlayerNominationForm, TrialEvent} = require('../models');
const authenticateJWT = require('../middleware');
const config = require('../config');
const path = require('path');

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


// Route to get the existing nomination form for current year
router.get('/getNominationForm/:sport', authenticateJWT, async (req, res) => {
  const { sport } = req.params;
  const { department } = req.user;
  const { year } = req.query; // Get year from query params

  try {
    const nomination = await PlayerNominationForm.findOne({ 
      sport, 
      department,
      year: year || new Date().getFullYear().toString() // Default to current year
    });

    if (nomination) {
      return res.json({ success: true, data: nomination });
    } else {
      return res.json({ success: false, message: 'No nominations found for this sport and year' });
    }
  } catch (error) {
    console.error('Error fetching nominations:', error);
    res.status(500).json({ success: false, error: 'Error fetching nominations' });
  }
});

// Route to submit the nomination form (initial submission)
router.post('/submitNominationForm/:sport', authenticateJWT, async (req, res) => {
  const { sport } = req.params;
  const { nominations, repId, repName, repEmail, repDepartment, lastUpdatedBy, lastUpdatedAt, year} = req.body;

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
      year,
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
  const { nominations, repId, repName, repEmail, repDepartment, lastUpdatedBy, lastUpdatedAt, year } = req.body;

  try {
    let nomination = await PlayerNominationForm.findOne({ sport, department: repDepartment });

    if (!nomination) {
      return res.status(404).json({ success: false, message: 'No nomination form found for this sport and department' });
    }

    nomination.nominations = nominations;
    nomination.lastUpdatedBy = lastUpdatedBy;
    nomination.lastUpdatedAt = lastUpdatedAt;
    nomination.year = year;
    await nomination.save();

    return res.json({ success: true, message: 'Nomination updated successfully' });
  } catch (error) {
    console.error('Error updating nomination:', error);
    res.status(500).json({ success: false, error: 'Error updating nomination' });
  }
});


// Route to fetch submitted forms for current year only
router.get('/getSubmittedForms', authenticateJWT, async (req, res) => {
  const { department } = req.user;
  const currentYear = new Date().getFullYear().toString();

  try {
    const submittedForms = await PlayerNominationForm.find({ 
      department,
      year: currentYear 
    });
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
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${sport}_nominations.pdf`);

    // Add IST logo with error handling
    try {
      const logoPath = path.join(__dirname, '../assets/ist.png');
      doc.image(logoPath, 50, 45, { width: 50 });
    } catch (imageError) {
      console.error('Error loading logo:', imageError);
      doc.fontSize(14).text('Institute of Space Technology', 50, 50);
    }

    // Header text
    doc.fontSize(14).text('Institute of Space Technology', 110, 50, { align: 'center' });
    doc.moveDown();

    // Document info table
    doc.fontSize(10);
    doc.text('Doc. No.', 50, 100);
    doc.text('IST-05A-5OP-03', 150, 100);
    doc.text('Form No.', 50, 120);
    doc.text('IST-05A-F-07', 150, 120);
    doc.text('Date of Issue', 50, 140);
    doc.text(new Date().toLocaleDateString(), 150, 140);

    // Title
    doc.fontSize(14).text('Nomination Form Departmental Team', 50, 180, { underline: true });
    doc.fontSize(10).text('Page #', 450, 180);
    doc.text('1 of 1', 500, 180);
    doc.text('Student Affairs', 50, 200);

    // Horizontal line
    doc.moveTo(50, 220).lineTo(550, 220).stroke();

    // Event section
    doc.fontSize(12).text('Event', 50, 240, { underline: true });
    
    // Department Representative Info (using rep fields from your schema)
    doc.fontSize(10);
    doc.text('Department Representative', 50, 270);
    doc.text('Name:', 200, 270);
    doc.text(nomination.repName || 'Not specified', 250, 270);
    doc.text('Email:', 400, 270);
    doc.text(nomination.repEmail || 'Not specified', 450, 270);

    doc.text('Department:', 50, 290);
    doc.text(nomination.repDepartment || 'Not specified', 250, 290);
    doc.text('Category:', 400, 290);
    doc.text(nomination.sport || 'Not specified', 450, 290);

    // Team members table header
    doc.fontSize(10).text('#', 50, 330);
    doc.text('Shirt No.', 80, 330);
    doc.text('Name', 130, 330);
    doc.text('Reg. No.', 250, 330);
    doc.text('CNIC No.', 350, 330);
    doc.text('Section', 450, 330);

    // Team members data
    let y = 350;
    nomination.nominations?.forEach((player, index) => {
      doc.text(`${index + 1}`, 50, y);
      doc.text(player?.shirtNo || 'N/A', 80, y);
      doc.text(player?.name || 'N/A', 130, y);
      doc.text(player?.regNo || 'N/A', 250, y);
      doc.text(player?.cnic || 'N/A', 350, y);
      doc.text(player?.section || 'N/A', 450, y);
      y += 20;
    });

    // Footer
    doc.moveTo(50, y + 30).lineTo(550, y + 30).stroke();
    doc.fontSize(8).text('CONTROLLED', 50, y + 40);
    doc.text(new Date().toLocaleDateString(), 150, y + 40);
    
    doc.fontSize(10).text('Last Updated By: ' + (nomination.lastUpdatedBy || 'Unknown'), 50, y + 70);
    doc.text('Date: ' + nomination.lastUpdatedAt.toLocaleDateString(), 400, y + 70);

    doc.pipe(res);
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

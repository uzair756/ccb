// routes/dsaRoutes.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { DSAUser,AdminPost,Department,PlayerNominationForm,createScheduleModel,BestCricketer,BestFootballPlayer,BestFutsalPlayer,BestBasketballPlayer,SportsCoachUser,CoordinatorUser,RepUser,RefUser,CaptainUser,BestTennisPlayer,BestBadmintonFemalePlayer,BestBadmintonMalePlayer,BestTableTennisFemalePlayer,BestTableTennisMalePlayer,BestSnookerPlayer,TeamRankings,Pools} = require('../models');
const authenticateJWT = require('../middleware');
const config = require('../config');
const upload = require('./multerConfig');
const PDFDocument = require('pdfkit'); // For PDF generation
const fs = require('fs');

const router = express.Router();


// DSA login route
router.post('/dsalogin', async (req, res) => {
  const { email, password } = req.body;
  const user = await DSAUser.findOne({ email });
  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ id: user._id, username: user.username, email: user.email, loggedin: user.loggedin }, config.JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, message: 'Logged in successfully', token });
  } else {
    res.json({ success: false, message: 'Invalid credentials' });
  }
});

// DSA landing page route
router.get('/dsalandingpage', authenticateJWT, async (req, res) => {
  try {
    const posts = await AdminPost.find({ adminpostuserId: req.user.id }); // Fetch posts created by the logged-in user
    res.json({ success: true, user: req.user, posts });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ error: 'Error fetching user posts' });
  }
});


// Create admin post with image upload
router.post('/adminpost', authenticateJWT, upload.single('adminimagepost'), async (req, res) => {
  const { adminpostdescription } = req.body;
  const { username, email, id } = req.user;

  try {
    const newPost = new AdminPost({
      adminpostdescription,
      adminimagepost: req.file ? {
        data: req.file.buffer,
        contentType: req.file.mimetype
      } : null,
      adminpostuserId: id,
      adminpostusername: username,
      adminpostemail: email,
    });

    const savedPost = await newPost.save();
    res.status(201).json({ 
      success: true, 
      message: 'Post created successfully', 
      post: savedPost 
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Error creating post' });
  }
});

// Get image for a post
router.get('/adminpost/image/:id', async (req, res) => {
  try {
    const post = await AdminPost.findById(req.params.id);
    
    if (!post || !post.adminimagepost || !post.adminimagepost.data) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.set('Content-Type', post.adminimagepost.contentType);
    res.send(post.adminimagepost.data);
  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({ error: 'Error fetching image' });
  }
});



// Update admin post with image handling
router.put('/adminpost/:id', authenticateJWT, upload.single('adminimagepost'), async (req, res) => {
  try {
    const { adminpostdescription, removeImage } = req.body;
    const updateData = { adminpostdescription };

    if (req.file) {
      updateData.adminimagepost = {
        data: req.file.buffer,
        contentType: req.file.mimetype
      };
    } else if (removeImage === 'true') {
      updateData.adminimagepost = null;
    }

    const updatedPost = await AdminPost.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ 
      success: true, 
      message: 'Post updated successfully', 
      updatedPost 
    });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Error updating post' });
  }
});




router.post('/changepasswordadmin', authenticateJWT, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    const user = await DSAUser.findById(userId);

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


// Initialize with empty teams array if no document exists
router.post('/init', authenticateJWT, async (req, res) => {
  try {
    const existing = await Department.findOne();
    if (!existing) {
      const department = new Department({ teams: [] });
      await department.save();
      return res.json({ message: 'Department collection initialized', teams: [] });
    }
    res.json({ message: 'Department collection already exists', teams: existing.teams });
  } catch (error) {
    res.status(500).json({ message: 'Initialization failed', error: error.message });
  }
});

// Add new team with validation
router.post('/teams', authenticateJWT, async (req, res) => {
  const { team } = req.body;
  
  if (!team || typeof team !== 'string') {
    return res.status(400).json({ message: 'Team name is required' });
  }

  // Additional validation
  if (!/^[A-Za-z]+$/.test(team)) {
    return res.status(400).json({ message: 'Team name must contain only alphabets' });
  }

  const teamUpper = team.toUpperCase();

  try {
    let department = await Department.findOne();
    if (!department) {
      department = new Department({ teams: [] });
    }

    if (department.teams.includes(teamUpper)) {
      return res.status(400).json({ message: 'Team already exists' });
    }

    department.teams.push(teamUpper);
    await department.save();
    res.json({ teams: department.teams });
  } catch (error) {
    res.status(500).json({ message: 'Error adding team', error: error.message });
  }
});

// Get all teams
router.get('/teams', authenticateJWT, async (req, res) => {
  try {
    const department = await Department.findOne();
    if (!department) {
      // Create initial document if none exists
      const newDepartment = new Department();
      await newDepartment.save();
      return res.json({ teams: newDepartment.teams });
    }
    res.json({ teams: department.teams });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching teams', error: error.message });
  }
});


// Remove team
router.delete('/teams/:team', authenticateJWT, async (req, res) => {
  const { team } = req.params;

  try {
    const department = await Department.findOne();
    if (!department) {
      return res.status(404).json({ message: 'No teams found' });
    }

    const index = department.teams.indexOf(team);
    if (index === -1) {
      return res.status(404).json({ message: 'Team not found' });
    }

    department.teams.splice(index, 1);
    await department.save();
    res.json({ teams: department.teams });
  } catch (error) {
    res.status(500).json({ message: 'Error removing team', error: error.message });
  }
});


// Get all departments with their nomination status
router.get('/nomination-status', authenticateJWT, async (req, res) => {
  const year = req.query.year || new Date().getFullYear().toString();
  
  try {
    // Get all departments
    const departmentDoc = await Department.findOne();
    if (!departmentDoc || !departmentDoc.teams) {
      return res.status(404).json({ 
        success: false, 
        message: 'No departments found' 
      });
    }

    // Get all nominations for selected year
    const allNominations = await PlayerNominationForm.find({ year });

    // Define sports array (must match frontend exactly)
    const sports = [
      'Football', 'Futsal', 'Volleyball', 'Basketball',
      'Table Tennis (M)', 'Table Tennis (F)', 'Snooker', 
      'Tug of War (M)', 'Tug of War (F)', 'Tennis', 
      'Cricket', 'Badminton (M)', 'Badminton (F)'
    ];

    // Prepare response
    const departments = departmentDoc.teams.map(dept => {
      const deptNominations = allNominations.filter(n => n.department === dept);
      
      const sportsStatus = sports.map(sport => {
        const nomination = deptNominations.find(n => n.sport === sport);
        return {
          sport,
          submitted: !!nomination,
          hasPlayers: nomination?.nominations?.length > 0 || false,
          lastUpdated: nomination?.lastUpdatedAt || null
        };
      });
      
      return {
        department: dept,
        sportsStatus
      };
    });

    res.json({ 
      success: true, 
      data: departments 
    });
  } catch (error) {
    console.error('Error fetching nomination status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});


// Download PDF for specific department and sport
router.get('/downloadPDF/:department/:sport', authenticateJWT, async (req, res) => {
  const { department, sport } = req.params;
  const year = req.query.year || new Date().getFullYear().toString();

  try {
    const nomination = await PlayerNominationForm.findOne({ 
      sport, 
      department,
      year
    });

    if (!nomination) {
      return res.status(404).json({ 
        success: false, 
        message: `No nomination form found for ${sport} and ${department} in ${year}` 
      });
    }

    if (!nomination.nominations || nomination.nominations.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No players nominated for this sport' 
      });
    }

     // Generate PDF
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${department}_${sport}_nominations.pdf`);

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
    
    // Department Representative Info
    doc.fontSize(10);
    doc.text('Department Representative', 50, 270);
    doc.text('Name:', 200, 270);
    doc.text(nomination.repName || 'Not specified', 250, 270);
    doc.text('Email:', 400, 270);
    doc.text(nomination.repEmail || 'Not specified', 450, 270);

    doc.text('Department:', 50, 290);
    doc.text(nomination.department || 'Not specified', 250, 290);
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
    nomination.nominations.forEach((player, index) => {
      doc.text(`${index + 1}`, 50, y);
      doc.text(player?.shirtNo?.toString() || 'N/A', 80, y);
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
    doc.text('Date: ' + (nomination.lastUpdatedAt?.toLocaleDateString() || new Date().toLocaleDateString()), 400, y + 70);
    
    // Finalize PDF and send
    doc.pipe(res);
    doc.end();
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate PDF' 
    });
  }
});



// Get schedules with edit capability
router.get('/dsa/schedules', authenticateJWT, async (req, res) => {
  const { sport, year } = req.query;

  try {
    const ScheduleModel = createScheduleModel(sport);
    if (!ScheduleModel) {
      return res.status(400).json({ success: false, message: 'Invalid sport category' });
    }

    const schedules = await ScheduleModel.find({ sport, year })
      .sort({ pool: 1, matchDate: 1 })
      .lean();

    res.json({ success: true, schedules });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update schedule
router.put('/dsa/schedules/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { sport, updates } = req.body;
  const user = req.user.username;

  try {
    const ScheduleModel = createScheduleModel(sport);
    if (!ScheduleModel) {
      return res.status(400).json({ success: false, message: 'Invalid sport category' });
    }

    const updatedSchedule = await ScheduleModel.findByIdAndUpdate(
      id,
      {
        ...updates,
        updatedBy: user,
        lastUpdated: new Date()
      },
      { new: true }
    );

    if (!updatedSchedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    res.json({ success: true, schedule: updatedSchedule });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// Get all players data
router.get('/admin/players', async (req, res) => {
  const { sport, year } = req.query;

  try {
    let playersData;
    switch(sport) {
      case 'Cricket':
        playersData = await BestCricketer.findOne({ year });
        break;
      case 'Football':
        playersData = await BestFootballPlayer.findOne({ year });
        break;
      case 'Futsal':
        playersData = await BestFutsalPlayer.findOne({ year });
        break;
      case 'Basketball':
        playersData = await BestBasketballPlayer.findOne({ year });
        break;
      case 'Tennis':
        playersData = await BestTennisPlayer.findOne({ year });
        break;
      case 'Table Tennis (M)':
        playersData = await BestTableTennisMalePlayer.findOne({ year });
        break;
      case 'Table Tennis (F)':
        playersData = await BestTableTennisFemalePlayer.findOne({ year });
        break;
      case 'Badminton (M)':
        playersData = await BestBasketballPlayer.findOne({ year });
        break;
      case 'Badminton (F)':
        playersData = await BestBasketballPlayer.findOne({ year });
        break;
        case 'Snooker':
        playersData = await BestSnookerPlayer.findOne({ year });
        break;
      default:
        return res.status(400).json({ 
          success: false, 
          message: 'This sport is qualitatively evaluated by referees' 
        });
    }

    if (!playersData || !playersData.nominations || playersData.nominations.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: `No ${sport} players data found for ${year}` 
      });
    }

    res.json({ 
      success: true, 
      players: playersData.nominations,
      sport,
      year
    });

  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

router.get('/admin/players/pdf', async (req, res) => {
  const { sport, year } = req.query;

  try {
    let playersData;
    switch(sport) {
      case 'Cricket':
        playersData = await BestCricketer.findOne({ year });
        break;
      case 'Football':
        playersData = await BestFootballPlayer.findOne({ year });
        break;
      case 'Futsal':
        playersData = await BestFutsalPlayer.findOne({ year });
        break;
      case 'Basketball':
        playersData = await BestBasketballPlayer.findOne({ year });
        break;
        case 'Tennis':
        playersData = await BestTennisPlayer.findOne({ year });
        break;
        case 'Table Tennis (M)':
        playersData = await BestTableTennisMalePlayer.findOne({ year });
        break;
      case 'Table Tennis (F)':
        playersData = await BestTableTennisFemalePlayer.findOne({ year });
        break;
      case 'Badminton (M)':
        playersData = await BestBadmintonMalePlayer.findOne({ year });
        break;
      case 'Badminton (F)':
        playersData = await BestBadmintonFemalePlayer.findOne({ year });
        break;
        case 'Snooker':
        playersData = await BestSnookerPlayer.findOne({ year });
        break;
      default:
        return res.status(400).json({ 
          success: false, 
          message: 'Cannot generate PDF for this sport' 
        });
    }

    if (!playersData || !playersData.nominations || playersData.nominations.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: `No data to generate PDF` 
      });
    }

    // Create PDF document - always use portrait mode
    const doc = new PDFDocument({
      margin: 20,
      size: 'letter' // Standard portrait size for all sports
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${sport}_players_${year}.pdf`);
    doc.pipe(res);
    
    // Add title
    doc.font('Helvetica-Bold')
       .fontSize(18)
       .text(`${sport} Players Performance - ${year}`, { 
         align: 'center',
         underline: true
       });
    doc.moveDown(1);
    
    // Table setup - add wickets column for cricket
    const headers = sport === 'Cricket' 
      ? ['Name', 'Reg No', 'Section', 'Runs', 'Wickets']
      : ['Name', 'Reg No', 'Section', sport === 'Basketball' || sport === 'Table Tennis (M)' || sport === 'Table Tennis (F)' || sport === 'Badminton (M)' || sport === 'Badminton (F)' || sport === 'Snooker' || sport === 'Tennis'   ? 'Points' : 'Goals'];
    
    const rows = playersData.nominations.map(player => {
      if (sport === 'Cricket') {
        return [
          player.name || '-',
          player.regNo || '-',
          player.section || '-',
          player.totalrunsScored?.toString() || '0',
          player.totalwicketstaken?.toString() || '0'
        ];
      } else if (sport === 'Basketball' || sport === 'Table Tennis (M)' || sport === 'Table Tennis (F)' || sport === 'Badminton (M)' || sport === 'Badminton (F)' || sport === 'Snooker' || sport === 'Tennis' ) {
        return [
          player.name || '-',
          player.regNo || '-',
          player.section || '-',
          player.totalpointsscored?.toString() || '0'
        ];
      } else {
        return [
          player.name || '-',
          player.regNo || '-',
          player.section || '-',
          player.totalgoalsscored?.toString() || '0'
        ];
      }
    });

    // Calculate column widths
    const pageWidth = 572; // Account for margins in portrait mode
    const columnCount = headers.length;
    const colWidth = pageWidth / columnCount;
    const rowHeight = 20;
    let y = 100; // Starting Y position after title

    // Draw table header
    doc.font('Helvetica-Bold').fontSize(12);
    headers.forEach((header, i) => {
      doc.text(header, 20 + (i * colWidth), y, {
        width: colWidth - 10,
        align: 'left'
      });
    });
    
    // Draw header underline
    y += rowHeight;
    doc.moveTo(20, y).lineTo(pageWidth, y).stroke();
    y += 10;

    // Draw table rows
    doc.font('Helvetica').fontSize(10);
    rows.forEach((row) => {
      // Check for page break
      if (y > 750) {
        doc.addPage({
          size: 'letter',
          margin: 20
        });
        y = 40;
        
        // Redraw header
        doc.font('Helvetica-Bold').fontSize(12);
        headers.forEach((header, i) => {
          doc.text(header, 20 + (i * colWidth), y, {
            width: colWidth - 10,
            align: 'left'
          });
        });
        y += rowHeight;
        doc.moveTo(20, y).lineTo(pageWidth, y).stroke();
        y += 10;
        doc.font('Helvetica').fontSize(10);
      }

      // Draw row cells
      row.forEach((cell, i) => {
        doc.text(cell, 20 + (i * colWidth), y, {
          width: colWidth - 10,
          align: 'left'
        });
      });
      y += rowHeight;
    });

    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating PDF: ' + error.message 
    });
  }
});



// Get all users for DSA
router.get('/dsa/allusers', async (req, res) => {
  try {
    const coaches = await SportsCoachUser.find({}, '-__v');
    const coordinators = await CoordinatorUser.find({}, '-__v');
    const reps = await RepUser.find({}, '-__v');
    const refs = await RefUser.find({}, '-__v');
    const captains = await CaptainUser.find({}, '-__v');

    const allUsers = [
      ...coaches,
      ...coordinators,
      ...reps,
      ...refs,
      ...captains
    ];

    res.json({ success: true, users: allUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete user by role and ID
router.delete('/dsa/deleteuser/:role/:id', async (req, res) => {
  const { role, id } = req.params;

  const models = {
    coach: SportsCoachUser,
    coordinator: CoordinatorUser,
    rep: RepUser,
    ref: RefUser,
    captain: CaptainUser
  };

  const Model = models[role.toLowerCase()];
  if (!Model) {
    return res.status(400).json({ success: false, message: 'Invalid role' });
  }

  try {
    const deleted = await Model.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: `${role} deleted successfully` });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Check if rankings exist
router.get('/check-rankings', authenticateJWT, async (req, res) => {
  const { sport, year } = req.query;
  
  try {
    const existingRanking = await TeamRankings.findOne({ 
      category: sport, 
      year 
    });
    
    if (existingRanking) {
      return res.json({ 
        exists: true, 
        message: 'Rankings already exist for this sport and year' 
      });
    }
    
    res.json({ exists: false });
  } catch (error) {
    console.error('Error checking rankings:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get existing rankings
router.get('/get-rankings', authenticateJWT, async (req, res) => {
  const { sport, year } = req.query;
  
  try {
    const rankings = await TeamRankings.findOne({ 
      category: sport, 
      year 
    });
    
    if (!rankings) {
      return res.status(404).json({ 
        success: false, 
        message: 'Rankings not found' 
      });
    }
    
    res.json({ success: true, rankings });
  } catch (error) {
    console.error('Error fetching rankings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching rankings' 
    });
  }
});

// Generate rankings - Updated to include playoff losing teams
router.post('/generate-rankings', authenticateJWT, async (req, res) => {
  const { sport, year } = req.body;
  
  try {
    // 1. Check if final exists and has result
    const ScheduleModel = createScheduleModel(sport);
    const finalMatch = await ScheduleModel.findOne({ 
      sport, 
      year, 
      pool: 'final',
      result: { $exists: true, $ne: null }
    });
    
    if (!finalMatch) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot generate rankings - final match not completed yet' 
      });
    }
    
    // 2. Get pools data
    const pools = await Pools.findOne({ sport, year });
    if (!pools) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cannot generate rankings - pools not found' 
      });
    }
    
    // 3. Resolve TBD teams and get playoff results
    const resolveTBD = async (team) => {
      if (team !== 'TBD') return team;
      const playoffMatch = await ScheduleModel.findOne({
        sport, year, pool: 'play-off', 
        result: { $exists: true, $ne: null }
      });
      if (!playoffMatch) {
        throw new Error('Cannot resolve TBD team - play-off match not completed');
      }
      return playoffMatch.result;
    };
    
    const resolvedPoolA = await Promise.all(pools.poolA.map(resolveTBD));
    const resolvedPoolB = await Promise.all(pools.poolB.map(resolveTBD));
    
    // Get playoff loser (if exists)
    const playoffMatch = await ScheduleModel.findOne({
      sport, year, pool: 'play-off',
      result: { $exists: true, $ne: null }
    });
    const playoffLoser = playoffMatch ? 
      (playoffMatch.result === playoffMatch.team1 ? playoffMatch.team2 : playoffMatch.team1) : 
      null;
    
    // 4. Get all pool matches (Pool A and Pool B)
    const poolMatches = await ScheduleModel.find({
      sport,
      year,
      pool: { $in: ['A', 'B'] },
      result: { $exists: true, $ne: null }
    });
    
    // 5. Calculate team stats for all teams (including playoff loser)
    const teamStats = {};
    let allTeams = [...new Set([...resolvedPoolA, ...resolvedPoolB].filter(team => team !== 'TBD'))];
    
    // Add playoff loser if not already in teams
    if (playoffLoser && !allTeams.includes(playoffLoser)) {
      allTeams.push(playoffLoser);
    }
    
    allTeams.forEach(team => {
      teamStats[team] = { 
        wins: 0, 
        matches: 0,
        pointsFor: 0,
        pointsAgainst: 0
      };
    });
    
    // Process pool matches
    poolMatches.forEach(match => {
      if (match.result && teamStats[match.result]) {
        teamStats[match.result].wins++;
      }
      
      if (teamStats[match.team1]) {
        teamStats[match.team1].matches++;
        teamStats[match.team1].pointsFor += match.scoreT1 || 0;
        teamStats[match.team1].pointsAgainst += match.scoreT2 || 0;
      }
      
      if (teamStats[match.team2]) {
        teamStats[match.team2].matches++;
        teamStats[match.team2].pointsFor += match.scoreT2 || 0;
        teamStats[match.team2].pointsAgainst += match.scoreT1 || 0;
      }
    });
    
    // 6. Get knockout stage results
    const semiMatches = await ScheduleModel.find({
      sport,
      year,
      pool: 'semi',
      result: { $exists: true, $ne: null }
    });
    
    const semiLosers = semiMatches.map(match => 
      match.result === match.team1 ? match.team2 : match.team1
    );
    
    // 7. Determine rankings
    const rankings = {
      category: sport,
      year,
      P1: finalMatch.result,
      P2: finalMatch.result === finalMatch.team1 ? finalMatch.team2 : finalMatch.team1
    };
    
    // Add semi-final losers (3rd and 4th)
    if (semiLosers.length >= 2) {
      rankings.P3 = semiLosers[0];
      rankings.P4 = semiLosers[1];
    }
    
    // Rank remaining teams (including playoff loser if not already in top 4)
    const remainingTeams = allTeams.filter(team => 
      !Object.values(rankings).includes(team)
    );
    
    remainingTeams.sort((a, b) => {
      // Primary sort by wins
      if (teamStats[b].wins !== teamStats[a].wins) {
        return teamStats[b].wins - teamStats[a].wins;
      }
      
      // Secondary sort by head-to-head
      const headToHead = poolMatches.find(m => 
        (m.team1 === a && m.team2 === b) || 
        (m.team1 === b && m.team2 === a)
      );
      
      if (headToHead?.result) {
        return headToHead.result === b ? 1 : -1;
      }
      
      // Tertiary sort by point difference
      const diffA = teamStats[a].pointsFor - teamStats[a].pointsAgainst;
      const diffB = teamStats[b].pointsFor - teamStats[b].pointsAgainst;
      return diffB - diffA;
    });
    
    // Add remaining teams to rankings dynamically (starting from P5)
    remainingTeams.forEach((team, index) => {
      rankings[`P${index + 5}`] = team;
    });
    
    // 8. Save to database
    const newRanking = new TeamRankings(rankings);
    await newRanking.save();
    
    res.json({ 
      success: true, 
      message: 'Rankings generated successfully',
      rankings
    });
    
  } catch (error) {
    console.error('Error generating rankings:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error generating rankings'
    });
  }
});



module.exports = router;

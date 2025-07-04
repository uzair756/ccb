const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { SportsCoachUser, SportsRules, TeamRankings, Pools, Schedules,createScheduleModel,PlayerNominationForm, Department} = require('../models');
const authenticateJWT = require('../middleware');
const config = require('../config');

const router = express.Router();

// Sports Coach signup route
router.post('/dsasportscoachuser', async (req, res) => {
  try {
    const existingUser = await SportsCoachUser.findOne({ email: req.body.email });
    if (existingUser) return res.status(400).json({ success: false, error: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = new SportsCoachUser({ ...req.body, password: hashedPassword });
    const result = await user.save();
    res.status(201).json({ success: true, user: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error creating account' });
  }
});

// Handle user login
router.post('/sportscoachlogin', async (req, res) => {
  const { email, password } = req.body;
  if (email && password) {
    const user = await SportsCoachUser.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user._id, username: user.username, email: user.email, loggedin: user.loggedin }, config.JWT_SECRET, { expiresIn: '24h' });
      res.json({ success: true, message: 'Logged in successfully', token });
    } else {
      res.json({ success: false, message: 'Invalid credentials' });
    }
  } else {
    res.json({ success: false, message: 'Please provide email and password' });
  }
});

// Sports Coach landing page route
router.get('/coachlandingpage', authenticateJWT, (req, res) => {
  res.json({ success: true, user: req.user });
});

// Change password route
router.post('/changepasswordcoach', authenticateJWT, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    const user = await SportsCoachUser.findById(userId);

    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) return res.status(400).json({ error: 'Current password is incorrect' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Error changing password' });
  }
});

// Fetch rules for a specific sport
router.get('/getrules/:sport', authenticateJWT, async (req, res) => {
  const { sport } = req.params;

  try {
    const rules = await SportsRules.findOne({ sport });
    if (rules) {
      res.json({
        success: true,
        rules: {
          rules: rules.rules,
          lastUpdatedBy: rules.lastUpdatedBy,
          updatedAt: rules.updatedAt,
        },
      });
    } else {
      res.status(404).json({ success: false, message: 'Rules not found' });
    }
  } catch (error) {
    console.error('Error fetching rules:', error);
    res.status(500).json({ success: false, error: 'Error fetching rules' });
  }
});

// Update rules for a specific sport
router.put('/updaterules/:sport', authenticateJWT, async (req, res) => {
  const { sport } = req.params;
  const { rules } = req.body;

  try {
    const user = await SportsCoachUser.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const updated = await SportsRules.findOneAndUpdate(
      { sport },
      {
        rules,
        lastUpdatedBy: user.username,
        updatedAt: new Date(),
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      updated: {
        sport: updated.sport,
        rules: updated.rules,
        lastUpdatedBy: updated.lastUpdatedBy,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating rules:', error);
    res.status(500).json({ success: false, error: 'Error updating rules' });
  }
});

router.post('/create-pools', authenticateJWT, async (req, res) => {
  const { sport } = req.body;
  const user = req.user;
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  try {
    // 1. Check if pools already exist
    const existingPools = await Pools.findOne({ 
      sport, 
      year: currentYear.toString() 
    });

    if (existingPools) {
      return res.status(400).json({
        success: false,
        message: `Pools already exist for ${currentYear} (created by ${existingPools.createdBy})`
      });
    }

    // 2. Get available teams from Department collection
    const department = await Department.findOne();
    if (!department || !department.teams || department.teams.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No teams found in department configuration. Please configure departments first.'
      });
    }
    const availableTeams = department.teams;

    // 3. Fetch and validate team rankings
    const rankings = await TeamRankings.find({ 
      category: sport, 
      year: previousYear.toString() 
    }).sort({ P1: 1 });

    if (!rankings || rankings.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: `No rankings found for ${sport} in ${previousYear}` 
      });
    }

    // 4. Extract and validate teams from rankings
    const rankedTeams = [];
    rankings.forEach(rank => {
      for (const key in rank) {
        if (key.match(/^P\d+$/) && rank[key]) {
          rankedTeams.push(rank[key]);
        }
      }
    });

    if (rankedTeams.length < 3) {
      return res.status(400).json({
        success: false,
        message: `Need at least 3 teams to create pools (found ${rankedTeams.length})`
      });
    }

    // Validate all ranked teams exist in department configuration
    const invalidTeams = rankedTeams.filter(team => !availableTeams.includes(team));
    if (invalidTeams.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid team(s) found in rankings that don't exist in department configuration: ${invalidTeams.join(', ')}`
      });
    }

    // 5. Determine teams for pools and playoff
    let poolA = [];
    let poolB = [];
    let playoffTeams = [];
    const hasOddTeams = rankedTeams.length % 2 !== 0;

    if (hasOddTeams) {
      // For odd number of teams (e.g., 11 teams)
      playoffTeams = rankedTeams.slice(-2); // Last two teams for playoff
      const teamsForPools = rankedTeams.slice(0, -2); // Consider only R1-R9
      
      // Distribute R1-R9 with TBD to make even
      for (let i = 0; i < teamsForPools.length; i++) {
        if (i % 2 === 0) {
          poolA.push(teamsForPools[i]); // Odd positions (1,3,5,7,9)
        } else {
          poolB.push(teamsForPools[i]); // Even positions (2,4,6,8)
        }
      }
      poolB.push('TBD'); // Add TBD to make pools equal size
    } else {
      // For even number of teams (e.g., 12 teams)
      for (let i = 0; i < rankedTeams.length; i++) {
        if (i % 2 === 0) {
          poolA.push(rankedTeams[i]); // Odd positions (1,3,5,7,9,11)
        } else {
          poolB.push(rankedTeams[i]); // Even positions (2,4,6,8,10,12)
        }
      }
    }

    // 6. Get all nominations at once for efficiency
    const nominations = await PlayerNominationForm.find({
      sport,
      year: currentYear,
      department: { $in: rankedTeams }
    });

    const getNominations = (team) => {
      if (team === 'TBD') return [];
      const found = nominations.find(n => n.department === team);
      return found ? found.nominations : [];
    };

    // 7. Save pools
    const newPools = new Pools({
      sport,
      poolA,
      poolB,
      createdBy: user.username,
      year: currentYear.toString(),
    });
    await newPools.save();

    // 8. Create schedules
    const schedules = [];
    const createPoolMatches = (pool, poolName) => {
      for (let i = 0; i < pool.length; i++) {
        for (let j = i + 1; j < pool.length; j++) {
          const team1 = pool[i];
          const team2 = pool[j];

          // Skip matches where both teams are TBD
          if (team1 === 'TBD' && team2 === 'TBD') continue;

          schedules.push({
            pool: poolName,
            team1,
            team2,
            sport,
            year: currentYear.toString(),
            status: 'upcoming',
            result: null,
            nominationsT1: getNominations(team1),
            nominationsT2: getNominations(team2),
          });
        }
      }
    };

    createPoolMatches(poolA, 'Pool A');
    createPoolMatches(poolB, 'Pool B');

    // 9. Create playoff match for odd number of teams
    if (hasOddTeams && playoffTeams.length === 2) {
      schedules.unshift({
        pool: 'play-off',
        team1: playoffTeams[0],
        team2: playoffTeams[1],
        sport,
        year: currentYear.toString(),
        status: 'upcoming',
        result: 'TBD',
        nominationsT1: getNominations(playoffTeams[0]),
        nominationsT2: getNominations(playoffTeams[1]),
        isPlayoff: true
      });
    }

    // 10. Save schedules
    const sportScheduleModel = createScheduleModel(sport);
    await sportScheduleModel.insertMany(schedules);

    // 11. Prepare response
    const response = {
      success: true,
      message: `Successfully created pools with ${poolA.length} teams in Pool A and ${poolB.length} teams in Pool B`,
      data: {
        totalTeams: rankedTeams.length,
        poolA,
        poolB,
        totalMatches: schedules.length,
        hasPlayoff: hasOddTeams,
        playoffMatch: hasOddTeams ? {
          team1: playoffTeams[0],
          team2: playoffTeams[1],
          status: 'upcoming',
          result: 'TBD'
        } : null,
        schedules: schedules.map(s => ({
          pool: s.pool,
          team1: s.team1,
          team2: s.team2,
          status: s.status,
          isPlayoff: s.isPlayoff || false
        }))
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Error creating pools:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating pools and schedules',
      error: error.message,
      details: {
        sport,
        year: currentYear,
        step: 'pool-creation'
      }
    });
  }
});


// // Fetch pools and schedules for a specific sport
// router.get('/get-pools-and-schedules/:sport', authenticateJWT, async (req, res) => {
//   const { sport } = req.params;

//   try {
//     const pools = await Pools.findOne({ sport });

//     if (!pools) {
//       return res.status(404).json({ success: false, message: `Pools not found for ${sport}.` });
//     }

//     const schedules = await Schedules.find({ sport }).sort({ createdAt: 1 });

//     if (!schedules || schedules.length === 0) {
//       return res.status(404).json({ success: false, message: `No schedules found for ${sport}.` });
//     }

//     res.json({
//       success: true,
//       pools: {
//         poolA: pools.poolA,
//         poolB: pools.poolB,
//       },
//       schedules,
//     });
//   } catch (error) {
//     console.error('Error fetching pools and schedules:', error);
//     res.status(500).json({ success: false, message: 'Server error while fetching pools and schedules.' });
//   }
// });
// Fetch pools and schedules for a specific sport
router.get('/get-pools-and-schedules/:sport', authenticateJWT, async (req, res) => {
  const { sport } = req.params;

  try {
    const pools = await Pools.findOne({ sport });

    if (!pools) {
      return res.status(404).json({ success: false, message: `Pools not found for ${sport}.` });
    }

    // Use the updated createScheduleModel function
    const ScheduleModel = createScheduleModel(sport);
    const schedules = await ScheduleModel.find().sort({ createdAt: 1 });

    if (!schedules || schedules.length === 0) {
      return res.status(404).json({ success: false, message: `No schedules found for ${sport}.` });
    }

    res.json({
      success: true,
      pools: {
        poolA: pools.poolA,
        poolB: pools.poolB,
      },
      schedules,
    });
  } catch (error) {
    console.error('Error fetching pools and schedules:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching pools and schedules.' });
  }
});




// // Fetch schedules for a specific sport and year
// router.get('/get-schedules', authenticateJWT, async (req, res) => {
//   const { sport, year } = req.query;

//   if (!sport || !year) {
//     return res.status(400).json({ success: false, message: 'Sport and year are required.' });
//   }

//   try {
//     const schedules = await Schedules.find({ sport, year }).sort({ createdAt: 1 });

//     if (schedules.length > 0) {
//       res.json({ success: true, schedules });
//     } else {
//       res.json({ success: false, message: 'No schedules found for the specified sport and year.' });
//     }
//   } catch (error) {
//     console.error('Error fetching schedules:', error);
//     res.status(500).json({ success: false, message: 'Server error while fetching schedules.' });
//   }
// });
// Fetch schedules for a specific sport and year
router.get('/get-schedules', authenticateJWT, async (req, res) => {
  const { sport, year } = req.query;

  if (!sport || !year) {
    return res.status(400).json({ success: false, message: 'Sport and year are required.' });
  }

  try {
    const ScheduleModel = createScheduleModel(sport); // Get dynamic model

    if (!ScheduleModel) {
      return res.status(400).json({ success: false, message: 'Invalid sport category.' });
    }

    const schedules = await ScheduleModel.find({ sport, year }).sort({ createdAt: 1 });

    if (schedules.length > 0) {
      res.json({ success: true, schedules });
    } else {
      res.status(404).json({ success: false, message: 'No schedules found for the specified sport and year.' });
    }
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching schedules.' });
  }
});






// POST route to store rankings in the database
router.post("/store-rankings", authenticateJWT, async (req, res) => {
  const { sport, year, rankings } = req.body;

  try {
    if (!sport || !year || !rankings) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Filter out empty rankings (ignore empty selections)
    const filteredRankings = Object.fromEntries(
      Object.entries(rankings).filter(([key, value]) => value)
    );

    if (Object.keys(filteredRankings).length === 0) {
      return res.status(400).json({ success: false, message: "No valid rankings provided" });
    }

    // Save to database
    const newRanking = new TeamRankings({
      category: sport,
      year,
      ...filteredRankings,
    });

    await newRanking.save();
    res.json({ success: true, message: "Rankings stored successfully!" });
  } catch (error) {
    console.error("Error storing rankings:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


// Add this to your departmentRoutes.js
router.get('/teams', authenticateJWT, async (req, res) => {
  try {
    const department = await Department.findOne();
    if (!department) {
      return res.status(404).json({ 
        success: false,
        message: 'Department configuration not found'
      });
    }
    res.json({ 
      success: true,
      teams: department.teams || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching teams',
      error: error.message
    });
  }
});


// Get Department List
router.get('/departments', async (req, res) => {
  try {
    const departmentDoc = await Department.findOne({}, { teams: 1 }); // Assuming collection is "Department"
    if (!departmentDoc) {
      return res.status(404).json({ success: false, error: 'Departments not found' });
    }

    res.status(200).json({ success: true, departments: departmentDoc.teams });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});



module.exports = router;

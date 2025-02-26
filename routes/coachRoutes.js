const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { SportsCoachUser, SportsRules, TeamRankings, Pools, Schedules,createScheduleModel,PlayerNominationForm} = require('../models');
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

// Create pools and schedules
// // Create pools and schedules
// router.post('/create-pools', authenticateJWT, async (req, res) => {
//   const { sport } = req.body;
//   const user = req.user;
//   const currentYear = new Date().getFullYear();
//   const previousYear = currentYear - 1;

//   try {
//     // Check if pools already exist for the current year
//     const existingPools = await Pools.findOne({ sport, year: currentYear.toString() });
//     if (existingPools) {
//       return res.status(400).json({
//         success: false,
//         message: `Pools and schedules for ${currentYear} have already been created by ${existingPools.createdBy}.`,
//       });
//     }

//     // Fetch team rankings from the previous year
//     const rankings = await TeamRankings.find({ category: sport, year: previousYear.toString() }).sort({ P1: 1 });
//     if (!rankings || rankings.length === 0) {
//       return res.status(404).json({ success: false, message: `No team rankings found for ${sport} in ${previousYear}.` });
//     }

//     const teams = [];
//     rankings.forEach(rank => {
//       teams.push(rank.P1, rank.P2, rank.P3, rank.P4, rank.P5, rank.P6, rank.P7, rank.P8);
//     });

//     // Remove undefined or empty entries
//     const validTeams = teams.filter(team => team);

//     // Check for 7 teams scenario
//     let teamsToConsider;
//     if (validTeams.length === 7) {
//       // Exclude the last two entries to get 5 teams
//       teamsToConsider = validTeams.slice(0, 5);

//       // Get the last team using play-off status from schedules
//       const playOffMatch = await Schedules.findOne({ pool: 'play-off', sport }).sort({ createdAt: -1 });
//       if (playOffMatch) {
//         teamsToConsider.push(playOffMatch.status); // Use play-off status as the last team
//       }

//       // Add 'TBD' as the 6th team
//       teamsToConsider.push('TBD');
//     } else {
//       // Default case: Consider the top 8 or less if not enough teams
//       teamsToConsider = validTeams.slice(0, 8);
//     }

//     console.log('Teams considered for pools:', teamsToConsider);

//     // Create pools manually for 7 teams scenario
//     let poolA, poolB;
//     if (validTeams.length === 7) {
//       // Manually distribute teams for 7 teams (3 in Pool A, 3 in Pool B)
//       poolA = [teamsToConsider[0], teamsToConsider[2], teamsToConsider[4]];
//       poolB = [teamsToConsider[1], teamsToConsider[3], teamsToConsider[5]]; // Last entry as TBD
//     } else {
//       // Default distribution for other cases
//       poolA = teamsToConsider.filter((_, index) => index % 2 === 0);
//       poolB = teamsToConsider.filter((_, index) => index % 2 === 1);
//     }

//     console.log('Pool A:', poolA);
//     console.log('Pool B:', poolB);

//     // Save pools
//     const newPools = new Pools({
//       sport,
//       poolA,
//       poolB,
//       createdBy: user.username,
//       year: currentYear.toString(),
//     });
//     await newPools.save();

//     // Create schedules for Pool A and Pool B
//     const schedules = [];
//     [poolA, poolB].forEach((pool, poolIndex) => {
//       console.log(`Creating schedules for ${poolIndex === 0 ? 'Pool A' : 'Pool B'}`);
//       console.log('Teams in Pool:', pool);

//       for (let i = 0; i < pool.length; i++) {
//         for (let j = i + 1; j < pool.length; j++) {
//           const team1 = pool[i];
//           const team2 = pool[j];

//           // Only create schedule if both teams are defined
//           if (team1 && team2) {
//             schedules.push({
//               pool: poolIndex === 0 ? 'Pool A' : 'Pool B',
//               team1,
//               team2,
//               sport,
//               year: currentYear.toString(),
//               status: 'upcoming',
//               result: null, // Default result as null
//             });
//           } else {
//             console.warn('Skipping match due to undefined team:', { team1, team2 });
//           }
//         }
//       }
//     });

//     // If 7 teams, create additional play-off schedule
//     if (validTeams.length === 7) {
//       schedules.unshift({
//         pool: 'play-off',
//         team1: validTeams[5], // P6
//         team2: validTeams[6], // P7
//         sport,
//         year: currentYear.toString(),
//         result: 'TBD', // Corrected to set result as TBD
//         status: 'upcoming', // Status remains as upcoming
//       });
//     }

//     await Schedules.insertMany(schedules);

//     res.json({ success: true, message: 'Pools and schedules created successfully using the previous year\'s rankings!' });
//   } catch (error) {
//     console.error('Error creating pools and schedules:', error);
//     res.status(500).json({ success: false, message: 'Error creating pools and schedules.' });
//   }
// });
// Create pools and schedules
// router.post('/create-pools', authenticateJWT, async (req, res) => {
//   const { sport } = req.body;
//   const user = req.user;
//   const currentYear = new Date().getFullYear();
//   const previousYear = currentYear - 1;

//   try {
//     // Check if pools already exist for the current year
//     const existingPools = await Pools.findOne({ sport, year: currentYear.toString() });
//     if (existingPools) {
//       return res.status(400).json({
//         success: false,
//         message: `Pools and schedules for ${currentYear} have already been created by ${existingPools.createdBy}.`,
//       });
//     }

//     // Fetch team rankings from the previous year
//     const rankings = await TeamRankings.find({ category: sport, year: previousYear.toString() }).sort({ P1: 1 });
//     if (!rankings || rankings.length === 0) {
//       return res.status(404).json({ success: false, message: `No team rankings found for ${sport} in ${previousYear}.` });
//     }

//     const teams = [];
//     rankings.forEach(rank => {
//       teams.push(rank.P1, rank.P2, rank.P3, rank.P4, rank.P5, rank.P6, rank.P7, rank.P8);
//     });

//     // Remove undefined or empty entries
//     const validTeams = teams.filter(team => team);

//     // Check for 7 teams scenario
//     let teamsToConsider;
//     if (validTeams.length === 7) {
//       // Exclude the last two entries to get 5 teams
//       teamsToConsider = validTeams.slice(0, 5);

//       // Get the last team using play-off status from schedules
//       const sportScheduleModel = createScheduleModel(sport);
//       const playOffMatch = await sportScheduleModel.findOne({ pool: 'play-off' }).sort({ createdAt: -1 });
//       if (playOffMatch) {
//         teamsToConsider.push(playOffMatch.status); // Use play-off status as the last team
//       }

//       // Add 'TBD' as the 6th team
//       teamsToConsider.push('TBD');
//     } else {
//       // Default case: Consider the top 8 or less if not enough teams
//       teamsToConsider = validTeams.slice(0, 8);
//     }

//     console.log('Teams considered for pools:', teamsToConsider);

//     // Create pools manually for 7 teams scenario
//     let poolA, poolB;
//     if (validTeams.length === 7) {
//       // Manually distribute teams for 7 teams (3 in Pool A, 3 in Pool B)
//       poolA = [teamsToConsider[0], teamsToConsider[2], teamsToConsider[4]];
//       poolB = [teamsToConsider[1], teamsToConsider[3], teamsToConsider[5]]; // Last entry as TBD
//     } else {
//       // Default distribution for other cases
//       poolA = teamsToConsider.filter((_, index) => index % 2 === 0);
//       poolB = teamsToConsider.filter((_, index) => index % 2 === 1);
//     }

//     console.log('Pool A:', poolA);
//     console.log('Pool B:', poolB);

//     // Save pools
//     const newPools = new Pools({
//       sport,
//       poolA,
//       poolB,
//       createdBy: user.username,
//       year: currentYear.toString(),
//     });
//     await newPools.save();

//     // Create schedules for Pool A and Pool B using the new schema
//     const sportScheduleModel = createScheduleModel(sport);
//     const schedules = [];
//     [poolA, poolB].forEach((pool, poolIndex) => {
//       console.log(`Creating schedules for ${poolIndex === 0 ? 'Pool A' : 'Pool B'}`);
//       console.log('Teams in Pool:', pool);

//       for (let i = 0; i < pool.length; i++) {
//         for (let j = i + 1; j < pool.length; j++) {
//           const team1 = pool[i];
//           const team2 = pool[j];

//           // Only create schedule if both teams are defined
//           if (team1 && team2) {
//             schedules.push({
//               pool: poolIndex === 0 ? 'Pool A' : 'Pool B',
//               team1,
//               team2,
//               sport,
//               year: currentYear.toString(),
//               status: 'upcoming',
//               result: null, // Default result as null
//             });
//           } else {
//             console.warn('Skipping match due to undefined team:', { team1, team2 });
//           }
//         }
//       }
//     });

//     // If 7 teams, create additional play-off schedule
//     if (validTeams.length === 7) {
//       schedules.unshift({
//         pool: 'play-off',
//         team1: validTeams[5], // P6
//         team2: validTeams[6], // P7
//         sport,
//         year: currentYear.toString(),
//         result: 'TBD', // Corrected to set result as TBD
//         status: 'upcoming', // Status remains as upcoming
//       });
//     }

//     await sportScheduleModel.insertMany(schedules);

//     res.json({ success: true, message: 'Pools and schedules created successfully using the previous year\'s rankings!' });
//   } catch (error) {
//     console.error('Error creating pools and schedules:', error);
//     res.status(500).json({ success: false, message: 'Error creating pools and schedules.' });
//   }
// });
router.post('/create-pools', authenticateJWT, async (req, res) => {
  const { sport } = req.body;
  const user = req.user;
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  try {
    // Check if pools already exist for the current year
    const existingPools = await Pools.findOne({ sport, year: currentYear.toString() });
    if (existingPools) {
      return res.status(400).json({
        success: false,
        message: `Pools and schedules for ${currentYear} have already been created by ${existingPools.createdBy}.`,
      });
    }

    // Fetch team rankings from the previous year
    const rankings = await TeamRankings.find({ category: sport, year: previousYear.toString() }).sort({ P1: 1 });
    if (!rankings || rankings.length === 0) {
      return res.status(404).json({ success: false, message: `No team rankings found for ${sport} in ${previousYear}.` });
    }

    const teams = [];
    rankings.forEach(rank => {
      teams.push(rank.P1, rank.P2, rank.P3, rank.P4, rank.P5, rank.P6, rank.P7, rank.P8);
    });

    // Remove undefined or empty entries
    const validTeams = teams.filter(team => team);

    // Check for 7 teams scenario
    let teamsToConsider;
    if (validTeams.length === 7) {
      teamsToConsider = validTeams.slice(0, 5); // Take first 5 teams

      // Get last team from play-off status
      const sportScheduleModel = createScheduleModel(sport);
      const playOffMatch = await sportScheduleModel.findOne({ pool: 'play-off' }).sort({ createdAt: -1 });
      if (playOffMatch) {
        teamsToConsider.push(playOffMatch.status); // Use play-off status as last team
      }

      teamsToConsider.push('TBD'); // Add 'TBD' as the 6th team
    } else {
      teamsToConsider = validTeams.slice(0, 8);
    }

    console.log('Teams considered for pools:', teamsToConsider);

    // Create pools manually for 7 teams scenario
    let poolA, poolB;
    if (validTeams.length === 7) {
      poolA = [teamsToConsider[0], teamsToConsider[2], teamsToConsider[4]];
      poolB = [teamsToConsider[1], teamsToConsider[3], teamsToConsider[5]];
    } else {
      poolA = teamsToConsider.filter((_, index) => index % 2 === 0);
      poolB = teamsToConsider.filter((_, index) => index % 2 === 1);
    }

    console.log('Pool A:', poolA);
    console.log('Pool B:', poolB);

    // Save pools
    const newPools = new Pools({
      sport,
      poolA,
      poolB,
      createdBy: user.username,
      year: currentYear.toString(),
    });
    await newPools.save();

    // Create schedules for Pool A and Pool B using the new schema
    const schedules = [];
    for (const [poolIndex, pool] of [poolA, poolB].entries()) {
      for (let i = 0; i < pool.length; i++) {
        for (let j = i + 1; j < pool.length; j++) {
          const team1 = pool[i];
          const team2 = pool[j];

          if (team1 && team2) {
            // Fetch nominations from playerNominationSchema
            const team1Nominations = await PlayerNominationForm.findOne({ department: team1 });
            const team2Nominations = await PlayerNominationForm.findOne({ department: team2 });

            schedules.push({
              pool: poolIndex === 0 ? 'Pool A' : 'Pool B',
              team1,
              team2,
              sport,
              year: currentYear.toString(),
              status: 'upcoming',
              result: null,
              nominationsT1: team1Nominations ? team1Nominations.nominations : [],
              nominationsT2: team2Nominations ? team2Nominations.nominations : [],
            });
          }
        }
      }
    }

    // If 7 teams, create additional play-off schedule
    if (validTeams.length === 7) {
      schedules.unshift({
        pool: 'play-off',
        team1: validTeams[5],
        team2: validTeams[6],
        sport,
        year: currentYear.toString(),
        result: 'TBD',
        status: 'upcoming',
      });
    }

    // Save schedules in the appropriate collection
    const sportScheduleModel = createScheduleModel(sport);
    await sportScheduleModel.insertMany(schedules);

    res.json({ success: true, message: 'Pools and schedules created successfully using the previous year\'s rankings!' });
  } catch (error) {
    console.error('Error creating pools and schedules:', error);
    res.status(500).json({ success: false, message: 'Error creating pools and schedules.' });
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


module.exports = router;

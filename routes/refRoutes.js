// Route for creating semi-final and final matches
// router.post('/createSemiFinalMatch', authenticateJWT, async (req, res) => {
//   try {
//     const { team1, team2, pool, year } = req.body;

//     const newMatch = new Schedules({
//       team1,
//       team2,
//       pool,
//       year,
//       status: 'upcoming',  // Default status for new matches
//       sport: req.user.sportscategory,  // Add the sport category here
//     });

//     await newMatch.save();
//     res.json({ success: true, message: 'Match created successfully' });
//   } catch (error) {
//     console.error('Error creating match:', error);
//     res.status(500).json({ success: false, message: 'Failed to create match' });
//   }
// });

//FOOTBALL ROUTES
// Update match status route
// router.post('/startmatchfootball', authenticateJWT, async (req, res) => {
//   const { matchId } = req.body;

//   try {
//       const match = await Schedules.findById(matchId);
//       if (!match) {
//           return res.status(404).json({ success: false, message: 'Match not found' });
//       }

//       // Update match status to "live"
//       match.status = 'live';
//       await match.save();

//       res.json({ success: true, message: 'Match status updated to live', match });
//   } catch (error) {
//       console.error("Error updating match status:", error);
//       res.status(500).json({ success: false, message: 'Failed to update match status' });
//   }
// });
// router.post('/startmatch', authenticateJWT, async (req, res) => {
//   const { matchId } = req.body;
//   const sportCategory = req.user.sportscategory; // Retrieve the sport category from the logged-in user

//   try {
//       if (!matchId || !sportCategory) {
//           return res.status(400).json({ success: false, message: 'Match ID and sport category are required.' });
//       }

//       const ScheduleModel = createScheduleModel(sportCategory); // Dynamically get the schedule model

//       if (!ScheduleModel) {
//           return res.status(400).json({ success: false, message: 'Invalid sport category.' });
//       }

//       const match = await ScheduleModel.findById(matchId);
//       if (!match) {
//           return res.status(404).json({ success: false, message: 'Match not found.' });
//       }

//       // Update match status to "live"
//       match.status = 'live';
//       await match.save();

//       res.json({ success: true, message: 'Match status updated to live', match });
//   } catch (error) {
//       console.error("Error updating match status:", error);
//       res.status(500).json({ success: false, message: 'Server error while updating match status.' });
//   }
// });

// router.post('/updateScorefootball', authenticateJWT, async (req, res) => {
//   const { matchId, team } = req.body;

//   try {
//       const match = await Schedules.findById(matchId);
//       if (!match) {
//           return res.status(404).json({ success: false, message: 'Match not found' });
//       }

//       if (team === 'T1') {
//           match.scoreT1 += 1;
//       } else if (team === 'T2') {
//           match.scoreT2 += 1;
//       } else {
//           return res.status(400).json({ success: false, message: 'Invalid team identifier' });
//       }

//       await match.save();

//       res.status(200).json({
//           success: true,
//           message: `Score updated successfully for ${team}`,
//           match,
//       });
//   } catch (error) {
//       console.error('Error updating score:', error);
//       res.status(500).json({ success: false, message: 'Failed to update score' });
//   }
// });

// router.post('/stopmatchfootball', authenticateJWT, async (req, res) => {
//   const { matchId } = req.body;

//   try {
//       // Find the match by ID
//       const match = await Schedules.findById(matchId);
//       if (!match) {
//           return res.status(404).json({ success: false, message: 'Match not found' });
//       }

//       // Update status to "recent"
//       match.status = 'recent';

//       // Determine the result
//       if (match.scoreT1 > match.scoreT2) {
//           match.result = match.team1; // Team 1 wins
//       } else if (match.scoreT2 > match.scoreT1) {
//           match.result = match.team2; // Team 2 wins
//       } else {
//           match.result = 'Draw'; // It's a tie
//       }

//       // Save the match with updated status and result
//       await match.save();

//       // Check if the match is a play-off
//       if (match.pool === 'play-off') {
//           console.log("Play-off match detected. Updating TBD entries...");

//           // Update all entries with TBD in the same sport and year
//           const updateResult = await Schedules.updateMany(
//               {
//                   sport: match.sport,
//                   year: match.year,
//                   $or: [
//                       { team1: 'TBD' },
//                       { team2: 'TBD' }
//                   ]
//               },
//               [
//                   {
//                       $set: {
//                           team1: {
//                               $cond: [{ $eq: ["$team1", "TBD"] }, match.result, "$team1"]
//                           },
//                           team2: {
//                               $cond: [{ $eq: ["$team2", "TBD"] }, match.result, "$team2"]
//                           }
//                       }
//                   }
//               ]
//           );

//           console.log("Update Result:", updateResult);
//       }

//       res.json({ success: true, message: 'Match stopped successfully', match });
//   } catch (error) {
//       console.error("Error in /stopmatch:", error);
//       res.status(500).json({ success: false, message: 'Error stopping the match', error });
//   }
// });
// router.post('/stopmatch', authenticateJWT, async (req, res) => {
//     const { matchId } = req.body;
//     const sportCategory = req.user.sportscategory; // Retrieve sport category from logged-in user

//     try {
//         if (!matchId || !sportCategory) {
//             return res.status(400).json({ success: false, message: 'Match ID and sport category are required.' });
//         }

//         const ScheduleModel = createScheduleModel(sportCategory); // Get correct schedule model

//         if (!ScheduleModel) {
//             return res.status(400).json({ success: false, message: 'Invalid sport category.' });
//         }

//         const match = await ScheduleModel.findById(matchId);
//         if (!match) {
//             return res.status(404).json({ success: false, message: 'Match not found.' });
//         }

//         // Update status to "recent"
//         match.status = 'recent';

//         // Determine match result (winner or draw)
//         let winningTeam = null;
//         if (match.scoreT1 > match.scoreT2) {
//             match.result = match.team1; // Team 1 wins
//             winningTeam = match.team1;
//         } else if (match.scoreT2 > match.scoreT1) {
//             match.result = match.team2; // Team 2 wins
//             winningTeam = match.team2;
//         } else {
//             match.result = 'Draw'; // Match is a tie
//         }

//         // Save updated match
//         await match.save();

//         // Handle play-off winner replacements and nomination updates
//         if (match.pool === 'play-off' && winningTeam) {
//             console.log("Play-off match detected. Updating TBD entries with nominations...");

//             // Fetch nominations of the winning team
//             const winnerNominations = await PlayerNominationForm.findOne({ department: winningTeam, sport: sportCategory });

//             // Update all TBD matches with the winning team and its nominations
//             const updateResult = await ScheduleModel.updateMany(
//                 {
//                     year: match.year,
//                     $or: [{ team1: 'TBD' }, { team2: 'TBD' }],
//                 },
//                 [
//                     {
//                         $set: {
//                             team1: {
//                                 $cond: [{ $eq: ["$team1", "TBD"] }, winningTeam, "$team1"]
//                             },
//                             team2: {
//                                 $cond: [{ $eq: ["$team2", "TBD"] }, winningTeam, "$team2"]
//                             },
//                             nominationsT1: {
//                                 $cond: [{ $eq: ["$team1", "TBD"] }, (winnerNominations ? winnerNominations.nominations : []), "$nominationsT1"]
//                             },
//                             nominationsT2: {
//                                 $cond: [{ $eq: ["$team2", "TBD"] }, (winnerNominations ? winnerNominations.nominations : []), "$nominationsT2"]
//                             }
//                         }
//                     }
//                 ]
//             );

//             console.log("TBD & Nominations Update Result:", updateResult);
//         }

//         res.json({ success: true, message: 'Match stopped successfully, nominations updated.', match });
//     } catch (error) {
//         console.error("Error in /stopmatch:", error);
//         res.status(500).json({ success: false, message: 'Error stopping the match', error });
//     }
//   });
// router.post('/updateScore', authenticateJWT, async (req, res) => {
//   const { matchId, team } = req.body;
//   const sportCategory = req.user.sportscategory; // Get sport category from authenticated user

//   try {
//       if (!matchId || !sportCategory || !team) {
//           return res.status(400).json({ success: false, message: 'Match ID, sport category, and team are required.' });
//       }

//       const ScheduleModel = createScheduleModel(sportCategory); // Get correct schedule model

//       if (!ScheduleModel) {
//           return res.status(400).json({ success: false, message: 'Invalid sport category.' });
//       }

//       const match = await ScheduleModel.findById(matchId);
//       if (!match) {
//           return res.status(404).json({ success: false, message: 'Match not found.' });
//       }

//       // Update score based on the team
//       if (team === 'T1') {
//           match.scoreT1 += 1;
//       } else if (team === 'T2') {
//           match.scoreT2 += 1;
//       } else {
//           return res.status(400).json({ success: false, message: 'Invalid team identifier.' });
//       }

//       await match.save();

//       res.status(200).json({
//           success: true,
//           message: `Score updated successfully for ${team}`,
//           match,
//       });
//   } catch (error) {
//       console.error('Error updating score:', error);
//       res.status(500).json({ success: false, message: 'Failed to update score' });
//   }
// });

const mongoose = require("mongoose");
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
  RefUser,
  Schedules,
  createScheduleModel,
  PlayerNominationForm,
} = require("../models"); // Ensure the RefUser schema is defined in your models
const authenticateJWT = require("../middleware");
const config = require("../config"); // Include JWT secret configuration

const router = express.Router();

router.post("/addref", authenticateJWT, async (req, res) => {
  try {
    const existingUser = await RefUser.findOne({ email: req.body.email });
    if (existingUser)
      return res
        .status(400)
        .json({ success: false, error: "Email already exists" });

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = new RefUser({ ...req.body, password: hashedPassword });
    const result = await user.save();
    res.status(201).json({ success: true, user: result });
  } catch (error) {
    res.status(500).json({ success: false, error: "Error creating account" });
  }
});

// Handle user login
router.post("/reflogin", async (req, res) => {
  const { email, password } = req.body;
  if (email && password) {
    const user = await RefUser.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
      // Generate JWT token
      const token = jwt.sign(
        {
          id: user._id,
          username: user.username,
          email: user.email,
          loggedin: user.loggedin,
          sportscategory: user.sportscategory,
        },
        config.JWT_SECRET,
        { expiresIn: "24h" },
      );
      res.json({ success: true, message: "Logged in successfully", token });
    } else {
      res.json({ success: false, message: "Invalid credentials" });
    }
  } else {
    res.json({ success: false, message: "Please provide email and password" });
  }
});
router.get("/reflandingpage", authenticateJWT, (req, res) => {
  res.json({ success: true, user: req.user });
});

router.get("/refmatches", authenticateJWT, async (req, res) => {
  try {
    const sportCategory = req.user.sportscategory; // Get the user's sport category

    if (!sportCategory) {
      return res
        .status(400)
        .json({ success: false, message: "Sport category is required." });
    }

    const ScheduleModel = createScheduleModel(sportCategory); // Dynamically get the model

    if (!ScheduleModel) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid sport category." });
    }

    const matches = await ScheduleModel.find({
      sport: sportCategory,
      status: { $in: ["upcoming", "live"] }, // Fetch only live and upcoming matches
    });

    res.json({ success: true, matches });
  } catch (error) {
    console.error("Error fetching matches:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Server error while fetching matches.",
      });
  }
});

router.post("/createSemiFinalMatch", authenticateJWT, async (req, res) => {
  try {
    const { team1, team2, pool, year } = req.body;
    const sport = req.user.sportscategory;

    // Validate required fields
    if (!team1 || !team2 || !pool || !year || !sport) {
      return res.status(400).json({ 
        success: false, 
        message: "All fields are required." 
      });
    }

    // Validate pool type
    if (!['semi', 'final'].includes(pool)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid pool type. Must be 'semi' or 'final'." 
      });
    }

    const ScheduleModel = createScheduleModel(sport);
    if (!ScheduleModel) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid sport category." 
      });
    }

    // Check for existing final match for this sport and year
    if (pool === 'final') {
      const existingFinal = await ScheduleModel.findOne({ 
        sport, 
        year, 
        pool: 'final' 
      });
      
      if (existingFinal) {
        return res.status(400).json({ 
          success: false, 
          message: "Final match already exists for this sport and year." 
        });
      }
    }

    // Check for existing semi matches for this sport and year
    if (pool === 'semi') {
      const existingSemis = await ScheduleModel.find({ 
        sport, 
        year, 
        pool: 'semi' 
      });
      
      if (existingSemis.length >= 2) {
        return res.status(400).json({ 
          success: false, 
          message: "Maximum of 2 semi-final matches already exist for this sport and year." 
        });
      }

      // Check if this exact match already exists
      const existingMatch = await ScheduleModel.findOne({
        $or: [
          { team1, team2, sport, year, pool: 'semi' },
          { team1: team2, team2: team1, sport, year, pool: 'semi' }
        ]
      });
      
      if (existingMatch) {
        return res.status(400).json({ 
          success: false, 
          message: "This semi-final match already exists." 
        });
      }
    }

    // Fetch nominations for both teams
    const [team1Nominations, team2Nominations] = await Promise.all([
      PlayerNominationForm.findOne({ department: team1, sport, year }),
      PlayerNominationForm.findOne({ department: team2, sport, year })
    ]);

    // Create new match
    const newMatch = new ScheduleModel({
      team1,
      team2,
      pool,
      year,
      status: "upcoming",
      sport,
      nominationsT1: team1Nominations ? team1Nominations.nominations : [],
      nominationsT2: team2Nominations ? team2Nominations.nominations : [],
    });

    await newMatch.save();
    
    res.json({
      success: true,
      message: "Match created successfully with nominations.",
      match: newMatch
    });
  } catch (error) {
    console.error("Error creating match:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while creating match." 
    });
  }
});

// Get a specific match by ID (FIXED)
router.get("/match/:sport/:id", authenticateJWT, async (req, res) => {
  try {
    const { sport, id } = req.params;
    const MatchModel = createScheduleModel(sport); // Get the correct model

    const match = await MatchModel.findById(id);

    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found" });
    }

    res.status(200).json({ success: true, match });
  } catch (error) {
    console.error("Error fetching match details:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;

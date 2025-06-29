const mongoose = require('mongoose');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {createScheduleModel,PlayerNominationForm,BestFutsalPlayer} = require('../models'); // Ensure the RefUser schema is defined in your models
const authenticateJWT = require('../middleware');
const config = require('../config'); // Include JWT secret configuration

const router = express.Router();


router.post('/startmatchfutsal', authenticateJWT, async (req, res) => {
    const { matchId } = req.body;
    const sportCategory = req.user.sportscategory; // Retrieve the sport category from the logged-in user
  
    try {
        if (!matchId || !sportCategory) {
            return res.status(400).json({ success: false, message: 'Match ID and sport category are required.' });
        }
  
        const ScheduleModel = createScheduleModel(sportCategory); // Dynamically get the schedule model
  
        if (!ScheduleModel) {
            return res.status(400).json({ success: false, message: 'Invalid sport category.' });
        }
  
        const match = await ScheduleModel.findById(matchId);
        if (!match) {
            return res.status(404).json({ success: false, message: 'Match not found.' });
        }
  
        // Update match status to "live" and increment the half value
        match.status = 'live';
        match.half = match.half + 1; // Increment the half value by 1 (0 -> 1, 1 -> 2, etc.)
        await match.save();
  
        res.json({ success: true, message: 'Match status updated to live, and half incremented.', match });
    } catch (error) {
        console.error("Error updating match status:", error);
        res.status(500).json({ success: false, message: 'Server error while updating match status.' });
    }
});




// router.post('/stopmatchfutsal', authenticateJWT, async (req, res) => {
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
router.post('/stopmatchfutsal', authenticateJWT, async (req, res) => {
    const { matchId } = req.body;
    const sportCategory = req.user.sportscategory;

    try {
        if (!matchId || !sportCategory) {
            return res.status(400).json({ success: false, message: 'Match ID and sport category are required.' });
        }

        const ScheduleModel = createScheduleModel(sportCategory);
        // const BestFutsalPlayer = mongoose.model('BestFutsalPlayer', bestFutsalPlayerSchema);

        if (!ScheduleModel) {
            return res.status(400).json({ success: false, message: 'Invalid sport category.' });
        }

        const match = await ScheduleModel.findById(matchId);
        if (!match) {
            return res.status(404).json({ success: false, message: 'Match not found.' });
        }

        // Update status to "recent"
        match.status = 'recent';

        // Determine match result (winner or draw)
        let winningTeam = null;
        if (match.scoreT1 > match.scoreT2) {
            match.result = match.team1;
            winningTeam = match.team1;
        } else if (match.scoreT2 > match.scoreT1) {
            match.result = match.team2;
            winningTeam = match.team2;
        } else {
            match.result = 'Draw';
        }

        // Save updated match
        await match.save();

        // Handle final match for Futsal
        if (match.pool === 'final' && sportCategory === 'Futsal') {
            console.log("Final match detected. Processing Futsal tournament statistics...");

            // Step 1: Fetch all nominated players and store in BestFutsalPlayer
            const allNominations = await PlayerNominationForm.find({
                sport: "Futsal",
                year: match.year
            }).select("nominations");

            console.log("Total nomination entries found:", allNominations.length);

            // Extract and prepare player data
            const allPlayers = allNominations.flatMap((team) =>
                team.nominations.map((player) => ({
                    shirtNo: player.shirtNo,
                    regNo: player.regNo,
                    name: player.name,
                    cnic: player.cnic,
                    section: player.section,
                    totalgoalsscored: 0 // Initialize with 0
                }))
            );

            console.log("Total Players Extracted:", allPlayers.length);

            // Create or update BestFutsalPlayer document for the year
            await BestFutsalPlayer.findOneAndUpdate(
                { year: match.year },
                {
                    year: match.year,
                    nominations: allPlayers
                },
                { upsert: true, new: true }
            );

            // Step 2: Calculate total goals for each player
            const allMatches = await ScheduleModel.find({
                year: match.year,
                status: 'recent' // Only completed matches
            }).select("nominationsT1 nominationsT2");

            const bestFutsalPlayerDoc = await BestFutsalPlayer.findOne({ year: match.year });
            if (!bestFutsalPlayerDoc) {
                console.log("No best futsal player document found, skipping goal calculation");
                return;
            }

            // Update each player's total goals
            for (const player of bestFutsalPlayerDoc.nominations) {
                let totalGoals = 0;

                // Search player in all matches
                for (const match of allMatches) {
                    // Check team1 nominations
                    const playerInT1 = match.nominationsT1.find(p => p.regNo === player.regNo);
                    if (playerInT1) {
                        totalGoals += playerInT1.goalsscored || 0;
                    }
                    
                    // Check team2 nominations
                    const playerInT2 = match.nominationsT2.find(p => p.regNo === player.regNo);
                    if (playerInT2) {
                        totalGoals += playerInT2.goalsscored || 0;
                    }
                }

                // Update the player's total goals
                await BestFutsalPlayer.updateOne(
                    { 
                        year: match.year,
                        "nominations.regNo": player.regNo 
                    },
                    { 
                        $set: { "nominations.$.totalgoalsscored": totalGoals } 
                    }
                );

                console.log(`Updated ${player.name} (${player.regNo}) - Total Goals: ${totalGoals}`);
            }

            console.log("All players' goal statistics updated in BestFutsalPlayer");
        }

        // Handle play-off winner replacements and nomination updates
        if (match.pool === 'play-off' && winningTeam) {
            console.log("Play-off match detected. Updating TBD entries with nominations...");

            const winnerNominations = await PlayerNominationForm.findOne({ 
                department: winningTeam, 
                sport: sportCategory 
            });

            const updateResult = await ScheduleModel.updateMany(
                {
                    year: match.year,
                    $or: [{ team1: 'TBD' }, { team2: 'TBD' }],
                },
                [
                    {
                        $set: {
                            team1: {
                                $cond: [{ $eq: ["$team1", "TBD"] }, winningTeam, "$team1"]
                            },
                            team2: {
                                $cond: [{ $eq: ["$team2", "TBD"] }, winningTeam, "$team2"]
                            },
                            nominationsT1: {
                                $cond: [{ $eq: ["$team1", "TBD"] }, (winnerNominations ? winnerNominations.nominations : []), "$nominationsT1"]
                            },
                            nominationsT2: {
                                $cond: [{ $eq: ["$team2", "TBD"] }, (winnerNominations ? winnerNominations.nominations : []), "$nominationsT2"]
                            }
                        }
                    }
                ]
            );

            console.log("TBD & Nominations Update Result:", updateResult);
        }

        res.json({ 
            success: true, 
            message: 'Match stopped successfully' + (match.pool === 'final' ? ' and tournament statistics updated' : ''), 
            match 
        });
    } catch (error) {
        console.error("Error in /stopmatchfutsal:", error);
        res.status(500).json({ success: false, message: 'Error stopping the match', error });
    }
});


  router.post('/updateGoalfutsal', authenticateJWT, async (req, res) => {
    try {
      const { matchId, playerId, team } = req.body;
      const sportCategory = req.user.sportscategory; // Ensure it's retrieved properly
  
      if (!matchId || !playerId || !team || !sportCategory) {
        return res.status(400).json({ success: false, message: "Invalid request data." });
      }
  
      const ScheduleModel = createScheduleModel(sportCategory);
      if (!ScheduleModel) {
        return res.status(400).json({ success: false, message: "Invalid sport category." });
      }
  
      const match = await ScheduleModel.findById(matchId);
      if (!match) {
        return res.status(404).json({ success: false, message: "Match not found." });
      }
  
      let updatedPlayer = null;
  
      if (team === "team1") {
        updatedPlayer = match.nominationsT1.find(player => player._id.toString() === playerId);
        match.scoreT1 += 1;
      } else if (team === "team2") {
        updatedPlayer = match.nominationsT2.find(player => player._id.toString() === playerId);
        match.scoreT2 += 1;
      }
  
      if (!updatedPlayer) {
        return res.status(404).json({ success: false, message: "Player not found in this match." });
      }
  
      updatedPlayer.goalsscored = (updatedPlayer.goalsscored || 0) + 1;
  
      await match.save();
      res.json({ success: true, message: "Goal updated successfully!" });
  
    } catch (error) {
      console.error("Error updating goal:", error);
      res.status(500).json({ success: false, message: "Internal server error." });
    }
  });
  
  


  router.post('/updateHalffutsal', authenticateJWT, async (req, res) => {
    const { matchId } = req.body;
    const sportCategory = req.user.sportscategory; // Retrieve sport category from logged-in user
  
    try {
        if (!matchId || !sportCategory) {
            return res.status(400).json({ success: false, message: 'Match ID and sport category are required.' });
        }
  
        const ScheduleModel = createScheduleModel(sportCategory); // Get the correct schedule model
  
        if (!ScheduleModel) {
            return res.status(400).json({ success: false, message: 'Invalid sport category.' });
        }
  
        const match = await ScheduleModel.findById(matchId);
        if (!match) {
            return res.status(404).json({ success: false, message: 'Match not found.' });
        }
  
        if (match.half !== 1) {
            return res.status(400).json({ success: false, message: 'Match is not in the first half.' });
        }
  
        // Update the match's half to 2 (second half)
        match.half = 2;
        await match.save();
  
        res.json({ success: true, message: 'First half ended, match moved to second half.', match });
    } catch (error) {
        console.error("Error ending first half:", error);
        res.status(500).json({ success: false, message: 'Server error while ending the first half.' });
    }
});



  
  
  router.post('/swapPlayersfutsal', authenticateJWT, async (req, res) => {
    try {
      const { matchId, reservedPlayerId, playingPlayerId } = req.body;
      const ScheduleModel = createScheduleModel(req.user.sportscategory);
      
      if (!matchId || !reservedPlayerId || !playingPlayerId || !ScheduleModel) {
        return res.status(400).json({ success: false, message: "Invalid data." });
      }
  
      const match = await ScheduleModel.findById(matchId);
      if (!match) return res.status(404).json({ success: false, message: "Match not found." });
  
      const updateStatus = (players, id, status) => {
        const player = players.find(p => p._id.equals(id));
        if (player) player.playingStatus = status;
      };
  
      updateStatus(match.nominationsT1, reservedPlayerId, "Playing");
      updateStatus(match.nominationsT1, playingPlayerId, "Reserved");
      updateStatus(match.nominationsT2, reservedPlayerId, "Playing");
      updateStatus(match.nominationsT2, playingPlayerId, "Reserved");
  
      await match.save();
      res.json({ success: true, message: "Players swapped successfully!" });
  
    } catch (error) {
      res.status(500).json({ success: false, message: "Internal server error." });
    }
  });
  
  
//   router.post('/updatePenaltyFootball', authenticateJWT, async (req, res) => {
//     try {
//         const { matchId, penaltiesT1, penaltiesT2 } = req.body;
//         if (!matchId) {
//             return res.status(400).json({ success: false, message: "Match ID is required." });
//         }

//         const sportCategory = req.user.sportscategory;
//         const ScheduleModel = createScheduleModel(sportCategory);

//         if (!ScheduleModel) {
//             return res.status(400).json({ success: false, message: "Invalid sport category." });
//         }

//         const match = await ScheduleModel.findById(matchId);
//         if (!match) {
//             return res.status(404).json({ success: false, message: "Match not found." });
//         }

//         // Function to update penalties
//         const updatePenalties = (teamKey, nominationsKey, penalties) => {
//             penalties.forEach(({ playerId, penaltyScore }) => {
//                 const player = match[nominationsKey].find(p => p._id.toString() === playerId);
//                 if (player) {
//                     const existing = match[teamKey].find(p => p.cnic === player.cnic);
//                     if (existing) {
//                         existing.penaltyscored = penaltyScore;
//                     } else {
//                         match[teamKey].push({
//                             name: player.name,
//                             cnic: player.cnic,
//                             section: player.section,
//                             penaltyscored: penaltyScore
//                         });
//                     }
//                 }
//             });
//         };

//         // Update team penalties
//         updatePenalties("penaltiesT1", "nominationsT1", penaltiesT1);
//         updatePenalties("penaltiesT2", "nominationsT2", penaltiesT2);

//         // Calculate total penalties for each team
//         const totalPenaltiesT1 = match.penaltiesT1.reduce((sum, p) => sum + p.penaltyscored, 0);
//         const totalPenaltiesT2 = match.penaltiesT2.reduce((sum, p) => sum + p.penaltyscored, 0);

//         // Determine the winner based on penalty scores
//         if (totalPenaltiesT1 > totalPenaltiesT2) {
//             match.result = match.team1; // If Team 1 has more penalties, they are the winner
//         } else if (totalPenaltiesT2 > totalPenaltiesT1) {
//             match.result = match.team2; // If Team 2 has more penalties, they are the winner
//         } else {
//             match.result = "Draw"; // If scores are equal, declare a draw
//         }

//         await match.save();

//         res.json({
//             success: true,
//             message: "Penalties updated successfully.",
//             totalPenaltiesT1,
//             totalPenaltiesT2,
//             winner: match.result
//         });

//     } catch (error) {
//         console.error("Server error:", error);
//         res.status(500).json({ success: false, message: "Server error while updating penalties." });
//     }
// });
router.post('/updatePenaltyfutsal', authenticateJWT, async (req, res) => {
    try {
        const { matchId, penaltiesT1 = [], penaltiesT2 = [] } = req.body;
        
        // Validate input
        if (!matchId) {
            return res.status(400).json({ 
                success: false, 
                message: "Match ID is required." 
            });
        }

        if (!Array.isArray(penaltiesT1) || !Array.isArray(penaltiesT2)) {
            return res.status(400).json({ 
                success: false, 
                message: "Penalties must be arrays." 
            });
        }

        const sportCategory = req.user.sportscategory;
        if (!sportCategory) {
            return res.status(400).json({ 
                success: false, 
                message: "User sport category not found." 
            });
        }

        const ScheduleModel = createScheduleModel(sportCategory);
        if (!ScheduleModel) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid sport category." 
            });
        }

        // Find match with error handling
        const match = await ScheduleModel.findById(matchId).catch(err => {
            console.error("Database find error:", err);
            throw new Error("Database operation failed");
        });

        if (!match) {
            return res.status(404).json({ 
                success: false, 
                message: "Match not found." 
            });
        }

        // Initialize arrays if they don't exist
        if (!match.penaltiesT1) match.penaltiesT1 = [];
        if (!match.penaltiesT2) match.penaltiesT2 = [];

        // Enhanced updatePenalties function with validation
        const updatePenalties = (teamKey, nominationsKey, penalties) => {
            try {
                penalties.forEach(({ playerId, penaltyScore }) => {
                    if (!playerId || typeof penaltyScore !== 'number') {
                        throw new Error(`Invalid penalty data for ${teamKey}`);
                    }

                    const player = match[nominationsKey].find(p => 
                        p._id && p._id.toString() === playerId
                    );
                    
                    if (!player) {
                        console.warn(`Player not found in nominations: ${playerId}`);
                        return;
                    }

                    const existing = match[teamKey].find(p => p.cnic === player.cnic);
                    if (existing) {
                        existing.penaltyscored = penaltyScore;
                    } else {
                        if (!player.regNo || !player.name || !player.cnic) {
                            console.warn(`Incomplete player data for ${playerId}`);
                            return;
                        }
                        
                        match[teamKey].push({
                            shirtNo: player.shirtNo,
                            regNo: player.regNo,
                            name: player.name,
                            cnic: player.cnic,
                            section: player.section || 'N/A',
                            penaltyscored: penaltyScore
                        });
                    }
                });
            } catch (updateError) {
                console.error("Error updating penalties:", updateError);
                throw updateError;
            }
        };

        // Update team penalties with error handling
        try {
            updatePenalties("penaltiesT1", "nominationsT1", penaltiesT1);
            updatePenalties("penaltiesT2", "nominationsT2", penaltiesT2);
        } catch (updateError) {
            return res.status(400).json({ 
                success: false, 
                message: "Error updating penalty data: " + updateError.message 
            });
        }

        // Calculate totals with null checks
        const totalPenaltiesT1 = match.penaltiesT1.reduce(
            (sum, p) => sum + (p.penaltyscored || 0), 0
        );
        const totalPenaltiesT2 = match.penaltiesT2.reduce(
            (sum, p) => sum + (p.penaltyscored || 0), 0
        );

        let winningTeam = null;
        
        // Determine winner
        if (totalPenaltiesT1 > totalPenaltiesT2) {
            match.result = match.team1;
            winningTeam = match.team1;
        } else if (totalPenaltiesT2 > totalPenaltiesT1) {
            match.result = match.team2;
            winningTeam = match.team2;
        } else {
            match.result = "Draw";
        }

        // Save match with error handling
        try {
            await match.save();
        } catch (saveError) {
            console.error("Error saving match:", saveError);
            return res.status(500).json({ 
                success: false, 
                message: "Error saving match data" 
            });
        }

        // Handle playoff advancement with error handling
        if (match.pool === "play-off" && winningTeam) {
            try {
                console.log(`Processing playoff advancement for ${winningTeam}...`);

                const winnerNominations = await PlayerNominationForm.findOne({ 
                    department: winningTeam, 
                    sport: sportCategory,
                    year: match.year,
                }).catch(err => {
                    console.error("Error fetching nominations:", err);
                    throw new Error("Failed to fetch nominations");
                });

                const nominations = winnerNominations ? winnerNominations.nominations : [];

                const upcomingMatches = await ScheduleModel.find({
                    year: match.year,
                    $or: [{ team1: "TBD" }, { team2: "TBD" }],
                }).catch(err => {
                    console.error("Error finding upcoming matches:", err);
                    throw new Error("Failed to find upcoming matches");
                });

                for (let upcomingMatch of upcomingMatches) {
                    let updatedFields = {};

                    if (upcomingMatch.team1 === "TBD") {
                        updatedFields.team1 = winningTeam;
                        updatedFields.nominationsT1 = nominations;
                    }
                    if (upcomingMatch.team2 === "TBD") {
                        updatedFields.team2 = winningTeam;
                        updatedFields.nominationsT2 = nominations;
                    }

                    try {
                        await ScheduleModel.updateOne(
                            { _id: upcomingMatch._id }, 
                            { $set: updatedFields }
                        );
                        console.log(`Updated match ${upcomingMatch._id}`);
                    } catch (updateError) {
                        console.error(`Error updating match ${upcomingMatch._id}:`, updateError);
                        // Continue with other matches even if one fails
                    }
                }
            } catch (playoffError) {
                console.error("Playoff advancement error:", playoffError);
                // Don't fail the whole request for playoff errors
            }
        }

        return res.json({
            success: true,
            message: "Penalties updated successfully.",
            totalPenaltiesT1,
            totalPenaltiesT2,
            winner: match.result
        });

    } catch (error) {
        console.error("Server error:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Server error while updating penalties.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});



router.post('/updatePlayerStatusfutsal', authenticateJWT, async (req, res) => {
    try {
        const { matchId, selectedPlayers } = req.body;
        const sportCategory = req.user.sportscategory;

        if (!matchId || !selectedPlayers || selectedPlayers.length === 0) {
            return res.status(400).json({ success: false, message: "Match ID and selected players are required." });
        }

        const ScheduleModel = createScheduleModel(sportCategory);
        if (!ScheduleModel) {
            return res.status(400).json({ success: false, message: "Invalid sport category." });
        }

        const match = await ScheduleModel.findById(matchId);
        if (!match) {
            return res.status(404).json({ success: false, message: "Match not found." });
        }

        match.nominationsT1.forEach(player => {
            if (selectedPlayers.includes(player._id.toString())) {
                player.playingStatus = "Playing";
            }
        });

        match.nominationsT2.forEach(player => {
            if (selectedPlayers.includes(player._id.toString())) {
                player.playingStatus = "Playing";
            }
        });

        await match.save();
        res.json({ success: true, message: "Players updated to Playing." });

    } catch (error) {
        res.status(500).json({ success: false, message: "Server error while updating players." });
    }
});



// server/routes/bestFootballer.js
router.get("/bestfutsalplayertp/:year", async (req, res) => {
  const year = req.params.year;

  try {
    const futsalData = await BestFutsalPlayer.findOne({ year });

    if (!futsalData || futsalData.nominations.length === 0) {
      return res.status(404).json({ success: false, message: "No record found for the year." });
    }

    // Find player(s) with highest goals
    const maxGoals = Math.max(...footballData.nominations.map(n => n.totalgoalsscored));
    const topScorers = futsalData.nominations.filter(n => n.totalgoalsscored === maxGoals);
    
    // If multiple players have same highest goals, just take the first one
    const bestFutsalPlayer = topScorers[0];

    res.json({
      success: true,
      bestFutsalPlayer: {
        name: bestFutsalPlayer.name,
        regNo: bestFutsalPlayer.regNo,
        goals: bestFutsalPlayer.totalgoalsscored,
        shirtNo: bestFutsalPlayer.shirtNo,
        section: bestFutsalPlayer.section
      }
    });
  } catch (error) {
    console.error("Error fetching best futsal player:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.get('/bestfutsalplayer', async (req, res) => {
  try {
    // Get current year or use a parameter if you want to support multiple years
    const currentYear = new Date().getFullYear().toString();
    
    const bestFutsalPlayerData = await BestFutsalPlayer.findOne({ year: currentYear });
    
    if (!bestFutsalPlayerData || !bestFutsalPlayerData.nominations || bestFutsalPlayerData.nominations.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No top scorer data available' 
      });
    }

    // Find player with highest goals
    const topScorer = bestFutsalPlayerData.nominations.reduce((prev, current) => 
      (current.totalgoalsscored > prev.totalgoalsscored) ? current : prev
    );

    res.json({
      success: true,
      bestFutsalPlayer: {
        name: topScorer.name,
        regNo: topScorer.regNo,
        goals: topScorer.totalgoalsscored,
        shirtNo: topScorer.shirtNo,
        section: topScorer.section,
        // Add matches count if you track it
        matches: topScorer.matches || 'N/A'
      }
    });
  } catch (error) {
    console.error("Error fetching best futsal player:", error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching top scorer',
      error: error.message 
    });
  }
});




module.exports = router;

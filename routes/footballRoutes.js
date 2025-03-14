const mongoose = require('mongoose');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {createScheduleModel,PlayerNominationForm} = require('../models'); // Ensure the RefUser schema is defined in your models
const authenticateJWT = require('../middleware');
const config = require('../config'); // Include JWT secret configuration

const router = express.Router();


router.post('/startmatchfootball', authenticateJWT, async (req, res) => {
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




router.post('/stopmatchfootball', authenticateJWT, async (req, res) => {
    const { matchId } = req.body;
    const sportCategory = req.user.sportscategory; // Retrieve sport category from logged-in user
  
    try {
        if (!matchId || !sportCategory) {
            return res.status(400).json({ success: false, message: 'Match ID and sport category are required.' });
        }
  
        const ScheduleModel = createScheduleModel(sportCategory); // Get correct schedule model
  
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
            match.result = match.team1; // Team 1 wins
            winningTeam = match.team1;
        } else if (match.scoreT2 > match.scoreT1) {
            match.result = match.team2; // Team 2 wins
            winningTeam = match.team2;
        } else {
            match.result = 'Draw'; // Match is a tie
        }
  
        // Save updated match
        await match.save();
  
        // Handle play-off winner replacements and nomination updates
        if (match.pool === 'play-off' && winningTeam) {
            console.log("Play-off match detected. Updating TBD entries with nominations...");
  
            // Fetch nominations of the winning team
            const winnerNominations = await PlayerNominationForm.findOne({ department: winningTeam, sport: sportCategory });
  
            // Update all TBD matches with the winning team and its nominations
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
  
        res.json({ success: true, message: 'Match stopped successfully, nominations updated.', match });
    } catch (error) {
        console.error("Error in /stopmatch:", error);
        res.status(500).json({ success: false, message: 'Error stopping the match', error });
    }
  });


  router.post('/updateGoalFootball', authenticateJWT, async (req, res) => {
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
  
  


  router.post('/updateHalffootball', authenticateJWT, async (req, res) => {
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



  
  
  router.post('/swapPlayers', authenticateJWT, async (req, res) => {
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
router.post('/updatePenaltyFootball', authenticateJWT, async (req, res) => {
    try {
        const { matchId, penaltiesT1, penaltiesT2 } = req.body;
        if (!matchId) {
            return res.status(400).json({ success: false, message: "Match ID is required." });
        }

        const sportCategory = req.user.sportscategory;
        const ScheduleModel = createScheduleModel(sportCategory);

        if (!ScheduleModel) {
            return res.status(400).json({ success: false, message: "Invalid sport category." });
        }

        const match = await ScheduleModel.findById(matchId);
        if (!match) {
            return res.status(404).json({ success: false, message: "Match not found." });
        }

        // Function to update penalties
        const updatePenalties = (teamKey, nominationsKey, penalties) => {
            penalties.forEach(({ playerId, penaltyScore }) => {
                const player = match[nominationsKey].find(p => p._id.toString() === playerId);
                if (player) {
                    const existing = match[teamKey].find(p => p.cnic === player.cnic);
                    if (existing) {
                        existing.penaltyscored = penaltyScore;
                    } else {
                        match[teamKey].push({
                            regNo: player.regNo,
                            name: player.name,
                            cnic: player.cnic,
                            section: player.section,
                            penaltyscored: penaltyScore
                        });
                    }
                }
            });
        };

        // Update team penalties
        updatePenalties("penaltiesT1", "nominationsT1", penaltiesT1);
        updatePenalties("penaltiesT2", "nominationsT2", penaltiesT2);

        // Calculate total penalties for each team
        const totalPenaltiesT1 = match.penaltiesT1.reduce((sum, p) => sum + p.penaltyscored, 0);
        const totalPenaltiesT2 = match.penaltiesT2.reduce((sum, p) => sum + p.penaltyscored, 0);

        let winningTeam = null;
        
        // Determine the winner based on penalty scores
        if (totalPenaltiesT1 > totalPenaltiesT2) {
            match.result = match.team1; // Team 1 wins
            winningTeam = match.team1;
        } else if (totalPenaltiesT2 > totalPenaltiesT1) {
            match.result = match.team2; // Team 2 wins
            winningTeam = match.team2;
        } else {
            match.result = "Draw"; // Match is a tie
        }

        await match.save();

        // **Handle Playoff Winner Advancing**
        if (match.pool === "play-off" && winningTeam) {
            console.log(`Playoff match detected. Updating TBD matches for ${winningTeam}...`);

            // Fetch nominations of the winning team
            const winnerNominations = await PlayerNominationForm.findOne({ 
                department: winningTeam, 
                sport: sportCategory 
            });

            // Ensure nominations exist
            const nominations = winnerNominations ? winnerNominations.nominations : [];

            // Find and update all TBD matches where the winning team should advance
            const upcomingMatches = await ScheduleModel.find({
                year: match.year,
                $or: [{ team1: "TBD" }, { team2: "TBD" }],
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

                // Apply the updates to the match
                await ScheduleModel.updateOne({ _id: upcomingMatch._id }, { $set: updatedFields });
                console.log(`Updated match ${upcomingMatch._id} with winner: ${winningTeam}`);
            }
        }

        res.json({
            success: true,
            message: "Penalties updated successfully.",
            totalPenaltiesT1,
            totalPenaltiesT2,
            winner: match.result
        });

    } catch (error) {
        console.error("Server error:", error);
        res.status(500).json({ success: false, message: "Server error while updating penalties." });
    }
});



router.post('/updatePlayerStatus', authenticateJWT, async (req, res) => {
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




module.exports = router;

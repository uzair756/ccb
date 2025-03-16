const mongoose = require('mongoose');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {createScheduleModel,PlayerNominationForm} = require('../models'); // Ensure the RefUser schema is defined in your models
const authenticateJWT = require('../middleware');
const config = require('../config'); // Include JWT secret configuration

const router = express.Router();


router.post('/startmatchvolleyball', authenticateJWT, async (req, res) => {
    const { matchId } = req.body;
    const sportCategory = req.user.sportscategory;

    try {
        if (!matchId || !sportCategory) {
            return res.status(400).json({ success: false, message: 'Match ID and sport category are required.' });
        }

        const ScheduleModel = createScheduleModel(sportCategory);
        if (!ScheduleModel) {
            return res.status(400).json({ success: false, message: 'Invalid sport category.' });
        }

        const match = await ScheduleModel.findById(matchId);
        if (!match) {
            return res.status(404).json({ success: false, message: 'Match not found.' });
        }

        console.log("Before Update - Quarter:", match.quarter); // 🔴 Debug log

        match.status = 'live';
        match.quarter = (match.quarter || 0) + 1; // Ensure it's at least 0 before incrementing

        await match.save(); // 🔥 Save the updated match
        console.log("After Update - Quarter:", match.quarter); // 🟢 Check if updated

        res.json({ success: true, message: 'Match started, quarter incremented.', match });
    } catch (error) {
        console.error("Error updating match status:", error);
        res.status(500).json({ success: false, message: 'Server error while updating match status.' });
    }
});





router.post('/stopmatchvolleyball', authenticateJWT, async (req, res) => {
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

        // Update match status to "recent"
        match.status = 'recent';

        // **Determine the match winner based on quarterWinners array**
        const quarterWinners = match.quarterWinners || []; // Ensure array exists
        const winnerCounts = {};

        // Count occurrences of each team in quarterWinners
        quarterWinners.forEach(team => {
            if (team) {
                winnerCounts[team] = (winnerCounts[team] || 0) + 1;
            }
        });

        let winningTeam = null;

        // ✅ If a team won 2 out of 3 quarters → They win
        if (winnerCounts[match.team1] === 2) {
            winningTeam = match.team1;
        } else if (winnerCounts[match.team2] === 2) {
            winningTeam = match.team2;
        } 
        // ✅ If each team won 1 quarter & the last was a tie → Draw
        else if (winnerCounts[match.team1] === 1 && winnerCounts[match.team2] === 1 && quarterWinners.length === 3) {
            winningTeam = 'Draw';
        } 
        // ✅ Default case: No clear winner, mark as Draw
        else {
            winningTeam = 'Draw';
        }

        match.result = winningTeam;

        // **Handle play-off winner replacements and nomination updates**
        if (match.pool === 'play-off' && winningTeam !== 'Draw') {
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

        await match.save();
        res.json({ success: true, message: 'Match stopped successfully, nominations updated.', match });

    } catch (error) {
        console.error("Error in /stopmatch:", error);
        res.status(500).json({ success: false, message: 'Error stopping the match', error });
    }
});



router.post('/updateGoalvolleyball', authenticateJWT, async (req, res) => {
    try {
        const { matchId, playerId, team } = req.body;
        const sportCategory = req.user.sportscategory;

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

        const quarterIndex = match.quarter - 1; // Adjust for zero-based index
        if (quarterIndex < 0 || quarterIndex > 3) {
            return res.status(400).json({ success: false, message: "Invalid quarter value." });
        }

        let updatedPlayer = null;

        if (team === "team1") {
            updatedPlayer = match.nominationsT1.find(player => player._id.toString() === playerId);
            if (updatedPlayer) {
                updatedPlayer.pointsByQuarter[quarterIndex] = 
                    (updatedPlayer.pointsByQuarter[quarterIndex] || 0) + 1; // Increment by 1

                match.scoreT1[quarterIndex] = 
                    (match.scoreT1[quarterIndex] || 0) + 1; // Increment team score by 1
            }
        } else if (team === "team2") {
            updatedPlayer = match.nominationsT2.find(player => player._id.toString() === playerId);
            if (updatedPlayer) {
                updatedPlayer.pointsByQuarter[quarterIndex] = 
                    (updatedPlayer.pointsByQuarter[quarterIndex] || 0) + 1;

                match.scoreT2[quarterIndex] = 
                    (match.scoreT2[quarterIndex] || 0) + 1;
            }
        }

        if (!updatedPlayer) {
            return res.status(404).json({ success: false, message: "Player not found in this match." });
        }

        await match.save();
        res.json({ success: true, message: "Point updated successfully!" });

    } catch (error) {
        console.error("Error updating point:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});




  


router.post('/updateHalfvolleyball', authenticateJWT, async (req, res) => {
    const { matchId, quarter } = req.body;
    const sportCategory = req.user.sportscategory;

    try {
        if (!matchId || !sportCategory) {
            return res.status(400).json({ success: false, message: 'Match ID and sport category are required.' });
        }

        const ScheduleModel = createScheduleModel(sportCategory);
        if (!ScheduleModel) {
            return res.status(400).json({ success: false, message: 'Invalid sport category.' });
        }

        const match = await ScheduleModel.findById(matchId);
        if (!match) {
            return res.status(404).json({ success: false, message: 'Match not found.' });
        }

        if (match.quarter >= 3) { 
            return res.status(400).json({ success: false, message: 'Match has already completed all quarters.' });
        }

        // Ensure quarterWinners exists and has correct length
        if (!match.quarterWinners || match.quarterWinners.length < 3) {
            match.quarterWinners = ["", "", ""];
        }

        // **Use current quarter (not next) for fetching scores**
        const currentQuarterIndex = quarter - 2; // Ensure correct indexing (0-based array)

        // Validate score arrays
        if (!match.scoreT1 || !match.scoreT2 || match.scoreT1.length < quarter || match.scoreT2.length < quarter) {
            return res.status(400).json({ success: false, message: `Scores for Quarter ${quarter} are missing.` });
        }

        // Fetch correct quarter's scores
        const team1Score = match.scoreT1[currentQuarterIndex]; 
        const team2Score = match.scoreT2[currentQuarterIndex]; 

        let winner = "";
        if (team1Score > team2Score) {
            winner = match.team1;
        } else if (team2Score > team1Score) {
            winner = match.team2;
        } else {
            winner = "Draw";
        }

        console.log(`Quarter: ${quarter}, Storing winner at index: ${currentQuarterIndex}`);
        match.quarterWinners[currentQuarterIndex] = winner; // Store winner in correct index

        // **Update quarter AFTER processing scores**
        match.quarter = quarter; 
        await match.save();

        res.json({ success: true, message: `Quarter ${quarter} ended. Winner: ${winner}`, match });
    } catch (error) {
        console.error("Error updating quarter:", error);
        res.status(500).json({ success: false, message: 'Server error while updating the quarter.' });
    }
});


router.post('/updateHalf3rdvolleyball', authenticateJWT, async (req, res) => {
    const { matchId, quarter } = req.body;
    const sportCategory = req.user.sportscategory;

    try {
        if (!matchId || !sportCategory) {
            return res.status(400).json({ success: false, message: 'Match ID and sport category are required.' });
        }

        const ScheduleModel = createScheduleModel(sportCategory);
        if (!ScheduleModel) {
            return res.status(400).json({ success: false, message: 'Invalid sport category.' });
        }

        const match = await ScheduleModel.findById(matchId);
        if (!match) {
            return res.status(404).json({ success: false, message: 'Match not found.' });
        }

        if (match.quarter !== 3) { 
            return res.status(400).json({ success: false, message: 'Only Quarter 4 can be ended with this route.' });
        }

        // Ensure quarterWinners exists and has correct length
        if (!match.quarterWinners || match.quarterWinners.length < 3) {
            match.quarterWinners = ["", "", ""];
        }

        // **Fetch Quarter 4's scores** (index 3 for 0-based array)
        const team1Score = match.scoreT1[2]; 
        const team2Score = match.scoreT2[2]; 

        let winner = "";
        if (team1Score > team2Score) {
            winner = match.team1;
        } else if (team2Score > team1Score) {
            winner = match.team2;
        } else {
            winner = "Draw";
        }

        console.log(`Quarter: 3, Storing winner at index: 2`);
        match.quarterWinners[2] = winner; // Store winner for Quarter 4

        // **Reset quarter to 0 after match completion**
        match.quarter = 0; 
        await match.save();

        res.json({ success: true, message: `Quarter 3 ended. Winner: ${winner}`, match });
    } catch (error) {
        console.error("Error updating quarter:", error);
        res.status(500).json({ success: false, message: 'Server error while updating the quarter.' });
    }
});







  
  
  router.post('/swapPlayersvolleyball', authenticateJWT, async (req, res) => {
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
  





module.exports = router;

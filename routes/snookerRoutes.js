const mongoose = require('mongoose');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {createScheduleModel,PlayerNominationForm,BestSnookerPlayer} = require('../models'); // Ensure the RefUser schema is defined in your models
const authenticateJWT = require('../middleware');
const config = require('../config'); // Include JWT secret configuration

const router = express.Router();


router.post('/startmatchsnooker', authenticateJWT, async (req, res) => {
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





router.post('/stopmatchsnooker', authenticateJWT, async (req, res) => {
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
        const quarterWinners = match.quarterWinners || [];
        const winnerCounts = {};

        // Count occurrences of each team in quarterWinners
        quarterWinners.forEach(team => {
            if (team) {
                winnerCounts[team] = (winnerCounts[team] || 0) + 1;
            }
        });

        // Find the team with the most wins
        let winningTeam = null;
        let maxWins = 0;

        for (const [team, count] of Object.entries(winnerCounts)) {
            if (count > maxWins) {
                maxWins = count;
                winningTeam = team;
            }
        }

        // If no team has more wins, it's a draw
        if (maxWins === 2 && Object.keys(winnerCounts).length > 1) {
            match.result = 'Draw';
        } else {
            match.result = winningTeam || 'Draw'; // Assign winner or draw
        }

        // Save updated match
        await match.save();

        // **Handle play-off winner replacements and nomination updates**
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

        // Handle final match for Tennis
            else if (match.pool === 'final' && sportCategory === 'Snooker') {
                console.log("Final match detected. Processing Snooker tournament statistics...");
    
                // Step 1: Fetch all nominated players and store in BestTennisPlayer
                const allNominations = await PlayerNominationForm.find({
                    sport: "Snooker",
                    year: match.year
                }).select("nominations");
    
                console.log("Total nomination entries found:", allNominations.length);
    
                // Extract and prepare player data with matchesPlayed initialized to 0
                const allPlayers = allNominations.flatMap((team) =>
                    team.nominations.map((player) => ({
                        shirtNo: player.shirtNo,
                        regNo: player.regNo,
                        name: player.name,
                        cnic: player.cnic,
                        section: player.section,
                        totalpointsscored: 0,
                        matchesPlayed: 0
                    }))
                );
    
                // Create or update BestTennisPlayer document
                await BestSnookerPlayer.findOneAndUpdate(
                    { year: match.year },
                    {
                        year: match.year,
                        nominations: allPlayers
                    },
                    { upsert: true, new: true }
                );
    
                // Step 2: Calculate statistics from all matches
                const allMatches = await ScheduleModel.find({
                    year: match.year,
                    status: 'recent'
                }).select("nominationsT1 nominationsT2");
    
                const bestTennisPlayerDoc = await BestSnookerPlayer.findOne({ year: match.year });
                if (!bestTennisPlayerDoc) {
                    console.log("No best tennis player document found, skipping statistics calculation");
                    return;
                }
    
                // Update each player's statistics
                for (const player of bestTennisPlayerDoc.nominations) {
                    let totalPoints = 0;
                    let matchesCount = 0;
    
                    // Search player in all matches
                    for (const match of allMatches) {
                        // Check team1 nominations
                        const playerInT1 = match.nominationsT1.find(p => p.regNo === player.regNo);
                        if (playerInT1) {
                            if (playerInT1.pointsByQuarter) {
                                totalPoints += playerInT1.pointsByQuarter.reduce((sum, points) => sum + (points || 0), 0);
                            }
                            matchesCount++;
                        }
                        
                        // Check team2 nominations
                        const playerInT2 = match.nominationsT2.find(p => p.regNo === player.regNo);
                        if (playerInT2) {
                            if (playerInT2.pointsByQuarter) {
                                totalPoints += playerInT2.pointsByQuarter.reduce((sum, points) => sum + (points || 0), 0);
                            }
                            matchesCount++;
                        }
                    }
    
                    // Update the player's statistics
                    await BestSnookerPlayer.updateOne(
                        { 
                            year: match.year,
                            "nominations.regNo": player.regNo 
                        },
                        { 
                            $set: { 
                                "nominations.$.totalpointsscored": totalPoints,
                                "nominations.$.matchesPlayed": matchesCount
                            } 
                        }
                    );
                }
            }
    
            await match.save();
            res.json({ 
                success: true, 
                message: 'Match stopped successfully' + 
                        (match.pool === 'play-off' ? ' and TBD entries updated' : '') +
                        (match.pool === 'final' ? ' and tournament statistics updated' : ''), 
                match 
            });

        res.json({ success: true, message: 'Match stopped successfully, nominations updated.', match });
    } catch (error) {
        console.error("Error in /stopmatch:", error);
        res.status(500).json({ success: false, message: 'Error stopping the match', error });
    }
});



  router.post('/updateGoalsnooker', authenticateJWT, async (req, res) => {
    try {
        const { matchId, playerId, team, value } = req.body;
        const sportCategory = req.user.sportscategory;

        if (!matchId || !playerId || !team || !sportCategory || value == null) {
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
                    (updatedPlayer.pointsByQuarter[quarterIndex] || 0) + Number(value); // Ensure Number type

                match.scoreT1[quarterIndex] = 
                    (match.scoreT1[quarterIndex] || 0) + Number(value);
            }
        } else if (team === "team2") {
            updatedPlayer = match.nominationsT2.find(player => player._id.toString() === playerId);
            if (updatedPlayer) {
                updatedPlayer.pointsByQuarter[quarterIndex] = 
                    (updatedPlayer.pointsByQuarter[quarterIndex] || 0) + Number(value);

                match.scoreT2[quarterIndex] = 
                    (match.scoreT2[quarterIndex] || 0) + Number(value);
            }
        }

        if (!updatedPlayer) {
            return res.status(404).json({ success: false, message: "Player not found in this match." });
        }

        await match.save();
        res.json({ success: true, message: "Goal updated successfully!" });

    } catch (error) {
        console.error("Error updating goal:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});



  


router.post('/updateHalfsnooker', authenticateJWT, async (req, res) => {
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

        if (match.quarter >= 4) { 
            return res.status(400).json({ success: false, message: 'Match has already completed all quarters.' });
        }

        // Ensure quarterWinners exists and has correct length
        if (!match.quarterWinners || match.quarterWinners.length < 4) {
            match.quarterWinners = ["", "", "", ""];
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


router.post('/updateHalf4thsnooker', authenticateJWT, async (req, res) => {
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

        if (match.quarter !== 4) { 
            return res.status(400).json({ success: false, message: 'Only Quarter 4 can be ended with this route.' });
        }

        // Ensure quarterWinners exists and has correct length
        if (!match.quarterWinners || match.quarterWinners.length < 4) {
            match.quarterWinners = ["", "", "", ""];
        }

        // **Fetch Quarter 4's scores** (index 3 for 0-based array)
        const team1Score = match.scoreT1[3]; 
        const team2Score = match.scoreT2[3]; 

        let winner = "";
        if (team1Score > team2Score) {
            winner = match.team1;
        } else if (team2Score > team1Score) {
            winner = match.team2;
        } else {
            winner = "Draw";
        }

        console.log(`Quarter: 4, Storing winner at index: 3`);
        match.quarterWinners[3] = winner; // Store winner for Quarter 4

        // **Reset quarter to 0 after match completion**
        match.quarter = 0; 
        await match.save();

        res.json({ success: true, message: `Quarter 4 ended. Winner: ${winner}`, match });
    } catch (error) {
        console.error("Error updating quarter:", error);
        res.status(500).json({ success: false, message: 'Server error while updating the quarter.' });
    }
});







  
  
  router.post('/swapPlayerssnooker', authenticateJWT, async (req, res) => {
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
  
  


router.post('/updatePlayerStatussnooker', authenticateJWT, async (req, res) => {
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

        match.nominationsT1.forEach(player => {updateHalf4thbasketball
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


// For Snooker
router.get("/bestsnookerplayertp/:year", async (req, res) => {
  const year = req.params.year;

  try {
    const snookerData = await BestSnookerPlayer.findOne({ year });

    if (!snookerData || snookerData.nominations.length === 0) {
      return res.status(404).json({ success: false, message: "No record found for the year." });
    }

    // Sort and get top 3 players
    const topPlayers = [...snookerData.nominations]
      .sort((a, b) => b.totalpointsscored - a.totalpointsscored)
      .slice(0, 3)
      .map(player => ({
        name: player.name,
        regNo: player.regNo,
        points: player.totalpointsscored,
        shirtNo: player.shirtNo,
        section: player.section,
        matchesPlayed: player.matchesPlayed,
      }));

    res.json({
      success: true,
      topPlayers: topPlayers
    });
  } catch (error) {
    console.error("Error fetching best snooker players:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
});



module.exports = router;

const mongoose = require('mongoose');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {createScheduleModel,PlayerNominationForm,BestBasketballPlayer} = require('../models'); // Ensure the RefUser schema is defined in your models
const authenticateJWT = require('../middleware');
const config = require('../config'); // Include JWT secret configuration

const router = express.Router();


router.post('/startmatchbasketball', authenticateJWT, async (req, res) => {
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



router.post('/stopmatchbasketball', authenticateJWT, async (req, res) => {
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

        // Update match status to "recent"
        match.status = 'recent';

        // Improved winner determination logic
        const quarterWinners = match.quarterWinners || [];
        
        // Count wins for each team
        const team1Wins = quarterWinners.filter(winner => winner === match.team1).length;
        const team2Wins = quarterWinners.filter(winner => winner === match.team2).length;

        // Determine the winner based on quarter wins
        if (team1Wins > team2Wins) {
            match.result = match.team1;
        } else if (team2Wins > team1Wins) {
            match.result = match.team2;
        } else {
            // If equal wins, check total points as tiebreaker
            const team1Total = (match.nominationsT1 || []).reduce((sum, player) => 
                sum + (player.pointsByQuarter?.reduce((s, p) => s + (p || 0), 0) || 0), 0);
            const team2Total = (match.nominationsT2 || []).reduce((sum, player) => 
                sum + (player.pointsByQuarter?.reduce((s, p) => s + (p || 0), 0) || 0), 0);

            if (team1Total > team2Total) {
                match.result = match.team1;
            } else if (team2Total > team1Total) {
                match.result = match.team2;
            } else {
                match.result = 'Draw';
            }
        }

        // Save updated match
        await match.save();

        // Handle play-off winner replacements and nomination updates
        if (match.pool === 'play-off' && match.result !== 'Draw') {
            console.log("Play-off match detected. Updating TBD entries...");
            
            const winnerNominations = await PlayerNominationForm.findOne({ 
                department: match.result, 
                sport: sportCategory,
                year: match.year
            }).select('nominations');

            console.log(`Found ${winnerNominations?.nominations?.length || 0} nominations for winner ${match.result}`);

            // Update all matches where team1 is TBD
            const updateTeam1Result = await ScheduleModel.updateMany(
                {
                    year: match.year,
                    team1: 'TBD'
                },
                {
                    $set: {
                        team1: match.result,
                        nominationsT1: winnerNominations?.nominations || []
                    }
                }
            );
            console.log(`Updated ${updateTeam1Result.modifiedCount} matches for team1=TBD`);

            // Update all matches where team2 is TBD
            const updateTeam2Result = await ScheduleModel.updateMany(
                {
                    year: match.year,
                    team2: 'TBD'
                },
                {
                    $set: {
                        team2: match.result,
                        nominationsT2: winnerNominations?.nominations || []
                    }
                }
            );
            console.log(`Updated ${updateTeam2Result.modifiedCount} matches for team2=TBD`);
        }

        // Handle final match for Basketball (moved to end as requested)
        if (match.pool === 'final' && sportCategory === 'Basketball') {
            console.log("Final match detected. Processing Basketball tournament statistics...");

            // Step 1: Fetch all nominated players and store in BestBasketballPlayer
            const allNominations = await PlayerNominationForm.find({
                sport: "Basketball",
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

            // Create or update BestBasketballPlayer document
            await BestBasketballPlayer.findOneAndUpdate(
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

            const bestBasketballPlayerDoc = await BestBasketballPlayer.findOne({ year: match.year });
            if (!bestBasketballPlayerDoc) {
                console.log("No best basketball player document found, skipping statistics calculation");
                return;
            }

            // Update each player's statistics
            for (const player of bestBasketballPlayerDoc.nominations) {
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
                await BestBasketballPlayer.updateOne(
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

        res.json({ 
            success: true, 
            message: 'Match stopped successfully' + 
                    (match.pool === 'play-off' ? ' and TBD entries updated' : '') +
                    (match.pool === 'final' ? ' and tournament statistics updated' : ''), 
            match 
        });
    } catch (error) {
        console.error("Error in /stopmatchbasketball:", error);
        res.status(500).json({ success: false, message: 'Error stopping the match', error });
    }
});

  router.post('/updateGoalbasketball', authenticateJWT, async (req, res) => {
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



  


router.post('/updateHalfbasketball', authenticateJWT, async (req, res) => {
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


router.post('/updateHalf4thbasketball', authenticateJWT, async (req, res) => {
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







  
  
  router.post('/swapPlayersbasketball', authenticateJWT, async (req, res) => {
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
  
  


router.post('/updatePlayerStatusbasketball', authenticateJWT, async (req, res) => {
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



// For Basketball
router.get("/bestbasketballplayertp/:year", async (req, res) => {
  const year = req.params.year;

  try {
    const basketballData = await BestBasketballPlayer.findOne({ year });

    if (!basketballData || basketballData.nominations.length === 0) {
      return res.status(404).json({ success: false, message: "No record found for the year." });
    }

    // Sort and get top 3 players
    const topPlayers = [...basketballData.nominations]
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
      topPlayers: topPlayers // Only return the array of top players
    });
  } catch (error) {
    console.error("Error fetching best basketball players:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.get('/bestbasketballplayer', async (req, res) => {
  try {
    // Get current year or use a parameter if you want to support multiple years
    const currentYear = new Date().getFullYear().toString();
    
    const bestFootballerData = await BestBasketballPlayer.findOne({ year: currentYear });
    
    if (!bestFootballerData || !bestFootballerData.nominations || bestFootballerData.nominations.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No top scorer data available' 
      });
    }

    // Find player with highest goals
    const topScorer = bestFootballerData.nominations.reduce((prev, current) => 
      (current.totalpointsscored > prev.totalpointsscored) ? current : prev
    );

    res.json({
      success: true,
      bestFootballer: {
        name: topScorer.name,
        regNo: topScorer.regNo,
        points: topScorer.totalpointsscored,
        shirtNo: topScorer.shirtNo,
        section: topScorer.section,
        // Add matches count if you track it
        matches: topScorer.matchesPlayed || 'N/A'
      }
    });
  } catch (error) {
    console.error("Error fetching best footballer:", error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching top scorer',
      error: error.message 
    });
  }
});



module.exports = router;

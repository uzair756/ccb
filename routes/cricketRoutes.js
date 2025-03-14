const mongoose = require('mongoose');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {createScheduleModel,PlayerNominationForm} = require('../models'); // Ensure the RefUser schema is defined in your models
const authenticateJWT = require('../middleware');
const config = require('../config'); // Include JWT secret configuration

const router = express.Router();




router.post("/updateToss", authenticateJWT, async (req, res) => {
    const { matchId, tosswin, tosswindecision, tossloose, tossloosedecision } = req.body;
    const sportCategory = req.user.sportscategory;

    try {
        if (!matchId || !tosswin || !tosswindecision || !tossloose || !tossloosedecision) {
            return res.status(400).json({ success: false, message: "All fields are required." });
        }

        const ScheduleModel = createScheduleModel(sportCategory);
        if (!ScheduleModel) {
            return res.status(400).json({ success: false, message: "Invalid sport category." });
        }

        const match = await ScheduleModel.findById(matchId);
        if (!match) {
            return res.status(404).json({ success: false, message: "Match not found." });
        }

        // Update toss details in the database
        match.tosswin = tosswin;
        match.tosswindecision = tosswindecision;
        match.tossloose = tossloose;
        match.tossloosedecision = tossloosedecision;

        // Determine the innings teams based on the toss decision
        if (tosswindecision === "Bat") {
            match.FirstInningBattingTeam = tosswin;
            match.FirstInningBowlingTeam = tossloose;
            match.SecondInningBattingTeam = tossloose;
            match.SecondInningBowlingTeam = tosswin;
        } else { // If toss winner chooses to Bowl
            match.FirstInningBattingTeam = tossloose;
            match.FirstInningBowlingTeam = tosswin;
            match.SecondInningBattingTeam = tosswin;
            match.SecondInningBowlingTeam = tossloose;
        }

        await match.save();

        res.json({ success: true, message: "Toss updated successfully and innings teams assigned.", match });
    } catch (error) {
        console.error("Error updating toss:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});


router.get("/getPlayers", authenticateJWT, async (req, res) => {
    const { matchId } = req.query;
    const sportCategory = req.user.sportscategory;

    try {
        if (!matchId) {
            return res.status(400).json({ success: false, message: "Match ID is required." });
        }

        const ScheduleModel = createScheduleModel(sportCategory);
        const match = await ScheduleModel.findById(matchId);

        if (!match) {
            return res.status(404).json({ success: false, message: "Match not found." });
        }

        res.json({
            success: true,
            team1: { 
                name: match.team1, 
                players: match.nominationsT1?.filter(player => player.playingStatus) || [] 
            },
            team2: { 
                name: match.team2, 
                players: match.nominationsT2?.filter(player => player.playingStatus) || [] 
            },
            tosswin: match.tosswin,
            tosswindecision: match.tosswindecision,
            FirstInningBattingTeam: match.FirstInningBattingTeam,
            FirstInningBowlingTeam: match.FirstInningBowlingTeam,
        });
    } catch (error) {
        console.error("Error fetching players:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

router.get("/getPlayers2ndinning", authenticateJWT, async (req, res) => {
    const { matchId } = req.query;
    const sportCategory = req.user.sportscategory;
    try {
        if (!matchId) {
            return res.status(400).json({ success: false, message: "Match ID is required." });
        }

        const ScheduleModel = createScheduleModel(sportCategory);
        const match = await ScheduleModel.findById(matchId);

        if (!match) {
            return res.status(404).json({ success: false, message: "Match not found." });
        }

        res.json({
            success: true,
            team1: { 
                name: match.team1, 
                players: match.nominationsT1?.filter(player => player.playingStatus) || [] 
            },
            team2: { 
                name: match.team2, 
                players: match.nominationsT2?.filter(player => player.playingStatus) || [] 
            },
            inning: match.inning,  // <-- Include the inning in response
            tossloose: match.tossloose,
            tossloosedecision: match.tossloosedecision,
            SecondInningBattingTeam: match.SecondInningBattingTeam,
            SecondInningBowlingTeam: match.SecondInningBowlingTeam,
        });
    } catch (error) {
        console.error("Error fetching players:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});







router.get("/getFirstInningTeams", authenticateJWT, async (req, res) => {
    const { matchId } = req.query;
    const sportCategory = req.user.sportscategory;

    try {
        if (!matchId) {
            return res.status(400).json({ success: false, message: "Match ID is required." });
        }

        const ScheduleModel = createScheduleModel(sportCategory);
        const match = await ScheduleModel.findById(matchId);

        if (!match) {
            return res.status(404).json({ success: false, message: "Match not found." });
        }

        res.json({
            success: true,
            FirstInningBattingTeam: match.FirstInningBattingTeam,
            FirstInningBowlingTeam: match.FirstInningBowlingTeam,
        });
    } catch (error) {
        console.error("Error fetching first inning teams:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

router.get("/getSecondInningTeams", authenticateJWT, async (req, res) => {
    const { matchId } = req.query;
    const sportCategory = req.user.sportscategory;

    try {
        if (!matchId) {
            return res.status(400).json({ success: false, message: "Match ID is required." });
        }

        const ScheduleModel = createScheduleModel(sportCategory);
        const match = await ScheduleModel.findById(matchId);

        if (!match) {
            return res.status(404).json({ success: false, message: "Match not found." });
        }

        res.json({
            success: true,
            SecondInningBattingTeam: match.SecondInningBattingTeam,
            SecondInningBowlingTeam: match.SecondInningBowlingTeam,
        });
    } catch (error) {
        console.error("Error fetching Second inning teams:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});






router.post("/updatePlayingStatus", authenticateJWT, async (req, res) => {
    const { matchId, players } = req.body; // `players` is an array of 3 _id values
    const sportCategory = req.user.sportscategory;

    try {
        if (!matchId || !Array.isArray(players) || players.length !== 3) {
            return res.status(400).json({ success: false, message: "Invalid input data." });
        }

        const ScheduleModel = createScheduleModel(sportCategory);
        if (!ScheduleModel) {
            return res.status(400).json({ success: false, message: "Invalid sport category." });
        }

        // Fetch match details
        const match = await ScheduleModel.findById(matchId);
        if (!match) {
            return res.status(404).json({ success: false, message: "Match not found." });
        }

        const [batsman1Id, batsman2Id, bowlerId] = players.map(id => new mongoose.Types.ObjectId(id));

        // Identify correct batting and bowling teams
        const battingTeamKey = match.FirstInningBattingTeam === match.team1 ? "nominationsT1" : "nominationsT2";
        const bowlingTeamKey = match.FirstInningBowlingTeam === match.team1 ? "nominationsT1" : "nominationsT2";

        // Ensure players exist in their respective teams
        const batsman1Exists = match[battingTeamKey].some(player => player._id.equals(batsman1Id));
        const batsman2Exists = match[battingTeamKey].some(player => player._id.equals(batsman2Id));
        const bowlerExists = match[bowlingTeamKey].some(player => player._id.equals(bowlerId));

        if (!batsman1Exists || !batsman2Exists || !bowlerExists) {
            return res.status(400).json({ success: false, message: "One or more players not found in respective teams." });
        }

        // Update playing status for selected batsmen and bowler
        const updateResult = await ScheduleModel.updateMany(
            { _id: matchId },
            {
                $set: {
                    [`${battingTeamKey}.$[batsman1].playingStatus`]: "ActiveBatsman",
                    [`${battingTeamKey}.$[batsman2].playingStatus`]: "ActiveBatsman",
                    [`${bowlingTeamKey}.$[bowler].playingStatus`]: "ActiveBowler",
                },
            },
            {
                arrayFilters: [
                    { "batsman1._id": batsman1Id },
                    { "batsman2._id": batsman2Id },
                    { "bowler._id": bowlerId },
                ],
                new: true,
            }
        );

        if (!updateResult.modifiedCount) {
            return res.status(400).json({ success: false, message: "Failed to update players." });
        }

        res.json({ success: true, message: "Players set to 'Active' successfully!", updatedMatch: updateResult });
    } catch (error) {
        console.error("Error updating players:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});







router.post("/updatePlayingStatus2ndInning", authenticateJWT, async (req, res) => {
    const { matchId, players } = req.body; // `players` is an array of 3 _id values
    const sportCategory = req.user.sportscategory;

    try {
        if (!matchId || !Array.isArray(players) || players.length !== 3) {
            return res.status(400).json({ success: false, message: "Invalid input data." });
        }

        const ScheduleModel = createScheduleModel(sportCategory);
        if (!ScheduleModel) {
            return res.status(400).json({ success: false, message: "Invalid sport category." });
        }

        // Fetch match details
        const match = await ScheduleModel.findById(matchId);
        if (!match) {
            return res.status(404).json({ success: false, message: "Match not found." });
        }

        const [batsman1Id, batsman2Id, bowlerId] = players.map(id => new mongoose.Types.ObjectId(id));

        // Identify correct batting and bowling teams
        const battingTeamKey = match.SecondInningBattingTeam === match.team1 ? "nominationsT1" : "nominationsT2";
        const bowlingTeamKey = match.SecondInningBowlingTeam === match.team1 ? "nominationsT1" : "nominationsT2";

        // Ensure players exist in their respective teams
        const batsman1Exists = match[battingTeamKey].some(player => player._id.equals(batsman1Id));
        const batsman2Exists = match[battingTeamKey].some(player => player._id.equals(batsman2Id));
        const bowlerExists = match[bowlingTeamKey].some(player => player._id.equals(bowlerId));

        if (!batsman1Exists || !batsman2Exists || !bowlerExists) {
            return res.status(400).json({ success: false, message: "One or more players not found in respective teams." });
        }

        // Update playing status for selected batsmen and bowler
        const updateResult = await ScheduleModel.updateMany(
            { _id: matchId },
            {
                $set: {
                    [`${battingTeamKey}.$[batsman1].playingStatus`]: "ActiveBatsman",
                    [`${battingTeamKey}.$[batsman2].playingStatus`]: "ActiveBatsman",
                    [`${bowlingTeamKey}.$[bowler].playingStatus`]: "ActiveBowler",
                },
            },
            {
                arrayFilters: [
                    { "batsman1._id": batsman1Id },
                    { "batsman2._id": batsman2Id },
                    { "bowler._id": bowlerId },
                ],
                new: true,
            }
        );

        if (!updateResult.modifiedCount) {
            return res.status(400).json({ success: false, message: "Failed to update players." });
        }

        res.json({ success: true, message: "Players set to 'Active' successfully!", updatedMatch: updateResult });
    } catch (error) {
        console.error("Error updating players:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});




router.post('/swapPlayerscricket', authenticateJWT, async (req, res) => {
    try {
        const { matchId, outgoingBatsmanId, newBatsmanId } = req.body;
        const ScheduleModel = createScheduleModel(req.user.sportscategory);

        if (!matchId || !outgoingBatsmanId || !newBatsmanId || !ScheduleModel) {
            return res.status(400).json({ success: false, message: "Invalid data." });
        }

        const match = await ScheduleModel.findById(matchId);
        if (!match) {
            return res.status(404).json({ success: false, message: "Match not found." });
        }

        // Function to update player status
        const updateStatus = (players, id, status) => {
            const player = players.find(p => p._id.equals(id));
            if (player) player.playingStatus = status;
        };

        // Function to update bowler stats
        const updateBowlerStats = (players) => {
            const activeBowler = players.find(p => p.playingStatus === "ActiveBowler");
            if (activeBowler) {
                activeBowler.wicketsTaken = (activeBowler.wicketsTaken || 0) + 1;
                activeBowler.ballsBowled.push("W");
            }
        };

        // Function to update overs correctly
        const updateOvers = (currentOvers) => {
            let [whole, decimal] = currentOvers.toString().split('.').map(Number);
            decimal = decimal || 0;

            if (decimal === 5) {
                whole += 1;
                decimal = 0;
            } else {
                decimal += 1;
            }

            return parseFloat(`${whole}.${decimal}`);
        };

        // Function to update runs & overs for the current inning
        const updateInnings = () => {
            if (match.inning === 1) {
                match.runsInning1.push("W");  // Add "W" to runs array
                match.oversInning1 = updateOvers(match.oversInning1); // Use updateOvers function
                console.log("Updated oversInning1:", match.oversInning1);
            } else if (match.inning === 2) {
                match.runsInning2.push("W");  // Add "W" to runs array
                match.oversInning2 = updateOvers(match.oversInning2); // Use updateOvers function
                console.log("Updated oversInning2:", match.oversInning2);
            }
        };

        // Determine which team is batting
        if (match.FirstInningBattingTeam.toString().trim() === match.team1.toString().trim()) {
            updateStatus(match.nominationsT1, newBatsmanId, "ActiveBatsman");
            updateStatus(match.nominationsT1, outgoingBatsmanId, "Out");

            match.T1wickets += 1;
            updateBowlerStats(match.nominationsT2); // Update bowler stats from team2
            updateInnings(); // Update runs & overs based on the inning value

            console.log("Updated T1Wickets:", match.T1wickets);

        } else if (match.FirstInningBattingTeam.toString().trim() === match.team2.toString().trim()) {
            updateStatus(match.nominationsT2, newBatsmanId, "ActiveBatsman");
            updateStatus(match.nominationsT2, outgoingBatsmanId, "Out");

            match.T2wickets += 1;
            updateBowlerStats(match.nominationsT1); // Update bowler stats from team1
            updateInnings(); // Update runs & overs based on the inning value

            console.log("Updated T2Wickets:", match.T2wickets);
        } else {
            return res.status(400).json({ success: false, message: "Invalid FirstInningBattingTeam value." });
        }

        // Save changes to database
        await match.save();

        res.json({ 
            success: true, 
            message: "Players swapped, wicket updated, and innings data recorded successfully!", 
            T1wickets: match.T1wickets, 
            T2wickets: match.T2wickets,
            oversInning1: match.oversInning1,
            oversInning2: match.oversInning2
        });

    } catch (error) {
        console.error("Error in swapPlayerscricket:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});


router.post('/swapPlayerscricket2ndInning', authenticateJWT, async (req, res) => {
    try {
        const { matchId, outgoingBatsmanId, newBatsmanId } = req.body;
        const ScheduleModel = createScheduleModel(req.user.sportscategory);

        if (!matchId || !outgoingBatsmanId || !newBatsmanId || !ScheduleModel) {
            return res.status(400).json({ success: false, message: "Invalid data." });
        }

        const match = await ScheduleModel.findById(matchId);
        if (!match) {
            return res.status(404).json({ success: false, message: "Match not found." });
        }

        // Function to update player status
        const updateStatus = (players, id, status) => {
            const player = players.find(p => p._id.equals(id));
            if (player) player.playingStatus = status;
        };

        // Function to update bowler stats
        const updateBowlerStats = (players) => {
            const activeBowler = players.find(p => p.playingStatus === "ActiveBowler");
            if (activeBowler) {
                activeBowler.wicketsTaken = (activeBowler.wicketsTaken || 0) + 1;
                activeBowler.ballsBowled.push("W");
            }
        };

        // Function to update overs correctly
        const updateOvers = (currentOvers) => {
            let [whole, decimal] = currentOvers.toString().split('.').map(Number);
            decimal = decimal || 0;

            if (decimal === 5) {
                whole += 1;
                decimal = 0;
            } else {
                decimal += 1;
            }

            return parseFloat(`${whole}.${decimal}`);
        };

        // Function to update runs & overs for the current inning
        const updateInnings = () => {
            if (match.inning === 1) {
                match.runsInning1.push("W");  // Add "W" to runs array
                match.oversInning1 = updateOvers(match.oversInning1); // Use updateOvers function
                console.log("Updated oversInning1:", match.oversInning1);
            } else if (match.inning === 2) {
                match.runsInning2.push("W");  // Add "W" to runs array
                match.oversInning2 = updateOvers(match.oversInning2); // Use updateOvers function
                console.log("Updated oversInning2:", match.oversInning2);
            }
        };

        // Determine which team is batting
        if (match.SecondInningBattingTeam.toString().trim() === match.team1.toString().trim()) {
            updateStatus(match.nominationsT1, newBatsmanId, "ActiveBatsman");
            updateStatus(match.nominationsT1, outgoingBatsmanId, "Out");

            match.T1wickets += 1;
            updateBowlerStats(match.nominationsT2); // Update bowler stats from team2
            updateInnings(); // Update runs & overs based on the inning value

            console.log("Updated T1Wickets:", match.T1wickets);

        } else if (match.SecondInningBattingTeam.toString().trim() === match.team2.toString().trim()) {
            updateStatus(match.nominationsT2, newBatsmanId, "ActiveBatsman");
            updateStatus(match.nominationsT2, outgoingBatsmanId, "Out");

            match.T2wickets += 1;
            updateBowlerStats(match.nominationsT1); // Update bowler stats from team1
            updateInnings(); // Update runs & overs based on the inning value

            console.log("Updated T2Wickets:", match.T2wickets);
        } else {
            return res.status(400).json({ success: false, message: "Invalid SecondInningBattingTeam value." });
        }

        // Save changes to database
        await match.save();

        res.json({ 
            success: true, 
            message: "Players swapped, wicket updated, and innings data recorded successfully!", 
            T1wickets: match.T1wickets, 
            T2wickets: match.T2wickets,
            oversInning1: match.oversInning1,
            oversInning2: match.oversInning2
        });

    } catch (error) {
        console.error("Error in swapPlayerscricket:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});



router.post('/swapbowlercricket', authenticateJWT, async (req, res) => {
    try {
        const { matchId, newBowlerId } = req.body;
        const ScheduleModel = createScheduleModel(req.user.sportscategory);

        if (!matchId || !newBowlerId || !ScheduleModel) {
            return res.status(400).json({ success: false, message: "Invalid data." });
        }

        const match = await ScheduleModel.findById(matchId);
        if (!match) {
            return res.status(404).json({ success: false, message: "Match not found." });
        }

        // Function to update player status in the given team nominations
        const updateStatus = (players, currentStatus, newStatus) => {
            const player = players.find(p => p.playingStatus === currentStatus);
            if (player) player.playingStatus = newStatus;
        };

        let bowlingTeamNominations = null;

        // Determine which team is bowling
        if (match.FirstInningBowlingTeam.toString().trim() === match.team1.toString().trim()) {
            bowlingTeamNominations = match.nominationsT1;
        } else if (match.FirstInningBowlingTeam.toString().trim() === match.team2.toString().trim()) {
            bowlingTeamNominations = match.nominationsT2;
        } else {
            return res.status(400).json({ success: false, message: "Invalid FirstInningBowlingTeam value." });
        }

        // Change current bowler from "ActiveBowler" to "Playing"
        updateStatus(bowlingTeamNominations, "ActiveBowler", "Playing");

        // Set the new bowler's status to "ActiveBowler"
        const newBowler = bowlingTeamNominations.find(p => p._id.equals(newBowlerId));
        if (newBowler) {
            newBowler.playingStatus = "ActiveBowler";
        } else {
            return res.status(404).json({ success: false, message: "New bowler not found in team nominations." });
        }

        // Save changes to database
        await match.save();

        res.json({ 
            success: true, 
            message: "Bowler changed successfully!", 
        });

    } catch (error) {
        console.error("Error in swapBowlercricket:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

router.post('/swapbowlercricket2ndInning', authenticateJWT, async (req, res) => {
    try {
        const { matchId, newBowlerId } = req.body;
        const ScheduleModel = createScheduleModel(req.user.sportscategory);

        if (!matchId || !newBowlerId || !ScheduleModel) {
            return res.status(400).json({ success: false, message: "Invalid data." });
        }

        const match = await ScheduleModel.findById(matchId);
        if (!match) {
            return res.status(404).json({ success: false, message: "Match not found." });
        }

        // Function to update player status in the given team nominations
        const updateStatus = (players, currentStatus, newStatus) => {
            const player = players.find(p => p.playingStatus === currentStatus);
            if (player) player.playingStatus = newStatus;
        };

        let bowlingTeamNominations = null;

        // Determine which team is bowling
        if (match.SecondInningBowlingTeam.toString().trim() === match.team1.toString().trim()) {
            bowlingTeamNominations = match.nominationsT1;
        } else if (match.SecondInningBowlingTeam.toString().trim() === match.team2.toString().trim()) {
            bowlingTeamNominations = match.nominationsT2;
        } else {
            return res.status(400).json({ success: false, message: "Invalid FirstInningBowlingTeam value." });
        }

        // Change current bowler from "ActiveBowler" to "Playing"
        updateStatus(bowlingTeamNominations, "ActiveBowler", "Playing");

        // Set the new bowler's status to "ActiveBowler"
        const newBowler = bowlingTeamNominations.find(p => p._id.equals(newBowlerId));
        if (newBowler) {
            newBowler.playingStatus = "ActiveBowler";
        } else {
            return res.status(404).json({ success: false, message: "New bowler not found in team nominations." });
        }

        // Save changes to database
        await match.save();

        res.json({ 
            success: true, 
            message: "Bowler changed successfully!", 
        });

    } catch (error) {
        console.error("Error in swapBowlercricket:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});




  
  
  



router.post('/startmatchcricket', authenticateJWT, async (req, res) => {
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
        match.inning = match.inning + 1; // Increment the half value by 1 (0 -> 1, 1 -> 2, etc.)
        await match.save();
  
        res.json({ success: true, message: 'Match status updated to live, and half incremented.', match });
    } catch (error) {
        console.error("Error updating match status:", error);
        res.status(500).json({ success: false, message: 'Server error while updating match status.' });
    }
});





router.post('/stopmatchcricket', authenticateJWT, async (req, res) => {
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



  


  router.post('/updateFirstInningcricket', authenticateJWT, async (req, res) => {
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
  
        if (match.inning !== 1) {
            return res.status(400).json({ success: false, message: 'Match is not in the First Inning.' });
        }
  
        // Update the match's half to 2 (second half)
        match.inning = 2;
         // Update playingStatus inside nominationsT1 and nominationsT2
         match.nominationsT1.forEach(player => {
            if (player.playingStatus === "ActiveBatsman" || player.playingStatus === "ActiveBowler" || player.playingStatus === "Out" ) {
                player.playingStatus = "Playing";
            }
        });
        
        match.nominationsT2.forEach(player => {
            if (player.playingStatus === "ActiveBatsman" || player.playingStatus === "ActiveBowler" || player.playingStatus === "Out") {
                player.playingStatus = "Playing";
            }
        });
        
        await match.save();
  
        res.json({ success: true, message: 'First Innings ended, match moved to second Inning.', match });
    } catch (error) {
        console.error("Error ending first half:", error);
        res.status(500).json({ success: false, message: 'Server error while ending the first inning.' });
    }
});




router.post("/updateScoreCricket", authenticateJWT, async (req, res) => {
    try {
        const { matchId, playerId, team, runs } = req.body;
        const sportCategory = req.user.sportscategory;

        if (!matchId || !playerId || !team || sportCategory === undefined || runs === undefined) {
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

        console.log("Received match:", match);
        console.log("Player ID:", playerId, "Team:", team, "Runs:", runs);

        let updatedBatsman = null;
        let teamKey = null;
        let bowlingTeamKey = null;

        if (match.scoreT1 === undefined) match.scoreT1 = 0;
        if (match.scoreT2 === undefined) match.scoreT2 = 0;

        if (team === match.team1) {
            match.scoreT1 += runs;
        } else if (team === match.team2) {
            match.scoreT2 += runs;
        } else {
            return res.status(400).json({ success: false, message: "Invalid team value." });
        }

        console.log("✅ After Updating: scoreT1 =", match.scoreT1, ", scoreT2 =", match.scoreT2);

        updatedBatsman = match.nominationsT1.find(player => player._id.equals(new mongoose.Types.ObjectId(playerId)) && player.playingStatus === "ActiveBatsman");
        if (updatedBatsman) {
            teamKey = "team1";
            bowlingTeamKey = "team2";
        }

        if (!updatedBatsman) {
            updatedBatsman = match.nominationsT2.find(player => player._id.equals(new mongoose.Types.ObjectId(playerId)) && player.playingStatus === "ActiveBatsman");
            if (updatedBatsman) {
                teamKey = "team2";
                bowlingTeamKey = "team1";
            }
        }

        if (!updatedBatsman) {
            console.log("Player not found or not an active batsman! Available IDs:");
            match.nominationsT1.forEach(player => console.log(player._id.toString()));
            match.nominationsT2.forEach(player => console.log(player._id.toString()));
            return res.status(404).json({ success: false, message: "Player not found or not an active batsman." });
        }

        console.log(`✅ Batsman found in ${teamKey}, updating score...`);

        if (!updatedBatsman.ballsFaced) updatedBatsman.ballsFaced = [];
        if (!match.runsInning1) match.runsInning1 = [];
        if (!match.runsInning2) match.runsInning2 = [];

        updatedBatsman.runsScored = (updatedBatsman.runsScored || 0) + runs;
        updatedBatsman.ballsFaced.push(runs);

        if (match.inning === 1) {
            match.runsInning1.push(runs);
            match.oversInning1 = updateOvers(match.oversInning1);
        } else if (match.inning === 2) {
            match.runsInning2.push(runs);
            match.oversInning2 = updateOvers(match.oversInning2);
        }

        const bowlingTeam = bowlingTeamKey === "team1" ? match.nominationsT1 : match.nominationsT2;
        const activeBowler = bowlingTeam.find(player => player.playingStatus === "ActiveBowler");

        if (activeBowler) {
            console.log(`✅ Active bowler found: ${activeBowler.name}, updating balls bowled...`);
            if (!activeBowler.ballsBowled) activeBowler.ballsBowled = [];
            activeBowler.ballsBowled.push(runs);
        } else {
            console.log("❌ No active bowler found in the bowling team.");
        }

        match.markModified("scoreT1");
        match.markModified("scoreT2");
        match.markModified("nominationsT1");
        match.markModified("nominationsT2");
        match.markModified("runsInning1");
        match.markModified("runsInning2");

        await match.save();
        res.json({ success: true, message: "✅ Score updated successfully!", match });

    } catch (error) {
        console.error("❌ Error updating score:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});





router.post("/updateByesCricket", authenticateJWT, async (req, res) => {
    try {
        const { matchId, team, byes } = req.body;
        const sportCategory = req.user.sportscategory;

        if (!matchId || !team || sportCategory === undefined || byes === undefined) {
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

        console.log("Received match:", match);
        console.log("Team:", team, "Byes:", byes);

        // Initialize scores if undefined
        if (match.scoreT1 === undefined) match.scoreT1 = 0;
        if (match.scoreT2 === undefined) match.scoreT2 = 0;

        // Determine which team is batting
        if (match.FirstInningBattingTeam.toString().trim() === match.team1.toString().trim()) {
            match.scoreT1 += byes;

            if (match.inning === 1) {
                match.runsInning1.push(`${byes}B`);
                match.oversInning1 = updateOvers(match.oversInning1);
            } else if (match.inning === 2) {
                match.runsInning2.push(`${byes}B`);
                match.oversInning2 = updateOvers(match.oversInning2);
            }

        } else if (match.FirstInningBattingTeam.toString().trim() === match.team2.toString().trim()) {
            match.scoreT2 += byes;

            if (match.inning === 1) {
                match.runsInning1.push(`${byes}B`);
                match.oversInning1 = updateOvers(match.oversInning1);
            } else if (match.inning === 2) {
                match.runsInning2.push(`${byes}B`);
                match.oversInning2 = updateOvers(match.oversInning2);
            }

        } else {
            return res.status(400).json({ success: false, message: "Invalid team value." });
        }

        // Save changes to database
        await match.save();

        res.json({ 
            success: true, 
            message: "✅ Byes updated successfully!", 
            scoreT1: match.scoreT1, 
            scoreT2: match.scoreT2,
            oversInning1: match.oversInning1,
            oversInning2: match.oversInning2
        });

    } catch (error) {
        console.error("❌ Error updating byes:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});


router.post("/updateByesCricket2ndInning", authenticateJWT, async (req, res) => {
    try {
        const { matchId, team, byes } = req.body;
        const sportCategory = req.user.sportscategory;

        if (!matchId || !team || sportCategory === undefined || byes === undefined) {
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

        console.log("Received match:", match);
        console.log("Team:", team, "Byes:", byes);

        // Initialize scores if undefined
        if (match.scoreT1 === undefined) match.scoreT1 = 0;
        if (match.scoreT2 === undefined) match.scoreT2 = 0;

        // Determine which team is batting
        if (match.SecondInningBattingTeam.toString().trim() === match.team1.toString().trim()) {
            match.scoreT1 += byes;

            if (match.inning === 1) {
                match.runsInning1.push(`${byes}B`);
                match.oversInning1 = updateOvers(match.oversInning1);
            } else if (match.inning === 2) {
                match.runsInning2.push(`${byes}B`);
                match.oversInning2 = updateOvers(match.oversInning2);
            }

        } else if (match.SecondInningBattingTeam.toString().trim() === match.team2.toString().trim()) {
            match.scoreT2 += byes;

            if (match.inning === 1) {
                match.runsInning1.push(`${byes}B`);
                match.oversInning1 = updateOvers(match.oversInning1);
            } else if (match.inning === 2) {
                match.runsInning2.push(`${byes}B`);
                match.oversInning2 = updateOvers(match.oversInning2);
            }

        } else {
            return res.status(400).json({ success: false, message: "Invalid team value." });
        }

        // Save changes to database
        await match.save();

        res.json({ 
            success: true, 
            message: "✅ Byes updated successfully!", 
            scoreT1: match.scoreT1, 
            scoreT2: match.scoreT2,
            oversInning1: match.oversInning1,
            oversInning2: match.oversInning2
        });

    } catch (error) {
        console.error("❌ Error updating byes:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});



router.post("/updateExtrasCricket", authenticateJWT, async (req, res) => {
    try {
        const { matchId, team, extraType } = req.body;
        const sportCategory = req.user.sportscategory;

        if (!matchId || !team || !extraType) {
            return res.status(400).json({ success: false, message: "Invalid request data." });
        }

        const ScheduleModel = createScheduleModel(sportCategory);
        const match = await ScheduleModel.findById(matchId);
        if (!match) {
            return res.status(404).json({ success: false, message: "Match not found." });
        }

        // Determine which team is batting
        if (match.FirstInningBattingTeam.toString().trim() === match.team1.toString().trim()) {
            match.scoreT1 += 1; // 1 extra run for Wide/No Ball
        } else if (match.FirstInningBattingTeam.toString().trim() === match.team2.toString().trim()) {
            match.scoreT2 += 1;
        } else {
            return res.status(400).json({ success: false, message: "Invalid FirstInningBattingTeam value." });
        }

        // Add extra in the correct inning, WITHOUT changing overs
        const extraValue = extraType === "Wide" ? "WD" : "NB";
        if (match.inning === 1) {
            match.runsInning1.push(extraValue);
        } else if (match.inning === 2) {
            match.runsInning2.push(extraValue);
        }

        // Identify the bowling team
        const bowlingTeamKey = match.FirstInningBattingTeam.toString().trim() === match.team1.toString().trim() ? "team2" : "team1";
        const bowlingTeam = bowlingTeamKey === "team1" ? match.nominationsT1 : match.nominationsT2;
        const activeBowler = bowlingTeam.find(player => player.playingStatus === "ActiveBowler");

        // If an active bowler exists, update their balls bowled with the extra value
        if (activeBowler) {
            console.log(`✅ Active bowler found: ${activeBowler.name}, updating balls bowled...`);
            if (!activeBowler.ballsBowled) activeBowler.ballsBowled = [];
            activeBowler.ballsBowled.push(extraValue);
        } else {
            console.log("❌ No active bowler found in the bowling team.");
        }

        await match.save();
        res.json({ success: true, message: "Extras updated successfully!", match });

    } catch (error) {
        console.error("Error updating extras:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

router.post("/updateExtrasCricket2ndInning", authenticateJWT, async (req, res) => {
    try {
        const { matchId, team, extraType } = req.body;
        const sportCategory = req.user.sportscategory;

        if (!matchId || !team || !extraType) {
            return res.status(400).json({ success: false, message: "Invalid request data." });
        }

        const ScheduleModel = createScheduleModel(sportCategory);
        const match = await ScheduleModel.findById(matchId);
        if (!match) {
            return res.status(404).json({ success: false, message: "Match not found." });
        }

        // Determine which team is batting
        if (match.SecondInningBattingTeam.toString().trim() === match.team1.toString().trim()) {
            match.scoreT1 += 1; // 1 extra run for Wide/No Ball
        } else if (match.SecondInningBattingTeam.toString().trim() === match.team2.toString().trim()) {
            match.scoreT2 += 1;
        } else {
            return res.status(400).json({ success: false, message: "Invalid FirstInningBattingTeam value." });
        }

        // Add extra in the correct inning, WITHOUT changing overs
        const extraValue = extraType === "Wide" ? "WD" : "NB";
        if (match.inning === 1) {
            match.runsInning1.push(extraValue);
        } else if (match.inning === 2) {
            match.runsInning2.push(extraValue);
        }

        // Identify the bowling team
        const bowlingTeamKey = match.SecondInningBattingTeam.toString().trim() === match.team1.toString().trim() ? "team2" : "team1";
        const bowlingTeam = bowlingTeamKey === "team1" ? match.nominationsT1 : match.nominationsT2;
        const activeBowler = bowlingTeam.find(player => player.playingStatus === "ActiveBowler");

        // If an active bowler exists, update their balls bowled with the extra value
        if (activeBowler) {
            console.log(`✅ Active bowler found: ${activeBowler.name}, updating balls bowled...`);
            if (!activeBowler.ballsBowled) activeBowler.ballsBowled = [];
            activeBowler.ballsBowled.push(extraValue);
        } else {
            console.log("❌ No active bowler found in the bowling team.");
        }

        await match.save();
        res.json({ success: true, message: "Extras updated successfully!", match });

    } catch (error) {
        console.error("Error updating extras:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});









const updateOvers = (currentOvers) => {
    let [whole, decimal] = currentOvers.toString().split('.').map(Number);
    decimal = decimal || 0;

    if (decimal === 5) {
        whole += 1;
        decimal = 0;
    } else {
        decimal += 1;
    }

    return parseFloat(`${whole}.${decimal}`);
};




module.exports = router;






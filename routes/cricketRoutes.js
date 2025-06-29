const mongoose = require("mongoose");
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
  createScheduleModel,
  PlayerNominationForm,
  BestCricketer,
} = require("../models"); // Ensure the RefUser schema is defined in your models
const authenticateJWT = require("../middleware");
const config = require("../config"); // Include JWT secret configuration

const router = express.Router();

// Get detailed information for a specific cricket match
const CricketMatch = createScheduleModel("Cricket");
router.get("/matches/cricket/:id", async (req, res) => {
  try {
    const match = await CricketMatch.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    // Format match data for easier consumption by the frontend
    const formattedMatch = {
      id: match._id,
      basicInfo: {
        pool: match.pool,
        team1: match.team1,
        team2: match.team2,
        sport: match.sport,
        year: match.year,
        status: match.status,
        result: match.result,
        createdAt: match.createdAt,
      },
      tossInfo: {
        winner: match.tosswin,
        winnerDecision: match.tosswindecision,
        loser: match.tossloose,
        loserDecision: match.tossloosedecision,
      },
      innings: {
        currentInning: match.inning,
        first: {
          battingTeam: match.FirstInningBattingTeam,
          bowlingTeam: match.FirstInningBowlingTeam,
          overs: match.oversInning1,
          runs: match.runsInning1,
          runsBreakdown: match.runsInning1,
        },
        second: {
          battingTeam: match.SecondInningBattingTeam,
          bowlingTeam: match.SecondInningBowlingTeam,
          overs: match.oversInning2,
          runs: match.runsInning2,
          runsBreakdown: match.runsInning2,
        },
      },
      scores: {
        team1: {
          runs: match.scoreT1,
          wickets: match.T1wickets,
        },
        team2: {
          runs: match.scoreT2,
          wickets: match.T2wickets,
        },
      },
      players: {
        team1: match.nominationsT1.map((player) => ({
          id: player._id,
          name: player.name,
          regNo: player.regNo,
          shirtNo: player.shirtNo,
          section: player.section,
          status: player.playingStatus,
          stats: {
            runsScored: player.runsScored,
            ballsFaced: player.ballsFaced,
            ballsBowled: player.ballsBowled,
            wicketsTaken: player.wicketsTaken,
          },
        })),
        team2: match.nominationsT2.map((player) => ({
          id: player._id,
          name: player.name,
          regNo: player.regNo,
          shirtNo: player.shirtNo,
          section: player.section,
          status: player.playingStatus,
          stats: {
            runsScored: player.runsScored,
            ballsFaced: player.ballsFaced,
            ballsBowled: player.ballsBowled,
            wicketsTaken: player.wicketsTaken,
          },
        })),
      },
    };

    res.json(formattedMatch);
  } catch (error) {
    console.error("Error fetching cricket match details:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Calculate match statistics from raw data
function calculateMatchStats(match) {
  // Calculate batting statistics for both teams
  const team1BattingStats = calculateTeamBattingStats(match.nominationsT1);
  const team2BattingStats = calculateTeamBattingStats(match.nominationsT2);

  // Calculate bowling statistics for both teams
  const team1BowlingStats = calculateTeamBowlingStats(match.nominationsT1);
  const team2BowlingStats = calculateTeamBowlingStats(match.nominationsT2);

  // Calculate innings run rates and other metrics
  const innings1RunRate =
    match.oversInning1 > 0
      ? (match.FirstInningBattingTeam === match.team1
          ? match.scoreT1
          : match.scoreT2) / match.oversInning1
      : 0;

  const innings2RunRate =
    match.oversInning2 > 0
      ? (match.SecondInningBattingTeam === match.team1
          ? match.scoreT1
          : match.scoreT2) / match.oversInning2
      : 0;

  return {
    battingStats: {
      team1: team1BattingStats,
      team2: team2BattingStats,
    },
    bowlingStats: {
      team1: team1BowlingStats,
      team2: team2BowlingStats,
    },
    runRates: {
      innings1: innings1RunRate.toFixed(2),
      innings2: innings2RunRate.toFixed(2),
    },
  };
}

function calculateTeamBattingStats(players) {
  const battingPlayers = players.filter(
    (p) =>
      p.playingStatus === "ActiveBatsman" ||
      p.playingStatus === "Out" ||
      p.runsScored > 0,
  );

  return battingPlayers.map((player) => {
    const ballsFaced = player.ballsFaced.length;
    const strikeRate =
      ballsFaced > 0 ? (player.runsScored / ballsFaced) * 100 : 0;

    // Count boundaries
    const fours = player.ballsFaced.filter((run) => run === 4).length;
    const sixes = player.ballsFaced.filter((run) => run === 6).length;

    return {
      name: player.name,
      shirtNo: player.shirtNo,
      status: player.playingStatus,
      runsScored: player.runsScored,
      ballsFaced: ballsFaced,
      strikeRate: strikeRate.toFixed(2),
      fours,
      sixes,
    };
  });
}

function calculateTeamBowlingStats(players) {
  const bowlingPlayers = players.filter(
    (p) => p.playingStatus === "ActiveBowler" || p.ballsBowled.length > 0,
  );

  return bowlingPlayers.map((player) => {
    const ballsBowled = player.ballsBowled.length;
    const overs = Math.floor(ballsBowled / 6) + (ballsBowled % 6) / 10; // Format as 4.3 for 4 overs and 3 balls

    // Calculate runs conceded from the ballsBowled array
    const runsConceded = player.ballsBowled.reduce((acc, ball) => {
      // Check if the ball entry is a number or a string with special notations
      const numericValue = parseInt(ball);
      if (!isNaN(numericValue)) {
        return acc + numericValue;
      }
      // Handle special cases like 'W' (wicket), 'WD' (wide), 'NB' (no ball)
      if (ball === "W") return acc;
      if (ball.includes("WD")) return acc + 1;
      if (ball.includes("NB")) return acc + 1;
      return acc;
    }, 0);

    const economy = overs > 0 ? runsConceded / overs : 0;

    return {
      name: player.name,
      shirtNo: player.shirtNo,
      overs: overs.toFixed(1),
      runsConceded,
      wickets: player.wicketsTaken,
      economy: economy.toFixed(2),
    };
  });
}

// Get match statistics for a cricket match
router.get("/matches/cricket/:id/stats", async (req, res) => {
  try {
    const match = await CricketMatch.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    const matchStats = calculateMatchStats(match);
    res.json(matchStats);
  } catch (error) {
    console.error("Error fetching cricket match statistics:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;

router.post("/updateToss", authenticateJWT, async (req, res) => {
  const { matchId, tosswin, tosswindecision, tossloose, tossloosedecision } =
    req.body;
  const sportCategory = req.user.sportscategory;

  try {
    if (
      !matchId ||
      !tosswin ||
      !tosswindecision ||
      !tossloose ||
      !tossloosedecision
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }

    const ScheduleModel = createScheduleModel(sportCategory);
    if (!ScheduleModel) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid sport category." });
    }

    const match = await ScheduleModel.findById(matchId);
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found." });
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
    } else {
      // If toss winner chooses to Bowl
      match.FirstInningBattingTeam = tossloose;
      match.FirstInningBowlingTeam = tosswin;
      match.SecondInningBattingTeam = tosswin;
      match.SecondInningBowlingTeam = tossloose;
    }

    await match.save();

    res.json({
      success: true,
      message: "Toss updated successfully and innings teams assigned.",
      match,
    });
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
      return res
        .status(400)
        .json({ success: false, message: "Match ID is required." });
    }

    const ScheduleModel = createScheduleModel(sportCategory);
    const match = await ScheduleModel.findById(matchId);

    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found." });
    }

    res.json({
      success: true,
      team1: {
        name: match.team1,
        players:
          match.nominationsT1?.filter((player) => player.playingStatus) || [],
      },
      team2: {
        name: match.team2,
        players:
          match.nominationsT2?.filter((player) => player.playingStatus) || [],
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
      return res
        .status(400)
        .json({ success: false, message: "Match ID is required." });
    }

    const ScheduleModel = createScheduleModel(sportCategory);
    const match = await ScheduleModel.findById(matchId);

    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found." });
    }

    res.json({
      success: true,
      team1: {
        name: match.team1,
        players:
          match.nominationsT1?.filter((player) => player.playingStatus) || [],
      },
      team2: {
        name: match.team2,
        players:
          match.nominationsT2?.filter((player) => player.playingStatus) || [],
      },
      inning: match.inning, // <-- Include the inning in response
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
      return res
        .status(400)
        .json({ success: false, message: "Match ID is required." });
    }

    const ScheduleModel = createScheduleModel(sportCategory);
    const match = await ScheduleModel.findById(matchId);

    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found." });
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
      return res
        .status(400)
        .json({ success: false, message: "Match ID is required." });
    }

    const ScheduleModel = createScheduleModel(sportCategory);
    const match = await ScheduleModel.findById(matchId);

    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found." });
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
      return res
        .status(400)
        .json({ success: false, message: "Invalid input data." });
    }

    const ScheduleModel = createScheduleModel(sportCategory);
    if (!ScheduleModel) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid sport category." });
    }

    // Fetch match details
    const match = await ScheduleModel.findById(matchId);
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found." });
    }

    const [batsman1Id, batsman2Id, bowlerId] = players.map(
      (id) => new mongoose.Types.ObjectId(id),
    );

    // Identify correct batting and bowling teams
    const battingTeamKey =
      match.FirstInningBattingTeam === match.team1
        ? "nominationsT1"
        : "nominationsT2";
    const bowlingTeamKey =
      match.FirstInningBowlingTeam === match.team1
        ? "nominationsT1"
        : "nominationsT2";

    // Ensure players exist in their respective teams
    const batsman1Exists = match[battingTeamKey].some((player) =>
      player._id.equals(batsman1Id),
    );
    const batsman2Exists = match[battingTeamKey].some((player) =>
      player._id.equals(batsman2Id),
    );
    const bowlerExists = match[bowlingTeamKey].some((player) =>
      player._id.equals(bowlerId),
    );

    if (!batsman1Exists || !batsman2Exists || !bowlerExists) {
      return res.status(400).json({
        success: false,
        message: "One or more players not found in respective teams.",
      });
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
      },
    );

    if (!updateResult.modifiedCount) {
      return res
        .status(400)
        .json({ success: false, message: "Failed to update players." });
    }

    res.json({
      success: true,
      message: "Players set to 'Active' successfully!",
      updatedMatch: updateResult,
    });
  } catch (error) {
    console.error("Error updating players:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.post(
  "/updatePlayingStatus2ndInning",
  authenticateJWT,
  async (req, res) => {
    const { matchId, players } = req.body; // `players` is an array of 3 _id values
    const sportCategory = req.user.sportscategory;

    try {
      if (!matchId || !Array.isArray(players) || players.length !== 3) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid input data." });
      }

      const ScheduleModel = createScheduleModel(sportCategory);
      if (!ScheduleModel) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid sport category." });
      }

      // Fetch match details
      const match = await ScheduleModel.findById(matchId);
      if (!match) {
        return res
          .status(404)
          .json({ success: false, message: "Match not found." });
      }

      const [batsman1Id, batsman2Id, bowlerId] = players.map(
        (id) => new mongoose.Types.ObjectId(id),
      );

      // Identify correct batting and bowling teams
      const battingTeamKey =
        match.SecondInningBattingTeam === match.team1
          ? "nominationsT1"
          : "nominationsT2";
      const bowlingTeamKey =
        match.SecondInningBowlingTeam === match.team1
          ? "nominationsT1"
          : "nominationsT2";

      // Ensure players exist in their respective teams
      const batsman1Exists = match[battingTeamKey].some((player) =>
        player._id.equals(batsman1Id),
      );
      const batsman2Exists = match[battingTeamKey].some((player) =>
        player._id.equals(batsman2Id),
      );
      const bowlerExists = match[bowlingTeamKey].some((player) =>
        player._id.equals(bowlerId),
      );

      if (!batsman1Exists || !batsman2Exists || !bowlerExists) {
        return res.status(400).json({
          success: false,
          message: "One or more players not found in respective teams.",
        });
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
        },
      );

      if (!updateResult.modifiedCount) {
        return res
          .status(400)
          .json({ success: false, message: "Failed to update players." });
      }

      res.json({
        success: true,
        message: "Players set to 'Active' successfully!",
        updatedMatch: updateResult,
      });
    } catch (error) {
      console.error("Error updating players:", error);
      res.status(500).json({ success: false, message: "Server error." });
    }
  },
);

router.post("/swapPlayerscricket", authenticateJWT, async (req, res) => {
  try {
    const { matchId, outgoingBatsmanId, newBatsmanId } = req.body;
    const ScheduleModel = createScheduleModel(req.user.sportscategory);

    if (!matchId || !outgoingBatsmanId || !newBatsmanId || !ScheduleModel) {
      return res.status(400).json({ success: false, message: "Invalid data." });
    }

    const match = await ScheduleModel.findById(matchId);
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found." });
    }

    // Function to update player status
    const updateStatus = (players, id, status) => {
      const player = players.find((p) => p._id.equals(id));
      if (player) player.playingStatus = status;
    };

    // Function to update bowler stats
    const updateBowlerStats = (players) => {
      const activeBowler = players.find(
        (p) => p.playingStatus === "ActiveBowler",
      );
      if (activeBowler) {
        activeBowler.wicketsTaken = (activeBowler.wicketsTaken || 0) + 1;
        activeBowler.ballsBowled.push("W");
      }
    };

    // Function to update overs correctly
    const updateOvers = (currentOvers) => {
      let [whole, decimal] = currentOvers.toString().split(".").map(Number);
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
        match.runsInning1.push("W"); // Add "W" to runs array
        match.oversInning1 = updateOvers(match.oversInning1); // Use updateOvers function
        console.log("Updated oversInning1:", match.oversInning1);
      } else if (match.inning === 2) {
        match.runsInning2.push("W"); // Add "W" to runs array
        match.oversInning2 = updateOvers(match.oversInning2); // Use updateOvers function
        console.log("Updated oversInning2:", match.oversInning2);
      }
    };

    // Determine which team is batting
    if (
      match.FirstInningBattingTeam.toString().trim() ===
      match.team1.toString().trim()
    ) {
      updateStatus(match.nominationsT1, newBatsmanId, "ActiveBatsman");
      updateStatus(match.nominationsT1, outgoingBatsmanId, "Out");

      match.T1wickets += 1;
      updateBowlerStats(match.nominationsT2); // Update bowler stats from team2
      updateInnings(); // Update runs & overs based on the inning value

      console.log("Updated T1Wickets:", match.T1wickets);
    } else if (
      match.FirstInningBattingTeam.toString().trim() ===
      match.team2.toString().trim()
    ) {
      updateStatus(match.nominationsT2, newBatsmanId, "ActiveBatsman");
      updateStatus(match.nominationsT2, outgoingBatsmanId, "Out");

      match.T2wickets += 1;
      updateBowlerStats(match.nominationsT1); // Update bowler stats from team1
      updateInnings(); // Update runs & overs based on the inning value

      console.log("Updated T2Wickets:", match.T2wickets);
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid FirstInningBattingTeam value.",
      });
    }

    // Save changes to database
    await match.save();

    res.json({
      success: true,
      message:
        "Players swapped, wicket updated, and innings data recorded successfully!",
      T1wickets: match.T1wickets,
      T2wickets: match.T2wickets,
      oversInning1: match.oversInning1,
      oversInning2: match.oversInning2,
    });
  } catch (error) {
    console.error("Error in swapPlayerscricket:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});
router.post("/handlealloutinning1", authenticateJWT, async (req, res) => {
  try {
    const { matchId, outgoingBatsmanId } = req.body;
    const ScheduleModel = createScheduleModel(req.user.sportscategory);

    if (!matchId || !outgoingBatsmanId || !ScheduleModel) {
      return res.status(400).json({ success: false, message: "Invalid data." });
    }

    const match = await ScheduleModel.findById(matchId);
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found." });
    }

    const updateStatus = (players, id, status) => {
      const player = players.find((p) => p._id.equals(id));
      if (player) player.playingStatus = status;
    };

    const updateBowlerStats = (players) => {
      const activeBowler = players.find(
        (p) => p.playingStatus === "ActiveBowler",
      );
      if (activeBowler) {
        activeBowler.wicketsTaken = (activeBowler.wicketsTaken || 0) + 1;
        activeBowler.ballsBowled.push("W");
      }
    };

    const updateOvers = (currentOvers) => {
      let [whole, decimal] = currentOvers.toString().split(".").map(Number);
      decimal = decimal || 0;

      if (decimal === 5) {
        whole += 1;
        decimal = 0;
      } else {
        decimal += 1;
      }

      return parseFloat(`${whole}.${decimal}`);
    };

    const updateInnings = () => {
      if (match.inning === 1) {
        match.runsInning1.push("W");
        match.oversInning1 = updateOvers(match.oversInning1);
      } else if (match.inning === 2) {
        match.runsInning2.push("W");
        match.oversInning2 = updateOvers(match.oversInning2);
      }
    };

    let allOut = false; // Track if the team is all out

    if (
      match.FirstInningBattingTeam.toString().trim() ===
      match.team1.toString().trim()
    ) {
      updateStatus(match.nominationsT1, outgoingBatsmanId, "Out");

      match.T1wickets += 1;
      updateBowlerStats(match.nominationsT2);
      updateInnings();

      if (match.T1wickets >= 10) allOut = true; // Check if all 10 wickets are lost
    } else if (
      match.FirstInningBattingTeam.toString().trim() ===
      match.team2.toString().trim()
    ) {
      updateStatus(match.nominationsT2, outgoingBatsmanId, "Out");

      match.T2wickets += 1;
      updateBowlerStats(match.nominationsT1);
      updateInnings();

      if (match.T2wickets >= 10) allOut = true; // Check if all 10 wickets are lost
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid FirstInningBattingTeam value.",
      });
    }

    // If all-out occurs in first innings, increment to inning 2
    if (match.inning === 1 && allOut) {
      match.inning += 1;
      console.log("First inning over! Inning incremented to:", match.inning);
      // Update playingStatus inside nominationsT1 and nominationsT2
      match.nominationsT1.forEach((player) => {
        if (
          player.playingStatus === "ActiveBatsman" ||
          player.playingStatus === "ActiveBowler" ||
          player.playingStatus === "Out"
        ) {
          player.playingStatus = "Playing";
        }
      });

      match.nominationsT2.forEach((player) => {
        if (
          player.playingStatus === "ActiveBatsman" ||
          player.playingStatus === "ActiveBowler" ||
          player.playingStatus === "Out"
        ) {
          player.playingStatus = "Playing";
        }
      });
    }

    await match.save();

    res.json({
      success: true,
      message:
        "Players swapped, wicket updated, and innings data recorded successfully!",
      T1wickets: match.T1wickets,
      T2wickets: match.T2wickets,
      oversInning1: match.oversInning1,
      oversInning2: match.oversInning2,
      inning: match.inning, // Return updated inning value
    });
  } catch (error) {
    console.error("Error in handlealloutinning1:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

router.post(
  "/swapPlayerscricket2ndInning",
  authenticateJWT,
  async (req, res) => {
    try {
      const { matchId, outgoingBatsmanId, newBatsmanId } = req.body;
      const ScheduleModel = createScheduleModel(req.user.sportscategory);

      if (!matchId || !outgoingBatsmanId || !newBatsmanId || !ScheduleModel) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid data." });
      }

      const match = await ScheduleModel.findById(matchId);
      if (!match) {
        return res
          .status(404)
          .json({ success: false, message: "Match not found." });
      }

      // Function to update player status
      const updateStatus = (players, id, status) => {
        const player = players.find((p) => p._id.equals(id));
        if (player) player.playingStatus = status;
      };

      // Function to update bowler stats
      const updateBowlerStats = (players) => {
        const activeBowler = players.find(
          (p) => p.playingStatus === "ActiveBowler",
        );
        if (activeBowler) {
          activeBowler.wicketsTaken = (activeBowler.wicketsTaken || 0) + 1;
          activeBowler.ballsBowled.push("W");
        }
      };

      // Function to update overs correctly
      const updateOvers = (currentOvers) => {
        let [whole, decimal] = currentOvers.toString().split(".").map(Number);
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
          match.runsInning1.push("W"); // Add "W" to runs array
          match.oversInning1 = updateOvers(match.oversInning1); // Use updateOvers function
          console.log("Updated oversInning1:", match.oversInning1);
        } else if (match.inning === 2) {
          match.runsInning2.push("W"); // Add "W" to runs array
          match.oversInning2 = updateOvers(match.oversInning2); // Use updateOvers function
          console.log("Updated oversInning2:", match.oversInning2);
        }
      };

      // Determine which team is batting
      if (
        match.SecondInningBattingTeam.toString().trim() ===
        match.team1.toString().trim()
      ) {
        updateStatus(match.nominationsT1, newBatsmanId, "ActiveBatsman");
        updateStatus(match.nominationsT1, outgoingBatsmanId, "Out");

        match.T1wickets += 1;
        updateBowlerStats(match.nominationsT2); // Update bowler stats from team2
        updateInnings(); // Update runs & overs based on the inning value

        console.log("Updated T1Wickets:", match.T1wickets);
      } else if (
        match.SecondInningBattingTeam.toString().trim() ===
        match.team2.toString().trim()
      ) {
        updateStatus(match.nominationsT2, newBatsmanId, "ActiveBatsman");
        updateStatus(match.nominationsT2, outgoingBatsmanId, "Out");

        match.T2wickets += 1;
        updateBowlerStats(match.nominationsT1); // Update bowler stats from team1
        updateInnings(); // Update runs & overs based on the inning value

        console.log("Updated T2Wickets:", match.T2wickets);
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid SecondInningBattingTeam value.",
        });
      }

      // Save changes to database
      await match.save();

      res.json({
        success: true,
        message:
          "Players swapped, wicket updated, and innings data recorded successfully!",
        T1wickets: match.T1wickets,
        T2wickets: match.T2wickets,
        oversInning1: match.oversInning1,
        oversInning2: match.oversInning2,
      });
    } catch (error) {
      console.error("Error in swapPlayerscricket:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error." });
    }
  },
);

router.post("/swapbowlercricket", authenticateJWT, async (req, res) => {
  try {
    const { matchId, newBowlerId } = req.body;
    const ScheduleModel = createScheduleModel(req.user.sportscategory);

    if (!matchId || !newBowlerId || !ScheduleModel) {
      return res.status(400).json({ success: false, message: "Invalid data." });
    }

    const match = await ScheduleModel.findById(matchId);
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found." });
    }

    // Function to update player status in the given team nominations
    const updateStatus = (players, currentStatus, newStatus) => {
      const player = players.find((p) => p.playingStatus === currentStatus);
      if (player) player.playingStatus = newStatus;
    };

    let bowlingTeamNominations = null;

    // Determine which team is bowling
    if (
      match.FirstInningBowlingTeam.toString().trim() ===
      match.team1.toString().trim()
    ) {
      bowlingTeamNominations = match.nominationsT1;
    } else if (
      match.FirstInningBowlingTeam.toString().trim() ===
      match.team2.toString().trim()
    ) {
      bowlingTeamNominations = match.nominationsT2;
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid FirstInningBowlingTeam value.",
      });
    }

    // Change current bowler from "ActiveBowler" to "Playing"
    updateStatus(bowlingTeamNominations, "ActiveBowler", "Playing");

    // Set the new bowler's status to "ActiveBowler"
    const newBowler = bowlingTeamNominations.find((p) =>
      p._id.equals(newBowlerId),
    );
    if (newBowler) {
      newBowler.playingStatus = "ActiveBowler";
    } else {
      return res.status(404).json({
        success: false,
        message: "New bowler not found in team nominations.",
      });
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

router.post(
  "/swapbowlercricket2ndInning",
  authenticateJWT,
  async (req, res) => {
    try {
      const { matchId, newBowlerId } = req.body;
      const ScheduleModel = createScheduleModel(req.user.sportscategory);

      if (!matchId || !newBowlerId || !ScheduleModel) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid data." });
      }

      const match = await ScheduleModel.findById(matchId);
      if (!match) {
        return res
          .status(404)
          .json({ success: false, message: "Match not found." });
      }

      // Function to update player status in the given team nominations
      const updateStatus = (players, currentStatus, newStatus) => {
        const player = players.find((p) => p.playingStatus === currentStatus);
        if (player) player.playingStatus = newStatus;
      };

      let bowlingTeamNominations = null;

      // Determine which team is bowling
      if (
        match.SecondInningBowlingTeam.toString().trim() ===
        match.team1.toString().trim()
      ) {
        bowlingTeamNominations = match.nominationsT1;
      } else if (
        match.SecondInningBowlingTeam.toString().trim() ===
        match.team2.toString().trim()
      ) {
        bowlingTeamNominations = match.nominationsT2;
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid FirstInningBowlingTeam value.",
        });
      }

      // Change current bowler from "ActiveBowler" to "Playing"
      updateStatus(bowlingTeamNominations, "ActiveBowler", "Playing");

      // Set the new bowler's status to "ActiveBowler"
      const newBowler = bowlingTeamNominations.find((p) =>
        p._id.equals(newBowlerId),
      );
      if (newBowler) {
        newBowler.playingStatus = "ActiveBowler";
      } else {
        return res.status(404).json({
          success: false,
          message: "New bowler not found in team nominations.",
        });
      }

      // Save changes to database
      await match.save();

      res.json({
        success: true,
        message: "Bowler changed successfully!",
      });
    } catch (error) {
      console.error("Error in swapBowlercricket:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error." });
    }
  },
);

router.post("/startmatchcricket", authenticateJWT, async (req, res) => {
  const { matchId } = req.body;
  const sportCategory = req.user.sportscategory; // Retrieve the sport category from the logged-in user

  try {
    if (!matchId || !sportCategory) {
      return res.status(400).json({
        success: false,
        message: "Match ID and sport category are required.",
      });
    }

    const ScheduleModel = createScheduleModel(sportCategory); // Dynamically get the schedule model

    if (!ScheduleModel) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid sport category." });
    }

    const match = await ScheduleModel.findById(matchId);
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found." });
    }

    // Update match status to "live" and increment the half value
    match.status = "live";
    match.inning = match.inning + 1; // Increment the half value by 1 (0 -> 1, 1 -> 2, etc.)
    await match.save();

    res.json({
      success: true,
      message: "Match status updated to live, and half incremented.",
      match,
    });
  } catch (error) {
    console.error("Error updating match status:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating match status.",
    });
  }
});

router.post("/handlealloutinning2", authenticateJWT, async (req, res) => {
  try {
    const { matchId, matchyear, outgoingBatsmanId } = req.body;
    const sportCategory = req.user.sportscategory;
    const ScheduleModel = createScheduleModel(req.user.sportscategory);

    if (!matchId || !matchyear || !outgoingBatsmanId || !ScheduleModel) {
      return res.status(400).json({ success: false, message: "Invalid data." });
    }

    const match = await ScheduleModel.findById(matchId);
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found." });
    }

    const updateStatus = (players, id, status) => {
      const player = players.find((p) => p._id.equals(id));
      if (player) player.playingStatus = status;
    };

    const updateBowlerStats = (players) => {
      const activeBowler = players.find(
        (p) => p.playingStatus === "ActiveBowler",
      );
      if (activeBowler) {
        activeBowler.wicketsTaken = (activeBowler.wicketsTaken || 0) + 1;
        activeBowler.ballsBowled.push("W");
      }
    };

    const updateOvers = (currentOvers) => {
      let [whole, decimal] = currentOvers.toString().split(".").map(Number);
      decimal = decimal || 0;

      if (decimal === 5) {
        whole += 1;
        decimal = 0;
      } else {
        decimal += 1;
      }

      return parseFloat(`${whole}.${decimal}`);
    };

    const updateInnings = () => {
      if (match.inning === 1) {
        match.runsInning1.push("W");
        match.oversInning1 = updateOvers(match.oversInning1);
      } else if (match.inning === 2) {
        match.runsInning2.push("W");
        match.oversInning2 = updateOvers(match.oversInning2);
      }
    };

    let allOut = false; // Track if the team is all out

    if (
      match.SecondInningBattingTeam.toString().trim() ===
      match.team1.toString().trim()
    ) {
      updateStatus(match.nominationsT1, outgoingBatsmanId, "Out");

      match.T1wickets += 1;
      updateBowlerStats(match.nominationsT2);
      updateInnings();

      if (match.T1wickets >= 10) allOut = true; // Check if all 10 wickets are lost
    } else if (
      match.SecondInningBattingTeam.toString().trim() ===
      match.team2.toString().trim()
    ) {
      updateStatus(match.nominationsT2, outgoingBatsmanId, "Out");

      match.T2wickets += 1;
      updateBowlerStats(match.nominationsT1);
      updateInnings();

      if (match.T2wickets >= 10) allOut = true; // Check if all 10 wickets are lost
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid SecondInningBattingTeam value.",
      });
    }

    // If all-out occurs in first innings, increment to inning 2
    if (match.inning === 1 && allOut) {
      match.inning += 1;
      console.log("First inning over! Inning incremented to:", match.inning);
      // Update playingStatus inside nominationsT1 and nominationsT2
      match.nominationsT1.forEach((player) => {
        if (
          player.playingStatus === "ActiveBatsman" ||
          player.playingStatus === "ActiveBowler" ||
          player.playingStatus === "Out"
        ) {
          player.playingStatus = "Playing";
        }
      });

      match.nominationsT2.forEach((player) => {
        if (
          player.playingStatus === "ActiveBatsman" ||
          player.playingStatus === "ActiveBowler" ||
          player.playingStatus === "Out"
        ) {
          player.playingStatus = "Playing";
        }
      });
    }

    try {
      if (!matchId || !sportCategory) {
        return res.status(400).json({
          success: false,
          message: "Match ID and sport category are required.",
        });
      }

      const ScheduleModel = createScheduleModel(sportCategory);
      if (!ScheduleModel) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid sport category." });
      }

      const match = await ScheduleModel.findById(matchId);
      if (!match) {
        return res
          .status(404)
          .json({ success: false, message: "Match not found." });
      }

      match.status = "recent";
      let winningTeam = null;

      if (match.scoreT1 > match.scoreT2) {
        match.result = match.team1;
        winningTeam = match.team1;
      } else if (match.scoreT2 > match.scoreT1) {
        match.result = match.team2;
        winningTeam = match.team2;
      } else {
        match.result = "Draw";
      }

      await match.save();

      // Play-off Logic
      if (match.pool === "play-off" && winningTeam) {
        console.log(
          "Play-off match detected. Updating TBD entries with nominations...",
        );
        const winnerNominations = await PlayerNominationForm.findOne({
          department: winningTeam,
          sport: sportCategory,
          year: matchyear
        });

        const updateResult = await ScheduleModel.updateMany(
          {
            year: match.year,
            $or: [{ team1: "TBD" }, { team2: "TBD" }],
          },
          [
            {
              $set: {
                team1: {
                  $cond: [{ $eq: ["$team1", "TBD"] }, winningTeam, "$team1"],
                },
                team2: {
                  $cond: [{ $eq: ["$team2", "TBD"] }, winningTeam, "$team2"],
                },
                nominationsT1: {
                  $cond: [
                    { $eq: ["$team1", "TBD"] },
                    winnerNominations?.nominations || [],
                    "$nominationsT1",
                  ],
                },
                nominationsT2: {
                  $cond: [
                    { $eq: ["$team2", "TBD"] },
                    winnerNominations?.nominations || [],
                    "$nominationsT2",
                  ],
                },
              },
            },
          ],
        );
        console.log("TBD & Nominations Update Result:", updateResult);
      } else if (match.pool === "final" && sportCategory === "Cricket") {
        console.log(
          "Fetching nominated players from PlayerNominationForm for Cricket...",
        );

        // Fetch all nominated players for Cricket
        const allNominations = await PlayerNominationForm.find({
          sport: "Cricket",
          year: matchyear
        }).select("nominations");

        console.log("Total nomination entries found:", allNominations.length);

        // Extract only required player details
        const allPlayers = allNominations.flatMap((team) =>
          team.nominations.map((player) => ({
            name: player.name,
            regNo: player.regNo,
            section: player.section,
            cnic: player.cnic,
          })),
        );

        console.log("Total Players Extracted:", allPlayers.length);

        // // Prepare bulk operations (just pushing into nominations array without checking)
        // const bulkOperations = allPlayers.map((player) => ({
        //   updateOne: {
        //     filter: {}, // No filtering condition, just push
        //     update: {
        //       $push: {
        //         nominations: {
        //           name: player.name,
        //           regNo: player.regNo,
        //           section: player.section,
        //           cnic: player.cnic,
        //           totalrunsScored: 0,
        //           totalballsfaced: 0,
        //           totalwicketstaken: 0,
        //           totalrunsconceeded: 0,
        //         },
        //       },
        //     },
        //     upsert: true, // Create if doesn't exist
        //   },
        // }));
        const bulkOperations = allPlayers.map((player) => ({
          updateOne: {
            filter: { year: matchyear }, // Ensure we're updating only the doc for this year
            update: {
              $setOnInsert: { year: matchyear }, // Set year only if this is a new document
              $push: {
                nominations: {
                  name: player.name,
                  regNo: player.regNo,
                  section: player.section,
                  cnic: player.cnic,
                  shirtNo: player.shirtNo || "", // Optional, if shirtNo exists
                  totalrunsScored: 0,
                  totalballsfaced: 0,
                  totalwicketstaken: 0,
                  totalrunsconceeded: 0,
                },
              },
            },
            upsert: true, // Create the doc if it doesn't exist
          },//docs.gradle.org/8.10.2/userguide/command_line_interface.html#sec
        }));

        // Execute bulk update
        if (bulkOperations.length > 0) {
          await BestCricketer.bulkWrite(bulkOperations);
          console.log("All nominated players pushed to BestCricketer.");
        } else {
          console.log("No players to update.");
        }

        const ScheduleModel = createScheduleModel(sportCategory);
        const allMatches = await ScheduleModel.find({year: matchyear}).select(
          "nominationsT1 nominationsT2",
        );

        // Get all players in BestCricketer
        const bestCricketers = await BestCricketer.findOne({year:matchyear});
        if (!bestCricketers) {
          console.log("No best cricketers found, skipping update.");
          return;
        }

        for (const player of bestCricketers.nominations) {
          let totalRuns = 0;
          let totalWickets = 0;
          let totalBallsFaced = 0;
          let totalRunsConceded = 0;

          // Search player in nominationsT1 & nominationsT2
          for (const match of allMatches) {
            const foundInT1 = match.nominationsT1.filter(
              (p) => p.regNo === player.regNo,
            );
            const foundInT2 = match.nominationsT2.filter(
              (p) => p.regNo === player.regNo,
            );

            // Add runs scored from both teams
            foundInT1.forEach((p) => (totalRuns += p.runsScored));
            foundInT2.forEach((p) => (totalRuns += p.runsScored));

            // Add wickets taken from both teams
            foundInT1.forEach((p) => (totalWickets += p.wicketsTaken));
            foundInT2.forEach((p) => (totalWickets += p.wicketsTaken));

            // Calculate total balls faced (length of ballsFaced array)
            foundInT1.forEach(
              (p) => (totalBallsFaced += p.ballsFaced?.length || 0),
            );
            foundInT2.forEach(
              (p) => (totalBallsFaced += p.ballsFaced?.length || 0),
            );

            // Calculate total runs conceded (sum of ballsBowled array considering W=0, WD/NB=1, and numbers as they are)
            const processBallsBowled = (ballsArray) => {
              return ballsArray.reduce((sum, ball) => {
                if (ball === "W" || ball.endsWith("B")) return sum; // Ignore Wickets & values ending with "B"
                if (ball === "WD" || ball === "NB") return sum + 1; // Wides and No-Balls count as 1
                return sum + (parseInt(ball, 10) || 0); // Convert valid numbers and ignore NaN
              }, 0);
            };

            foundInT1.forEach(
              (p) =>
                (totalRunsConceded += processBallsBowled(p.ballsBowled || [])),
            );
            foundInT2.forEach(
              (p) =>
                (totalRunsConceded += processBallsBowled(p.ballsBowled || [])),
            );
          }

          // Update totalRunsScored, totalwicketstaken, totalballsfaced, and totalrunsconceeded in BestCricketer
          await BestCricketer.updateOne(
            { "nominations.regNo": player.regNo },
            {
              $set: {
                "nominations.$.totalrunsScored": totalRuns,
                "nominations.$.totalwicketstaken": totalWickets,
                "nominations.$.totalballsfaced": totalBallsFaced,
                "nominations.$.totalrunsconceeded": totalRunsConceded,
              },
            },
          );

          console.log(
            `Updated ${player.name} (RegNo: ${player.regNo}) -> Runs: ${totalRuns}, Wickets: ${totalWickets}, Balls Faced: ${totalBallsFaced}, Runs Conceded: ${totalRunsConceded}`,
          );
        }

        console.log("All players' stats updated in BestCricketer.");
      }

      await match.save();

      res.json({
        success: true,
        message:
          "Players swapped, wicket updated, and innings data recorded successfully!",
        T1wickets: match.T1wickets,
        T2wickets: match.T2wickets,
        oversInning1: match.oversInning1,
        oversInning2: match.oversInning2,
        inning: match.inning, // Return updated inning value
      });
    } catch (error) {
      console.error("Error in handlealloutinning2:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error." });
    }
  } catch (error) {
    console.error("Error in handlealloutinning2:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

router.post("/stopmatchcricket", authenticateJWT, async (req, res) => {
  const { matchId, matchyear } = req.body;
  const sportCategory = req.user.sportscategory;

  try {
    if (!matchId || !sportCategory || !matchyear) {
      console.log(matchyear)
      return res.status(400).json({
        success: false,
        message: "Match ID, Match year and sport category are required.",
      });
    }

    const ScheduleModel = createScheduleModel(sportCategory);
    if (!ScheduleModel) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid sport category." });
    }

    const match = await ScheduleModel.findById(matchId);
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found." });
    }

    match.status = "recent";
    let winningTeam = null;

    if (match.scoreT1 > match.scoreT2) {
      match.result = match.team1;
      winningTeam = match.team1;
    } else if (match.scoreT2 > match.scoreT1) {
      match.result = match.team2;
      winningTeam = match.team2;
    } else {
      match.result = "Draw";
    }

    await match.save();

    // Play-off Logic
    if (match.pool === "play-off" && winningTeam) {
      console.log(
        "Play-off match detected. Updating TBD entries with nominations...",
      );
      const winnerNominations = await PlayerNominationForm.findOne({
        department: winningTeam,
        sport: sportCategory,
        year: matchyear
      });

      const updateResult = await ScheduleModel.updateMany(
        {
          year: match.year,
          $or: [{ team1: "TBD" }, { team2: "TBD" }],
        },
        [
          {
            $set: {
              team1: {
                $cond: [{ $eq: ["$team1", "TBD"] }, winningTeam, "$team1"],
              },
              team2: {
                $cond: [{ $eq: ["$team2", "TBD"] }, winningTeam, "$team2"],
              },
              nominationsT1: {
                $cond: [
                  { $eq: ["$team1", "TBD"] },
                  winnerNominations?.nominations || [],
                  "$nominationsT1",
                ],
              },
              nominationsT2: {
                $cond: [
                  { $eq: ["$team2", "TBD"] },
                  winnerNominations?.nominations || [],
                  "$nominationsT2",
                ],
              },
            },
          },
        ],
      );
      console.log("TBD & Nominations Update Result:", updateResult);
    } else if (match.pool === "final" && sportCategory === "Cricket") {
      console.log(
        "Fetching nominated players from PlayerNominationForm for Cricket...",
      );

      // Fetch all nominated players for Cricket
      const allNominations = await PlayerNominationForm.find({
        sport: "Cricket",
        year: matchyear,
      }).select("nominations");

      console.log("Total nomination entries found:", allNominations.length);

      // Extract only required player details
      const allPlayers = allNominations.flatMap((team) =>
        team.nominations.map((player) => ({
          name: player.name,
          regNo: player.regNo,
          section: player.section,
          cnic: player.cnic,
        })),
      );

      console.log("Total Players Extracted:", allPlayers.length);

      const bulkOperations = allPlayers.map((player) => ({
        updateOne: {
          filter: { year: matchyear }, // Ensure we're updating only the doc for this year
          update: {
            $setOnInsert: { year: matchyear }, // Set year only if this is a new document
            $push: {
              nominations: {
                name: player.name,
                regNo: player.regNo,
                section: player.section,
                cnic: player.cnic,
                shirtNo: player.shirtNo || "", // Optional, if shirtNo exists
                totalrunsScored: 0,
                totalballsfaced: 0,
                totalwicketstaken: 0,
                totalrunsconceeded: 0,
              },
            },
          },
          upsert: true, // Create the doc if it doesn't exist
        },
      }));

      // Execute bulk update
      if (bulkOperations.length > 0) {
        await BestCricketer.bulkWrite(bulkOperations);
        console.log("All nominated players pushed to BestCricketer.");
      } else {
        console.log("No players to update.");
      }

      const ScheduleModel = createScheduleModel(sportCategory);
      const allMatches = await ScheduleModel.find({year: matchyear}).select(
        "nominationsT1 nominationsT2",
      );

      // Get all players in BestCricketer
      const bestCricketers = await BestCricketer.findOne({year:matchyear});
      if (!bestCricketers) {
        console.log("No best cricketers found, skipping update.");
        return;
      }

      for (const player of bestCricketers.nominations) {
        let totalRuns = 0;
        let totalWickets = 0;
        let totalBallsFaced = 0;
        let totalRunsConceded = 0;

        // Search player in nominationsT1 & nominationsT2
        for (const match of allMatches) {
          const foundInT1 = match.nominationsT1.filter(
            (p) => p.regNo === player.regNo,
          );
          const foundInT2 = match.nominationsT2.filter(
            (p) => p.regNo === player.regNo,
          );

          // Add runs scored from both teams
          foundInT1.forEach((p) => (totalRuns += p.runsScored));
          foundInT2.forEach((p) => (totalRuns += p.runsScored));

          // Add wickets taken from both teams
          foundInT1.forEach((p) => (totalWickets += p.wicketsTaken));
          foundInT2.forEach((p) => (totalWickets += p.wicketsTaken));

          // Calculate total balls faced (length of ballsFaced array)
          foundInT1.forEach(
            (p) => (totalBallsFaced += p.ballsFaced?.length || 0),
          );
          foundInT2.forEach(
            (p) => (totalBallsFaced += p.ballsFaced?.length || 0),
          );

          // Calculate total runs conceded (sum of ballsBowled array considering W=0, WD/NB=1, and numbers as they are)
          const processBallsBowled = (ballsArray) => {
            return ballsArray.reduce((sum, ball) => {
              if (ball === "W" || ball.endsWith("B")) return sum; // Ignore Wickets & values ending with "B"
              if (ball === "WD" || ball === "NB") return sum + 1; // Wides and No-Balls count as 1
              return sum + (parseInt(ball, 10) || 0); // Convert valid numbers and ignore NaN
            }, 0);
          };

          foundInT1.forEach(
            (p) =>
              (totalRunsConceded += processBallsBowled(p.ballsBowled || [])),
          );
          foundInT2.forEach(
            (p) =>
              (totalRunsConceded += processBallsBowled(p.ballsBowled || [])),
          );
        }

        // Update totalRunsScored, totalwicketstaken, totalballsfaced, and totalrunsconceeded in BestCricketer
        await BestCricketer.updateOne(
          { "nominations.regNo": player.regNo },
          {
            $set: {
              "nominations.$.totalrunsScored": totalRuns,
              "nominations.$.totalwicketstaken": totalWickets,
              "nominations.$.totalballsfaced": totalBallsFaced,
              "nominations.$.totalrunsconceeded": totalRunsConceded,
            },
          },
        );

        console.log(
          `Updated ${player.name} (RegNo: ${player.regNo}) -> Runs: ${totalRuns}, Wickets: ${totalWickets}, Balls Faced: ${totalBallsFaced}, Runs Conceded: ${totalRunsConceded}`,
        );
      }

      console.log("All players' stats updated in BestCricketer.");
    }

    res.json({ success: true, message: "Match stopped successfully.", match });
  } catch (error) {
    console.error("Error in /stopmatchcricket:", error);
    res
      .status(500)
      .json({ success: false, message: "Error stopping the match", error });
  }
});

router.post("/updateFirstInningcricket", authenticateJWT, async (req, res) => {
  const { matchId } = req.body;
  const sportCategory = req.user.sportscategory; // Retrieve sport category from logged-in user

  try {
    if (!matchId || !sportCategory) {
      return res.status(400).json({
        success: false,
        message: "Match ID and sport category are required.",
      });
    }

    const ScheduleModel = createScheduleModel(sportCategory); // Get the correct schedule model

    if (!ScheduleModel) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid sport category." });
    }

    const match = await ScheduleModel.findById(matchId);
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found." });
    }

    if (match.inning !== 1) {
      return res
        .status(400)
        .json({ success: false, message: "Match is not in the First Inning." });
    }

    // Update the match's half to 2 (second half)
    match.inning = 2;
    // Update playingStatus inside nominationsT1 and nominationsT2
    match.nominationsT1.forEach((player) => {
      if (
        player.playingStatus === "ActiveBatsman" ||
        player.playingStatus === "ActiveBowler" ||
        player.playingStatus === "Out"
      ) {
        player.playingStatus = "Playing";
      }
    });

    match.nominationsT2.forEach((player) => {
      if (
        player.playingStatus === "ActiveBatsman" ||
        player.playingStatus === "ActiveBowler" ||
        player.playingStatus === "Out"
      ) {
        player.playingStatus = "Playing";
      }
    });

    await match.save();

    res.json({
      success: true,
      message: "First Innings ended, match moved to second Inning.",
      match,
    });
  } catch (error) {
    console.error("Error ending first half:", error);
    res.status(500).json({
      success: false,
      message: "Server error while ending the first inning.",
    });
  }
});

router.post("/updateScoreCricket", authenticateJWT, async (req, res) => {
  // const session = await mongoose.startSession(); // Start MongoDB transaction session
  // session.startTransaction();
  try {
    const { matchId, playerId, team, runs } = req.body;
    const sportCategory = req.user.sportscategory;

    if (
      !matchId ||
      !playerId ||
      !team ||
      sportCategory === undefined ||
      runs === undefined
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid request data." });
    }

    const ScheduleModel = createScheduleModel(sportCategory);
    if (!ScheduleModel) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid sport category." });
    }

    const match = await ScheduleModel.findById(matchId);
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found." });
    }

    // console.log("Received match:", match);
    // console.log("Player ID:", playerId, "Team:", team, "Runs:", runs);

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
      return res
        .status(400)
        .json({ success: false, message: "Invalid team value." });
    }

    // console.log("✅ After Updating: scoreT1 =", match.scoreT1, ", scoreT2 =", match.scoreT2);

    updatedBatsman = match.nominationsT1.find(
      (player) =>
        player._id.equals(new mongoose.Types.ObjectId(playerId)) &&
        player.playingStatus === "ActiveBatsman",
    );
    if (updatedBatsman) {
      teamKey = "team1";
      bowlingTeamKey = "team2";
    }

    if (!updatedBatsman) {
      updatedBatsman = match.nominationsT2.find(
        (player) =>
          player._id.equals(new mongoose.Types.ObjectId(playerId)) &&
          player.playingStatus === "ActiveBatsman",
      );
      if (updatedBatsman) {
        teamKey = "team2";
        bowlingTeamKey = "team1";
      }
    }

    if (!updatedBatsman) {
      console.log("Player not found or not an active batsman! Available IDs:");
      match.nominationsT1.forEach((player) =>
        console.log(player._id.toString()),
      );
      match.nominationsT2.forEach((player) =>
        console.log(player._id.toString()),
      );
      return res.status(404).json({
        success: false,
        message: "Player not found or not an active batsman.",
      });
    }

    // console.log(`✅ Batsman found in ${teamKey}, updating score...`);

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

    const bowlingTeam =
      bowlingTeamKey === "team1" ? match.nominationsT1 : match.nominationsT2;
    const activeBowler = bowlingTeam.find(
      (player) => player.playingStatus === "ActiveBowler",
    );

    if (activeBowler) {
      // console.log(`✅ Active bowler found: ${activeBowler.name}, updating balls bowled...`);
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
    res.json({
      success: true,
      message: "✅ Score updated successfully!",
      match,
    });
  } catch (error) {
    console.error("❌ Error updating score:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

router.post("/updateByesCricket", authenticateJWT, async (req, res) => {
  try {
    const { matchId, team, byes } = req.body;
    const sportCategory = req.user.sportscategory;
    console.log(sportCategory);

    if (
      !matchId ||
      !team ||
      sportCategory === undefined ||
      byes === undefined
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid request data." });
    }

    const ScheduleModel = createScheduleModel(sportCategory);
    if (!ScheduleModel) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid sport category." });
    }

    const match = await ScheduleModel.findById(matchId);
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found." });
    }

    console.log("Received match:", match);
    console.log("Team:", team, "Byes:", byes);

    // Initialize scores if undefined
    if (match.scoreT1 === undefined) match.scoreT1 = 0;
    if (match.scoreT2 === undefined) match.scoreT2 = 0;

    // Determine which team is batting
    if (
      match.FirstInningBattingTeam.toString().trim() ===
      match.team1.toString().trim()
    ) {
      match.scoreT1 += byes;

      if (match.inning === 1) {
        match.runsInning1.push(`${byes}B`);
        match.oversInning1 = updateOvers(match.oversInning1);
      } else if (match.inning === 2) {
        match.runsInning2.push(`${byes}B`);
        match.oversInning2 = updateOvers(match.oversInning2);
      }
    } else if (
      match.FirstInningBattingTeam.toString().trim() ===
      match.team2.toString().trim()
    ) {
      match.scoreT2 += byes;

      if (match.inning === 1) {
        match.runsInning1.push(`${byes}B`);
        match.oversInning1 = updateOvers(match.oversInning1);
      } else if (match.inning === 2) {
        match.runsInning2.push(`${byes}B`);
        match.oversInning2 = updateOvers(match.oversInning2);
      }
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid team value." });
    }

    // Identify the bowling team
    const bowlingTeamKey =
      match.FirstInningBattingTeam.toString().trim() ===
      match.team1.toString().trim()
        ? "team2"
        : "team1";
    const bowlingTeam =
      bowlingTeamKey === "team1" ? match.nominationsT1 : match.nominationsT2;

    // Find the active bowler
    const activeBowler = bowlingTeam.find(
      (player) => player.playingStatus === "ActiveBowler",
    );

    if (activeBowler) {
      // Add the byes to the bowler's ballsBowled array
      activeBowler.ballsBowled.push(`${byes}B`);
    } else {
      console.warn("No active bowler found.");
    }

    // Save changes to database
    await match.save();

    res.json({
      success: true,
      message: "✅ Byes updated successfully!",
      scoreT1: match.scoreT1,
      scoreT2: match.scoreT2,
      oversInning1: match.oversInning1,
      oversInning2: match.oversInning2,
    });
  } catch (error) {
    console.error("❌ Error updating byes:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

router.post(
  "/updateByesCricket2ndInning",
  authenticateJWT,
  async (req, res) => {
    try {
      const { matchId, team, byes } = req.body;
      const sportCategory = req.user.sportscategory;

      if (
        !matchId ||
        !team ||
        sportCategory === undefined ||
        byes === undefined
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid request data." });
      }

      const ScheduleModel = createScheduleModel(sportCategory);
      if (!ScheduleModel) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid sport category." });
      }

      const match = await ScheduleModel.findById(matchId);
      if (!match) {
        return res
          .status(404)
          .json({ success: false, message: "Match not found." });
      }

      console.log("Received match:", match);
      console.log("Team:", team, "Byes:", byes);

      // Initialize scores if undefined
      if (match.scoreT1 === undefined) match.scoreT1 = 0;
      if (match.scoreT2 === undefined) match.scoreT2 = 0;

      // Determine which team is batting
      if (
        match.SecondInningBattingTeam.toString().trim() ===
        match.team1.toString().trim()
      ) {
        match.scoreT1 += byes;

        if (match.inning === 1) {
          match.runsInning1.push(`${byes}B`);
          match.oversInning1 = updateOvers(match.oversInning1);
        } else if (match.inning === 2) {
          match.runsInning2.push(`${byes}B`);
          match.oversInning2 = updateOvers(match.oversInning2);
        }
      } else if (
        match.SecondInningBattingTeam.toString().trim() ===
        match.team2.toString().trim()
      ) {
        match.scoreT2 += byes;

        if (match.inning === 1) {
          match.runsInning1.push(`${byes}B`);
          match.oversInning1 = updateOvers(match.oversInning1);
        } else if (match.inning === 2) {
          match.runsInning2.push(`${byes}B`);
          match.oversInning2 = updateOvers(match.oversInning2);
        }
      } else {
        return res
          .status(400)
          .json({ success: false, message: "Invalid team value." });
      }

      // Identify the bowling team
      const bowlingTeamKey =
        match.SecondInningBattingTeam.toString().trim() ===
        match.team1.toString().trim()
          ? "team2"
          : "team1";
      const bowlingTeam =
        bowlingTeamKey === "team1" ? match.nominationsT1 : match.nominationsT2;

      // Find the active bowler
      const activeBowler = bowlingTeam.find(
        (player) => player.playingStatus === "ActiveBowler",
      );

      if (activeBowler) {
        // Add the byes to the bowler's ballsBowled array
        activeBowler.ballsBowled.push(`${byes}B`);
      } else {
        console.warn("No active bowler found.");
      }

      // Save changes to database
      await match.save();

      res.json({
        success: true,
        message: "✅ Byes updated successfully!",
        scoreT1: match.scoreT1,
        scoreT2: match.scoreT2,
        oversInning1: match.oversInning1,
        oversInning2: match.oversInning2,
      });
    } catch (error) {
      console.error("❌ Error updating byes:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error." });
    }
  },
);

router.post("/updateExtrasCricket", authenticateJWT, async (req, res) => {
  try {
    const { matchId, team, extraType } = req.body;
    const sportCategory = req.user.sportscategory;

    if (!matchId || !team || !extraType) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid request data." });
    }

    const ScheduleModel = createScheduleModel(sportCategory);
    const match = await ScheduleModel.findById(matchId);
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found." });
    }

    // Determine which team is batting
    if (
      match.FirstInningBattingTeam.toString().trim() ===
      match.team1.toString().trim()
    ) {
      match.scoreT1 += 1; // 1 extra run for Wide/No Ball
    } else if (
      match.FirstInningBattingTeam.toString().trim() ===
      match.team2.toString().trim()
    ) {
      match.scoreT2 += 1;
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid FirstInningBattingTeam value.",
      });
    }

    // Add the extra type in the correct inning
    if (match.inning === 1) {
      match.runsInning1.push(extraType);  // Can be "Wide", "NB", "1E", "2E", etc.
    } else if (match.inning === 2) {
      match.runsInning2.push(extraType);  // Can be "Wide", "NB", "1E", "2E", etc.
    }

    // Identify the bowling team
    const bowlingTeamKey =
      match.FirstInningBattingTeam.toString().trim() ===
      match.team1.toString().trim()
        ? "team2"
        : "team1";
    const bowlingTeam =
      bowlingTeamKey === "team1" ? match.nominationsT1 : match.nominationsT2;
    const activeBowler = bowlingTeam.find(
      (player) => player.playingStatus === "ActiveBowler",
    );

    // If an active bowler exists, update their balls bowled with the extra value
    if (activeBowler) {
      console.log(
        `✅ Active bowler found: ${activeBowler.name}, updating balls bowled...`,
      );
      if (!activeBowler.ballsBowled) activeBowler.ballsBowled = [];
      activeBowler.ballsBowled.push(extraType);  // Add the extra as part of the bowler's balls bowled
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


router.post(
  "/updateExtrasCricket2ndInning",
  authenticateJWT,
  async (req, res) => {
    try {
      const { matchId, team, extraType } = req.body;
      const sportCategory = req.user.sportscategory;
  
      if (!matchId || !team || !extraType) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid request data." });
      }
  
      const ScheduleModel = createScheduleModel(sportCategory);
      const match = await ScheduleModel.findById(matchId);
      if (!match) {
        return res
          .status(404)
          .json({ success: false, message: "Match not found." });
      }
  
      // Determine which team is batting
      if (
        match.SecondInningBattingTeam.toString().trim() ===
        match.team1.toString().trim()
      ) {
        match.scoreT1 += 1; // 1 extra run for Wide/No Ball
      } else if (
        match.SecondInningBattingTeam.toString().trim() ===
        match.team2.toString().trim()
      ) {
        match.scoreT2 += 1;
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid SecondInningBattingTeam value.",
        });
      }
  
      // Add the extra type in the correct inning
      if (match.inning === 1) {
        match.runsInning1.push(extraType);  // Can be "Wide", "NB", "1E", "2E", etc.
      } else if (match.inning === 2) {
        match.runsInning2.push(extraType);  // Can be "Wide", "NB", "1E", "2E", etc.
      }
  
      // Identify the bowling team
      const bowlingTeamKey =
        match.FirstInningBattingTeam.toString().trim() ===
        match.team1.toString().trim()
          ? "team2"
          : "team1";
      const bowlingTeam =
        bowlingTeamKey === "team1" ? match.nominationsT1 : match.nominationsT2;
      const activeBowler = bowlingTeam.find(
        (player) => player.playingStatus === "ActiveBowler",
      );
  
      // If an active bowler exists, update their balls bowled with the extra value
      if (activeBowler) {
        console.log(
          `✅ Active bowler found: ${activeBowler.name}, updating balls bowled...`,
        );
        if (!activeBowler.ballsBowled) activeBowler.ballsBowled = [];
        activeBowler.ballsBowled.push(extraType);  // Add the extra as part of the bowler's balls bowled
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
  let [whole, decimal] = currentOvers.toString().split(".").map(Number);
  decimal = decimal || 0;

  if (decimal === 5) {
    whole += 1;
    decimal = 0;
  } else {
    decimal += 1;
  }

  return parseFloat(`${whole}.${decimal}`);
};

// Route to get the best batsman and best bowler
router.get("/bestcricketer", authenticateJWT, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear().toString();
    const cricketerData = await BestCricketer.findOne({ year: currentYear });

    if (!cricketerData || cricketerData.nominations.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No nominations found." });
    }

    // Find all batsmen with the highest runs
    const maxRuns = Math.max(...cricketerData.nominations.map(n => n.totalrunsScored));
    const topBatsmen = cricketerData.nominations.filter(n => n.totalrunsScored === maxRuns);
    
    // Determine best batsman (using average if tie)
    let bestBatsman;
    if (topBatsmen.length > 1) {
      bestBatsman = topBatsmen.reduce((prev, curr) => {
        const prevAvg = prev.totalrunsScored / (prev.totalballsfaced || 1);
        const currAvg = curr.totalrunsScored / (curr.totalballsfaced || 1);
        return currAvg > prevAvg ? curr : prev;
      }, topBatsmen[0]);
    } else {
      bestBatsman = topBatsmen[0];
    }

    // Find all bowlers with the highest wickets
    const maxWickets = Math.max(...cricketerData.nominations.map(n => n.totalwicketstaken));
    const topBowlers = cricketerData.nominations.filter(n => n.totalwicketstaken === maxWickets);
    
    // Determine best bowler (using economy if tie)
    let bestBowler;
    if (topBowlers.length > 1) {
      bestBowler = topBowlers.reduce((prev, curr) => {
        const prevEcon = prev.totalwicketstaken / (prev.totalrunsconceeded || 1);
        const currEcon = curr.totalwicketstaken / (curr.totalrunsconceeded || 1);
        return currEcon > prevEcon ? curr : prev;
      }, topBowlers[0]);
    } else {
      bestBowler = topBowlers[0];
    }

    res.json({
      success: true,
      bestBatsman: {
        name: bestBatsman.name,
        regNo: bestBatsman.regNo,
        runs: bestBatsman.totalrunsScored,
        ballsfaced: bestBatsman.totalballsfaced,
        average: bestBatsman.totalrunsScored / (bestBatsman.totalballsfaced || 1)
      },
      bestBowler: {
        name: bestBowler.name,
        regNo: bestBowler.regNo,
        wickets: bestBowler.totalwicketstaken,
        ballsbowled: bestBowler.totalrunsconceeded,
        economy: bestBowler.totalwicketstaken / (bestBowler.totalrunsconceeded || 1)
      },
    });
  } catch (error) {
    console.error("Error fetching best cricketers:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching best cricketers.",
    });
  }
});

router.post("/startSuperOver", authenticateJWT, async (req, res) => {
  try {
    const { matchId, batsmen, bowler, battingTeam, bowlingTeam } = req.body;
    const ScheduleModel = createScheduleModel(req.user.sportscategory);

    const match = await ScheduleModel.findById(matchId);
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found" });
    }

    // Validate batsmen and bowler
    if (!Array.isArray(batsmen) || batsmen.length !== 2 || !bowler) {
      return res.status(400).json({
        success: false,
        message: "Please select exactly 2 batsmen and 1 bowler",
      });
    }

    // Set playing status for selected players
    const battingTeamKey =
      battingTeam === match.team1 ? "nominationsT1" : "nominationsT2";
    const bowlingTeamKey =
      bowlingTeam === match.team1 ? "nominationsT1" : "nominationsT2";

    // Update batsmen status
    match[battingTeamKey].forEach((player) => {
      if (batsmen.includes(player._id.toString())) {
        player.playingStatus = "ActiveBatsman";
      }
    });

    // Update bowler status
    match[bowlingTeamKey].forEach((player) => {
      if (player._id.toString() === bowler) {
        player.playingStatus = "ActiveBowler";
      }
    });

    // Initialize super over data with two innings
    match.superOver = {
      firstInning: {
        battingTeam: battingTeam,
        bowlingTeam: bowlingTeam,
        runs: 0,
        wickets: 0,
        ballsBowled: 0,
        balls: [],
        batsmen: batsmen,
        bowler: bowler,
      },
      secondInning: {
        battingTeam: bowlingTeam, // Teams switch for second inning
        bowlingTeam: battingTeam,
        runs: 0,
        wickets: 0,
        ballsBowled: 0,
        balls: [],
        batsmen: [],
        bowler: null,
      },
      currentInning: 1,
      winner: null,
      isComplete: false,
    };

    await match.save();
    res.json({
      success: true,
      message: "Super Over started",
      superOver: match.superOver,
    });
  } catch (error) {
    console.error("Error starting super over:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post(
  "/prepareSuperOverSecondInning",
  authenticateJWT,
  async (req, res) => {
    try {
      const { matchId } = req.body;
      const ScheduleModel = createScheduleModel(req.user.sportscategory);

      const match = await ScheduleModel.findById(matchId);
      if (!match) {
        return res
          .status(404)
          .json({ success: false, message: "Match not found" });
      }

      if (!match.superOver || match.superOver.currentInning !== 1) {
        return res.status(400).json({
          success: false,
          message: "Super Over not started or already in second inning",
        });
      }

      // Get teams for second inning
      const secondBattingTeam = match.superOver.secondInning.battingTeam;
      const secondBowlingTeam = match.superOver.secondInning.bowlingTeam;

      // Get players from database
      const secondBattingPlayers =
        secondBattingTeam === match.team1
          ? match.nominationsT1
          : match.nominationsT2;
      const secondBowlingPlayers =
        secondBowlingTeam === match.team1
          ? match.nominationsT1
          : match.nominationsT2;

      // Select first two available batsmen
      const availableBatsmen = secondBattingPlayers.filter(
        (p) => p.playingStatus === "Playing",
      );
      const newBatsmen = availableBatsmen
        .slice(0, 2)
        .map((p) => p._id.toString());

      // Select first available bowler
      const availableBowlers = secondBowlingPlayers.filter(
        (p) => p.playingStatus === "Playing",
      );
      const newBowler = availableBowlers[0]?._id.toString() || null;

      if (newBatsmen.length < 2 || !newBowler) {
        return res.status(400).json({
          success: false,
          message: "Not enough players available for second inning",
        });
      }

      // Update player statuses
      secondBattingPlayers.forEach((player) => {
        if (newBatsmen.includes(player._id.toString())) {
          player.playingStatus = "ActiveBatsman";
        }
      });

      secondBowlingPlayers.forEach((player) => {
        if (player._id.toString() === newBowler) {
          player.playingStatus = "ActiveBowler";
        }
      });

      // Update second inning data
      match.superOver.secondInning.batsmen = newBatsmen;
      match.superOver.secondInning.bowler = newBowler;
      match.superOver.currentInning = 2;

      await match.save();
      res.json({
        success: true,
        message: "Second inning prepared",
        batsmen: newBatsmen,
        bowler: newBowler,
        superOver: match.superOver,
      });
    } catch (error) {
      console.error("Error preparing second inning:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

router.post("/updateSuperOverScore", authenticateJWT, async (req, res) => {
  try {
    const { matchId, playerId, team, runs, inning } = req.body;
    const ScheduleModel = createScheduleModel(req.user.sportscategory);

    const match = await ScheduleModel.findById(matchId);
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found" });
    }

    console.log(match);
    if (!match.superOver || match.superOver.isComplete) {
      return res.status(400).json({
        success: false,
        message: "Super Over not started or already complete",
      });
    }

    // Update the correct inning
    const inningData =
      inning === 1 ? match.superOver.firstInning : match.superOver.secondInning;

    if (inningData.ballsBowled >= 6) {
      return res.status(400).json({
        success: false,
        message: "Inning already complete (6 balls bowled)",
      });
    }

    inningData.runs += runs;
    inningData.ballsBowled += 1;
    inningData.balls.push(runs);

    // Update player stats
    const teamKey = team === match.team1 ? "nominationsT1" : "nominationsT2";
    const playerIndex = match[teamKey].findIndex(
      (p) => p._id.toString() === playerId,
    );
    if (playerIndex !== -1) {
      match[teamKey][playerIndex].runsScored =
        (match[teamKey][playerIndex].runsScored || 0) + runs;
      if (!match[teamKey][playerIndex].ballsFaced) {
        match[teamKey][playerIndex].ballsFaced = [];
      }
      match[teamKey][playerIndex].ballsFaced.push(runs);
    }

    // Update bowler stats if this is a valid ball (not a wide or no ball)
    const bowlerTeamKey =
      inning === 1
        ? match.superOver.firstInning.bowlingTeam === match.team1
          ? "nominationsT1"
          : "nominationsT2"
        : match.superOver.secondInning.bowlingTeam === match.team1
          ? "nominationsT1"
          : "nominationsT2";

    const bowlerId =
      inning === 1
        ? match.superOver.firstInning.bowler
        : match.superOver.secondInning.bowler;

    const bowlerIndex = match[bowlerTeamKey].findIndex(
      (p) => p._id.toString() === bowlerId,
    );
    if (bowlerIndex !== -1) {
      if (!match[bowlerTeamKey][bowlerIndex].ballsBowled) {
        match[bowlerTeamKey][bowlerIndex].ballsBowled = [];
      }
      match[bowlerTeamKey][bowlerIndex].ballsBowled.push(runs);
      match[bowlerTeamKey][bowlerIndex].runsConceded =
        (match[bowlerTeamKey][bowlerIndex].runsConceded || 0) + runs;
    }

    await match.save();
    res.json({
      success: true,
      message: "Score updated",
      superOver: match.superOver,
    });
  } catch (error) {
    console.error("Error updating super over score:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/updateSuperOverWicket", authenticateJWT, async (req, res) => {
  try {
    const { matchId, outgoingBatsmanId, newBatsmanId, inning } = req.body;
    const ScheduleModel = createScheduleModel(req.user.sportscategory);

    const match = await ScheduleModel.findById(matchId);
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found" });
    }

    if (!match.superOver || match.superOver.isComplete) {
      return res.status(400).json({
        success: false,
        message: "Super Over not started or already complete",
      });
    }

    // Update the correct inning
    const inningData =
      inning === 1 ? match.superOver.firstInning : match.superOver.secondInning;

    if (inningData.ballsBowled >= 6) {
      return res.status(400).json({
        success: false,
        message: "Inning already complete (6 balls bowled)",
      });
    }

    inningData.wickets += 1;
    inningData.ballsBowled += 1;
    inningData.balls.push("W");

    // Update batsmen array if we have a new batsman
    if (newBatsmanId) {
      const batsmanIndex = inningData.batsmen.findIndex(
        (id) => id.toString() === outgoingBatsmanId,
      );
      if (batsmanIndex !== -1) {
        inningData.batsmen[batsmanIndex] = newBatsmanId;
      }
    }

    // Update player status
    const battingTeamKey =
      inning === 1
        ? match.superOver.firstInning.battingTeam === match.team1
          ? "nominationsT1"
          : "nominationsT2"
        : match.superOver.secondInning.battingTeam === match.team1
          ? "nominationsT1"
          : "nominationsT2";

    // Mark outgoing batsman as out
    const outgoingIndex = match[battingTeamKey].findIndex(
      (p) => p._id.toString() === outgoingBatsmanId,
    );
    if (outgoingIndex !== -1) {
      match[battingTeamKey][outgoingIndex].playingStatus = "Out";
    }

    // Mark new batsman as active
    if (newBatsmanId) {
      const newBatsmanIndex = match[battingTeamKey].findIndex(
        (p) => p._id.toString() === newBatsmanId,
      );
      if (newBatsmanIndex !== -1) {
        match[battingTeamKey][newBatsmanIndex].playingStatus = "ActiveBatsman";
      }
    }

    // Update bowler stats (wicket)
    const bowlerTeamKey =
      inning === 1
        ? match.superOver.firstInning.bowlingTeam === match.team1
          ? "nominationsT1"
          : "nominationsT2"
        : match.superOver.secondInning.bowlingTeam === match.team1
          ? "nominationsT1"
          : "nominationsT2";

    const bowlerId =
      inning === 1
        ? match.superOver.firstInning.bowler
        : match.superOver.secondInning.bowler;

    const bowlerIndex = match[bowlerTeamKey].findIndex(
      (p) => p._id.toString() === bowlerId,
    );
    if (bowlerIndex !== -1) {
      match[bowlerTeamKey][bowlerIndex].wicketsTaken =
        (match[bowlerTeamKey][bowlerIndex].wicketsTaken || 0) + 1;
      if (!match[bowlerTeamKey][bowlerIndex].ballsBowled) {
        match[bowlerTeamKey][bowlerIndex].ballsBowled = [];
      }
      match[bowlerTeamKey][bowlerIndex].ballsBowled.push("W");
    }

    await match.save();
    res.json({
      success: true,
      message: "Wicket updated",
      superOver: match.superOver,
    });
  } catch (error) {
    console.error("Error updating super over wicket:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/updateSuperOverByes", authenticateJWT, async (req, res) => {
  try {
    const { matchId, team, byes, inning } = req.body;
    const ScheduleModel = createScheduleModel(req.user.sportscategory);

    const match = await ScheduleModel.findById(matchId);
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found" });
    }

    if (!match.superOver || match.superOver.isComplete) {
      return res.status(400).json({
        success: false,
        message: "Super Over not started or already complete",
      });
    }

    // Update the correct inning
    const inningData =
      inning === 1 ? match.superOver.firstInning : match.superOver.secondInning;

    if (inningData.ballsBowled >= 6) {
      return res.status(400).json({
        success: false,
        message: "Inning already complete (6 balls bowled)",
      });
    }

    inningData.runs += byes;
    inningData.ballsBowled += 1;
    inningData.balls.push(`${byes}B`);

    // Update bowler stats (just mark the ball bowled)
    const bowlerTeamKey =
      inning === 1
        ? match.superOver.firstInning.bowlingTeam === match.team1
          ? "nominationsT1"
          : "nominationsT2"
        : match.superOver.secondInning.bowlingTeam === match.team1
          ? "nominationsT1"
          : "nominationsT2";

    const bowlerId =
      inning === 1
        ? match.superOver.firstInning.bowler
        : match.superOver.secondInning.bowler;

    const bowlerIndex = match[bowlerTeamKey].findIndex(
      (p) => p._id.toString() === bowlerId,
    );
    if (bowlerIndex !== -1) {
      if (!match[bowlerTeamKey][bowlerIndex].ballsBowled) {
        match[bowlerTeamKey][bowlerIndex].ballsBowled = [];
      }
      match[bowlerTeamKey][bowlerIndex].ballsBowled.push(`${byes}B`);
    }

    await match.save();
    res.json({
      success: true,
      message: "Byes updated",
      superOver: match.superOver,
    });
  } catch (error) {
    console.error("Error updating super over byes:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/updateSuperOverExtras", authenticateJWT, async (req, res) => {
  try {
    const { matchId, team, extraType, inning } = req.body;
    const ScheduleModel = createScheduleModel(req.user.sportscategory);

    const match = await ScheduleModel.findById(matchId);
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found" });
    }

    if (!match.superOver || match.superOver.isComplete) {
      return res.status(400).json({
        success: false,
        message: "Super Over not started or already complete",
      });
    }

    // Update the correct inning
    const inningData =
      inning === 1 ? match.superOver.firstInning : match.superOver.secondInning;

    if (inningData.ballsBowled >= 6) {
      return res.status(400).json({
        success: false,
        message: "Inning already complete (6 balls bowled)",
      });
    }

    const extraValue = extraType === "Wide" ? "WD" : "NB";
    inningData.runs += 1; // 1 run for extras
    inningData.balls.push(extraValue);

    // For wides and no-balls, we don't increment ballsBowled
    if (extraType !== "Wide" && extraType !== "NB") {
      inningData.ballsBowled += 1;
    }

    // Update bowler stats
    const bowlerTeamKey =
      inning === 1
        ? match.superOver.firstInning.bowlingTeam === match.team1
          ? "nominationsT1"
          : "nominationsT2"
        : match.superOver.secondInning.bowlingTeam === match.team1
          ? "nominationsT1"
          : "nominationsT2";

    const bowlerId =
      inning === 1
        ? match.superOver.firstInning.bowler
        : match.superOver.secondInning.bowler;

    const bowlerIndex = match[bowlerTeamKey].findIndex(
      (p) => p._id.toString() === bowlerId,
    );
    if (bowlerIndex !== -1) {
      if (!match[bowlerTeamKey][bowlerIndex].ballsBowled) {
        match[bowlerTeamKey][bowlerIndex].ballsBowled = [];
      }
      match[bowlerTeamKey][bowlerIndex].ballsBowled.push(extraValue);
      match[bowlerTeamKey][bowlerIndex].runsConceded =
        (match[bowlerTeamKey][bowlerIndex].runsConceded || 0) + 1;
    }

    await match.save();
    res.json({
      success: true,
      message: "Extras updated",
      superOver: match.superOver,
    });
  } catch (error) {
    console.error("Error updating super over extras:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// router.post("/completeSuperOver", authenticateJWT, async (req, res) => {
//   try {
//     const {
//       matchId,
//       winner,
//       team1Runs,
//       team2Runs,
//       team1Wickets,
//       team2Wickets,
//     } = req.body;
//     const ScheduleModel = createScheduleModel(req.user.sportscategory);

//     const match = await ScheduleModel.findById(matchId);
//     if (!match) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Match not found" });
//     }

//     if (!match.superOver) {
//       return res.status(400).json({
//         success: false,
//         message: "Super Over not started",
//       });
//     }

//     // Update super over results
//     match.superOver.firstInning.runs = team1Runs;
//     match.superOver.firstInning.wickets = team1Wickets;
//     match.superOver.secondInning.runs = team2Runs;
//     match.superOver.secondInning.wickets = team2Wickets;
//     match.superOver.winner = winner;
//     match.superOver.isComplete = true;

//     match.winner = winner;

//     // Update match result
//     if (winner !== "Match Tied") {
//       match.result = winner;
//     } else {
//       match.result = "Tied";
//     }

//     match.status = "recent";

//     // Reset all player statuses to "Playing"
//     match.nominationsT1.forEach((player) => {
//       player.playingStatus = "Playing";
//     });
//     match.nominationsT2.forEach((player) => {
//       player.playingStatus = "Playing";
//     });

//     await match.save();
//     res.json({
//       success: true,
//       message: "Super Over completed",
//       match,
//     });
//   } catch (error) {
//     console.error("Error completing super over:", error);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });
router.post("/completeSuperOver", authenticateJWT, async (req, res) => {
  try {
    const {
      matchId,
      winner,
      team1Runs,
      team2Runs,
      team1Wickets,
      team2Wickets,
    } = req.body;
    const ScheduleModel = createScheduleModel(req.user.sportscategory);

    const match = await ScheduleModel.findById(matchId);
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found" });
    }

    if (!match.superOver) {
      return res.status(400).json({
        success: false,
        message: "Super Over not started",
      });
    }

    // Update super over results
    match.superOver.firstInning.runs = team1Runs;
    match.superOver.firstInning.wickets = team1Wickets;
    match.superOver.secondInning.runs = team2Runs;
    match.superOver.secondInning.wickets = team2Wickets;
    match.superOver.winner = winner;
    match.superOver.isComplete = true;

    match.winner = winner;

    // Update match result
    if (winner !== "Match Tied") {
      match.result = winner;
    } else {
      match.result = "Tied";
    }

    match.status = "recent";

    // Reset all player statuses to "Playing"
    match.nominationsT1.forEach((player) => {
      player.playingStatus = "Playing";
    });
    match.nominationsT2.forEach((player) => {
      player.playingStatus = "Playing";
    });

    await match.save();

    // Additional functionality for play-off and final matches
    const winningTeam = winner !== "Match Tied" ? winner : null;
    const sportCategory = req.user.sportscategory;
    const matchyear = match.year;

    if (match.pool === "play-off" && winningTeam) {
      console.log(
        "Play-off match detected. Updating TBD entries with nominations...",
      );
      const winnerNominations = await PlayerNominationForm.findOne({
        department: winningTeam,
        sport: sportCategory,
        year: matchyear
      });

      const updateResult = await ScheduleModel.updateMany(
        {
          year: match.year,
          $or: [{ team1: "TBD" }, { team2: "TBD" }],
        },
        [
          {
            $set: {
              team1: {
                $cond: [{ $eq: ["$team1", "TBD"] }, winningTeam, "$team1"],
              },
              team2: {
                $cond: [{ $eq: ["$team2", "TBD"] }, winningTeam, "$team2"],
              },
              nominationsT1: {
                $cond: [
                  { $eq: ["$team1", "TBD"] },
                  winnerNominations?.nominations || [],
                  "$nominationsT1",
                ],
              },
              nominationsT2: {
                $cond: [
                  { $eq: ["$team2", "TBD"] },
                  winnerNominations?.nominations || [],
                  "$nominationsT2",
                ],
              },
            },
          },
        ],
      );
      console.log("TBD & Nominations Update Result:", updateResult);
    } else if (match.pool === "final" && sportCategory === "Cricket") {
      console.log(
        "Fetching nominated players from PlayerNominationForm for Cricket...",
      );

      // Fetch all nominated players for Cricket
      const allNominations = await PlayerNominationForm.find({
        sport: "Cricket",
        year: matchyear,
      }).select("nominations");

      console.log("Total nomination entries found:", allNominations.length);

      // Extract only required player details
      const allPlayers = allNominations.flatMap((team) =>
        team.nominations.map((player) => ({
          name: player.name,
          regNo: player.regNo,
          section: player.section,
          cnic: player.cnic,
        })),
      );

      console.log("Total Players Extracted:", allPlayers.length);

      const bulkOperations = allPlayers.map((player) => ({
        updateOne: {
          filter: { year: matchyear },
          update: {
            $setOnInsert: { year: matchyear },
            $push: {
              nominations: {
                name: player.name,
                regNo: player.regNo,
                section: player.section,
                cnic: player.cnic,
                shirtNo: player.shirtNo || "",
                totalrunsScored: 0,
                totalballsfaced: 0,
                totalwicketstaken: 0,
                totalrunsconceeded: 0,
              },
            },
          },
          upsert: true,
        },
      }));

      // Execute bulk update
      if (bulkOperations.length > 0) {
        await BestCricketer.bulkWrite(bulkOperations);
        console.log("All nominated players pushed to BestCricketer.");
      } else {
        console.log("No players to update.");
      }

      const allMatches = await ScheduleModel.find({year: matchyear}).select(
        "nominationsT1 nominationsT2",
      );

      const bestCricketers = await BestCricketer.findOne({year: matchyear});
      if (!bestCricketers) {
        console.log("No best cricketers found, skipping update.");
      } else {
        for (const player of bestCricketers.nominations) {
          let totalRuns = 0;
          let totalWickets = 0;
          let totalBallsFaced = 0;
          let totalRunsConceded = 0;

          // Search player in nominationsT1 & nominationsT2
          for (const match of allMatches) {
            const foundInT1 = match.nominationsT1.filter(
              (p) => p.regNo === player.regNo,
            );
            const foundInT2 = match.nominationsT2.filter(
              (p) => p.regNo === player.regNo,
            );

            // Add runs scored from both teams
            foundInT1.forEach((p) => (totalRuns += p.runsScored));
            foundInT2.forEach((p) => (totalRuns += p.runsScored));

            // Add wickets taken from both teams
            foundInT1.forEach((p) => (totalWickets += p.wicketsTaken));
            foundInT2.forEach((p) => (totalWickets += p.wicketsTaken));

            // Calculate total balls faced
            foundInT1.forEach(
              (p) => (totalBallsFaced += p.ballsFaced?.length || 0),
            );
            foundInT2.forEach(
              (p) => (totalBallsFaced += p.ballsFaced?.length || 0),
            );

            // Calculate total runs conceded
            const processBallsBowled = (ballsArray) => {
              return ballsArray.reduce((sum, ball) => {
                if (ball === "W" || ball.endsWith("B")) return sum;
                if (ball === "WD" || ball === "NB") return sum + 1;
                return sum + (parseInt(ball, 10) || 0);
              }, 0);
            };

            foundInT1.forEach(
              (p) =>
                (totalRunsConceded += processBallsBowled(p.ballsBowled || [])),
            );
            foundInT2.forEach(
              (p) =>
                (totalRunsConceded += processBallsBowled(p.ballsBowled || [])),
            );
          }

          // Update player stats in BestCricketer
          await BestCricketer.updateOne(
            { "nominations.regNo": player.regNo },
            {
              $set: {
                "nominations.$.totalrunsScored": totalRuns,
                "nominations.$.totalwicketstaken": totalWickets,
                "nominations.$.totalballsfaced": totalBallsFaced,
                "nominations.$.totalrunsconceeded": totalRunsConceded,
              },
            },
          );

          console.log(
            `Updated ${player.name} (RegNo: ${player.regNo}) -> Runs: ${totalRuns}, Wickets: ${totalWickets}, Balls Faced: ${totalBallsFaced}, Runs Conceded: ${totalRunsConceded}`,
          );
        }
        console.log("All players' stats updated in BestCricketer.");
      }
    }

    res.json({
      success: true,
      message: "Super Over completed",
      match,
    });
  } catch (error) {
    console.error("Error completing super over:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});



// server/routes/bestCricketer.js
router.get("/bestcricketertp/:year", async (req, res) => {
  const year = req.params.year;

  try {
    const cricketerData = await BestCricketer.findOne({ year });

    if (!cricketerData || cricketerData.nominations.length === 0) {
      return res.status(404).json({ success: false, message: "No record found for the year." });
    }

    // Find all batsmen with the highest runs
    const maxRuns = Math.max(...cricketerData.nominations.map(n => n.totalrunsScored));
    const topBatsmen = cricketerData.nominations.filter(n => n.totalrunsScored === maxRuns);
    
    // If multiple batsmen have same highest runs, calculate their averages
    let bestBatsman;
    if (topBatsmen.length > 1) {
      // Calculate average (runs/balls) for each and find the highest
      bestBatsman = topBatsmen.reduce((prev, curr) => {
        const prevAvg = prev.totalrunsScored / (prev.totalballsfaced || 1); // Avoid division by zero
        const currAvg = curr.totalrunsScored / (curr.totalballsfaced || 1);
        return currAvg > prevAvg ? curr : prev;
      }, topBatsmen[0]);
    } else {
      bestBatsman = topBatsmen[0];
    }

    // Find all bowlers with the highest wickets
    const maxWickets = Math.max(...cricketerData.nominations.map(n => n.totalwicketstaken));
    const topBowlers = cricketerData.nominations.filter(n => n.totalwicketstaken === maxWickets);
    
    // If multiple bowlers have same highest wickets, calculate their economy (wickets/runs conceded)
    let bestBowler;
    if (topBowlers.length > 1) {
      // Calculate economy (wickets/runs conceded) for each and find the highest
      bestBowler = topBowlers.reduce((prev, curr) => {
        const prevEcon = prev.totalwicketstaken / (prev.totalrunsconceeded || 1); // Avoid division by zero
        const currEcon = curr.totalwicketstaken / (curr.totalrunsconceeded || 1);
        return currEcon > prevEcon ? curr : prev;
      }, topBowlers[0]);
    } else {
      bestBowler = topBowlers[0];
    }

    res.json({
      success: true,
      bestBatsman: {
        name: bestBatsman.name,
        regNo: bestBatsman.regNo,
        runs: bestBatsman.totalrunsScored,
        ballsfaced: bestBatsman.totalballsfaced,
        average: bestBatsman.totalrunsScored / (bestBatsman.totalballsfaced || 1)
      },
      bestBowler: {
        name: bestBowler.name,
        regNo: bestBowler.regNo,
        wickets: bestBowler.totalwicketstaken,
        ballsbowled: bestBowler.totalrunsconceeded,
        economy: bestBowler.totalwicketstaken / (bestBowler.totalrunsconceeded || 1)
      },
    });
  } catch (error) {
    console.error("Error fetching best cricketers:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
});



router.post("/handleRunOutWithRuns", authenticateJWT, async (req, res) => {
  try {
    const { matchId, outgoingBatsmanId, newBatsmanId, runs, team } = req.body;
    const ScheduleModel = createScheduleModel(req.user.sportscategory);

    if (!matchId || !outgoingBatsmanId || !newBatsmanId || runs === undefined || !team || !ScheduleModel) {
      return res.status(400).json({ success: false, message: "Invalid data." });
    }

    const match = await ScheduleModel.findById(matchId);
    if (!match) {
      return res.status(404).json({ success: false, message: "Match not found." });
    }

    // Update outgoing batsman
    const updateOutgoingBatsman = (players, id) => {
      const player = players.find(p => p._id.equals(id));
      if (player) {
        player.runsScored = (player.runsScored || 0) + runs;
        player.ballsFaced.push(runs.toString());
        player.playingStatus = "Out";
      }
    };

    // Update team score
    if (team === match.team1.toString().trim()) {
      match.scoreT1 += runs;
      match.T1wickets += 1;
      updateOutgoingBatsman(match.nominationsT1, outgoingBatsmanId);
      
      // Update new batsman
      const newBatsman = match.nominationsT1.find(p => p._id.equals(newBatsmanId));
      if (newBatsman) newBatsman.playingStatus = "ActiveBatsman";
      
      // Update bowler stats
      const bowler = match.nominationsT2.find(p => p.playingStatus === "ActiveBowler");
      if (bowler) {
        // bowler.wicketsTaken = (bowler.wicketsTaken || 0) + 1;
        bowler.ballsBowled.push(`W${runs}`); // Special notation for run out with runs
      }
    } else if (team === match.team2.toString().trim()) {
      match.scoreT2 += runs;
      match.T2wickets += 1;
      updateOutgoingBatsman(match.nominationsT2, outgoingBatsmanId);
      
      // Update new batsman
      const newBatsman = match.nominationsT2.find(p => p._id.equals(newBatsmanId));
      if (newBatsman) newBatsman.playingStatus = "ActiveBatsman";
      
      // Update bowler stats
      const bowler = match.nominationsT1.find(p => p.playingStatus === "ActiveBowler");
      if (bowler) {
        // bowler.wicketsTaken = (bowler.wicketsTaken || 0) + 1;
        bowler.ballsBowled.push(`W${runs}`); // Special notation for run out with runs
      }
    } else {
      return res.status(400).json({ success: false, message: "Invalid team." });
    }

    // Update innings data
    const runOutNotation = `W${runs}`;
    if (match.inning === 1) {
      match.runsInning1.push(runOutNotation);
      match.oversInning1 = updateOvers(match.oversInning1);
    } else if (match.inning === 2) {
      match.runsInning2.push(runOutNotation);
      match.oversInning2 = updateOvers(match.oversInning2);
    }

    await match.save();
    res.json({
      success: true,
      message: "Run out with runs recorded successfully!",
      match
    });
  } catch (error) {
    console.error("Error in handleRunOutWithRuns:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

router.post("/handleAllOutWithRuns", authenticateJWT, async (req, res) => {
  try {
    const { matchId, outgoingBatsmanId, runs, team ,matchyear} = req.body;
    const ScheduleModel = createScheduleModel(req.user.sportscategory);
    const sportCategory = req.user.sportscategory;

    if (!matchId || !outgoingBatsmanId || runs === undefined || !team || !ScheduleModel) {
      return res.status(400).json({ success: false, message: "Invalid data." });
    }

    const match = await ScheduleModel.findById(matchId);
    if (!match) {
      return res.status(404).json({ success: false, message: "Match not found." });
    }

    // Update outgoing batsman
    const updateOutgoingBatsman = (players, id) => {
      const player = players.find(p => p._id.equals(id));
      if (player) {
        player.runsScored = (player.runsScored || 0) + runs;
        player.ballsFaced.push(runs.toString());
        // player.playingStatus = "Out"; // Leaving this commented out for now
      }
    };

    // Update team score
    if (team === match.team1.toString().trim()) {
      match.scoreT1 += runs;
      match.T1wickets += 1;
      updateOutgoingBatsman(match.nominationsT1, outgoingBatsmanId);
      
      // Update bowler stats
      const bowler = match.nominationsT2.find(p => p.playingStatus === "ActiveBowler");
      if (bowler) {
        // bowler.wicketsTaken = (bowler.wicketsTaken || 0) + 1;
        bowler.ballsBowled.push(`W${runs}`);
      }
    } else if (team === match.team2.toString().trim()) {
      match.scoreT2 += runs;
      match.T2wickets += 1;
      updateOutgoingBatsman(match.nominationsT2, outgoingBatsmanId);
      
      // Update bowler stats
      const bowler = match.nominationsT1.find(p => p.playingStatus === "ActiveBowler");
      if (bowler) {
        // bowler.wicketsTaken = (bowler.wicketsTaken || 0) + 1;
        bowler.ballsBowled.push(`W${runs}`);
      }
    }

    // If all-out occurs in first innings, increment to inning 2
if (match.inning === 1) {
  match.inning += 1;
  console.log("First inning over! Inning incremented to:", match.inning);

  // Update playingStatus inside nominationsT1 and nominationsT2 for the first inning
  match.nominationsT1.forEach((player) => {
    if (
      player.playingStatus === "ActiveBatsman" ||
      player.playingStatus === "ActiveBowler" ||
      player.playingStatus === "Out"
    ) {
      player.playingStatus = "Playing";
    }
  });

  match.nominationsT2.forEach((player) => {
    if (
      player.playingStatus === "ActiveBatsman" ||
      player.playingStatus === "ActiveBowler" ||
      player.playingStatus === "Out"
    ) {
      player.playingStatus = "Playing";
    }
  });
} else if (match.inning === 2) {
  // If it's the second inning, don't increment inning value but update player statuses
  console.log("Inning 2 started. Updating player statuses.");

  match.nominationsT1.forEach((player) => {
    if (
      player.playingStatus === "ActiveBatsman" ||
      player.playingStatus === "ActiveBowler" ||
      player.playingStatus === "Out"
    ) {
      player.playingStatus = "Playing";
    }
  });

  match.nominationsT2.forEach((player) => {
    if (
      player.playingStatus === "ActiveBatsman" ||
      player.playingStatus === "ActiveBowler" ||
      player.playingStatus === "Out"
    ) {
      player.playingStatus = "Playing";
    }
  });
}


    // Update innings data
    const runOutNotation = `W${runs}`;
    if (match.inning === 1) {
      // match.runsInning1.push(runOutNotation);
      match.oversInning1 = updateOvers(match.oversInning1);
    } else if (match.inning === 2) {
      // match.runsInning2.push(runOutNotation);
      match.oversInning2 = updateOvers(match.oversInning2);
    }


    match.status = "recent";
    let winningTeam = null;

    if (match.scoreT1 > match.scoreT2) {
      match.result = match.team1;
      winningTeam = match.team1;
    } else if (match.scoreT2 > match.scoreT1) {
      match.result = match.team2;
      winningTeam = match.team2;
    } else {
      match.result = "Draw";
    }

    // Play-off Logic
    if (match.pool === "play-off" && winningTeam) {
      console.log(
        "Play-off match detected. Updating TBD entries with nominations...",
      );
      const winnerNominations = await PlayerNominationForm.findOne({
        department: winningTeam,
        sport: sportCategory,
        year: matchyear
      });

      const updateResult = await ScheduleModel.updateMany(
        {
          year: match.year,
          $or: [{ team1: "TBD" }, { team2: "TBD" }],
        },
        [
          {
            $set: {
              team1: {
                $cond: [{ $eq: ["$team1", "TBD"] }, winningTeam, "$team1"],
              },
              team2: {
                $cond: [{ $eq: ["$team2", "TBD"] }, winningTeam, "$team2"],
              },
              nominationsT1: {
                $cond: [
                  { $eq: ["$team1", "TBD"] },
                  winnerNominations?.nominations || [],
                  "$nominationsT1",
                ],
              },
              nominationsT2: {
                $cond: [
                  { $eq: ["$team2", "TBD"] },
                  winnerNominations?.nominations || [],
                  "$nominationsT2",
                ],
              },
            },
          },
        ],
      );
      console.log("TBD & Nominations Update Result:", updateResult);
    } else if (match.pool === "final" && sportCategory === "Cricket") {
      console.log(
        "Fetching nominated players from PlayerNominationForm for Cricket...",
      );

      // Fetch all nominated players for Cricket
      const allNominations = await PlayerNominationForm.find({
        sport: "Cricket",
        year: matchyear,
      }).select("nominations");

      console.log("Total nomination entries found:", allNominations.length);

      // Extract only required player details
      const allPlayers = allNominations.flatMap((team) =>
        team.nominations.map((player) => ({
          name: player.name,
          regNo: player.regNo,
          section: player.section,
          cnic: player.cnic,
        })),
      );

      console.log("Total Players Extracted:", allPlayers.length);

      const bulkOperations = allPlayers.map((player) => ({
        updateOne: {
          filter: { year: matchyear }, // Ensure we're updating only the doc for this year
          update: {
            $setOnInsert: { year: matchyear }, // Set year only if this is a new document
            $push: {
              nominations: {
                name: player.name,
                regNo: player.regNo,
                section: player.section,
                cnic: player.cnic,
                shirtNo: player.shirtNo || "", // Optional, if shirtNo exists
                totalrunsScored: 0,
                totalballsfaced: 0,
                totalwicketstaken: 0,
                totalrunsconceeded: 0,
              },
            },
          },
          upsert: true, // Create the doc if it doesn't exist
        },
      }));

      // Execute bulk update
      if (bulkOperations.length > 0) {
        await BestCricketer.bulkWrite(bulkOperations);
        console.log("All nominated players pushed to BestCricketer.");
      } else {
        console.log("No players to update.");
      }

      const ScheduleModel = createScheduleModel(sportCategory);
      const allMatches = await ScheduleModel.find({year: matchyear}).select(
        "nominationsT1 nominationsT2",
      );

      // Get all players in BestCricketer
      const bestCricketers = await BestCricketer.findOne({year:matchyear});
      if (!bestCricketers) {
        console.log("No best cricketers found, skipping update.");
        return;
      }

      for (const player of bestCricketers.nominations) {
        let totalRuns = 0;
        let totalWickets = 0;
        let totalBallsFaced = 0;
        let totalRunsConceded = 0;

        // Search player in nominationsT1 & nominationsT2
        for (const match of allMatches) {
          const foundInT1 = match.nominationsT1.filter(
            (p) => p.regNo === player.regNo,
          );
          const foundInT2 = match.nominationsT2.filter(
            (p) => p.regNo === player.regNo,
          );

          // Add runs scored from both teams
          foundInT1.forEach((p) => (totalRuns += p.runsScored));
          foundInT2.forEach((p) => (totalRuns += p.runsScored));

          // Add wickets taken from both teams
          foundInT1.forEach((p) => (totalWickets += p.wicketsTaken));
          foundInT2.forEach((p) => (totalWickets += p.wicketsTaken));

          // Calculate total balls faced (length of ballsFaced array)
          foundInT1.forEach(
            (p) => (totalBallsFaced += p.ballsFaced?.length || 0),
          );
          foundInT2.forEach(
            (p) => (totalBallsFaced += p.ballsFaced?.length || 0),
          );

          // Calculate total runs conceded (sum of ballsBowled array considering W=0, WD/NB=1, and numbers as they are)
          const processBallsBowled = (ballsArray) => {
            return ballsArray.reduce((sum, ball) => {
              if (ball === "W" || ball.endsWith("B")) return sum; // Ignore Wickets & values ending with "B"
              if (ball === "WD" || ball === "NB") return sum + 1; // Wides and No-Balls count as 1
              return sum + (parseInt(ball, 10) || 0); // Convert valid numbers and ignore NaN
            }, 0);
          };

          foundInT1.forEach(
            (p) =>
              (totalRunsConceded += processBallsBowled(p.ballsBowled || [])),
          );
          foundInT2.forEach(
            (p) =>
              (totalRunsConceded += processBallsBowled(p.ballsBowled || [])),
          );
        }

        // Update totalRunsScored, totalwicketstaken, totalballsfaced, and totalrunsconceeded in BestCricketer
        await BestCricketer.updateOne(
          { "nominations.regNo": player.regNo },
          {
            $set: {
              "nominations.$.totalrunsScored": totalRuns,
              "nominations.$.totalwicketstaken": totalWickets,
              "nominations.$.totalballsfaced": totalBallsFaced,
              "nominations.$.totalrunsconceeded": totalRunsConceded,
            },
          },
        );

        console.log(
          `Updated ${player.name} (RegNo: ${player.regNo}) -> Runs: ${totalRuns}, Wickets: ${totalWickets}, Balls Faced: ${totalBallsFaced}, Runs Conceded: ${totalRunsConceded}`,
        );
      }

      console.log("All players' stats updated in BestCricketer.");
    }

    await match.save();
    res.json({
      success: true,
      message: "All out with runs recorded successfully! and innings successfully ended",
      match
    });
  } catch (error) {
    console.error("Error in handleAllOutWithRuns:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});



module.exports = router;

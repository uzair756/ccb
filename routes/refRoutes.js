const mongoose = require("mongoose");
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
  RefUser,
  Schedules,
  createScheduleModel,
  PlayerNominationForm,
  Pools
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

// router.post('/create-semi-finals', authenticateJWT, async (req, res) => {
//   try {
//     const { sport, year } = req.body;
//     const user = req.user;

//     // 1. Get pools data
//     const pools = await Pools.findOne({ sport, year });
//     if (!pools) {
//       return res.status(404).json({ 
//         success: false, 
//         message: 'Pools not found. Create pools first.' 
//       });
//     }

//     // 2. Check if semi-finals already exist
//     const ScheduleModel = createScheduleModel(sport);
//     const existingSemis = await ScheduleModel.find({ 
//       sport, 
//       year, 
//       pool: 'semi' 
//     });
    
//     if (existingSemis.length >= 2) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Semi-finals already exist for this sport and year.' 
//       });
//     }

//     // 3. Handle TBD teams by checking play-off matches
//     const replaceTBD = async (team) => {
//       if (team !== 'TBD') return team;
      
//       const playoffMatch = await ScheduleModel.findOne({
//         sport,
//         year,
//         pool: 'play-off',
//         status: 'recent'
//       });
      
//       if (!playoffMatch || !playoffMatch.result) {
//         throw new Error('Cannot resolve TBD team - play-off match not completed');
//       }
      
//       return playoffMatch.result;
//     };

//     // Create resolved pools with TBD replaced
//     const resolvedPoolA = await Promise.all(pools.poolA.map(replaceTBD));
//     const resolvedPoolB = await Promise.all(pools.poolB.map(replaceTBD));

//     // 4. Calculate team rankings based on match results
//     const allMatches = await ScheduleModel.find({ 
//       sport, 
//       year,
//       status: 'recent' // Only completed matches
//     });

//     // Function to calculate team wins
//     const calculateTeamStats = (team) => {
//       let wins = 0;
//       allMatches.forEach(match => {
//         if (match.result === team) wins++;
//       });
//       return { team, wins };
//     };

//     // Calculate rankings for Pool A
//     const poolARankings = resolvedPoolA.map(calculateTeamStats)
//       .sort((a, b) => b.wins - a.wins)
//       .map(item => item.team);

//     // Calculate rankings for Pool B
//     const poolBRankings = resolvedPoolB.map(calculateTeamStats)
//       .sort((a, b) => b.wins - a.wins)
//       .map(item => item.team);

//     // 5. Get nominations for all teams
//     const teamNominations = await PlayerNominationForm.find({
//       sport,
//       year,
//       department: { $in: [...poolARankings, ...poolBRankings] }
//     });

//     // Create a map of team to nominations for quick lookup
//     const nominationsMap = {};
//     teamNominations.forEach(doc => {
//       nominationsMap[doc.department] = doc.nominations;
//     });

//     // 6. Create semi-final matches with nominations
//     const semiFinal1 = {
//       team1: poolARankings[0], // 1st Pool A
//       team2: poolBRankings[1], // 2nd Pool B
//       pool: 'semi',
//       year,
//       sport,
//       status: 'upcoming',
//       isKnockout: true,
//       nominationsT1: nominationsMap[poolARankings[0]] || [],
//       nominationsT2: nominationsMap[poolBRankings[1]] || []
//     };

//     const semiFinal2 = {
//       team1: poolBRankings[0], // 1st Pool B
//       team2: poolARankings[1], // 2nd Pool A
//       pool: 'semi',
//       year,
//       sport,
//       status: 'upcoming',
//       isKnockout: true,
//       nominationsT1: nominationsMap[poolBRankings[0]] || [],
//       nominationsT2: nominationsMap[poolARankings[1]] || []
//     };

//     await ScheduleModel.insertMany([semiFinal1, semiFinal2]);

//     res.json({
//       success: true,
//       message: 'Semi-finals created successfully with nominations!',
//       data: {
//         semiFinal1,
//         semiFinal2,
//         canCreateFinal: true
//       }
//     });

//   } catch (error) {
//     console.error('Error creating semi-finals:', error);
//     res.status(500).json({ 
//       success: false, 
//       message: error.message || 'Error creating semi-finals' 
//     });
//   }
// });

router.post('/create-semi-finals', authenticateJWT, async (req, res) => {
  try {
    const { sport, year } = req.body;
    const user = req.user;

    console.log(`\n=== Creating semi-finals for ${sport} ${year} ===`);

    // 1. Get pools data
    const pools = await Pools.findOne({ sport, year });
    if (!pools) {
      console.log('Pools not found. Create pools first.');
      return res.status(404).json({ 
        success: false, 
        message: 'Pools not found. Create pools first.' 
      });
    }

    // 2. Check if semi-finals already exist
    const ScheduleModel = createScheduleModel(sport);
    const existingSemis = await ScheduleModel.find({ 
      sport, 
      year, 
      pool: 'semi' 
    });
    
    if (existingSemis.length >= 2) {
      console.log('Semi-finals already exist for this sport and year.');
      return res.status(400).json({ 
        success: false, 
        message: 'Semi-finals already exist for this sport and year.' 
      });
    }

    // 3. Handle TBD teams
    const replaceTBD = async (team) => {
      if (team !== 'TBD') return team;
      const playoffMatch = await ScheduleModel.findOne({
        sport, year, pool: 'play-off', status: 'recent'
      });
      if (!playoffMatch || !playoffMatch.result) {
        throw new Error('Cannot resolve TBD team - play-off match not completed');
      }
      return playoffMatch.result;
    };

    // Create resolved pools
    const resolvedPoolA = await Promise.all(pools.poolA.map(replaceTBD));
    const resolvedPoolB = await Promise.all(pools.poolB.map(replaceTBD));
    console.log('Resolved Pools:');
    console.log(`- Pool A: ${resolvedPoolA.join(', ')}`);
    console.log(`- Pool B: ${resolvedPoolB.join(', ')}`);

    // 4. Calculate team rankings with tie-breaking
    const allMatches = await ScheduleModel.find({ sport, year, status: 'recent' });

    const calculateTeamStats = async (team) => {
      const teamMatches = allMatches.filter(m => m.team1 === team || m.team2 === team);
      let stats = { 
        team, wins: 0, 
        pointsFor: 0, pointsAgainst: 0,
        gamesWon: 0, gamesLost: 0,
        headToHead: { wins: 0, matches: 0 }
      };

      teamMatches.forEach(match => {
        const isTeam1 = match.team1 === team;
        const opponent = isTeam1 ? match.team2 : match.team1;

        if (match.result === team) stats.wins++;

        if (sport.includes('Badminton') || sport.includes('Tennis')) {
          const teamGames = isTeam1 ? match.scoreT1 : match.scoreT2;
          const oppGames = isTeam1 ? match.scoreT2 : match.scoreT1;
          stats.gamesWon += teamGames.reduce((a, b) => a + b, 0);
          stats.gamesLost += oppGames.reduce((a, b) => a + b, 0);
        } else {
          stats.pointsFor += isTeam1 ? match.scoreT1 : match.scoreT2;
          stats.pointsAgainst += isTeam1 ? match.scoreT2 : match.scoreT1;
        }

        if ([...resolvedPoolA, ...resolvedPoolB].includes(opponent)) {
          stats.headToHead.matches++;
          if (match.result === team) stats.headToHead.wins++;
        }
      });

      return stats;
    };

    const rankTeams = async (teams, poolName) => {
      console.log(`\nCalculating rankings for ${poolName}:`);
      const teamStats = await Promise.all(teams.map(calculateTeamStats));
      
      // Log initial stats
      teamStats.forEach(s => {
        console.log(
          `- ${s.team}: ${s.wins} wins | ` +
          `${sport.includes('Badminton') ? `${s.gamesWon}-${s.gamesLost} games` : `${s.pointsFor}-${s.pointsAgainst} points`} | ` +
          `H2H: ${s.headToHead.wins}/${s.headToHead.matches}`
        );
      });

      const rankedTeams = teamStats.sort((a, b) => {
        // 1. Wins
        if (b.wins !== a.wins) {
          console.log(`\t${b.team} > ${a.team} (more wins: ${b.wins} vs ${a.wins})`);
          return b.wins - a.wins;
        }

        // 2. Head-to-head
        if (a.headToHead.matches > 0 && b.headToHead.matches > 0) {
          const aRatio = a.headToHead.wins / a.headToHead.matches;
          const bRatio = b.headToHead.wins / b.headToHead.matches;
          if (aRatio !== bRatio) {
            console.log(`\t${bRatio > aRatio ? b.team : a.team} > ${bRatio > aRatio ? a.team : b.team} (better H2H)`);
            return bRatio - aRatio;
          }
        }

        // 3. Game/Point Difference
        let diffA, diffB, metric;
        if (sport.includes('Badminton') || sport.includes('Tennis')) {
          diffA = a.gamesWon - a.gamesLost;
          diffB = b.gamesWon - b.gamesLost;
          metric = "game difference";
        } else {
          diffA = a.pointsFor - a.pointsAgainst;
          diffB = b.pointsFor - b.pointsAgainst;
          metric = "point difference";
        }

        if (diffB !== diffA) {
          console.log(`\t${b.team} > ${a.team} (better ${metric}: ${diffB} vs ${diffA})`);
          return diffB - diffA;
        }

        // 4. Total Games/Points
        const totalA = sport.includes('Badminton') ? a.gamesWon : a.pointsFor;
        const totalB = sport.includes('Badminton') ? b.gamesWon : b.pointsFor;
        if (totalB !== totalA) {
          console.log(`\t${b.team} > ${a.team} (more ${sport.includes('Badminton') ? 'games' : 'points'})`);
          return totalB - totalA;
        }

        // 5. Random draw
        console.log(`\tRandom draw between ${a.team} and ${b.team}`);
        return Math.random() - 0.5;
      }).map(stat => stat.team);

      console.log(`Final ${poolName} ranking: ${rankedTeams.join(' > ')}`);
      return rankedTeams;
    };

    // Calculate final rankings
    const poolARankings = await rankTeams(resolvedPoolA, "Pool A");
    const poolBRankings = await rankTeams(resolvedPoolB, "Pool B");

    // 5. Create semi-finals
    const teamNominations = await PlayerNominationForm.find({
      sport, year,
      department: { $in: [...poolARankings, ...poolBRankings] }
    });

    const nominationsMap = {};
    teamNominations.forEach(doc => {
      nominationsMap[doc.department] = doc.nominations;
    });

    const semiFinal1 = {
      team1: poolARankings[0],
      team2: poolBRankings[1],
      pool: 'semi',
      year,
      sport,
      status: 'upcoming',
      isKnockout: true,
      nominationsT1: nominationsMap[poolARankings[0]] || [],
      nominationsT2: nominationsMap[poolBRankings[1]] || []
    };

    const semiFinal2 = {
      team1: poolBRankings[0],
      team2: poolARankings[1],
      pool: 'semi',
      year,
      sport,
      status: 'upcoming',
      isKnockout: true,
      nominationsT1: nominationsMap[poolBRankings[0]] || [],
      nominationsT2: nominationsMap[poolARankings[1]] || []
    };

    await ScheduleModel.insertMany([semiFinal1, semiFinal2]);

    console.log('\nCreated semi-finals:');
    console.log(`- SF1: ${semiFinal1.team1} vs ${semiFinal1.team2}`);
    console.log(`- SF2: ${semiFinal2.team1} vs ${semiFinal2.team2}`);
    console.log('====================================');

    res.json({
      success: true,
      message: 'Semi-finals created successfully!',
      data: {
        semiFinal1,
        semiFinal2,
        tieBreakersUsed: poolARankings.length !== new Set(poolARankings).size || 
                        poolBRankings.length !== new Set(poolBRankings).size
      }
    });

  } catch (error) {
    console.error('\nERROR creating semi-finals:', error.message);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error creating semi-finals' 
    });
  }
});

// Updated create-final route with nominations
router.post('/create-final', authenticateJWT, async (req, res) => {
  try {
    const { sport, year } = req.body;
    const user = req.user;

    // 1. Check if final already exists
    const ScheduleModel = createScheduleModel(sport);
    const existingFinal = await ScheduleModel.findOne({ 
      sport, 
      year, 
      pool: 'final' 
    });
    
    if (existingFinal) {
      return res.status(400).json({ 
        success: false, 
        message: 'Final already exists for this sport and year.' 
      });
    }

    // 2. Get semi-final results
    const semiFinals = await ScheduleModel.find({ 
      sport, 
      year, 
      pool: 'semi',
      status: 'recent' // Only completed matches
    });

    if (semiFinals.length < 2) {
      return res.status(400).json({ 
        success: false, 
        message: 'Both semi-finals must be completed first.' 
      });
    }

    // 3. Determine finalists
    const finalists = semiFinals.map(match => match.result);

    if (finalists.length !== 2 || !finalists[0] || !finalists[1]) {
      return res.status(400).json({ 
        success: false, 
        message: 'Could not determine finalists from semi-final results.' 
      });
    }

    // 4. Get nominations for finalists
    const teamNominations = await PlayerNominationForm.find({
      sport,
      year,
      department: { $in: finalists }
    });

    // Create a map of team to nominations
    const nominationsMap = {};
    teamNominations.forEach(doc => {
      nominationsMap[doc.department] = doc.nominations;
    });

    // 5. Create final match with nominations
    const finalMatch = {
      team1: finalists[0],
      team2: finalists[1],
      pool: 'final',
      year,
      sport,
      status: 'upcoming',
      isKnockout: true,
      nominationsT1: nominationsMap[finalists[0]] || [],
      nominationsT2: nominationsMap[finalists[1]] || []
    };

    await ScheduleModel.create(finalMatch);

    res.json({
      success: true,
      message: 'Final match created successfully with nominations!',
      data: finalMatch
    });

  } catch (error) {
    console.error('Error creating final:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating final match' 
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

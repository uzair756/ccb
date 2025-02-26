const express = require('express');
const { AdminPost, Schedules, SportsRules, createScheduleModel } = require('../models');
const router = express.Router();

// Get all posts (no authentication required)
router.get('/getadminposts', async (req, res) => {
  try {
    const posts = await AdminPost.find().sort({ postedAt: -1 }); // Sort by date, descending
    res.json({ success: true, posts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch posts' });
  }
});

// Fetch rules for a specific sport
router.get('/getruless/:sport', async (req, res) => {
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
// Get upcoming matches from the schedules collection
// router.get('/upcomingmatches', async (req, res) => {
//   try {
//     const upcomingMatches = await Schedules.find({ status: 'upcoming' }).sort({ createdAt: 1 }); // Sort by creation date
//     res.json({ success: true, matches: upcomingMatches });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: 'Failed to fetch upcoming matches' });
//   }
// });


router.get('/upcomingmatches', async (req, res) => {
  const { sportCategory } = req.query; // Get the sport category from the query params

  if (!sportCategory) {
    return res.status(400).json({ success: false, message: 'Sport category is required' });
  }

  try {
    const ScheduleModel = createScheduleModel(sportCategory); // Dynamically get the correct model
    const upcomingMatches = await ScheduleModel.find({ status: 'upcoming' }).sort({ createdAt: 1 });

    res.json({ success: true, matches: upcomingMatches });
  } catch (error) {
    console.error('Error fetching upcoming matches:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch upcoming matches' });
  }
});


// router.get('/recentmatches', async (req, res) => {
//   try {
//     const upcomingMatches = await Schedules.find({ status: 'recent' }).sort({ createdAt: 1 }); // Sort by creation date
//     res.json({ success: true, matches: upcomingMatches });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: 'Failed to fetch recent matches' });
//   }
// });
router.get('/recentmatches', async (req, res) => {
  const { sportCategory } = req.query; // Get the sport category from the query params

  if (!sportCategory) {
    return res.status(400).json({ success: false, message: 'Sport category is required' });
  }

  try {
    const ScheduleModel = createScheduleModel(sportCategory); // Dynamically get the correct model
    const recentMatches = await ScheduleModel.find({ status: 'recent' }).sort({ createdAt: 1 });

    res.json({ success: true, matches: recentMatches });
  } catch (error) {
    console.error('Error fetching upcoming matches:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch upcoming matches' });
  }
});

// router.get('/livematches', async (req, res) => {
//   try {
//     const upcomingMatches = await Schedules.find({ status: 'live' }).sort({ createdAt: 1 }); // Sort by creation date
//     res.json({ success: true, matches: upcomingMatches });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: 'Failed to fetch live matches' });
//   }
// });
router.get('/livematches', async (req, res) => {
  const { sportCategory } = req.query; // Get the sport category from the query params

  if (!sportCategory) {
    return res.status(400).json({ success: false, message: 'Sport category is required' });
  }

  try {
    const ScheduleModel = createScheduleModel(sportCategory); // Dynamically get the correct model
    const liveMatches = await ScheduleModel.find({ status: 'live' }).sort({ createdAt: 1 });

    res.json({ success: true, matches: liveMatches });
  } catch (error) {
    console.error('Error fetching upcoming matches:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch upcoming matches' });
  }
});
module.exports = router;

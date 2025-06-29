const express = require('express');
const { AdminPost, Schedules, SportsRules, createScheduleModel } = require('../models');
const router = express.Router();

// Get all posts (no authentication required)
router.get('/getadminposts', async (req, res) => {
  try {
    const posts = await AdminPost.find().sort({ postedAt: -1 });
    
    // Return posts without modifying image data
    res.json({ 
      success: true, 
      posts: posts.map(post => ({
        ...post._doc,
        // Don't include binary data in the initial response
        adminimagepost: post.adminimagepost ? true : false
      }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch posts' });
  }
});

// Get image for a specific post
router.get('/adminpost/image/:id', async (req, res) => {
  try {
    const post = await AdminPost.findById(req.params.id);
    
    if (!post || !post.adminimagepost || !post.adminimagepost.data) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.set('Content-Type', post.adminimagepost.contentType);
    res.send(post.adminimagepost.data);
  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({ error: 'Error fetching image' });
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

// Get final match result for a sport and year
router.get('/finalwinner', async (req, res) => {
  const { sportCategory, year } = req.query;

  if (!sportCategory || !year) {
    return res.status(400).json({ success: false, message: 'Sport category and year are required' });
  }

  try {
    const ScheduleModel = createScheduleModel(sportCategory);
    const finalMatch = await ScheduleModel.findOne({ pool: 'final', year });

    if (finalMatch && finalMatch.result) {
      return res.json({ success: true, winner: finalMatch.result });
    } else {
      return res.json({ success: true, winner: null });
    }
  } catch (error) {
    console.error('Error fetching final match:', error);
    res.status(500).json({ success: false, message: 'Error fetching final match' });
  }
});



// router.get('/livematches', async (req, res) => {
//   const { sportCategory } = req.query; // Get the sport category from the query params

//   if (!sportCategory) {
//     return res.status(400).json({ success: false, message: 'Sport category is required' });
//   }

//   try {
//     const ScheduleModel = createScheduleModel(sportCategory); // Dynamically get the correct model
//     const liveMatches = await ScheduleModel.find({ status: 'live' }).sort({ createdAt: 1 });

//     res.json({ success: true, matches: liveMatches });
//   } catch (error) {
//     console.error('Error fetching upcoming matches:', error);
//     res.status(500).json({ success: false, message: 'Failed to fetch upcoming matches' });
//   }
// });
module.exports = router;

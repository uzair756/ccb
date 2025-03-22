const express = require('express');
const { createScheduleModel } = require('../models');
const router = express.Router();

router.get('/livematches', async (req, res) => {
  const { sportCategory } = req.query;

  if (!sportCategory) {
    return res.status(400).json({ success: false, message: 'Sport category is required' });
  }

  try {
    const ScheduleModel = createScheduleModel(sportCategory);
    const liveMatches = await ScheduleModel.find({ status: 'live' }).sort({ createdAt: 1 });

    res.json({ success: true, matches: liveMatches });
  } catch (error) {
    console.error('Error fetching live matches:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch live matches' });
  }
});

// WebSocket event for match updates
router.post('/update-match', async (req, res) => {
  console.log("Update Match Called");
  const { sportCategory, matchId, updateData } = req.body;

  if (!sportCategory || !matchId || !updateData) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    const ScheduleModel = createScheduleModel(sportCategory);
    const updatedMatch = await ScheduleModel.findByIdAndUpdate(matchId, updateData, { new: true });

    if (updatedMatch) {
      const io = req.app.get('io'); // Get socket instance
      io.emit('matchUpdated', { sportCategory, match: updatedMatch }); // Broadcast to clients
      return res.json({ success: true, match: updatedMatch });
    } else {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }
  } catch (error) {
    console.error('Error updating match:', error);
    return res.status(500).json({ success: false, message: 'Failed to update match' });
  }
});

module.exports = router;

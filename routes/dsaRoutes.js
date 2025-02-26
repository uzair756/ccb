// routes/dsaRoutes.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { DSAUser,AdminPost } = require('../models');
const authenticateJWT = require('../middleware');
const config = require('../config');

const router = express.Router();

// // DSA signup route
// router.post('/dsasignup', async (req, res) => {
//   try {
//     const existingUser = await DSAUser.findOne({ email: req.body.email });
//     if (existingUser) return res.status(400).json({ error: 'Email already exists' });

//     const hashedPassword = await bcrypt.hash(req.body.password, 10);
//     const user = new DSAUser({ ...req.body, password: hashedPassword });
//     const result = await user.save();
//     res.status(201).send(result);
//   } catch (error) {
//     res.status(500).json({ error: 'Error creating account' });
//   }
// });

// DSA login route
router.post('/dsalogin', async (req, res) => {
  const { email, password } = req.body;
  const user = await DSAUser.findOne({ email });
  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ id: user._id, username: user.username, email: user.email, loggedin: user.loggedin }, config.JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, message: 'Logged in successfully', token });
  } else {
    res.json({ success: false, message: 'Invalid credentials' });
  }
});

// DSA landing page route
router.get('/dsalandingpage', authenticateJWT, async (req, res) => {
  try {
    const posts = await AdminPost.find({ adminpostuserId: req.user.id }); // Fetch posts created by the logged-in user
    res.json({ success: true, user: req.user, posts });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ error: 'Error fetching user posts' });
  }
});






router.post('/adminpost', authenticateJWT, async (req, res) => {
  const { adminpostdescription, adminimagepost } = req.body; // Receive post data
  const { username, email, id } = req.user; // Get user info from JWT
  
  try {
    const newPost = new AdminPost({
      adminpostdescription,
      adminimagepost,
      adminpostuserId:id,
      adminpostusername: username,
      adminpostemail: email,
    });

    const savedPost = await newPost.save();
    res.status(201).json({ success: true, message: 'Post created successfully', post: savedPost });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Error creating post' });
  }
});





router.put('/adminpost/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { adminpostdescription, adminimagepost } = req.body;

  try {
    const updatedPost = await AdminPost.findOneAndUpdate(
      { _id: id, adminpostuserId: req.user.id }, // Ensure the user can only update their own posts
      { adminpostdescription, adminimagepost },
      { new: true } // Return the updated document
    );

    if (!updatedPost) {
      return res.status(404).json({ error: 'Post not found or unauthorized' });
    }

    res.json({ success: true, message: 'Post updated successfully', updatedPost });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Error updating post' });
  }
});




router.post('/changepasswordadmin', authenticateJWT, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    const user = await DSAUser.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Error changing password' });
  }
});







module.exports = router;

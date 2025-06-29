// routes/dsaRoutes.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { DSAUser,AdminPost } = require('../models');
const authenticateJWT = require('../middleware');
const config = require('../config');
const upload = require('./multerConfig');

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






// router.post('/adminpost', authenticateJWT, async (req, res) => {
//   const { adminpostdescription, adminimagepost } = req.body; // Receive post data
//   const { username, email, id } = req.user; // Get user info from JWT
  
//   try {
//     const newPost = new AdminPost({
//       adminpostdescription,
//       adminimagepost,
//       adminpostuserId:id,
//       adminpostusername: username,
//       adminpostemail: email,
//     });

//     const savedPost = await newPost.save();
//     res.status(201).json({ success: true, message: 'Post created successfully', post: savedPost });
//   } catch (error) {
//     console.error('Error creating post:', error);
//     res.status(500).json({ error: 'Error creating post' });
//   }
// });

// Create admin post with image upload
router.post('/adminpost', authenticateJWT, upload.single('adminimagepost'), async (req, res) => {
  const { adminpostdescription } = req.body;
  const { username, email, id } = req.user;

  try {
    const newPost = new AdminPost({
      adminpostdescription,
      adminimagepost: req.file ? {
        data: req.file.buffer,
        contentType: req.file.mimetype
      } : null,
      adminpostuserId: id,
      adminpostusername: username,
      adminpostemail: email,
    });

    const savedPost = await newPost.save();
    res.status(201).json({ 
      success: true, 
      message: 'Post created successfully', 
      post: savedPost 
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Error creating post' });
  }
});

// Get image for a post
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



// Update admin post with image handling
router.put('/adminpost/:id', authenticateJWT, upload.single('adminimagepost'), async (req, res) => {
  try {
    const { adminpostdescription, removeImage } = req.body;
    const updateData = { adminpostdescription };

    if (req.file) {
      updateData.adminimagepost = {
        data: req.file.buffer,
        contentType: req.file.mimetype
      };
    } else if (removeImage === 'true') {
      updateData.adminimagepost = null;
    }

    const updatedPost = await AdminPost.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ 
      success: true, 
      message: 'Post updated successfully', 
      updatedPost 
    });
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

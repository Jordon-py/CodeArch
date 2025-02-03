// controllers/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/user.js');

// Sign Up page
router.get('/sign-up', (req, res) => {
  res.render('auth/sign-up');
});

// Sign In page
router.get('/sign-in', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('auth/sign-in');
});

// Sign Out route
router.get('/sign-out', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Handle Sign Up form submission
router.post('/sign-up', async (req, res) => {
  try {
    // Check if the username is already taken
    const userInDatabase = await User.findOne({ username: req.body.username });
    if (userInDatabase) {
      return res.send('Username already taken.');
    }

    // Check if password and confirm password match
    if (req.body.password !== req.body.confirmPassword) {
      return res.send('Password and Confirm Password must match.');
    }

    // Hash the password before saving to the database
    const hashedPassword = bcrypt.hashSync(req.body.password, 10);
    req.body.password = hashedPassword;

    // Create the new user
    const newUser = await User.create(req.body);

    // Automatically log in the new user and redirect to dashboard
    req.session.user = {
      username: newUser.username,
      _id: newUser._id,
      name: newUser.name // assuming your user model includes a 'name'
    };
    res.redirect('/dashboard');
  } catch (error) {
    console.log(error);
    res.redirect('/');
  }
});

// Handle Sign In form submission
router.post('/sign-in', async (req, res) => {
  try {
    // Get the user from the database
    const userInDatabase = await User.findOne({ username: req.body.username });
    if (!userInDatabase) {
      return res.send('Login failed. Please try again.');
    }

    // Validate the password
    const validPassword = bcrypt.compareSync(req.body.password, userInDatabase.password);
    if (!validPassword) {
      return res.send('Login failed. Please try again.');
    }

    // Set the user in the session (without the password)
    req.session.user = {
      username: userInDatabase.username,
      _id: userInDatabase._id,
      name: userInDatabase.name // assuming userInDatabase has a 'name' property
    };

    // Redirect to the dashboard after successful login
    res.redirect('/dashboard');
  } catch (error) {
    console.log(error);
    res.redirect('/');
  }
});

module.exports = router;

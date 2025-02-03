// server.js
const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const session = require('express-session');
const authController = require('./controllers/auth.js');
const port = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.on('connected', () => {
  console.log(`Connected to MongoDB ${mongoose.connection.name}.`);
});

// Serve static files from the public folder
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));

// Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

// Set the view engine
app.set('view engine', 'ejs');

// Landing page route (home.ejs)
app.get('/', (req, res) => {
  res.render('home', { user: req.session.user });
});

// Middleware to check authentication
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/auth/sign-in');
}

// Protected routes: dashboard and snippets
app.use('/dashboard', isAuthenticated);
app.use('/snippets', isAuthenticated);

// Dashboard route (first page after login)
app.get('/dashboard', (req, res) => {
  res.render('dashboard', { user: req.session.user, snippets: [] });
});

// VIP Lounge example route
app.get('/vip-lounge', (req, res) => {
  if (req.session.user) {
    res.send(`Welcome to the party ${req.session.user.username}.`);
  } else {
    res.send('Sorry, no guests allowed.');
  }
});

// Use the auth controller for all auth-related routes
app.use('/auth', authController);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

app.listen(port, () => {
  console.log(`The express app is ready on port ${port}!`);
});

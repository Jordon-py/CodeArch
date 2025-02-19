// server.js (Iteration 2)
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const app = express();
const methodOverride = require('method-override');
const session = require('express-session');
const authController = require('./controllers/auth.js');
const Snippet = require('./models/snippets'); // Import the snippet model
const port = process.env.PORT || 3000;

const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not defined in environment variables.");
  process.exit(1);
}

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB via Mongoose"))
  .catch(err => {
    console.error("Failed to connect to MongoDB via Mongoose", err);
    process.exit(1);
  });

// Serve static files from the public folder
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
app.set('view engine', 'ejs');

// Landing page route
app.get('/', (req, res) => {
  res.render('landing', { user: req.session.user });
});

<<<<<<< HEAD
// Authentication middleware to protect routes
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/auth/sign-in');
}
=======
>>>>>>> bb76a4cd9c67786ae8675a72a16e478d26b602d6

app.use('/dashboard', isAuthenticated);
app.use('/snippets', isAuthenticated);

// Dashboard route – pass activeSection explicitly for navigation highlighting
app.get('/dashboard', (req, res, next) => {
  Snippet.find({})
    .then((snippets) => {
      res.render('dashboard', { 
        user: req.session.user, 
        snippets, 
        activeSection: 'dashboard' 
      });
    })
    .catch(next);
});

// Middleware to check authentication
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/auth/sign-in');
}


// VIP Lounge example route
app.get('/vip-lounge', (req, res) => {
  if (req.session.user) {
    res.send(`Welcome to the party ${req.session.user.username}.`);
  } else {
    res.send('Sorry, no guests allowed.');
  }
});

// POST route to save a snippet
app.post('/snippets', (req, res, next) => {
  const { title, language, code } = req.body;
  Snippet.create({ title, language, code })
    .then(() => res.redirect('/dashboard'))
    .catch(next);
});

// DELETE route to remove a snippet by its ID
app.delete('/snippets/:id', (req, res, next) => {
  Snippet.findByIdAndDelete(req.params.id)
    .then(() => res.redirect('/dashboard'))
    .catch(next);
});

// Auth routes
app.use('/auth', authController);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

app.listen(port, () => {
  console.log(`The express app is ready on port ${port}!`);
});

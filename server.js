// server.js
const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const session = require('express-session');
const authController = require('./controllers/auth.js');
const Snippet = require('./models/snippets'); // Import the snippet model
const port = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('MongoDB connection error:', err));

  
// Serve static files from the public folder
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method')); // Enables PUT, DELETE via query parameter

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://cjordon:Myhero143r@codearch.k8c6m.mongodb.net/?retryWrites=true&w=majority&appName=CodeArch";
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


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

// Dashboard route – Retrieve snippets from the database
app.get('/dashboard', (req, res, next) => {
  Snippet.find({})
    .then((snippets) => {
      res.render('dashboard', { user: req.session.user, snippets });
    })
    .catch(next);
});

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

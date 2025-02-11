// models/snippets.js
const mongoose = require('mongoose');


const snippetSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  language: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true  // Set to true if all snippets must belong to a user
  }
}, { timestamps: true, updatedAt: true, createdAt: true });

const Snippet = mongoose.model('Snippet', snippetSchema);
module.exports = Snippet;

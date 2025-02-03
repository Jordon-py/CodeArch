const mongoose = require('mongoose')

const snippetSchema = mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    code: {
        type: String || Int16Array,
        required: true,
    },
})


const snippet = mongoose.model('userSnippet', snippetSchema);
model.exports = snippet;
model.exports = snippetSchema
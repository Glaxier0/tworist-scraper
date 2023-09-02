const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const searchSchema = new Schema({
    searchQuery: String,
});

const Search = mongoose.model('Search', searchSchema)

module.exports = Search
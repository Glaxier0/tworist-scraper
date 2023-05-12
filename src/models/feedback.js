const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const feedbackSchema = new Schema({
    firstName: String,
    lastName: String,
    email: String,
    message: String
});

const Feedback = mongoose.model('Feedback', feedbackSchema)

module.exports = Feedback
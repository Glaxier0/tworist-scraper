const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const hotelSchema = new Schema({
    title: String,
    address: String,
    price: String,
    starCount: String,
    reviewScore: String,
    reviewCount: String,
    hotelUrl: String,
    imageUrl: String,
    searchId: String
});

const Hotel = mongoose.model('Hotel', hotelSchema)

module.exports = Hotel
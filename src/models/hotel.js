const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const hotelSchema = new Schema({
    title: String,
    address: String,
    price: String,
    starCount: String,
    reviewScore: String,
    reviewCount: String,
    hotelUrl: String,
    imageUrl: String,
    userCheckIn: String,
    userCheckOut: String,
    adultCount: String,
    childrenCount: String,
    roomCount: String,
    website: String,
    searchId: String
});

const Hotel = mongoose.model('Hotel', hotelSchema)

module.exports = Hotel
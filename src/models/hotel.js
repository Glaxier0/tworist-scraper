const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const hotelSchema = new Schema({
    Id: ObjectId,
    address: String,
    title: String,
    price: String,
    starCount: String,
    reviewScore: String,
    reviewCount: String,
    hotelUrl: String,
    imageUrl: String
});

const Hotel = mongoose.model('Hotel', hotelSchema)

module.exports = Hotel
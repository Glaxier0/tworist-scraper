const mongoose = require('mongoose');

const Schema = mongoose.Schema;
// const ObjectId = Schema.ObjectId;

const hotelDetailsSchema = new Schema({
    hotelId: String,
    url: String,
    lat: String,
    long: String,
    images: [Object],
    summary: String,
    closeLocations: [Object],
    popularFacilities: [Object],
    facilities: [Object],
    policies: [Object]
});

const HotelDetails = mongoose.model('HotelDetails', hotelDetailsSchema)

module.exports = HotelDetails
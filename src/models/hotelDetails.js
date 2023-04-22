const mongoose = require('mongoose');

const Schema = mongoose.Schema;
// const ObjectId = Schema.ObjectId;

const hotelDetailsSchema = new Schema({
    address: String,
    title: String,
    hotelId: String,
    url: String,
    lat: String,
    long: String,
    closeLocations: [Object],
    summary: String,
    popularFacilities: [Object],
    facilities: [Object],
    policies: [Object]
});

const HotelDetails = mongoose.model('HotelDetails', hotelDetailsSchema)

module.exports = HotelDetails
const mongoose = require('mongoose');

const Schema = mongoose.Schema;
// const ObjectId = Schema.ObjectId;

const hotelDetailsSchema = new Schema({
    hotelId: String,
    url: String,
    closeLocations: [Object],
    summary: String,
    popularFacilities: [Object],
    facilities: [Object],
    policies: [Object]
});

const HotelDetails = mongoose.model('HotelDetails', hotelDetailsSchema)

module.exports = HotelDetails
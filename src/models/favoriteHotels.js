const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const favoriteHotelsSchema = new Schema({
    userId: String,
    favoriteHotels: [Object]
});

const FavoriteHotels = mongoose.model('FavoriteHotels', favoriteHotelsSchema)

module.exports = FavoriteHotels
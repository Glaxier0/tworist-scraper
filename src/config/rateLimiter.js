const rateLimit = require('express-rate-limit');
const Search = require("../models/search");
const HotelDetails = require("../models/hotelDetails");

const apiLimiter45 = rateLimit({
    windowMs: 45 * 1000, // 45 seconds
    max: 1, // limit each IP to 1 requests per windowMs
    message: 'Too many requests created from this IP, please try again after 45 seconds'
});

const apiLimiter10 = rateLimit({
    windowMs: 10 * 1000, // 10 seconds
    max: 1, // limit each IP to 1 requests per windowMs
    message: 'Too many requests created from this IP, please try again after 10 seconds'
});

async function checkHotelsAndRateLimit(req, res, next) {
    const {
        search,
        checkInYear,
        checkInMonth,
        checkInDay,
        checkOutYear,
        checkOutMonth,
        checkOutDay,
        adultCount,
        childCount,
        roomCount
    } = req.body;

    const paddedCheckInDay = checkInDay.toString().padStart(2, '0');
    const paddedCheckInMonth = checkInMonth.toString().padStart(2, '0')
    const paddedCheckOutDay = checkOutDay.toString().padStart(2, '0');
    const paddedCheckOutMonth = checkOutMonth.toString().padStart(2, '0');

    const searchModel = new Search({
        searchQuery: (search + "&" + checkInYear + "&" + paddedCheckInMonth + "&" + paddedCheckInDay + "&" +
            checkOutYear + "&" + paddedCheckOutMonth + "&" + paddedCheckOutDay + "&" + adultCount + "&" +
            childCount + "&" + roomCount).toLocaleLowerCase().trim()
    });

    const searchDB = await Search.findOne({'searchQuery': searchModel["searchQuery"]});

    if (!searchDB) {
        return apiLimiter45(req, res, next);
    }

    next();
}

async function checkHotelDetailsAndRateLimit(req, res, next) {
    let hotelDetails = await HotelDetails.findOne({'hotelId': req.params.id});

    if (!hotelDetails) {
        return apiLimiter10(req, res, next);
    }

    next();
}

module.exports = {checkHotelsAndRateLimit, checkHotelDetailsAndRateLimit}
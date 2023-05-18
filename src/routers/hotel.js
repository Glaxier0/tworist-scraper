const express = require('express');
const {body, validationResult} = require('express-validator');
const SearchForm = require('../dto/searchForm');
const {
    scrapeHotels: scrapeHotelsBooking, scrapeHotelDetails: scrapeHotelDetailsBooking
} = require('../scrapers/booking');
const {scrapeHotels: scrapeHotelsHotels, scrapeHotelDetails: scrapeHotelDetailsHotels} = require('../scrapers/hotels');
const {
    scrapeHotels: scrapeHotelsExpedia, scrapeHotelDetails: scrapeHotelDetailsExpedia
} = require('../scrapers/expedia');
const {
    scrapeHotels: scrapeHotelsOrbitz, scrapeHotelDetails: scrapeHotelDetailsOrbitz
} = require('../scrapers/orbitz');
const {
    scrapeHotels: scrapeHotelsGetARoom, scrapeHotelDetails: scrapeHotelDetailsGetARoom
} = require('../scrapers/getaroom');

const Hotel = require('../models/hotel');
const HotelDetails = require('../models/hotelDetails');
const Search = require("../models/search");
const hotelDetailMerger = require('../services/hotelDetailMerger');
const {browsers} = require('../services/puppeteerBrowser');
const {authenticate} = require("../middleware/auth");
const FavoriteHotels = require('../models/favoriteHotels');
const User = require("../models/user");

const router = new express.Router();

router.post('/hotels', [
    body('adultCount').isInt().withMessage('Adult count must be an integer.'),
    body('childCount').isInt().withMessage('Child count must be an integer.'),
    body('roomCount').isInt().withMessage('Room count must be an integer.')
], async (req, res) => {
    // #swagger.tags = ['Hotels']
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

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array()});
    }

    const paddedCheckInDay = checkInDay.toString().padStart(2, '0');
    const paddedCheckInMonth = checkInMonth.toString().padStart(2, '0')
    const paddedCheckOutDay = checkOutDay.toString().padStart(2, '0');
    const paddedCheckOutMonth = checkOutMonth.toString().padStart(2, '0');

    const searchForm = new SearchForm(search, checkInYear, paddedCheckInMonth, paddedCheckInDay, checkOutYear, paddedCheckOutMonth, paddedCheckOutDay, adultCount, childCount, roomCount);

    const searchModel = new Search({
        searchQuery: (search + "&" + checkInYear + "&" + paddedCheckInMonth + "&" + paddedCheckInDay + "&" + checkOutYear + "&" + paddedCheckOutMonth + "&" + paddedCheckOutDay + "&" + adultCount + "&" + childCount + "&" + roomCount).toLocaleLowerCase().trim()
    });

    const searchDB = await Search.findOne({'searchQuery': searchModel["searchQuery"]});

    console.log("Search id: " + searchModel["_id"]);

    if (searchDB) {
        const hotels = await Hotel.find({'searchId': searchDB["_id"]});
        const hotelsData = {
            hotels
        }
        res.status(200).send(hotelsData);
        return;
    }

    const browser1 = browsers[0];
    const browser2 = browsers[1];

    const searchId = searchModel["_id"]

    const hotels = await scrapeHotelsBooking(searchForm, searchId, browser1);
    const hotelsData = {
        hotels
    }
    res.status(200).send(hotelsData);

    Hotel.insertMany(hotels)
        .then((docs) => {
            if (hotels) {
                console.log(`${docs.length} hotels inserted successfully`);
                Search.create(searchModel).then(() => console.log("New search added to database."));
            }
        })
        .catch((err) => {
            console.error(err);
        });

    const additionalHotelsPromise = Promise.allSettled([scrapeHotelsGetARoom(searchForm, searchId, browser1), scrapeHotelsHotels(searchForm, searchId, browser1), scrapeHotelsExpedia(searchForm, searchId, browser2), scrapeHotelsOrbitz(searchForm, searchId, browser2)])
        .then((results) => {
            return results
                .filter(result => result.status === 'fulfilled')
                .flatMap(result => result.value);
        })
        .catch((error) => {
            console.error('An error occurred:', error);
        });

    let additionalHotels;

    try {
        additionalHotels = await additionalHotelsPromise;
        const startTime = new Date();

        try {
            const docs = await Hotel.insertMany(additionalHotels);
            console.log(`${docs.length} hotels inserted successfully`);
        } catch (err) {
            console.error(err);
        } finally {
            const endTime = new Date();
            const elapsedTime = endTime - startTime;
            console.log(`Elapsed time bulk save: ${elapsedTime}ms`);
        }
    } catch (err) {
        console.error('An error occurred while fetching additional hotels:', err);
    }
})

router.get('/hotel/:id', async (req, res) => {
    // #swagger.tags = ['Hotels']
    //  #swagger.parameters['id'] = { description: 'hotel id' }
    let hotelDetails = await HotelDetails.findOne({'hotelId': req.params.id})

    let startTime = new Date();

    const hotel = await Hotel.findOne({'_id': req.params.id});

    let hotelDetail;
    let details;

    // If exists in db return it without scraping.
    if (hotelDetails) {
        hotelDetail = await hotelDetailMerger(hotel, hotelDetails)

        details = {
            hotelDetail
        }

        res.status(200).send(details)
        return;
    }

    let endTime = new Date();
    let elapsedTime = endTime - startTime;
    console.log(`Elapsed time to fetch hotel: ${elapsedTime}ms`);

    const hotelId = hotel["_id"];
    const browser = browsers[2];

    if (hotel.website === 'booking.com') {
        hotelDetails = await scrapeHotelDetailsBooking(hotel.hotelUrl, hotelId, browser);
    } else if (hotel.website === 'hotels.com') {
        hotelDetails = await scrapeHotelDetailsHotels(hotel.hotelUrl, hotelId, browser);
    } else if (hotel.website === 'expedia.com') {
        hotelDetails = await scrapeHotelDetailsExpedia(hotel.hotelUrl, hotelId, browser);
    } else if (hotel.website === 'orbitz.com') {
        hotelDetails = await scrapeHotelDetailsOrbitz(hotel.hotelUrl, hotelId, browser);
    } else if (hotel.website === 'getaroom.com') {
        hotelDetails = await scrapeHotelDetailsGetARoom(hotel.hotelUrl, hotelId, browser);
    }

    startTime = new Date();

    await HotelDetails.create(hotelDetails)

    endTime = new Date();
    elapsedTime = endTime - startTime;
    console.log(`Elapsed time to save: ${elapsedTime}ms`);

    hotelDetail = await hotelDetailMerger(hotel, hotelDetails)

    details = {
        hotelDetail
    }

    res.status(200).send(details)
})

router.get('/favorites', authenticate, async (req, res) => {
    // #swagger.tags = ['Hotels']
    // #swagger.security = [{"bearerAuth": []}]
    const user = await User.findOne({email: req.user.email});
    const favoriteHotels = await FavoriteHotels.find({userId: user["_id"]});

    res.status(200).send(favoriteHotels);
});

router.patch('/favorites/:hotelId', authenticate, async (req, res) => {
    // #swagger.tags = ['Hotels']
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.description = 'Add or Delete a hotel from the favorite hotel list.'
    // #swagger.parameters['hotelId'] = { description: 'Id of the hotel to add to the favorite list.' }
    const user = await User.findOne({email: req.user.email});
    let favoriteHotels = await FavoriteHotels.findOne({userId: user["_id"]});

    if (!favoriteHotels) {
        favoriteHotels = new FavoriteHotels({userId: user["_id"], favoriteHotels: []});
    }

    const hotel = await Hotel.findOne({_id: req.params.hotelId});

    if (!hotel) {
        return res.status(404).send({message: 'Hotel not found.'});
    }

    const index = favoriteHotels.favoriteHotels.findIndex(h => h._id.toString() === hotel._id.toString());

    if (index !== -1) {
        favoriteHotels.favoriteHotels.splice(index, 1);
    } else {
        favoriteHotels.favoriteHotels.push(hotel);
    }

    await favoriteHotels.save();

    res.status(200).send(favoriteHotels);
});

router.delete('/favorites', authenticate, async (req, res) => {
    // #swagger.tags = ['Hotels']
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.description = 'Clear the favorite hotel list of user.'
    const user = await User.findOne({email: req.user.email});

    await FavoriteHotels.deleteMany({userId: user["_id"]})

    res.status(200).send({message: "Favorite hotel list cleaned."});
});

module.exports = router
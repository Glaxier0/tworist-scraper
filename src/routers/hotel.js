const express = require('express');
const SearchForm = require('../dto/searchForm');
const {
    scrapeHotels: scrapeHotelsBooking,
    scrapeHotelDetails: scrapeHotelDetailsBooking
} = require('../scrapers/booking');
const {scrapeHotels: scrapeHotelsHotels, scrapeHotelDetails: scrapeHotelDetailsHotels} = require('../scrapers/hotels');
const {scrapeHotels: scrapeHotelExpedia, scrapeHotelDetails: scrapeHotelDetailsExpedia} = require('../scrapers/expedia');

const Hotel = require('../models/hotel');
const HotelDetails = require('../models/hotelDetails');
const Search = require("../models/search");
const router = new express.Router();
const hotelDetailMerger = require('../services/HotelDetailMerger')

// router.post('/tasks', auth, async (req, res) => {
//     const task = new Hotel({
//         ...req.body,
//         user: req.user._id
//     })
//
//     try {
//         await task.save()
//         res.status(201).send(task)
//     } catch (error) {
//         res.status(400).send(error)
//     }
// })

router.post('/hotels', async (req, res) => {
    const {
        search, checkInYear, checkInMonth, checkInDay, checkOutYear,
        checkOutMonth, checkOutDay, adultCount, childCount, roomCount
    } = req.body;

    const searchForm = new SearchForm(search, checkInYear, checkInMonth, checkInDay, checkOutYear,
        checkOutMonth, checkOutDay, adultCount, childCount, roomCount);

    const searchModel = new Search({
        searchQuery: (search + "&" + checkInYear + "&" + checkInMonth + "&" + checkInDay + "&"
            + checkOutYear + "&" + checkOutMonth + "&" + checkOutDay + "&"
            + adultCount + "&" + childCount + "&" + roomCount).toLocaleLowerCase().trim()
    });

    const searchDB = await Search.findOne({'searchQuery': searchModel["searchQuery"]});

    if (searchDB) {
        const hotels = await Hotel.find({'searchId': searchDB["_id"]});
        const hotelsData = {
            hotels
        }
        res.status(200).send(hotelsData);
        return;
    }

    Search.create(searchModel).then(console.log("New search created."));
    // Await all
    // const hotels = await Promise.all([scrapeHotelsBooking(searchForm, searchModel["_id"]), scrapeHotelsHotels(searchForm, searchModel["_id"])])
    //     .then(([result1, result2]) => {
    //         return [...result1, ...result2];
    //     })
    //     .catch((error) => {
    //         console.error('An error occurred:', error);
    //     });

    const hotelsPromise = scrapeHotelsBooking(searchForm, searchModel["_id"]);
    // const additionalHotelsPromise = scrapeHotelsHotels(searchForm, searchModel["_id"]);

    const additionalHotelsPromise = Promise.all([scrapeHotelsHotels(searchForm, searchModel["_id"]), scrapeHotelExpedia(searchForm, searchModel["_id"])])
        .then(([result1, result2]) => {
            return [...result1, ...result2];
        })
        .catch((error) => {
            console.error('An error occurred:', error);
        });

    const hotels = await hotelsPromise;
    const hotelsData = {
        hotels
    }
    res.status(200).send(hotelsData);

    Hotel.insertMany(hotels)
        .then((docs) => {
            console.log(`${docs.length} hotels inserted successfully`);
        })
        .catch((err) => {
            console.error(err);
        });

    additionalHotelsPromise.then((additionalHotels) => {
        const startTime = new Date();

        return Hotel.insertMany(additionalHotels)
            .then((docs) => {
                console.log(`${docs.length} hotels inserted successfully`);
            })
            .catch((err) => {
                console.error(err);
            })
            .finally(() => {
                const endTime = new Date();
                const elapsedTime = endTime - startTime;
                console.log(`Elapsed time bulk save: ${elapsedTime}ms`);
            });
    }).catch((err) => {
        console.error('An error occurred while fetching additional hotels:', err);
    });
})

router.get('/hotel/:id',
    async (req, res) => {
        let hotelDetails = await HotelDetails.findOne({'hotelId': req.params.id})

        let startTime = new Date();

        const hotel = await Hotel.findOne({'_id': req.params.id});

        let hotelDetail = '';
        let details = {hotelDetail};

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

        if (hotel.website === 'hotels.com') {
            hotelDetails = await scrapeHotelDetailsHotels(hotel.hotelUrl, hotel["_id"]);
        } else if (hotel.website === 'booking.com') {
            hotelDetails = await scrapeHotelDetailsBooking(hotel.hotelUrl, hotel["_id"]);
        } else if (hotel.website === 'expedia.com') {
            hotelDetails = await scrapeHotelDetailsExpedia(hotel.hotelUrl, hotel["_id"]);
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

// router.get('/tasks', auth, async (req, res) => {
//     const match = {}
//     const sort = {}
//
//     if (req.query.completed) {
//         match.completed = req.query.completed === 'true'
//     }
//
//     if (req.query["sortBy"]) {
//         const parts = req.query["sortBy"].split(':')
//         sort[parts[0]] = parts[1] === 'desc' ? -1 : 1
//     }
//
//     try {
//         await req.user.populate({
//             path: 'tasks',
//             match,
//             options: {
//                 limit: parseInt(req.query.limit),
//                 skip: parseInt(req.query.skip),
//                 sort
//             }
//         })
//         res.send(req.user["tasks"])
//     } catch (error) {
//         console.log(error)
//         res.status(500).send(error)
//     }
// })

router.get('/tasks/:id', async (req, res) => {
    const _id = req.params.id

    try {
        const task = await Hotel.findOne({_id, user: req.user._id})

        if (!task) {
            return res.status(404).send()
        }
        res.send(task)
    } catch (error) {
        res.status(500).send()
    }
})

// router.patch('/tasks/:id', async (req, res) => {
//     const updates = Object.keys(req.body)
//     const allowedUpdates = ['description', 'completed']
//     const isValid = updates.every((update) => allowedUpdates.includes(update))
//
//     if (!isValid) {
//         return res.status(400).send({error: 'Invalid updates!'})
//     }
//
//     try {
//         const task = await Hotel.findOne({_id: req.params.id, user: req.user._id})
//
//         if (!task) {
//             return res.status(404).send()
//         }
//
//         updates.forEach((update) => task[update] = req.body[update])
//         await task.save()
//         res.send(task)
//     } catch (error) {
//         res.status(400).send()
//     }
// })
//
// router.delete('/tasks/:id', async (req, res) => {
//     try {
//         const task = await Hotel.findOneAndDelete({_id: req.params.id, user: req.user._id})
//
//         if (!task) {
//             res.status(404).send()
//         }
//
//         res.send(task)
//     } catch (error) {
//         res.status(500).send()
//     }
// })

module.exports = router
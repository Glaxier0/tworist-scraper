const express = require('express');
const SearchForm = require('../dto/searchForm');
const {scrapeHotels, scrapeHotelDetails} = require('../scrapers/booking');
const Hotel = require('../models/hotel');
const Search = require("../models/search");
const router = new express.Router();

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

router.get('/hotels', async (req, res) => {
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
        res.status(200).send(hotels);
        return;
    }

    await Search.create(searchModel).then(console.log("New search created."));
    const hotels = await scrapeHotels(searchForm, searchModel["_id"]);

    const startTime = new Date();

    // TODO Add await after multiple scrapers set.
    Hotel.insertMany(hotels)
        .then((docs) => {
            console.log(`${docs.length} hotels inserted successfully`);
        })
        .catch((err) => {
            console.error(err);
        });
    const endTime = new Date();
    const elapsedTime = endTime - startTime;
    console.log(`Elapsed time bulk save: ${elapsedTime}ms`);

    res.status(200).send(hotels)
})

router.get('/hotel', async (req, res) => {
    const url = req.body;
    const hotelDetails = await scrapeHotelDetails(url)
    res.status(200).send(hotelDetails)
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
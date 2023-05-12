const express = require('express');
const Feedback = require('../models/feedback')
require('dotenv').config();
const router = express.Router();

router.post('/feedbacks', async (req, res) => {
    const {firstName, lastName, email, message} = req.body;

    const feedback = new Feedback({
        firstName, lastName, email, message
    })

    await Feedback.create(feedback);

    res.status(201).send({message: "Thank you for reaching us!"});
});

module.exports = router
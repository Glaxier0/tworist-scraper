const express = require('express');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const {authenticate} = require('../middleware/auth');
require('dotenv').config();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        const { username, email, googleId, appleId } = req.user;
        const user = {
            username,
            email,
            googleId,
            appleId
        };
        const token = jwt.sign(user, JWT_SECRET);
        res.redirect(`/success?token=${token}`);
    });

router.get('/protected',
    authenticate,
    (req, res) => {
        res.json(req.user);
    });

module.exports = router;
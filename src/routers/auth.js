const express = require('express');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const {authenticate} = require('../middleware/auth');
const User = require('../models/user');
require('dotenv').config();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

router.get('/google', passport.authenticate('google', {scope: ['profile', 'email']}), () => {
    // #swagger.tags = ['Auth']
    // #swagger.path = '/auth/google'
});

router.get('/google/callback', passport.authenticate('google', {failureRedirect: '/login'}),
    (req, res) => {
        // #swagger.tags = ['Auth']
        // #swagger.path = '/auth/google/callback'
        const {username, email, googleId, appleId} = req.user;
        const user = {
            username,
            email,
            googleId,
            appleId
        };
        const token = jwt.sign(user, JWT_SECRET);
        res.redirect(`/success?token=${token}`);
    });

router.get('/apple', passport.authenticate('apple', {scope: ['name', 'email']}, () => {
        // #swagger.tags = ['Auth']
        // #swagger.path = '/auth/apple'
    })
);

router.get('/apple/callback', passport.authenticate('apple', {failureRedirect: '/login'}),
    (req, res) => {
        // #swagger.tags = ['Auth']
        // #swagger.path = '/auth/apple/callback'
        const {username, email, googleId, appleId} = req.user;
        const user = {
            username,
            email,
            googleId,
            appleId
        };
        const token = jwt.sign(user, JWT_SECRET);
        res.redirect(`/success?token=${token}`);
    }
);

router.post('/register', async (req, res) => {
    // #swagger.tags = ['Auth']
    // #swagger.path = '/auth/register'
    const {username, email, password} = req.body;

    try {
        const userExists = await User.exists({email});

        if (userExists) {
            return res.status(409).json({message: 'User already exists.'});
        }

        const user = new User({
            username,
            password,
            email,
            googleId: '',
            appleId: ''
        });

        await User.create(user);

        res.status(201).json({message: 'User registered successfully'});
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Internal server error'});
    }
});

router.post('/login', async (req, res) => {
    // #swagger.tags = ['Auth']
    // #swagger.path = '/auth/login'
    const {email, password} = req.body;

    const user = await User.findOne({email});

    if (!user) {
        return res.status(401).json({message: 'Invalid credentials.'});
    }

    const result = await user.comparePassword(password);

    if (!result) {
        return res.status(401).json({message: 'Invalid credentials.'});
    }

    const jwtUser = {
        username: user.username,
        email: user.email,
        googleId: user.googleId,
        appleId: user.appleId
    };

    const token = jwt.sign(jwtUser, JWT_SECRET);

    res.status(200).json({message: 'Login successful', token});
});

router.get('/protected', authenticate, (req, res) => {
    // #swagger.tags = ['Auth']
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.path = '/auth/protected'
    res.json(req.user);
});

module.exports = router;
const jwt = require('jsonwebtoken');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user')
require('dotenv').config({
    path: '.env'
});

const test = {
    findOrCreate: async function(profile) {
        return { id: profile.id, name: profile.displayName };
    }
};

async function findOneOrCreate(profile) {
    console.log(profile)
    const user = await User.findOne(profile);
    if (!user) {
        await User.create(profile)
    }
    return user;
}

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const user = await findOneOrCreate(profile);
        done(null, user);
    } catch (err) {
        done(err);
    }
}));

passport.serializeUser((user, done) => {
    const token = jwt.sign({ sub: user.id }, process.env.GOOGLE_CLIENT_SECRET);
    done(null, token);
});

passport.deserializeUser(async (token, done) => {
    try {
        const payload = jwt.verify(token, process.env.GOOGLE_CLIENT_SECRET);
        const user = await User.findById(payload.sub);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

function authenticate(req, res, next) {
    passport.authenticate('google', { scope: ['profile'] })(req, res, next);
}

function callback(req, res, next) {
    passport.authenticate('google', (err, user) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.redirect('/login');
        }
        req.logIn(user, err => {
            if (err) {
                return next(err);
            }
            const token = req.user.token;
            res.redirect('/home?token=' + token);
        });
    })(req, res, next);
}

module.exports = {
    authenticate,
    callback
};
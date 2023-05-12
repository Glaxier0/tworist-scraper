const User = require("../models/user");
const passport = require("passport");
const {Strategy: GoogleStrategy} = require("passport-google-oauth20");
const {Strategy: AppleStrategy} = require("passport-apple");
const jwt = require("jsonwebtoken");
require('dotenv').config({
    path: '.env'
});

// async function findOneOrCreate(profile) {
//     const { id, displayName, emails } = profile;
//
//     let user = await User.findOne({ googleId: id });
//
//     if (!user) {
//         user = await User.findOne({ email: emails[0].value });
//
//         if (user) {
//             user.googleId = id;
//             await User.updateOne(user);
//         } else {
//             user = await User.create({
//                 username: displayName,
//                 email: emails[0].value,
//                 googleId: id
//             });
//         }
//     }
//
//     return user;
// }

// async function findOneOrCreateApple(profile) {
//     const { id, email, displayName } = profile;
//
//     let user = await User.findOne({ appleId: id });
//
//     if (!user) {
//         user = await User.findOne({ email });
//
//         if (user) {
//             user.appleId = id;
//             await User.updateOne(user);
//         } else {
//             user = await User.create({
//                 username: displayName,
//                 email,
//                 appleId: id,
//             });
//         }
//     }
//
//     return user;
// }

async function findOneOrCreate(profile) {
    const {id, displayName, emails, provider} = profile;
    let user;

    if (provider === 'google') {
        user = await User.findOne({googleId: id});
    } else if (provider === 'apple') {
        user = await User.findOne({appleId: id});
    }

    if (!user) {
        user = await User.findOne({email: emails[0].value});

        if (user) {
            if (provider === 'google') {
                user.googleId = id;
            } else if (provider === 'apple') {
                user.appleId = id;
            }
            await User.updateOne(user);
        } else {
            user = await User.create({
                username: displayName,
                email: emails[0].value,
                googleId: provider === 'google' ? id : '',
                appleId: provider === 'apple' ? id : '',
            });
        }
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

passport.use(new AppleStrategy({
            clientID: process.env.APPLE_CLIENT_ID,
            teamID: process.env.APPLE_TEAM_ID,
            callbackURL: process.env.APPLE_CALLBACK_URL,
            keyID: process.env.APPLE_KEY_ID,
            privateKeyPath: process.env.APPLE_PRIVATE_KEY
        }, async (accessToken, refreshToken, decodedIdToken, profile, done) => {
            try {
                const user = await findOneOrCreate(profile);
                done(null, user);
            } catch (err) {
                done(err);
            }
        }
    )
);

passport.serializeUser((user, done) => {
    const token = jwt.sign({sub: user.id}, process.env.GOOGLE_CLIENT_SECRET);
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
    passport.authenticate('google', {scope: ['profile']})(req, res, next);
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
const jwt = require("jsonwebtoken");
require('dotenv').config({
    path: '.env'
});

const JWT_SECRET = process.env.JWT_SECRET;

function authenticate(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1] || req.query.token;

    if (!token) {
        return res.status(401).json({ message: 'No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token.' });
    }
}

module.exports = {
    authenticate
};
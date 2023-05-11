const JwtUser = require("../dto/jwtUser");

async function jwtModelMapper(user) {
    return new JwtUser(user.username, user.email, user.googleId, user.appleId);
}

module.exports = jwtModelMapper
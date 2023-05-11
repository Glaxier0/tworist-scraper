class JwtUser {
    constructor(username, email, googleId, appleId) {
        this.username = username;
        this.email = email;
        this.googleId = googleId;
        this.appleId = appleId;
    }
}

module.exports = JwtUser
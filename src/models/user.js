const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: { type: String },
    password: { type: String },
    email: { type: String, unique: true },
    googleId: { type: String },
    appleId: { type: String },
});

userSchema.pre('save', async function (next) {
    const user = this;
    if (!user.isModified('password')) {
        return next();
    }
    try {
        user.password = await bcrypt.hashSync(user.password, 10);
        next();
    } catch (error) {
        return next(error);
    }
});

userSchema.methods.comparePassword = async function (password) {
    try {
        return await bcrypt.compare(password, this.password);
    } catch (error) {
        throw new Error(error);
    }
};

const User = mongoose.model('User', userSchema);

module.exports = User;
const mongoose = require('mongoose');
const url = "mongodb://admin:admin@localhost:27017/tworist?authMechanism=DEFAULT&authSource=tworist";

async function connectToDatabase() {
    await mongoose.connect(url);
    console.log(`Successfully connected to ${url}`);
}

connectToDatabase().then(r => r);

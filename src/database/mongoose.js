const mongoose = require('mongoose');

await mongoose.connect(process.env.MONGODB_URL)


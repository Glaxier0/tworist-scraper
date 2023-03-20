const express = require('express')
require('./database/mongoose')
const hotelRouter = require('./routers/hotel')

const app = express()

app.use(express.json())
app.use(hotelRouter)

module.exports = app




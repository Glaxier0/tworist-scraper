const express = require('express')

const hotelRouter = require('./routers/hotel')

const app = express()

app.use(express.json())
app.use(hotelRouter)

module.exports = app




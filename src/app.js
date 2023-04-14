const express = require('express')
const cors = require('cors')
require('./database/mongoose')
const hotelRouter = require('./routers/hotel')

const app = express()

app.use(express.json())
app.use(cors())
app.use(hotelRouter)

module.exports = app




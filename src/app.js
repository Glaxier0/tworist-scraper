const express = require('express')
const cors = require('cors')
const hotelRouter = require('./routers/hotel')
const authRouter = require('./routers/auth')
const feedbackRouter = require('./routers/feedback')
const session = require('express-session')
const passport = require('passport');
const swaggerUi = require('swagger-ui-express')
const swaggerFile = require('./swagger_output.json')
require('./database/mongoose')
require('./config/passport')

const app = express()
app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerFile));
app.use(express.json())
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(cors())
app.use(hotelRouter)
app.use('/auth', authRouter)
app.use(feedbackRouter)
module.exports = app




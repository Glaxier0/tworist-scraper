const app = require('./app')
const port = process.env.PORT || 3000

app.listen(port, () => {
    console.log('Server is up on port ' + port)
});

app.get('/', (req, res) => res.json('API is Up.'));
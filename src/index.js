const app = require('./app')
const {initBrowsers, closeBrowsers} = require('./services/puppeteerBrowser')
const port = process.env.PORT || 3000

app.listen(port, () => {
    console.log('Server is up on port ' + port)
});

(async () => {
    initBrowsers(3).then(() => {
        console.log("Browsers initialized.")
    })
})();

process.on('SIGINT', async () => {
    await closeBrowsers();
    process.exit(0);
});

app.get('/', (req, res) => res.json('API is Up.'));
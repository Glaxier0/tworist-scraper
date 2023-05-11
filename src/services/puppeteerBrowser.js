const puppeteer = require("puppeteer-extra");
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');

puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({blockTrackers: true}));

const browsers = [];
async function puppeteerBrowser() {
    return await puppeteer.launch({
        headless: false,
        devtools: false,
        args: [
            '--headless',
            '--disable-canvas-aa',
            '--disable-2d-canvas-clip-aa',
            '--disable-gl-drawing-for-tests',
            '--disable-dev-shm-usage',
            '--use-gl=swiftshader',
            '--enable-webgl',
            '--hide-scrollbars',
            '--mute-audio',
            '--disable-infobars',
            '--disable-breakpad',
            '--window-size=400,300',
            // '--user-data-dir=./chromeData',
            // '--no-sandbox',
            // '--disable-setuid-sandbox',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-web-security',
            '--metrics-recording-only'
        ]
    });
}

async function initBrowsers(count) {
    for (let i = 0; i < count; i++) {
        const browser = await puppeteerBrowser();
        browsers.push(browser);
    }
}

async function closeBrowsers() {
    for (let i = 0; i < browsers.length; i++) {
        browsers[i].close().then(() => {
            console.log('Browser closed.');
        }).catch((e) => {
            console.error(e)
        })
    }
}

module.exports = {puppeteerBrowser, initBrowsers, closeBrowsers, browsers};

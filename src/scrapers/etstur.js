const puppeteer = require('puppeteer-extra');
const cheerio = require('cheerio');
const Hotel = require('../models/hotel');
const HotelDetails = require('../models/hotelDetails');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
puppeteer.use(AdblockerPlugin({blockTrackers: true}));
const axios = require('axios')
const SearchForm = require("../dto/searchForm");

test();

async function test() {
    const searchForm = new SearchForm('İstanbul', '2023', '04', '10',
        '2023', '04', '11', 2, 0, 1);
    // console.log(await scrapeHotels(searchForm));
    console.log(await scrapeHotelDetails('https://www.etstur.com/The-Gate-Kadikoy-Downtown?check_in=10.04.2023&check_out=11.04.2023&adult_1=2', 'test'));
}

async function autoComplete(searchTerm) {
    const encodedSearchTerm = encodeURIComponent(searchTerm)
    const suggestions = await (await axios.get('https://www.etstur.com/Otel/ajax/autocomplete?pagetype=SEARCH&q=' + encodedSearchTerm))
        .data["suggestions"]
    const url = suggestions.find(obj => obj.name.toLocaleLowerCase().includes(searchTerm + ' otelleri')).url;

    return url;
}

async function scrapeHotels(searchForm, searchId) {
    const startTime = new Date();

    const browser = await puppeteer.launch({
        headless: false,
        devtools: false, // not needed so far, we can see websocket frames and xhr responses without that.
        args: [
            // '--headless',
            '--disable-canvas-aa', // Disable antialiasing on 2d canvas
            '--disable-2d-canvas-clip-aa', // Disable antialiasing on 2d canvas clips
            '--disable-gl-drawing-for-tests', // BEST OPTION EVER! Disables GL drawing operations which produce pixel output. With this the GL output will not be correct but tests will run faster.
            '--disable-dev-shm-usage', // ???
            '--use-gl=swiftshader', // better cpu usage with --use-gl=desktop rather than --use-gl=swiftshader, still needs more testing.
            '--enable-webgl',
            '--hide-scrollbars',
            '--mute-audio',
            '--disable-infobars',
            '--disable-breakpad',
            '--window-size=400,300', // see defaultViewport
            '--user-data-dir=./chromeData', // created in index.js, guess cache folder ends up inside too.
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-web-security',
            '--metrics-recording-only'
        ] // same
    });

    const page = await browser.newPage();

    await page.setRequestInterception(true);

    page.on('request', (req) => {
        if (req.resourceType() === 'font' || req.resourceType() === 'image' || req.resourceType() === 'stylesheet') {
            req.abort();
        } else {
            req.continue();
        }
    });

    const searchTerm = await autoComplete(searchForm.search.toLocaleLowerCase());
    const checkInDate = searchForm.checkInDay + '.' + searchForm.checkInMonth + '.' + searchForm.checkInYear;
    const checkOutDate = searchForm.checkOutDay + '.' + searchForm.checkOutMonth + '.' + searchForm.checkOutYear;

    const url = 'https://www.etstur.com/' + searchTerm + '?check_in=' + checkInDate + '&check_out=' + checkOutDate
        + '&adult_1=' + searchForm.adultCount + '&child_1=' + searchForm.childCount;

    const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36";
    await page.setUserAgent(ua);

    page.goto(url).catch((e) => e)

    let endTime = new Date();
    let elapsedTime = endTime - startTime;
    console.log(`Elapsed time goto: ${elapsedTime}ms`);

    await page.waitForSelector('#hotelList .hotel-row-item');

    endTime = new Date();
    elapsedTime = endTime - startTime;
    console.log(`Elapsed time waiting: ${elapsedTime}ms`);

    const html = await page.content();
    const $ = cheerio.load(html);

    const hotels = $('#hotelList .card-panel.hotelCardItem.has-price').map((i, el) => {
        const address = $(el).attr('data-city');
        const title = $(el).attr('data-hotelname');
        const price = $(el).attr('data-price');
        const reviewScore = $(el).attr('data-score');
        const reviewCount = $(el).attr('data-totalcomments');
        const hotelUrl = "https://www.etstur.com/" + $(el).find('a').attr('href');
        const imageUrl = $(el).find('img').attr('src');
        const hotel = new Hotel({
            address,
            title,
            price,
            reviewScore,
            reviewCount,
            hotelUrl,
            imageUrl,
            searchId
        });
        return hotel;
    }).get();

    endTime = new Date();
    elapsedTime = endTime - startTime;
    console.log(`Elapsed time scrape hotels: ${elapsedTime}ms`);

    browser.close().catch((e) => e);

    return hotels;
}

async function scrapeHotelDetails(url, hotelId, lat, long) {
    const startTime = new Date();

    const browser = await puppeteer.launch({
        headless: false,
        // executablePath: "/usr/bin/chromium-browser",
        devtools: false, // not needed so far, we can see websocket frames and xhr responses without that.
        // //dumpio: true,
        // defaultViewport: { //--window-size in args
        //     width: 1280,
        //     height: 882
        // },
        args: [
            //'--crash-test', // Causes the browser process to crash on startup, useful to see if we catch that correctly
            // '--headless',
            '--disable-canvas-aa', // Disable antialiasing on 2d canvas
            '--disable-2d-canvas-clip-aa', // Disable antialiasing on 2d canvas clips
            '--disable-gl-drawing-for-tests', // BEST OPTION EVER! Disables GL drawing operations which produce pixel output. With this the GL output will not be correct but tests will run faster.
            '--disable-dev-shm-usage', // ???
            // '--no-zygote', // wtf does that mean ?
            '--use-gl=swiftshader', // better cpu usage with --use-gl=desktop rather than --use-gl=swiftshader, still needs more testing.
            '--enable-webgl',
            '--hide-scrollbars',
            '--mute-audio',
            // '--no-first-run',
            '--disable-infobars',
            '--disable-breakpad',
            //'--ignore-gpu-blacklist',
            '--window-size=400,300', // see defaultViewport
            '--user-data-dir=./chromeData', // created in index.js, guess cache folder ends up inside too.
            '--no-sandbox', // better resource consumption
            '--disable-setuid-sandbox',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-web-security',
            '--metrics-recording-only'

            // '--disable-extensions'
            // '--disable-gpu'
        ] // same
        // '--proxy-server=socks5://127.0.0.1:9050'] // tor if needed
    });

    const page = await browser.newPage();

    await page.setRequestInterception(true);

    page.on('request', (req) => {
        if (req.resourceType() === 'font' || req.resourceType() === 'image'
            || req.resourceType() === 'xhr' || req.resourceType() === 'stylesheet') {
            req.abort();
        } else {
            req.continue();
        }
    });

    // const url = 'https://www.booking.com/hotel/gb/comfortinnedgware.en-gb.html?aid=397594&label=gog235jc-1FCAEoggI46AdIKFgDaOQBiAEBmAEouAEXyAEM2AEB6AEB-AECiAIBqAIDuAKAwKygBsACAdICJDBkM2MzYTVlLTQwMjgtNGY2Yy05ZDQxLTc2MjRmYmU4ZmEyNNgCBeACAQ&sid=72a9d1104ff45429504706b924efcdd4&all_sr_blocks=23180306_190199343_3_0_0;checkin=2023-03-10;checkout=2023-03-11;dest_id=-2601889;dest_type=city;dist=0;group_adults=2;group_children=0;hapos=3;highlighted_blocks=23180306_190199343_3_0_0;hpos=3;matching_block_id=23180306_190199343_3_0_0;no_rooms=1;req_adults=2;req_children=0;room1=A%2CA;sb_price_type=total;sr_order=popularity;sr_pri_blocks=23180306_190199343_3_0_0__11993;srepoch=1678451288;srpvid=fd5957ab31d700a7;type=total;ucfs=1&#hotelTmpl';
    const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36";
    await page.setUserAgent(ua);
    page.goto(new URL(url)).catch((e) => e);

    let endTime = new Date();
    let elapsedTime = endTime - startTime;
    console.log(`Elapsed time goto: ${elapsedTime}ms`);

    const hotelDetails = new HotelDetails({
        url,
        hotelId,
        lat,
        long,
        closeLocations: '',
        summary: '',
        popularFacilities: '',
        facilities: '',
        policies: ''
    });

    await page.waitForSelector('#hotelTabMenu');

    endTime = new Date();
    elapsedTime = endTime - startTime;
    console.log(`Elapsed time waiting: ${elapsedTime}ms`);

    const html = await page.content();
    const $ = cheerio.load(html);

    // TODO get close places from google api

    // Working, gets the list of close places with title but slows scraping
    // properties.closeLocations = $('ul[data-location-block-list="true"]').map((i, element) => {
    //     const title = $(element).parent().text().trim().replace($(element).text(), "").replace("\n", "");
    //     const locations = $(element).find('li').map((j, li) =>
    //         $(li).text().replace(/([A-Z])/g, ' $1').replace('\n', ' ').trim()).get();
    //     return {title, locations}
    // }).get();

    // Working gives summary
    hotelDetails.summary = $('ul#printableArea li#GENERAL span.conditionsText').text().replaceAll("\n", "").trim();

    // Working get facilities and titles
    hotelDetails.facilities = $('ul.boxFacility-list li span.defaultFac').map((i, el) => $(el).text()).get();

    // Working hotel policies
    const colElement = $('.col-md-3.importantInfo');
    const conditions = colElement.find('li.condDesc');
    const checkTime = colElement.find('li.importantInfo-time-item');

    const checkInTime = checkTime.find('span.checkInTime').text().trim();
    const checkOutTime = checkTime.find('span.checkOutTime').text().trim();

    const conditionsTexts = conditions.find('span.conditionsText').map((i, el) => {
        return $(el).text().trim();
    }).get();

    const childrenRule = conditionsTexts.filter(x => x.toLocaleLowerCase().includes("çocuk")).toString().trim();

    const isChildrenAllowed = childrenRule ? !childrenRule.toLocaleLowerCase().includes("edilm")
        || childrenRule.toLocaleLowerCase().includes("edili"): null;

    const ageRestriction = 0;

    const rules = conditions.find('span.conditionsText').map((i, el) => {
        const ruleType = $(el).text().toLocaleLowerCase().trim();
        const ruleName = ruleType
            .replace('kabul edilmez', '')
            .replace('sağlanmaz', '')
            .replace('sağlanır', '')
            .replace('kabul edilir', '')
            .trim();
        let isAllowed = null;
        if (ruleType.includes('edilm') || ruleType.includes('sağlanmaz')) {
            isAllowed = false;
        } else if (ruleType.includes('edili') || ruleType.includes('sağlanı')) {
            isAllowed = true;
        }
        return {ruleName, ruleType, isAllowed};
    }).get();

    const cards = null;
    const cancellation = null;

    hotelDetails.policies = {
        checkInTime,
        checkOutTime,
        isChildrenAllowed,
        ageRestriction,
        rules,
        cards,
        cancellation,
    };

    endTime = new Date();
    elapsedTime = endTime - startTime;
    console.log(`Elapsed time scrape hotels: ${elapsedTime}ms`);

    browser.close().catch((e) => e);

    return hotelDetails;
}

module.exports = {scrapeHotels, scrapeHotelDetails}
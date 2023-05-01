const puppeteer = require('puppeteer-extra');
const cheerio = require('cheerio');
const Hotel = require('../models/hotel');
const HotelDetails = require('../models/hotelDetails');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
const SearchForm = require("../dto/searchForm");
const normalizeString = require("../services/Utils");
puppeteer.use(AdblockerPlugin({blockTrackers: true}));
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const {translate} = require('bing-translate-api');

test();

async function test() {
    const searchForm = new SearchForm('izmir', '2023', '05', '07',
        '2023', '05', '08', 2, 0, 1);

    const hotels = await scrapeHotels(searchForm, "testId");
    console.log(hotels)
    console.log(hotels.length)

    // const url = 'https://www.hotels.com/ho342052/isg-airport-hotel-special-class-tuzla-turkey/?chkin=2023-05-01&chkout=2023-05-02&x_pwa=1&rfrr=HSR&pwa_ts=1682342094467&referrerUrl=aHR0cHM6Ly93d3cuaG90ZWxzLmNvbS9Ib3RlbC1TZWFyY2g%3D&useRewards=false&rm1=a2&regionId=1639&destination=Istanbul%2C+Istanbul%2C+T%C3%BCrkiye&destType=MARKET&neighborhoodId=6094912&latLong=41.01357%2C28.96352&sort=RECOMMENDED&top_dp=108&top_cur=USD&userIntent=&selectedRoomType=211809904&selectedRatePlan=232209721&expediaPropertyId=3430585';
    // const hotelDetails = await scrapeHotelDetails(url, 'testId')
    // console.log(hotelDetails)
}

async function autoComplete(searchTerm) {
    const normalized = normalizeString(searchTerm);
    const encodedSearchTerm = encodeURIComponent(normalized);
    const url = 'https://www.getaroom.com/locations/list.json?limit=50&q=' + encodedSearchTerm

    try {
        const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36';
        const {stdout} = await exec(`curl -s -H "User-Agent: ${userAgent}" "${url}"`);
        const suggestions = JSON.parse(stdout);
        let suggestion = suggestions.find(obj => obj["title"].split(',')[0].trim().toLowerCase() === normalized.toLowerCase()) ?? suggestions[0];

        if (suggestion) {
            suggestion = suggestion["title"]
        }
        return encodeURIComponent(suggestion);
    } catch (error) {
        console.error(`Error in autoComplete function: ${error.message}`);
    }
}

async function scrapeHotels(searchForm, searchId) {
    const startTime = new Date();

    const browser = await puppeteer.launch({
        headless: false,
        devtools: false,
        args: [
            // '--headless',
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
            '--user-data-dir=./chromeData',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-web-security',
            '--metrics-recording-only'
        ]
    });

    const page = await browser.newPage();

    await page.setRequestInterception(true);

    page.on('request', (req) => {
        if (req.resourceType() === 'font') {
            req.abort();
        } else {
            req.continue();
        }
    });

    let translated = await translate(searchForm.search, null, 'en')

    if (translated) {
        translated = translated["translation"];
    }

    const searchTerm = await autoComplete(translated);

    const checkInDate = [
        searchForm.checkInYear,
        searchForm.checkInMonth.toString().padStart(2, '0'),
        searchForm.checkInDay.toString().padStart(2, '0')
    ].join('-');

    const checkOutDate = [
        searchForm.checkOutYear,
        searchForm.checkOutMonth.toString().padStart(2, '0'),
        searchForm.checkOutDay.toString().padStart(2, '0')
    ].join('-');

    let childArray = Array(searchForm.childCount).fill(10);
    let adultArray = Array(searchForm.adultCount).fill(18);

    const peopleCount = adultArray.join(",") + childArray.join(",")


    let url = 'https://www.getaroom.com/search?amenities=&destination=' + searchTerm + '&page=1&per_page=25&rinfo=[['
        + peopleCount + ']]&sort_order=position&hide_unavailable=true&check_in=' + checkInDate + '&check_out='
        + checkOutDate + '&currency=USD';

    const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36";
    await page.setUserAgent(ua);

    page.goto(url).catch((e) => e)
    let endTime = new Date();
    let elapsedTime = endTime - startTime;
    console.log(`Elapsed time go to getaroom: ${elapsedTime}ms`);
    await page.waitForSelector('.results-list');

    endTime = new Date();
    elapsedTime = endTime - startTime;
    console.log(`Elapsed time waiting getaroom: ${elapsedTime}ms`);

    const html = await page.content();
    const $ = cheerio.load(html);

    const userCheckIn = [
        searchForm.checkInDay.toString().padStart(2, '0'),
        searchForm.checkInMonth.toString().padStart(2, '0'),
        searchForm.checkInYear
    ].join('.');

    const userCheckOut = [
        searchForm.checkOutDay.toString().padStart(2, '0'),
        searchForm.checkOutMonth.toString().padStart(2, '0'),
        searchForm.checkOutYear
    ].join('.');

    const website = 'getaroom.com';

    const hotels = $('.hotel-card').map((i, el) => {
        const title = $(el).find('.name a').text().trim() || '';
        const address = $(el).find('.city').text().trim() || '';
        const price = $(el).find('.price .amount').text().trim() || '';
        const starCount = $(el).find('.star-rating .sr-only').text()
            .replace('Stars', '').trim() || 0;
        const reviewScore = $(el).find('.trip-advisor-reviews .sr-only').text().trim() || '0';
        const reviewCount = $(el).find('.trip-advisor-reviews').text().replace(reviewScore, '').match(/\d+(,\d+)*\s+reviews/)?.[0]?.replace(/\D/g, '') || '0';

        let hotelUrl = $(el).find('.click-target').attr('href') || '';
        if (hotelUrl) {
            hotelUrl = 'https://www.getaroom.com/hotels' + hotelUrl
        }
        const imageUrl = $(el).find('.img').css('background-image')?.replace(/^url\(["']?/, '').replace(/["']?\)$/, '') || '';

        return new Hotel({
            title,
            address,
            price,
            starCount,
            reviewScore,
            reviewCount,
            hotelUrl,
            imageUrl,
            userCheckIn,
            userCheckOut,
            adultCount: searchForm.adultCount,
            childrenCount: searchForm.childCount,
            roomCount: searchForm.roomCount,
            website,
            searchId
        })
    }).get();

    endTime = new Date();
    elapsedTime = endTime - startTime;
    console.log(`Elapsed time scrape hotels from getaroom: ${elapsedTime}ms`);
    hotels.pop();
    browser.close().catch((e) => e);

    return hotels;
}

async function scrapeHotelDetails(url, hotelId) {
    const startTime = new Date()

    const browser = await puppeteer.launch({
        headless: false,
        devtools: false,
        args: [
            '--headless',
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
            '--no-sandbox', // better resource consumption
            '--disable-setuid-sandbox',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-web-security',
            '--metrics-recording-only'
        ]
    });

    const page = await browser.newPage();

    await page.setRequestInterception(true);

    page.on('request', (req) => {
        if (req.resourceType() === 'xhr' || req.resourceType() === 'font' || req.resourceType() === 'stylesheet') {
            req.abort();
        } else {
            req.continue();
        }
    });

    const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36";
    await page.setUserAgent(ua);
    page.goto(new URL(url)).catch((e) => e);

    let endTime = new Date();
    let elapsedTime = endTime - startTime;
    console.log(`Elapsed time go to booking: ${elapsedTime}ms`);

    const hotelDetails = new HotelDetails({
        url,
        hotelId,
        lat: '',
        long: '',
        images: '',
        closeLocations: '',
        summary: '',
        popularFacilities: '',
        facilities: '',
        policies: ''
    });

    await page.waitForSelector('[data-testid="facility-group-icon"]');
    await page.waitForSelector('.active-image');

    endTime = new Date();
    elapsedTime = endTime - startTime;
    console.log(`Elapsed time waiting booking: ${elapsedTime}ms`);

    const html = await page.content();
    const $ = cheerio.load(html);

    // Images
    hotelDetails.images = $('a.bh-photo-grid-item > img, div.bh-photo-grid-thumbs img')
        .map((i, el) => $(el).attr('src'))
        .toArray();

    // Working, gets the list of close places with title but slows scraping
    // properties.closeLocations = $('ul[data-location-block-list="true"]').map((i, element) => {
    //     const title = $(element).parent().text().trim().replace($(element).text(), "").replace("\n", "");
    //     const locations = $(element).find('li').map((j, li) =>
    //         $(li).text().replace(/([A-Z])/g, ' $1').replace('\n', ' ').trim()).get();
    //     return {title, locations}
    // }).get();

    // Working gives summary
    const regex = /You're eligible for a Genius discount at [\w\s]+! To save at this property, all you have to do is sign in\./g
    hotelDetails.summary = $('#property_description_content > p').text().trim()
        .replace(regex, "")

    // Working get Most popular facilities
    hotelDetails.popularFacilities = [...new Set($('[data-testid="facility-list-most-popular-facilities"] > div').map((i, element) => {
        return $(element).text().trim();
    }).get())];

    // Working get facilities and titles
    hotelDetails.facilities = $('[data-testid="facility-group-icon"]').map((i, element) => {
        const parentElement = $(element).parent();
        const title = parentElement.text().trim();
        const properties = parentElement.parent().parent().parent().find('ul > li').map((i, el) => $(el).text().trim()).get();
        if (properties.length === 0)
            properties.push(parentElement.parent().parent().parent().text().replace(title, "").trim().split(/\n\s+/))
        return {title, properties: properties.join(', ').split(', ')};
    }).get();

    // Coordinates
    const coordinates = $('#hotel_address').attr('data-atlas-latlng');
    [hotelDetails.lat, hotelDetails.long] = coordinates.split(",");

    // Working hotel policies
    let checkInTime = $('#checkin_policy').text() || '';
    checkInTime = checkInTime
        .replace(/\bCheck-in\b/i, '')
        .trim();

    let checkOutTime = $('#checkout_policy').text() || '';
    checkOutTime = checkOutTime
        .replace(/\bCheck-out\b/i, '')
        .trim();

    const isChildrenAllowed = !$('[data-test-id="child-policies-block"]').text().includes('not allowed');
    const ageRestriction = parseInt($('#age_restriction_policy').text().match(/\d+/)) || 0;

    const rules = $('.description--house-rule p.policy_name').map((i, el) => {
        const ruleName = $(el).text().replace(/\n/g, '').trim();
        const ruleType = $(el).parent().text().replace(ruleName, '').replace(/\n/g, '').trim();
        let isAllowed = null;
        if (ruleType.toLocaleLowerCase().includes('not allowed')) {
            isAllowed = false;
        } else if (ruleType.toLocaleLowerCase().includes('allowed')) {
            isAllowed = true;
        }
        return {ruleName, ruleType, isAllowed};
    }).get();

    const paymentCards = $('.payment_methods_overall img').map((i, el) => $(el).attr('title').trim()).get();
    const noImageCards = $('.no-image-payment').map((i, el) => $(el).text().trim()).get();
    const textCard = $('.description.hp_bp_payment_method > p:not(.policy_name):not(.payment_methods_overall)').text().trim();
    const cards = paymentCards.concat(noImageCards);
    cards.push(textCard)

    const cancellation = $('#cancellation_policy').text().replace(/\n/g, '').replace('Cancellation/prepayment', '').trim();

    hotelDetails.policies = {
        checkInTime,
        checkOutTime,
        isChildrenAllowed,
        ageRestriction,
        rules,
        cards,
        cancellation
    };

    endTime = new Date();
    elapsedTime = endTime - startTime;
    console.log(`Elapsed time scrape hotels booking: ${elapsedTime}ms`);

    browser.close().catch((e) => e);

    return hotelDetails;
}

module.exports = {scrapeHotels, scrapeHotelDetails}
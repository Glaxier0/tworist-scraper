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
    const searchForm = new SearchForm('istanbul', '2023', '05', '01',
        '2023', '05', '02', 2, 0, 1);

    // await scrapeHotels(searchForm, "testId");
    // const hotels = await scrapeHotels(searchForm, "testId");
    // console.log(hotels)
    // console.log(hotels.length)

    const url = 'https://www.hotels.com/ho342052/isg-airport-hotel-special-class-tuzla-turkey/?chkin=2023-05-01&chkout=2023-05-02&x_pwa=1&rfrr=HSR&pwa_ts=1682342094467&referrerUrl=aHR0cHM6Ly93d3cuaG90ZWxzLmNvbS9Ib3RlbC1TZWFyY2g%3D&useRewards=false&rm1=a2&regionId=1639&destination=Istanbul%2C+Istanbul%2C+T%C3%BCrkiye&destType=MARKET&neighborhoodId=6094912&latLong=41.01357%2C28.96352&sort=RECOMMENDED&top_dp=108&top_cur=USD&userIntent=&selectedRoomType=211809904&selectedRatePlan=232209721&expediaPropertyId=3430585';
    const hotelDetails = await scrapeHotelDetails(url, 'testId')
    console.log(hotelDetails)
}

async function autoComplete(searchTerm) {
    const encodedSearchTerm = encodeURIComponent(searchTerm)

    //istanbul
    //https://uk.hotels.com/api/v4/typeahead/londra?browser=Chrome&client=Homepage&dest=true&device=Desktop&expuserid=-1&features=ta_hierarchy%7Cpostal_code%7Cgoogle%7Cconsistent_display&format=json&guid=5e36f909-5808-49f7-8a89-299766be9e50&lob=HOTELS&locale=en_GB&maxresults=8&personalize=true&regiontype=2047&siteid=300000005
    const suggestions = await (await axios.get('https://uk.hotels.com/api/v4/typeahead/' + encodedSearchTerm +
        '?browser=Chrome&client=Homepage&dest=true&device=Desktop&expuserid=-1' +
        '&features=ta_hierarchy%7Cpostal_code%7Cgoogle%7Cconsistent_display' +
        '&format=json&guid=5e36f909-5808-49f7-8a89-299766be9e50&lob=HOTELS&locale=en_GB' +
        '&maxresults=8&personalize=true&regiontype=2047&siteid=300000005')).data["sr"]

    const suggestion = suggestions.find(obj => obj["regionNames"]["shortName"].toLowerCase().includes(searchTerm));
    const fullName = suggestion["regionNames"]["fullName"]
    const regionId = suggestion["essId"]["sourceId"];
    const coordinates = suggestion["coordinates"];
    const lat = coordinates["lat"];
    const long = coordinates["long"];

    const encodedFullName = encodeURIComponent(fullName);

    return {encodedFullName, regionId, lat, long};
}

async function autoScroll(page) {
    return await page.evaluate(async () => {
        return await new Promise((resolve) => {
            const distance = 125;
            const scrollDelay = 40;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                const totalHeight = window.scrollY + window.innerHeight;

                // Stop scrolling when reached the bottom
                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve({reachedBottom: true});
                }
            }, scrollDelay);
        });
    });
}

async function fastAutoScroll(page) {
    return await page.evaluate(async () => {
        return await new Promise((resolve) => {
            const distance = 175;
            const scrollDelay = 20;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                const totalHeight = window.scrollY + window.innerHeight;

                // Stop scrolling when reached the bottom
                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve({reachedBottom: true});
                }
            }, scrollDelay);
        });
    });
}

async function scrapeHotels(searchForm, searchId) {
    const startTime = new Date();

    const browser = await puppeteer.launch({
        headless: false,
        devtools: false, // not needed so far, we can see websocket frames and xhr responses without that.
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
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-web-security',
            '--metrics-recording-only',
        ]
    });

    const page = await browser.newPage();

    await page.setRequestInterception(true);

    page.on('request', (req) => {
        if (req.resourceType() === 'font' || req.resourceType() === 'stylesheet' || req.resourceType() === 'xhr') {
            req.abort();
        } else {
            req.continue();
        }
    });

    const suggestion = await autoComplete(searchForm.search.toLowerCase());

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

    const peopleCount = searchForm.adultCount + searchForm.childCount

    const url = 'https://www.hotels.com/Hotel-Search?locale=en_US&adults=' + peopleCount
        + '&d1=' + checkInDate + '&d2=' + checkOutDate + '&destination=' + suggestion.encodedFullName
        + '&endDate=' + checkOutDate + "&latLong" + suggestion.lat + "%2c" + suggestion.long
        + "&regionId=" + suggestion.regionId + "&rooms=" + searchForm.roomCount + "&selected=&semdtl=" +
        "&sort=RECOMMENDED&startDate=" + checkInDate + "&theme=&useRewards=false&userIntent=";

    const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36";
    await page.setUserAgent(ua);

    page.goto(url).catch((e) => e)

    let endTime = new Date();
    let elapsedTime = endTime - startTime;
    console.log(`Elapsed time goto: ${elapsedTime}ms`);

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

    await page.waitForSelector('[data-stid="open-hotel-information"]');
    await autoScroll(page);

    endTime = new Date();
    elapsedTime = endTime - startTime;
    console.log(`Elapsed time waiting: ${elapsedTime}ms`);

    const hotels = await page.evaluate(() => {
        const hotelElements = Array.from(document.querySelectorAll('[data-stid="open-hotel-information"]'));

        return hotelElements.flatMap((el) => {
            const parentEl = el.parentElement;
            const {textContent: address} = parentEl.querySelector('.truncate-lines-2') || {};
            const {textContent: title = ''} = parentEl.querySelector('.overflow-wrap') || {};
            let price = parentEl.querySelector('[class*=spacing] [class*=spacing-padding-block-half]') || {};
            if (price) {
                price = parseInt(price.textContent.match(/\d+$/)[0]);
            }
            const reviewTextElement = parentEl.querySelector('[class*=layout-flex] [class*=layout-flex-align-items-flex-start]');
            const reviewText = reviewTextElement?.textContent?.trim() || '';
            const [reviewScore = null] = reviewText.match(/^(\d+\.\d+)\//) || [];
            const [reviewCount = null] = reviewText.match(/\(([\d,]+)\sreviews\)/) || [];
            const hotelUrl = `https://www.hotels.com${el.getAttribute('href')}`;
            const imageUrl = parentEl.querySelector('[class*=image-media]')?.src;

            return {
                address,
                title,
                price,
                reviewScore,
                reviewCount,
                hotelUrl,
                imageUrl
            };
        });
    });

    const hotelList = hotels.map((hotel) => {
        return new Hotel({
            address: hotel.address,
                title: hotel.title,
                price: hotel.price,
                reviewScore: hotel.reviewScore,
                reviewCount: hotel.reviewCount,
                hotelUrl: hotel.hotelUrl,
                imageUrl: hotel.imageUrl,
                userCheckIn,
                userCheckOut,
                adultCount: searchForm.adultCount,
                childrenCount: searchForm.childCount,
                roomCount: searchForm.roomCount,
                searchId
        });
    });

    endTime = new Date();
    elapsedTime = endTime - startTime;
    console.log(`Elapsed time scrape hotels: ${elapsedTime}ms`);

    browser.close().catch((e) => e);

    return hotelList;
}

async function scrapeHotelDetails(url, hotelId) {
    const startTime = new Date();

    url = url + '&locale=en_US';

    const browser = await puppeteer.launch({
        headless: false,
        devtools: false,
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
            '--metrics-recording-only',
        ]
    });

    const page = await browser.newPage();

    await page.setRequestInterception(true);

    page.on('request', (req) => {
        if (req.resourceType() === 'font' || req.resourceType() === 'xhr' || req.resourceType() === 'stylesheet') {
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
    console.log(`Elapsed time goto: ${elapsedTime}ms`);

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

    await page.waitForSelector('[class*=layout-flex-item] [class*=flex-item-flex-grow]');
    await page.waitForSelector('#Overview');
    await fastAutoScroll(page);

    endTime = new Date();
    elapsedTime = endTime - startTime;
    console.log(`Elapsed time waiting: ${elapsedTime}ms`);

    const html = await page.content();
    const $ = cheerio.load(html);

    // Working gets images
    hotelDetails.images = $('[class*=image] [class*=image-media]')
        .map((i, el) => $(el).attr('src'))
        .toArray();

    hotelDetails.images = hotelDetails.images.filter(x => !x.includes('maps.googleapis'))

    // TODO get close places from google api
    // Working, gets the list of close places with title but slows scraping
    // properties.closeLocations = $('ul[data-location-block-list="true"]').map((i, element) => {
    //     const title = $(element).parent().text().trim().replace($(element).text(), "").replace("\n", "");
    //     const locations = $(element).find('li').map((j, li) =>
    //         $(li).text().replace(/([A-Z])/g, ' $1').replace('\n', ' ').trim()).get();
    //     return {title, locations}
    // }).get();

    // Working gives summary
    const about = $('[data-stid="content-item"]')
    hotelDetails.summary = $(about).find('[class*=layout-grid-item] [class*=text] [class*=text-default-theme]').text().trim() || {};

    // Working get Most popular facilities
    const popularFacilities = $('[data-stid="hotel-amenities-list"]');
    hotelDetails.popularFacilities = [...new Set($(popularFacilities).find('ul[role="list"] > div > li').map((i, element) => {
        return $(element).text().trim();
    }).get())];

    // Working get the facilities and titles
    const facilities = $('[class*=spacing][class*=spacing-margin-blockend-four] > div');
    hotelDetails.facilities = facilities.map((_, elem) => {
        const title = $(elem).find('h3').text();
        const properties = $(elem).find('li div').map((_, subElem) => $(subElem).text().trim()).get();
        return {title, properties};
    }).get();

    // Working get the coordinates
    const coordinates = $('[itemprop="geo"]');
    hotelDetails.lat = coordinates.find('[itemprop="latitude"]').attr('content');
    hotelDetails.long = coordinates.find('[itemprop="longitude"]').attr('content');

    // Working hotel policies
    const glance = $('[class*=heading][class*=heading-4]:contains("At a glance")').parent().parent();
    const glances = $(glance).find('[class*=spacing][class*=spacing-margin-blockend-four] > div');

    const rules = glances.map((_, elem) => {
        const ruleName = $(elem).find('h3').text().trim();
        const ruleType = $(elem).find('li div').map((_, subElem) => $(subElem).text().trim()).get();

        let isAllowed = null;

        if (ruleName.toLowerCase() === 'children') {
            isAllowed = true;
        } else {
            if (Array.isArray(ruleType)) {
                if (ruleType.some(type => type.toLowerCase().includes('allowed') && type.toLowerCase().includes('no'))) {
                    isAllowed = false;
                } else if (ruleType.some(type => type.toLowerCase().includes('allowed'))) {
                    isAllowed = true;
                } else if (ruleType.some(type => type.toLowerCase().includes('no'))) {
                    isAllowed = false;
                }
            } else if (ruleType && typeof ruleType === 'string') {
                if (ruleType.toLowerCase().includes('allowed') && ruleType.toLowerCase().includes('no')) {
                    isAllowed = false;
                } else if (ruleType.toLowerCase().includes('allowed')) {
                    isAllowed = true;
                } else if (ruleType.toLowerCase().includes('no')) {
                    isAllowed = false;
                }
            }
        }

        return {ruleName, ruleType, isAllowed};
    }).get();

    const ruleNames = rules.map(rule => rule.ruleName);

    let checkRule = rules.find(rule => rule.ruleName === 'Arriving/Leaving') || '';
    let checkInTime = '';
    let checkOutTime = '';
    let ageRestriction = '';

    if (checkRule) {
        checkInTime = checkRule.ruleType.find(checkIn => checkIn.toLowerCase().includes('check-in time')).trim();
        checkOutTime = checkRule.ruleType.find(checkOut => checkOut.toLowerCase().includes('check-out time')).trim();
        const ageRestrictionString = checkRule.ruleType.find(checkOut => checkOut.toLowerCase().includes('minimum check-in age:'));
        if (ageRestrictionString) {
            ageRestriction = ageRestrictionString.split(':')[1].trim();
        }
    }

    const isChildrenAllowed = rules.some(rule => rule.ruleName.toLowerCase().includes('children'));

    const cancellation = 'Cancellation depends on the chosen booking option and may be available for an additional fee.'
    let policy = $('[class*=heading][class*=heading-5]:contains("Policies")').parent().parent().parent().parent()
        .text()
        .replace('Policies', '')
        .replace(/<\/p>/g, '')
        .replace(/<p>/g, '')
        .trim();

    let cards = '';
    if (policy.toLowerCase().includes('this property accepts credit cards and cash')) {
        cards = 'This property accepts credit cards and cash.'
        policy = policy.replace(cards, '').trim()
    }

    hotelDetails.policies = {
        checkInTime,
        checkOutTime,
        isChildrenAllowed,
        ageRestriction,
        rules,
        cards,
        cancellation
    };

    hotelDetails.summary = (hotelDetails.summary + ' ' + policy).trim();

    console.log(ruleNames)

    hotelDetails.facilities = hotelDetails.facilities.filter(facility => {
        return !ruleNames.some(rule => {
            return facility.title === rule;
        });
    });

    endTime = new Date();
    elapsedTime = endTime - startTime;
    console.log(`Elapsed time scrape hotels: ${elapsedTime}ms`);

    browser.close().catch((e) => e);

    return hotelDetails;
}

module.exports = {scrapeHotels, scrapeHotelDetails}
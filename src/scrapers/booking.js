const puppeteer = require('puppeteer-extra');
const cheerio = require('cheerio');
const Hotel = require('../models/hotel');
const HotelDetails = require('../models/hotelDetails');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
puppeteer.use(AdblockerPlugin({blockTrackers: true}));

async function scrapeHotels(searchForm, searchId) {
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
            // not idea if those 2 aa options are useful with disable gl thingy
            '--headless',
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
            '--no-sandbox',
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

    // Used to statically construct url now redundant
    // const search = 'londra';
    // const checkin_year = '2023';
    // const checkin_month = '3';
    // const checkin_monthday = '11';
    // const checkout_year = '2023';
    // const checkout_month = '3';
    // const checkout_monthday = '12';
    // const adultCount = 2;
    // const roomCount = 1;
    // const childrenCount = 0;

    // working without ssne&ssne_untouched
    // https://www.booking.com/searchresults.en-gb.html?ss=köln&checkin_year=2023&checkin_month=2&checkin_monthday=23&checkout_year=2023&checkout_month=2&checkout_monthday=24&group_adults=2&no_rooms=1&group_children=0&dest_type=city&sb_travel_purpose=leisure
    // with ssne&ssne_untouched
    // https://www.booking.com/searchresults.en-gb.html?ss=köln&ssne=köln&ssne_untouched=köln&checkin_year=2023&checkin_month=2&checkin_monthday=23&checkout_year=2023&checkout_month=2&checkout_monthday=24&group_adults=2&no_rooms=1&group_children=0&dest_type=city&sb_travel_purpose=leisure
    //&offset=30 = page 2
    // const url = 'https://www.booking.com/searchresults.en-gb.html?ss=' + search + '&ssne='
    //     + search + '&ssne_untouched=' + search + '&checkin_year=' + checkin_year + '&checkin_month='
    //     + checkin_month + '&checkin_monthday=' + checkin_monthday + '&checkout_year=' + checkout_year
    //     + '&checkout_month=' + checkout_month + '&checkout_monthday=' + checkout_monthday + '&group_adults='
    //     + adultCount + '&no_rooms=' + roomCount + '&group_children=' + childrenCount + '&dest_type=city&sb_travel_purpose=leisure';

    const url = 'https://www.booking.com/searchresults.en-gb.html?ss=' + searchForm.search + '&ssne='
        + searchForm.search + '&ssne_untouched=' + searchForm.search + '&checkin_year=' + searchForm.checkInYear + '&checkin_month='
        + searchForm.checkInMonth + '&checkin_monthday=' + searchForm.checkInDay + '&checkout_year=' + searchForm.checkOutYear
        + '&checkout_month=' + searchForm.checkOutMonth + '&checkout_monthday=' + searchForm.checkOutDay + '&group_adults='
        + searchForm.adultCount + '&no_rooms=' + searchForm.roomCount + '&group_children=' + searchForm.childCount + '&dest_type=city&sb_travel_purpose=leisure&selected_currency=TRY';

    const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36";
    await page.setUserAgent(ua);

    page.goto(url).catch((e) => e)
    let endTime = new Date();
    let elapsedTime = endTime - startTime;
    console.log(`Elapsed time goto: ${elapsedTime}ms`);
    await page.waitForSelector('#right');

    endTime = new Date();
    elapsedTime = endTime - startTime;
    console.log(`Elapsed time waiting: ${elapsedTime}ms`);

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

    const hotels = $('div[data-testid="property-card"]').map((i, el) => {
        const address = $(el).find('[data-testid="address"]').text().trim() || null;
        const title = $(el).find('div[data-testid="title"]').text().trim() || null;
        const price = $(el).find('[data-testid="price-and-discounted-price"]').text().match(/TL\s[\d,]+/)?.[0] || null;
        const starCount = $(el).find('div[data-testid="rating-stars"]').children().length || 0;
        const reviewElement = $(el).find('[data-testid="review-score"]').text().trim() || '0.0Good 0 reviews';
        let reviewScore = null;
        let reviewCount = null;
        if (reviewElement) {
            reviewScore = reviewElement.match(/^\d+\.\d+/)?.[0] || null;
            reviewCount = reviewElement.match(/\d+(,\d+)*\s+reviews/)?.[0]?.replace(/\D/g, '') || null;
        }
        const hotelUrl = $(el).find('a').attr('href') || null;
        const imageUrl = $(el).find('img[data-testid="image"]').attr('src') || null;

        return new Hotel({
            address,
            title,
            price,
            starCount,
            reviewScore,
            reviewCount,
            hotelUrl,
            imageUrl,
            userCheckIn,
            userCheckOut,
            searchId
        })
        // return {address, title, price, starCount, reviewScore, reviewCount, hotelUrl, imageUrl}
    }).get();

    endTime = new Date();
    elapsedTime = endTime - startTime;
    console.log(`Elapsed time scrape hotels: ${elapsedTime}ms`);

    browser.close().catch((e) => e);

    return hotels;
}

async function scrapeHotelDetails(url, hotelId) {
    const startTime = new Date()

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
            '--headless',
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

    // await page.setRequestInterception(true);
    //
    // page.on('request', (req) => {
    //     if (req.resourceType() === 'xhr' || req.resourceType() === 'font' || req.resourceType() === 'stylesheet') {
    //         req.abort();
    //     } else {
    //         req.continue();
    //     }
    // });

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
    console.log(`Elapsed time waiting: ${elapsedTime}ms`);

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
    checkInTime = checkInTime.toLowerCase()
        // .replace('from', '')
        // .replace('to', '-')
        // .replace('until', '')
        .replace('/\n/g', '')
        // .replace('check-in', '')
        // .replace('available 24 hours', '00:00 - 24:00')
        // .replace('hours', '')
        // .replace('undefined', '')
        // .replace('guests are required to show a photo identification and credit card upon check-in', '')
        .replace('/\n/g', '')
        .trim();

    let checkOutTime = $('#checkout_policy').text() || '';
    checkOutTime = checkOutTime.toLowerCase()
        // .replace('from', '')
        // .replace('to', '-')
        // .replace('until', '')
        .replace('/\n/g', ' ')
        // .replace('check-out', '')
        // .replace('available 24 hours', '00:00 - 24:00')
        // .replace('hours', '')
        // .replace('undefined', '')
        // .replace('guests are required to show a photo identification and credit card upon check-in', '')
        // .replace('15:00 - 00:00\\n\\nyou\'ll need to let the property know in advance what time you\'ll arrive.')
        .replace('/\n/g', ' ')
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
    console.log(`Elapsed time scrape hotels: ${elapsedTime}ms`);

    // browser.close().catch((e) => e);

    return hotelDetails;
}

module.exports = {scrapeHotels, scrapeHotelDetails}
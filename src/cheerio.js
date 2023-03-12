const puppeteer = require('puppeteer-extra');
const cheerio = require('cheerio')
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')
puppeteer.use(AdblockerPlugin({blockTrackers: true}))

async function scrapeHotels(searchForm) {
    const totalStartTime = new Date();
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
            // not idea if those 2 aa options are usefull with disable gl thingy
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
        if(req.resourceType() == 'font' || req.resourceType() == 'image'){
            req.abort();
        }
        else {
            req.continue();
        }
    });

    // await page.setViewport({
    //     width: 800,
    //     height: 600
    // });

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
    const startTime = new Date();
    page.goto(url).catch((e) => e)


    await page.waitForSelector('div[data-testid="property-card"]');

    const html = await page.content();
    const $ = cheerio.load(html);

    const hotels = $('div[data-testid="property-card"]').map((i, el) => {
        const address = $(el).find('[data-testid="address"]').text().trim();
        const title = $(el).find('div[data-testid="title"]').text().trim();
        const price = $(el).find('[data-testid="price-and-discounted-price"]').text().match(/TL\s[\d,]+/)[0];
        const starCount = $(el).find('div[data-testid="rating-stars"]').children().length || 0;
        const reviewElement = $(el).find('[data-testid="review-score"]').text().trim() || '0.0Good 0 reviews';
        const reviewScore = reviewElement.match(/^\d+\.\d+/)[0];
        const reviewCount = reviewElement.match(/\d+(,\d+)*\s+reviews/)[0].replace(/\D/g, '');
        const hotelUrl = $(el).find('a').attr('href');
        const imageUrl = $(el).find('img[data-testid="image"]').attr('src');

        return { address, title, /*price, */starCount, reviewScore, reviewCount, hotelUrl, imageUrl };
    }).get();

    const endTime = new Date();
    const elapsedTime = endTime - startTime;
    browser.close().catch((e) => e);
    const totalEndTime = new Date();
    const totalElapsedTime = totalEndTime - totalStartTime;
    console.log(`Elapsed time scrape hotels: ${elapsedTime}ms`);
    console.log(`Total elapsed time: ${totalElapsedTime}ms`);
    return hotels;
    //
    // await page.waitForSelector('div[data-testid="property-card"]');
    //
    // // const hotels = await page.$$eval('div[data-testid="property-card"]', items => {
    // //     return items.map(item => {
    // //         const address = item.querySelector('[data-testid="address"]').textContent.trim();
    // //         const title = item.querySelector('div[data-testid="title"]').innerText.trim();
    // //         const price = item.querySelector('[data-testid="price-and-discounted-price"]').textContent.trim().match(/TL\s[\d,]+/)[0];
    // //         const starCount = item.querySelector('div[data-testid="rating-stars"]')?.childElementCount || 0;
    // //         const reviewElement = item.querySelector('[data-testid="review-score"]')?.textContent.trim() || '0.0Good 0 reviews';
    // //         const reviewScore = reviewElement.match(/^\d+\.\d+/)[0];
    // //         const reviewCount = reviewElement.match(/\d+(,\d+)*\s+reviews/)[0].replace(/\D/g, '');
    // //         const hotelUrl = item.querySelector('a').href;
    // //         const imageUrl = item.querySelector('img[data-testid="image"]').src;
    // //
    // //         return {address, title, price, starCount, reviewScore, reviewCount, hotelUrl, imageUrl};
    // //     });
    // // }).catch(e => console.log(e));
    //
    //
    // const hotels = await page.evaluate(() => {
    //     const items = document.querySelectorAll('div[data-testid="property-card"]');
    //     return Array.from(items).map((item) => {
    //         const address = item.querySelector('[data-testid="address"]')?.innerText.trim();
    //         const title = item.querySelector('div[data-testid="title"]')?.innerText.trim();
    //         const price = item.querySelector('[data-testid="price-and-discounted-price"]')?.innerText.trim().match(/TL\s[\d,]+/)[0];
    //         const starCount = item.querySelector('div[data-testid="rating-stars"]')?.childElementCount || 0;
    //         const reviewElement = item.querySelector('[data-testid="review-score"]')?.innerText.trim() || '0.0Good 0 reviews';
    //         const reviewScore = reviewElement.match(/^\d+\.\d+/)[0];
    //         const reviewCount = reviewElement.match(/\d+(,\d+)*\s+reviews/)[0].replace(/\D/g, '');
    //         const hotelUrl = item.querySelector('a')?.href;
    //         const imageUrl = item.querySelector('img[data-testid="image"]')?.src;
    //
    //         return { address, title, price, starCount, reviewScore, reviewCount, hotelUrl, imageUrl };
    //     });
    // });
    //
    // // console.log(hotels);
    // const endTime = new Date();
    // const elapsedTime = endTime - startTime;
    // // await iterateHotels(browser, hotels)
    // browser.close().catch((e) => e);
    // const totalEndTime = new Date();
    // const totalElapsedTime = totalEndTime - totalStartTime;
    // console.log(`Elapsed time scrape hotels: ${elapsedTime}ms`);
    // console.log(`Total elapsed time: ${totalElapsedTime}ms`);
    // return hotels
}

async function scrapeHotelDetails(url) {
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
            // not idea if those 2 aa options are usefull with disable gl thingy
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
            '--no-sandbox', // meh but better resource comsuption
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
        if(req.resourceType() == 'font' || req.resourceType() == 'image'){
            req.abort();
        }
        else {
            req.continue();
        }
    });
    const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36";
    await page.setUserAgent(ua);
    const startTime = new Date();
    page.goto(new URL(url.url)).catch((e) => e);

    const properties = {
        closeLocations: '',
        summary: '',
        popularFacilities: '',
        facilities: '',
        policies: ''
    }

    await page.waitForSelector('body');

    const html = await page.content();
    const $ = cheerio.load(html);


    properties.closeLocations = $('ul[data-location-block-list="true"]').map((i, element) => {
        const title = $(element).parent().text().trim().replace($(element).text(), "").replace("\n", "");
        const locations = $(element).find('li').map((j, li) =>
            $(li).text().replace(/([A-Z])/g, ' $1').replace('\n', ' ').trim()).get();
        return {title, locations}
    }).get();

    properties.summary = $('#property_description_content > p').map((i, element) =>
        $(element).text().trim()).get();

    properties.popularFacilities = $('[data-testid="facility-list-most-popular-facilities"] > div').map((i, element) => {
        const title = 'Most popular facilities';
        const facilities = $(element).text().trim();
        return {title, facilities};
    }).get();

    properties.facilities = $('[data-testid="facility-group-icon"').map((i, element) => {
        const parentElement = $(element).parent();
        const title = parentElement.text().trim();
        const properties = parentElement.parent().parent().parent().text().replace(title, "").trim().split("\n");
        return {title, properties}
    }).get();

    properties.policies = $('#hotelPoliciesInc').map((i, element) => {
        const checkInTime = $(element).find('#checkin_policy .timebar__caption').text().trim() || '';
        const checkOutTime = $(element).find('#checkout_policy .timebar__caption').text().trim() || '';
        const isChildrenAllowed = !$(element).find('[data-test-id="child-policies-block"]').text().includes("not allowed") || false;
        const ageRestriction = $(element).find('#age_restriction_policy').text().match(/\d+/) ? [0] : 0;
        const rules = $(element).find('.description--house-rule p.policy_name').map((j, rule) => {
            const ruleName = $(rule).text().replaceAll("\n", "").trim();
            const ruleType = $(rule).parent().text().replace(ruleName, "").replaceAll("\n", "").trim();
            let isAllowed = null;
            if (ruleType.toLocaleLowerCase().includes("not allowed")) {
                isAllowed = false;
            } else if (ruleType.toLocaleLowerCase().includes("allowed")) {
                isAllowed = true
            }
            return {ruleName, ruleType, isAllowed}
        }).get();
        const paymentCards = $(element).find('.payment_methods_overall img').map((j, payment) => {
            return $(payment).attr('title').trim();
        }).get();
        const noImageCards = $(element).find('.no-image-payment').map((j, payment) => {
            return $(payment).text().trim();
        }).get();
        const cards = paymentCards.concat(noImageCards);
        const cancellation = $(element).find('#cancellation_policy').text().replaceAll("\n", "").replace("Cancellation/prepayment", "").trim();
        return {checkInTime, checkOutTime, isChildrenAllowed, ageRestriction, rules, cards, cancellation};
    }).get();

    const endTime = new Date();
    const elapsedTime = endTime - startTime;
    console.log(`Elapsed time scrape hotels: ${elapsedTime}ms`);

    return properties;
}

module.exports = {scrapeHotels, scrapeHotelDetails}
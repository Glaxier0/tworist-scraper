const puppeteer = require('puppeteer');
const url = require("url");

async function scrapeHotels() {
    const browser = await puppeteer.launch({
        headless: false
    });
    const page = await browser.newPage();

    const search = 'londra';
    const checkin_year = '2023';
    const checkin_month = '2';
    const checkin_monthday = '24';
    const checkout_year = '2023';
    const checkout_month = '2';
    const checkout_monthday = '25';
    const adultCount = 2;
    const roomCount = 1;
    const childrenCount = 0;

    // working without ssne&ssne_untouched
    // https://www.booking.com/searchresults.en-gb.html?ss=köln&checkin_year=2023&checkin_month=2&checkin_monthday=23&checkout_year=2023&checkout_month=2&checkout_monthday=24&group_adults=2&no_rooms=1&group_children=0&dest_type=city&sb_travel_purpose=leisure
    // with ssne&ssne_untouched
    // https://www.booking.com/searchresults.en-gb.html?ss=köln&ssne=köln&ssne_untouched=köln&checkin_year=2023&checkin_month=2&checkin_monthday=23&checkout_year=2023&checkout_month=2&checkout_monthday=24&group_adults=2&no_rooms=1&group_children=0&dest_type=city&sb_travel_purpose=leisure
    //&offset=30 = page 2
    const url = 'https://www.booking.com/searchresults.en-gb.html?ss=' + search + '&ssne='
        + search + '&ssne_untouched=' + search + '&checkin_year=' + checkin_year + '&checkin_month='
        + checkin_month + '&checkin_monthday=' + checkin_monthday + '&checkout_year=' + checkout_year
        + '&checkout_month=' + checkout_month + '&checkout_monthday=' + checkout_monthday + '&group_adults='
        + adultCount + '&no_rooms=' + roomCount + '&group_children=' + childrenCount + '&dest_type=city&sb_travel_purpose=leisure';

    // await page.goto('https://www.booking.com');
    await page.goto(url);

    // // Wait for dialog to show up
    // await page.waitForSelector('[role="dialog"]');
    // // Retrieve the button element
    // const button = await page.$('button[aria-label="Dismiss sign in information."]');
    // // Click the button
    // await button.click();

    // // Wait dialog to show up
    // await page.click('[role="dialog"]').then(
    //     const element = await page.$('svg[xmlns="http://www.w3.org/2000/svg"]')
    //     element.click());

    // await page.click('[data-testid="date-display-field-start"]');
    // await page.click('[data-date="2023-02-23"]');
    // await page.click('[data-date="2023-02-24"]');
    // await page.click('.sb-searchbox__button'); // Click search button

    // Wait for search results to load
    // await page.waitForSelector('#hotellist_inner');

    // Scrape hotel data from search results

    // const hotels = await page.$$eval('div[data-testid="property-card"]', items => {
    //     return items.map(async item => {
    //         const name = item.querySelector('div[data-testid="title"]').innerText.trim();
    //         const price = item.querySelector('[data-testid="price-and-discounted-price"]').innerText.trim();
    //         // const rating = item.querySelector('div[data-testid="rating-stars"]');
    //         const rating = await item.evaluate(item => {
    //             const ratingElement = item.querySelector('div[data-testid="rating-stars"]');
    //
    //             return ratingElement.childElementCount;
    //         });
    //
    //         return {name, price, rating};
    //     });
    // });


    const items = await page.$$('div[data-testid="property-card"]');

    // console.log(await items[0].evaluate(el => el.innerHTML))

    const hotels = await Promise.all(items.map(async (item) => {
        const address = await item.$eval('[data-testid="address"]', (el) => el.textContent.trim())
        const title = await item.$eval('div[data-testid="title"]', (el) => el.innerText.trim());
        const price = (await item.$eval('[data-testid="price-and-discounted-price"]',
            (el) => el.textContent.trim())).match(/TL\s[\d,]+/)[0];
        // Get star count and null check
        const starCount = await item.evaluate(item => {
            const ratingElement = item.querySelector('div[data-testid="rating-stars"]');
            if (ratingElement)
                return ratingElement.childElementCount;
            return 0
        });
        // Get review element and null check
        const review = await item.evaluate(item => {
            const reviewElement = item.querySelector('[data-testid="review-score"]');
            if (reviewElement)
                return reviewElement.textContent.trim();
            return '0.0Good 0 reviews'
        });
        // Parse review score using regex
        const reviewScore = review.match(/^\d+\.\d+/)[0];
        // Parse review count using regex
        const reviewCount = review.match(/\d+(,\d+)*\s+reviews/)[0].replace(/\D/g, '');
        // Get hotel Url
        const hotelUrl = await item.$eval('a', (el) => el.href);
        // Get image Url
        const imageUrl = await item.$eval('img[data-testid="image"]', img => img.src);

        return {address, title, price, starCount, reviewScore, reviewCount, hotelUrl, imageUrl};
    }));

    // hotels.map(async (hotel) => {
    //     await page.goto(hotel.hotelUrl);
    // })

    console.log(hotels);

    iterateHotels(browser, hotels)
    // await browser.close();
}

async function iterateHotels(browser, hotels) {
    const urls = hotels.map(hotel => hotel.hotelUrl);
    // const pages = await Promise.all(urls.map(url => browser.newPage()));

    const batchSize = 10;

    const scrapeBatch = async (batch) => {
        const pages = await Promise.all(batch.map(url => browser.newPage()));
        const scrapePromises = pages.map(page => {
            const index = batch.indexOf(page.url());
            return page.goto(batch[index])
                .then(() => Promise.all([
                    // page.$eval('.hotelName', element => element.textContent),
                    // page.$eval('.hotelAddress', element => element.textContent),
                    // page.$eval('.hotelRating', element => element.textContent)
                ]))
                .then(([hotelName, hotelAddress, hotelRating]) => {
                    // console.log(`Hotel Name: ${hotelName}`);
                    // console.log(`Hotel Address: ${hotelAddress}`);
                    // console.log(`Hotel Rating: ${hotelRating}`);
                })
                .then(() => page.close());
        });
        await Promise.all(scrapePromises);
    };

    const batches = urls.reduce((resultArray, item, index) => {
        const chunkIndex = Math.floor(index / batchSize);
        if (!resultArray[chunkIndex]) {
            resultArray[chunkIndex] = [];
        }
        resultArray[chunkIndex].push(item);
        return resultArray;
    }, []);

    for (const batch of batches) {
        await scrapeBatch(batch);
    }

    // await browser.close();


    // const scrapePromises = pages.map((page, index) => {
    //     const url = urls[index];
    //     return page.goto(url)
    //         .then(() => Promise.all([
    //             // page.$eval('.hotelName', element => element.textContent),
    //             // page.$eval('.hotelAddress', element => element.textContent),
    //             // page.$eval('.hotelRating', element => element.textContent)
    //         ]))
    //         .then(([hotelName, hotelAddress, hotelRating]) => {
    //             // console.log(`Hotel Name: ${hotelName}`);
    //             // console.log(`Hotel Address: ${hotelAddress}`);
    //             // console.log(`Hotel Rating: ${hotelRating}`);
    //         })
    //         .then(() => page.close());
    // });
    //
    // await Promise.all(scrapePromises);
    //
    // await browser.close();

    // for (const hotel of hotels) {
    //     const page = await browser.newPage();
    //     await page.goto(hotel.hotelUrl);
    //
    //     // const hotelName = await page.$eval('h1', element => element.textContent);
    //     // console.log(hotelName);
    //
    //     // await page.close();
    // }
}

scrapeHotels();
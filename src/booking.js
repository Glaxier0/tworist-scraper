const puppeteer = require('puppeteer');

async function scrapeHotels() {
    const startTime = new Date();
    const browser = await puppeteer.launch({
        headless: false
    });

    const page = await browser.newPage();

    // await page.setViewport({
    //     width: 80,
    //     height: 60
    // });

    const search = 'londra';
    const checkin_year = '2023';
    const checkin_month = '2';
    const checkin_monthday = '28';
    const checkout_year = '2023';
    const checkout_month = '3';
    const checkout_monthday = '1';
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
    const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36";
    await page.setUserAgent(ua);
    page.goto(url);

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

    await page.waitForSelector('div[data-testid="property-card"]');
    // /*
    const hotels = await page.$$eval('div[data-testid="property-card"]', items => {
        return items.map(item => {
            const address = item.querySelector('[data-testid="address"]').textContent.trim();
            const title = item.querySelector('div[data-testid="title"]').innerText.trim();
            const price = item.querySelector('[data-testid="price-and-discounted-price"]').textContent.trim().match(/TL\s[\d,]+/)[0];
            const starCount = item.querySelector('div[data-testid="rating-stars"]')?.childElementCount || 0;
            const reviewElement = item.querySelector('[data-testid="review-score"]')?.textContent.trim() || '0.0Good 0 reviews';
            const reviewScore = reviewElement.match(/^\d+\.\d+/)[0];
            const reviewCount = reviewElement.match(/\d+(,\d+)*\s+reviews/)[0].replace(/\D/g, '');
            const hotelUrl = item.querySelector('a').href;
            const imageUrl = item.querySelector('img[data-testid="image"]').src;
            const latLng = '';
            return { address, title, price, starCount, reviewScore, reviewCount, hotelUrl, imageUrl, latLng };
        });
    });

    // */
    // console.log(await items[0].evaluate(el => el.innerHTML))
    /*
    const items = await page.$$('div[data-testid="property-card"]');

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
        let latLng = '';

        return {address, title, price, starCount, reviewScore, reviewCount, hotelUrl, imageUrl, latLng};
    }));
    */


    // hotels.map(async (hotel) => {
    //     await page.goto(hotel.hotelUrl);
    // })

    // console.log(hotels);
    const endTime = new Date();
    const elapsedTime = endTime - startTime;
    console.log(`Elapsed time scrape hotels: ${elapsedTime}ms`);
    await iterateHotels(browser, hotels)
    // await browser.close();
}

async function iterateHotels(browser, hotels) {
    const startTime = new Date();
    // const urls = hotels.map(hotel => hotel.hotelUrl);
    // const pages = await Promise.all(urls.map(url => browser.newPage()));

    const batchSize = 10;

    const scrapeBatch = async (batchHotels) => {
        const context = await browser.createIncognitoBrowserContext();
        const pages = await Promise.all(batchHotels.map(() => context.newPage()));
        // const pages = await Promise.all(batchHotels.map(() => browser.newPage()));

        const scrapePromises = pages.map(async (page, index) => {
            const url = batchHotels[index].hotelUrl;
            page.goto(url).catch(e => e);
            await page.waitForSelector('#hotel_address');
            const element = await page.$('#hotel_address'); // replace with the ID of the "a" element
            batchHotels[index].latLng = await element.evaluate(el => el.getAttribute('data-atlas-latlng'));

            page.close().catch(e => e)
        });

        await Promise.all(scrapePromises);
        console.log(batchHotels)
    };

    // console.log("before batches")
    const batches = hotels.reduce((resultArray, item, index) => {
        // console.log("inside batches")
        const chunkIndex = Math.floor(index / batchSize);
        if (!resultArray[chunkIndex]) {
            resultArray[chunkIndex] = [];
        }
        resultArray[chunkIndex].push(item);
        return resultArray;
    }, []);

    // console.log("before for")
    for (const batch of batches) {
        // console.log("inside for")
        await scrapeBatch(batch);
    }


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
    const endTime = new Date();
    const elapsedTime = endTime - startTime;
    console.log(`Elapsed time iterate hotels: ${elapsedTime}ms`);
}

scrapeHotels().then(r => r);
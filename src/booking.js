const puppeteer = require('puppeteer');

async function scrapeHotels() {
    const totalStartTime = new Date();
    const browser = await puppeteer.launch({
        headless: true
    });

    const page = await browser.newPage();

    // await page.setViewport({
    //     width: 800,
    //     height: 600
    // });

    const search = 'londra';
    const checkin_year = '2023';
    const checkin_month = '3';
    const checkin_monthday = '2';
    const checkout_year = '2023';
    const checkout_month = '3';
    const checkout_monthday = '3';
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

    const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36";
    await page.setUserAgent(ua);
    const startTime = new Date();
    page.goto(url).catch((e) => e);

    await page.waitForSelector('div[data-testid="property-card"]');

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
            const properties = {
                latLng: " ",
            };
            // const latLng = '';
            return {address, title, price, starCount, reviewScore, reviewCount, hotelUrl, imageUrl, properties};
        });
    });

    // console.log(hotels);
    const endTime = new Date();
    const elapsedTime = endTime - startTime;
    await iterateHotels(browser, hotels)
    browser.close().catch((e) => e);
    const totalEndTime = new Date();
    const totalElapsedTime = totalEndTime - totalStartTime;
    console.log(`Elapsed time scrape hotels: ${elapsedTime}ms`);
    console.log(`Total elapsed time: ${totalElapsedTime}ms`);
}

async function iterateHotels(browser, hotels) {
    const startTime = new Date();
    const batchSize = 10;

    const scrapeBatch = async (batchHotels, count) => {
        const context = await browser.createIncognitoBrowserContext();
        const pages = await Promise.all(batchHotels.map(() => context.newPage()));

        const scrapePromises = pages.map(async (page, index) => {
            const url = batchHotels[index].hotelUrl;
            page.goto(url).catch(e => e);
            await page.waitForSelector('#hotel_address');
            const element = await page.$('#hotel_address'); // replace with the ID of the "a" element
            hotels[index + ((batchSize) * count)].properties.latLng = await element.evaluate(el => el.getAttribute('data-atlas-latlng'));
            // const surroundings = await page.$('[data-testid="property-section--content"]'); // replace with the ID of the "a" element
            // const test = await page.$$eval('ul[data-location-block-list="true"]');
            // const ulHtml = await page.evaluate(test => test.innerHTML, test);
            // console.log(ulHtml);
            // surroundings.evaluate(el => el)
            await page.waitForSelector('[data-testid="property-section--content"]');
            // const test = await page.$eval('[data-testid="property-section--content"]', (el) => el.innerHTML)
            // const test = await page.$eval('[data-testid="property-section--content"]', (el) => {
            //     const element = el.$eval('ul[data-location-block-list="true"]', (el) => el.innerHTML);
            //     console.log(element)
            // })


            // const content = await page.$eval('[data-testid="property-section--content"]', element => {
            //     const ul = element.$('ul[data-location-block-list="true"]');
            //     // const category = page.$x('//*[@id="basiclayout"]/div[1]/div[10]/div/div/div/div/section/div/div[2]/div/div/div/div/div');
            //     // element.querySelector('//*[@id="basiclayout"]/div[1]/div[10]/div/div/div/div/section/div/div[2]/div/div/div/div/div');
            //     // const category = ul.outerHTML
            //     return {
            //         ul
            //         // list: Array.from(ul.querySelectorAll('li'), li => li.textContent.trim())
            //     }
            // });

            const content = await page.$('[data-testid="property-section--content"]');
            const ul = await content.$('ul[data-location-block-list="true"]');

            // console.log(content)
            console.log(ul)
            // const test = await page.evaluate(() => document.querySelector('[data-testid="property-section--content"]').innerHTML);

            // console.log(test)

            // const locationBlockList = await page.$$(
            //     '[data-testid="property-section--content"] > div > ul'
            // );

            // console.log(locationBlockList)
            // Extract the HTML content of the ul element
            // const ulHtml = await page.evaluate(locationBlockList => locationBlockList.innerHTML, locationBlockList);

            // console.log(ulHtml);
            // console.log(test)
            // console.log(test.innerHTML)
            page.close().catch(e => e)
        });

        await Promise.all(scrapePromises);
    };

    const batches = hotels.reduce((resultArray, item, index) => {
        const chunkIndex = Math.floor(index / batchSize);
        if (!resultArray[chunkIndex]) {
            resultArray[chunkIndex] = [];
        }
        resultArray[chunkIndex].push(item);
        return resultArray;
    }, []);

    let count = 0;
    for (const batch of batches) {
        await scrapeBatch(batch, count);
        count++;
    }

    const endTime = new Date();
    const elapsedTime = endTime - startTime;
    // console.log(hotels)
    console.log(`Elapsed time iterate hotels: ${elapsedTime}ms`);
}

scrapeHotels().then(r => r);
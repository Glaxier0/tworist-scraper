const puppeteer = require('puppeteer');
async function scrapeHotels(searchForm) {
    const totalStartTime = new Date();
    const browser = await puppeteer.launch({
        headless: true
    });

    const page = await browser.newPage();

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
        + searchForm.adultCount + '&no_rooms=' + searchForm.roomCount + '&group_children=' + searchForm.childCount + '&dest_type=city&sb_travel_purpose=leisure';

    const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36";
    await page.setUserAgent(ua);
    const startTime = new Date();
    page.goto(url).catch((e) => e);

    await page.waitForSelector('div[data-testid="property-card"]');

    // const hotels = await page.$$eval('div[data-testid="property-card"]', items => {
    //     return items.map(item => {
    //         const address = item.querySelector('[data-testid="address"]').textContent.trim();
    //         const title = item.querySelector('div[data-testid="title"]').innerText.trim();
    //         const price = item.querySelector('[data-testid="price-and-discounted-price"]').textContent.trim().match(/TL\s[\d,]+/)[0];
    //         const starCount = item.querySelector('div[data-testid="rating-stars"]')?.childElementCount || 0;
    //         const reviewElement = item.querySelector('[data-testid="review-score"]')?.textContent.trim() || '0.0Good 0 reviews';
    //         const reviewScore = reviewElement.match(/^\d+\.\d+/)[0];
    //         const reviewCount = reviewElement.match(/\d+(,\d+)*\s+reviews/)[0].replace(/\D/g, '');
    //         const hotelUrl = item.querySelector('a').href;
    //         const imageUrl = item.querySelector('img[data-testid="image"]').src;
    //
    //         return {address, title, price, starCount, reviewScore, reviewCount, hotelUrl, imageUrl};
    //     });
    // });

    const hotels = await page.evaluate(() => {
        const items = document.querySelectorAll('div[data-testid="property-card"]');
        return Array.from(items).map((item) => {
            const address = item.querySelector('[data-testid="address"]').textContent.trim();
            const title = item.querySelector('div[data-testid="title"]').innerText.trim();
            const price = item.querySelector('[data-testid="price-and-discounted-price"]').textContent.trim().match(/TL\s[\d,]+/)[0];
            const starCount = item.querySelector('div[data-testid="rating-stars"]')?.childElementCount || 0;
            const reviewElement = item.querySelector('[data-testid="review-score"]')?.textContent.trim() || '0.0Good 0 reviews';
            const reviewScore = reviewElement.match(/^\d+\.\d+/)[0];
            const reviewCount = reviewElement.match(/\d+(,\d+)*\s+reviews/)[0].replace(/\D/g, '');
            const hotelUrl = item.querySelector('a').href;
            const imageUrl = item.querySelector('img[data-testid="image"]').src;

            return { address, title, price, starCount, reviewScore, reviewCount, hotelUrl, imageUrl };
        });
    });

    // console.log(hotels);
    const endTime = new Date();
    const elapsedTime = endTime - startTime;
    // await iterateHotels(browser, hotels)
    browser.close().catch((e) => e);
    const totalEndTime = new Date();
    const totalElapsedTime = totalEndTime - totalStartTime;
    console.log(`Elapsed time scrape hotels: ${elapsedTime}ms`);
    console.log(`Total elapsed time: ${totalElapsedTime}ms`);
    return hotels
}

async function scrapeHotelDetails(url) {
    const browser = await puppeteer.launch({
        headless: true
    });

    const page = await browser.newPage();
    // const url = 'https://www.booking.com/hotel/gb/comfortinnedgware.en-gb.html?aid=397594&label=gog235jc-1FCAEoggI46AdIKFgDaOQBiAEBmAEouAEXyAEM2AEB6AEB-AECiAIBqAIDuAKAwKygBsACAdICJDBkM2MzYTVlLTQwMjgtNGY2Yy05ZDQxLTc2MjRmYmU4ZmEyNNgCBeACAQ&sid=72a9d1104ff45429504706b924efcdd4&all_sr_blocks=23180306_190199343_3_0_0;checkin=2023-03-10;checkout=2023-03-11;dest_id=-2601889;dest_type=city;dist=0;group_adults=2;group_children=0;hapos=3;highlighted_blocks=23180306_190199343_3_0_0;hpos=3;matching_block_id=23180306_190199343_3_0_0;no_rooms=1;req_adults=2;req_children=0;room1=A%2CA;sb_price_type=total;sr_order=popularity;sr_pri_blocks=23180306_190199343_3_0_0__11993;srepoch=1678451288;srpvid=fd5957ab31d700a7;type=total;ucfs=1&#hotelTmpl';
    const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36";
    await page.setUserAgent(ua);
    const startTime = new Date();
    // page.goto("https://www.booking.com/hotel/gb/birds-nest-residency.en-gb.html?aid=304142&label=gen173nr-1FCAQoggI46wdICVgEaOQBiAEBmAEJuAEXyAEM2AEB6AEB-AEDiAIBqAIDuALZsv6fBsACAdICJDQ0MTliYzVjLTdkOTQtNDdjNy1hMTRjLWIxNmEzMmRjZGE0NNgCBeACAQ&sid=72a9d1104ff45429504706b924efcdd4&all_sr_blocks=889154202_358921867_2_0_0;checkin=2023-03-03;checkout=2023-03-04;dest_id=-2601889;dest_type=city;dist=0;group_adults=2;group_children=0;hapos=4;highlighted_blocks=889154202_358921867_2_0_0;hpos=4;matching_block_id=889154202_358921867_2_0_0;no_rooms=1;req_adults=2;req_children=0;room1=A%2CA;sb_price_type=total;sr_order=popularity;sr_pri_blocks=889154202_358921867_2_0_0__21600;srepoch=1677698182;srpvid=ce458782d6e902e0;type=total;ucfs=1&#hotelTmpl").catch((e) => e);
    page.goto(new URL(url.url)).catch((e) => e);

    const properties = {
        closeLocations: '',
        summary: '',
        popularFacilities: '',
        facilities: '',
        policies: ''
    }

    // Working, gets the list of close places with title
    await page.waitForSelector('ul[data-location-block-list="true"]');
    // console.log(closeLocations);
    properties.closeLocations = await page.$$eval('ul[data-location-block-list="true"]',
        liLists => {
            return liLists.map(liList => {
                const title = liList.parentElement.innerText.trim()
                    .replace(liList.innerText, "").replace("\n", "");
                const locations = Array.from(liList.querySelectorAll('li')).map(li =>
                    li.innerText.replace(/([A-Z])/g, ' $1')
                        .replace('\n', ' ').trim());
                return {title, locations}
            });
        });

    // Working gives location titles, redundant now
    // const elements = await page.$$('div.b3d1cacd40.cc56d568f0 > div.ac78a73c96.f0d4d6a2f5.fda3b74d0d');
    // const texts = await Promise.all(elements.map(element => element.evaluate(node => node.textContent.trim())));
    // console.log(texts);

    // Working gives summary
    await page.waitForSelector('#property_description_content');
    // console.log(summary)
    properties.summary = await page.$$eval('#property_description_content > p',
        elements => elements.map(element => element["innerText"].trim()));

    // Working get Most popular facilities
    // console.log(popularFacilities);
    properties.popularFacilities = await page.$$eval('[data-testid="facility-list-most-popular-facilities"] > div',
        elements => {
            const title = 'Most popular facilities';
            const facilities = elements.map(element => element["innerText"].trim());
            return {title, facilities};
        });

    // Working get facilities and titles
    // console.log(facilities);
    properties.facilities = await page.$$eval('[data-testid="facility-group-icon"', elements => {
        return elements.map(element => {
            const parentElement = element.parentElement;
            const title = parentElement.innerText;
            const properties = parentElement.parentElement.parentElement.parentElement.innerText
                .replace(title, "").trim().split("\n")
            return {title, properties}
        });
    });

    // Working hotel policies
    // console.log(policies)
    properties.policies = await page.$eval('#hotelPoliciesInc', element => {
        const checkInTime = element.querySelector('#checkin_policy .timebar__caption')?.textContent.trim() ?? '';
        const checkOutTime = element.querySelector('#checkout_policy .timebar__caption')?.textContent.trim() ?? '';
        const isChildrenAllowed = !element.querySelector('[data-test-id="child-policies-block"]')?.textContent
            .includes("not allowed") ?? false;
        const ageRestriction = element.querySelector('#age_restriction_policy')
            .textContent.match(/\d+/) ? [0].trim() : 0;
        const rules = Array.from(element.querySelectorAll('.description--house-rule p.policy_name')).map(rule => {
            const ruleName = rule.textContent.replaceAll("\n", "").trim()
            const ruleType = rule.parentElement.textContent.replace(ruleName, "")
                .replaceAll("\n", "").trim();
            let isAllowed = null;
            if (ruleType.toLocaleLowerCase().includes("not allowed")) {
                isAllowed = false;
            } else if (ruleType.toLocaleLowerCase().includes("allowed")) {
                isAllowed = true
            }

            return {ruleName, ruleType, isAllowed}
        });
        const paymentCards = Array.from(element.querySelectorAll('.payment_methods_overall img')).map(payment => {
            return payment.getAttribute('title').trim()
        })
        const noImageCards = Array.from(element.querySelectorAll('.no-image-payment')).map(payment => {
            return payment.textContent.trim()
        })
        const cards = paymentCards.concat(noImageCards)

        // Placeholder in case of other cancellation throws error
        // const cancellationPolicy = element.querySelector('#cancellation_policy .policy_name')
        // const cancellation = cancellationPolicy.parentElement.textContent
        //     .replace(cancellationPolicy.textContent, "")
        //     .replaceAll("\n", "").trim();

        const cancellation = element.querySelector('#cancellation_policy')
            .textContent.replaceAll("\n", "")
            .replace("Cancellation/prepayment", "").trim()

        return {checkInTime, checkOutTime, isChildrenAllowed, ageRestriction, rules, cards, cancellation}
    });

    const endTime = new Date();
    const elapsedTime = endTime - startTime;
    browser.close().catch((e) => e);
    console.log(`Elapsed time scrape hotels: ${elapsedTime}ms`);

    return properties;
}

// async function iterateHotels(browser, hotels) {
//     const startTime = new Date();
//     const batchSize = 10;
//
//     const scrapeBatch = async (batchHotels, count) => {
//         const context = await browser.createIncognitoBrowserContext();
//         const pages = await Promise.all(batchHotels.map(() => context.newPage()));
//
//         const scrapePromises = pages.map(async (page, index) => {
//             const url = batchHotels[index].hotelUrl;
//             page.goto(url).catch(e => e);
//             await page.waitForSelector('#hotel_address');
//             const element = await page.$('#hotel_address'); // replace with the ID of the "a" element
//             hotels[index + ((batchSize) * count)].properties.latLng = await element.evaluate(el => el.getAttribute('data-atlas-latlng'));
//             // const surroundings = await page.$('[data-testid="property-section--content"]'); // replace with the ID of the "a" element
//             // const test = await page.$$eval('ul[data-location-block-list="true"]');
//             // const ulHtml = await page.evaluate(test => test.innerHTML, test);
//             // console.log(ulHtml);
//             // surroundings.evaluate(el => el)
//             await page.waitForSelector('[data-testid="property-section--content"]');
//             // const test = await page.$eval('[data-testid="property-section--content"]', (el) => el.innerHTML)
//             //
//             // console.log(test)
//             const test = await page.evaluate(() => document.querySelector('[data-testid="property-section--content"]').innerHTML);
//
//             console.log(test)
//
//             // const locationBlockList = await page.$$(
//             //     '[data-testid="property-section--content"] > div > ul'
//             // );
//
//             // console.log(locationBlockList)
//             // Extract the HTML content of the ul element
//             // const ulHtml = await page.evaluate(locationBlockList => locationBlockList.innerHTML, locationBlockList);
//
//             // console.log(ulHtml);
//             // console.log(test)
//             // console.log(test.innerHTML)
//             page.close().catch(e => e)
//         });
//
//         await Promise.all(scrapePromises);
//     };
//
//     const batches = hotels.reduce((resultArray, item, index) => {
//         const chunkIndex = Math.floor(index / batchSize);
//         if (!resultArray[chunkIndex]) {
//             resultArray[chunkIndex] = [];
//         }
//         resultArray[chunkIndex].push(item);
//         return resultArray;
//     }, []);
//
//     let count = 0;
//     for (const batch of batches) {
//         await scrapeBatch(batch, count);
//         count++;
//     }
//
//     const endTime = new Date();
//     const elapsedTime = endTime - startTime;
//     // console.log(hotels)
//     console.log(`Elapsed time iterate hotels: ${elapsedTime}ms`);
// }

// scrapeHotels().then(r => r);

module.exports = {scrapeHotels, scrapeHotelDetails}
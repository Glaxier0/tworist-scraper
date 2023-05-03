const puppeteerBrowser = require('../services/puppeteerBrowser')
const cheerio = require('cheerio');
const Hotel = require('../models/hotel');
const HotelDetails = require('../models/hotelDetails');
const SearchForm = require("../dto/searchForm");
const normalizeString = require("../services/utils");
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const { translate } = require('bing-translate-api');

test();

async function test() {
    const searchForm = new SearchForm('londra', '2023', '05', '07',
        '2023', '05', '09', 2, 0, 1);

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
    const url = 'https://www.priceline.com/svcs/ac/index/hotels/' + encodedSearchTerm +
        '/6/3/3/3';

    try {
        const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36';
        const {stdout} = await exec(`curl -s -H "User-Agent: ${userAgent}" "${url}"`);
        const suggestions = JSON.parse(stdout)["searchItems"];
        const suggestion = suggestions.find(obj => obj["displayLine1"].toLowerCase() === normalized.toLowerCase()) ?? suggestions[0];
        const id = suggestion["id"];

        return id;
    } catch (error) {
        console.error(`Error in autoComplete function: ${error.message}`);
    }
}

async function fastAutoScroll(page) {
    return await page.evaluate(async () => {
        return await new Promise((resolve) => {
            const distance = 150;
            const scrollDelay = 40;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                const totalHeight = window.scrollY + window.innerHeight;

                // Stop scrolling when reaches to the bottom.
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

    const browser = await puppeteerBrowser();

    const page = await browser.newPage();

    await page.setRequestInterception(true);

    page.on('request', (req) => {
        if (req.resourceType() === 'font' || req.resourceType() === 'stylesheet') {
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
    ].join('');

    const checkOutDate = [
        searchForm.checkOutYear,
        searchForm.checkOutMonth.toString().padStart(2, '0'),
        searchForm.checkOutDay.toString().padStart(2, '0')
    ].join('');

    let zerosArray = Array(searchForm.childCount).fill(0);
    let childrenUrl = zerosArray.join(",");

    let url = 'https://www.priceline.com/relax/in/' + searchTerm + '/from/' + checkInDate + '/to/' + checkOutDate
        + '/rooms/' + searchForm.roomCount + '/adults/' + searchForm.adultCount;

    if (searchForm.childCount > 0) {
        url = url + '/children/' + childrenUrl;
    }

    url = url + '?cur=USD';

    const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36";
    await page.setUserAgent(ua);

    page.goto(url).catch((e) => e)
    let endTime = new Date();
    let elapsedTime = endTime - startTime;
    console.log(`Elapsed time go to priceline: ${elapsedTime}ms`);
    await page.waitForSelector('[class*=Listings__StyledWrapper]');

    try {
        await fastAutoScroll(page);
    } catch (error) {
        console.error(error)
    }

    endTime = new Date();
    elapsedTime = endTime - startTime;
    console.log(`Elapsed time waiting priceline: ${elapsedTime}ms`);

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

    const website = 'priceline.com';

    const regex = /\$(\d+)/g;

    const hotels = $('[class*=Listings__ListingCardWrapper]').map((i, el) => {
        const titleElement = $(el).find('[data-autobot-element-id="HTL_LIST_LISTING_COMPONENT_HOTEL_NAME"]')
        const title = titleElement.text().trim() || '';
        const address = $(el).find('[class*=NeighborhoodRow__NeighborhoodRowWrapper]').text().trim();
        const priceElement = $(el).find('[class*=MinRateSection__MinRatePriceWrapper]');
        const allPrices = $(priceElement).find('[class*=Text__Span]').text().trim();
        const matches = allPrices.match(regex);
        let price = allPrices;
        if (matches[1]) {
            price = matches[1];
        }
        price = price.replace(/\$/g, '').trim();
        const starCount = $(el).find('div[data-testid="rating-stars"]').children().length || 0;
        const reviewElement = $(el).find('[data-testid="review-score"]').text().trim() || '0.0Good 0 reviews';
        let reviewScore = '';
        let reviewCount = '';
        if (reviewElement) {
            reviewScore = reviewElement.match(/^\d+\.\d+/)?.[0] || '';
            reviewCount = reviewElement.match(/\d+(,\d+)*\s+reviews/)?.[0]?.replace(/\D/g, '') || '';
        }
        const hotelUrl = $(titleElement).attr('href') || '';
        const imageUrl = $(el).find('img[data-testid="image"]').attr('src') || '';

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
    console.log(`Elapsed time scrape hotels from booking: ${elapsedTime}ms`);

    // browser.close().catch((e) => e);

    return hotels;
}

async function scrapeHotelDetails(url, hotelId) {
    const startTime = new Date()

    const browser = await puppeteerBrowser();

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
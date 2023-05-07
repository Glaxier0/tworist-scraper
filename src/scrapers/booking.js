const puppeteerBrowser = require('../services/puppeteerBrowser')
const cheerio = require('cheerio');
const Hotel = require('../models/hotel');
const HotelDetails = require('../models/hotelDetails');
const SearchForm = require("../dto/searchForm");

// test();

async function test() {
    const searchForm = new SearchForm('cologne', '2023', '05', '07',
        '2023', '05', '10', 2, 0, 1);

    const hotels = await scrapeHotels(searchForm, "testId");
    console.log(hotels)
    console.log(hotels.length)

    // const url = 'https://www.expedia.com/Istanbul-Hotels-ISTANBUL-AIRPORT-EXPRESS-PLUS-HOTEL.h61618672.Hotel-Information?chkin=2023-05-07&chkout=2023-05-08&x_pwa=1&rfrr=HSR&pwa_ts=1682803432797&referrerUrl=aHR0cHM6Ly93d3cuZXhwZWRpYS5jb20vSG90ZWwtU2VhcmNo&useRewards=false&rm1=a2&regionId=178267&destination=Istanbul+%28and+vicinity%29%2C+Istanbul%2C+T%C3%BCrkiye&destType=MARKET&latLong=41.007884%2C28.977964&sort=RECOMMENDED&top_dp=91&top_cur=USD&userIntent=&selectedRoomType=227757882&selectedRatePlan=258384794'
    // const hotelDetails = await scrapeHotelDetails(url, 'testId')
    // console.log(hotelDetails)
}

async function scrapeHotels(searchForm, searchId, browser) {
    const startTime = new Date();

    // const browser = await puppeteerBrowser();

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

    const url = 'https://www.booking.com/searchresults.en-gb.html?ss=' + searchForm.search + '&ssne='
        + searchForm.search + '&ssne_untouched=' + searchForm.search + '&checkin_year=' + searchForm.checkInYear + '&checkin_month='
        + searchForm.checkInMonth + '&checkin_monthday=' + searchForm.checkInDay + '&checkout_year=' + searchForm.checkOutYear
        + '&checkout_month=' + searchForm.checkOutMonth + '&checkout_monthday=' + searchForm.checkOutDay + '&group_adults='
        + searchForm.adultCount + '&no_rooms=' + searchForm.roomCount + '&group_children=' + searchForm.childCount + '&dest_type=city&sb_travel_purpose=leisure&selected_currency=USD';

    const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36";
    await page.setUserAgent(ua);

    page.goto(url).catch((e) => e)
    let endTime = new Date();
    let elapsedTime = endTime - startTime;
    console.log(`Elapsed time go to booking: ${elapsedTime}ms`);
    await page.waitForSelector('#ajaxsrwrap');

    endTime = new Date();
    elapsedTime = endTime - startTime;
    console.log(`Elapsed time waiting booking: ${elapsedTime}ms`);

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

    const website = 'booking.com';

    const hotels = $('div[data-testid="property-card"]').map((i, el) => {
        const title = $(el).find('div[data-testid="title"]').text().trim() || '';
        const address = $(el).find('[data-testid="address"]').text().trim() || '';
        let price = $(el).find('[data-testid="price-and-discounted-price"]') || '';
        if (price) {
            price = price.text().replace(',','').replace('US','').trim()
        }
        const starCount = $(el).find('div[data-testid="rating-stars"]').children().length || 0;
        const reviewElement = $(el).find('[data-testid="review-score"]').text().trim() || '0.0Good 0 reviews';
        let reviewScore = '0';
        let reviewCount = '0';
        if (reviewElement) {
            reviewScore = reviewElement.match(/^\d+\.\d+/)?.[0] || '0';
            reviewCount = reviewElement.match(/\d+(,\d+)*\s+reviews/)?.[0]?.replace(/\D/g, '') || '';
            if (!reviewCount) {
                reviewCount = reviewElement.match(/\d+(,\d+)*\s+review/)?.[0]?.replace(/\D/g, '') || '0';
            }
        }
        const hotelUrl = $(el).find('a').attr('href') || '';
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
    console.log(`Elapsed time scrape hotels from booking: ${elapsedTime}ms. ${hotels.length} Hotels found.`);

    page.close().catch(e => e);
    // browser.close().catch((e) => e);

    return hotels;
}

async function scrapeHotelDetails(url, hotelId, browser) {
    const startTime = new Date()

    // const browser = await puppeteerBrowser();

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
    console.log(`Elapsed time go to booking details: ${elapsedTime}ms`);

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
    console.log(`Elapsed time waiting booking details: ${elapsedTime}ms`);

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
    console.log(`Elapsed time scrape booking details: ${elapsedTime}ms`);

    // browser.close().catch((e) => e);

    return hotelDetails;
}

module.exports = {scrapeHotels, scrapeHotelDetails}
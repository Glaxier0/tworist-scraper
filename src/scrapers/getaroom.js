const {puppeteerBrowser} = require('../services/puppeteerBrowser')
const cheerio = require('cheerio');
const Hotel = require('../models/hotel');
const HotelDetails = require('../models/hotelDetails');
const SearchForm = require("../dto/searchForm");
const {normalizeString, autoRefresher} = require("../services/utils");
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const {translate} = require('bing-translate-api');

// test();

async function test() {
    const searchForm = new SearchForm('londra', '2023', '05', '07',
        '2023', '05', '08', 2, 0, 1);

    const hotels = await scrapeHotels(searchForm, "testId");
    console.log(hotels)
    console.log(hotels.length)

    const url = 'https://www.getaroom.com/hotels/h10-london-waterloo';
    const hotelDetails = await scrapeHotelDetails(url, 'testId')
    console.log(hotelDetails)
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

async function scrapeHotels(searchForm, searchId, browser) {
    const startTime = new Date();

    // const browser = await puppeteerBrowser();

    const page = await browser.newPage();
    await page.setDefaultTimeout(60000);


    await page.setRequestInterception(true);

    page.on('request', (req) => {
        if (req.resourceType() === 'font' || req.resourceType() === 'stylesheet'
            || req.resourceType() === 'images' || req.resourceType() === 'xhr') {
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
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
    await page.setUserAgent(ua);

    await page.goto(url).catch((e) => e)
    let endTime = new Date();
    let elapsedTime = endTime - startTime;
    console.log(`Elapsed time go to getaroom: ${elapsedTime}ms`);

    const selectors = [
        '.results-list'
    ];

    const success = await autoRefresher(selectors, page);

    if (!success) {
        return;
    }

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
        let price = $(el).find('.price .amount') || '';
        if (price) {
            price = '$' + price.text().replace(',', '').trim() || '';
        }
        const starCount = $(el).find('.star-rating .sr-only').text()
            .replace('Stars', '').trim() || 0;
        const reviewScore = $(el).find('.trip-advisor-reviews .sr-only').text().trim() * 2 || '0';
        let reviewCount = $(el).find('.trip-advisor-reviews').text().replace(reviewScore, '').match(/\d+(,\d+)*\s+reviews/)?.[0]?.replace(/\D/g, '') || '';
        if (!reviewCount) {
            reviewCount = $(el).find('.trip-advisor-reviews').text().replace(reviewScore, '').match(/\d+(,\d+)*\s+review/)?.[0]?.replace(/\D/g, '') || '0';
        }

        let hotelUrl = $(el).find('.click-target').attr('href') || '';
        if (hotelUrl) {
            hotelUrl = 'https://www.getaroom.com' + hotelUrl
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
    console.log(`Elapsed time scrape hotels from getaroom: ${elapsedTime}ms. ${hotels.length} Hotels found.`);
    hotels.pop();

    page.close().catch(e => e);
    // browser.close().catch((e) => e);

    return hotels;
}

async function scrapeHotelDetails(url, hotelId, browser) {
    const startTime = new Date()

    // const browser = await puppeteerBrowser();

    const page = await browser.newPage();
    await page.setDefaultTimeout(60000);

    await page.setRequestInterception(true);

    page.on('request', (req) => {
        if (req.resourceType() === 'font' || req.resourceType() === 'stylesheet' || req.resourceType() === 'xhr') {
            req.abort();
        } else {
            req.continue();
        }
    });

    const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
    await page.setUserAgent(ua);
    await page.goto(new URL(url)).catch((e) => e);

    let endTime = new Date();
    let elapsedTime = endTime - startTime;
    console.log(`Elapsed time go to getaroom details: ${elapsedTime}ms`);

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

    const selectors = [
        '.details',
        '.gallery-image'
    ];

    const success = await autoRefresher(selectors, page);

    if (!success) {
        return;
    }

    endTime = new Date();
    elapsedTime = endTime - startTime;
    console.log(`Elapsed time waiting getaroom details: ${elapsedTime}ms`);

    const html = await page.content();
    const $ = cheerio.load(html);

    // Images
    hotelDetails.images = $('.gallery-image img')
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
    const details = $('#propdetails');
    hotelDetails.summary = $(details).find('.prop-description').text().trim()

    // Working get facilities and titles
    const facilities = $(details).find('.list-unstyled li').map((i, el) => {
        return $(el).find('span').text().trim();
    }).get();

    hotelDetails.facilities = {
        title: 'Overall',
        properties: facilities
    }

    // Coordinates
    const googleMapsUrl = $('#mini-map-cta img').attr('src');
    const searchParams = new URLSearchParams(new URL(googleMapsUrl).search);
    const coordinates = searchParams.get('markers');
    [hotelDetails.lat, hotelDetails.long] = coordinates.split(",");

    // Working hotel policies
    const checkInTime = 'The hotel has not specified this information.';
    const checkOutTime = 'The hotel has not specified this information.';
    const isChildrenAllowed = 'The hotel has not specified this information.';
    const ageRestriction = 'The hotel has not specified this information.';
    const rules = 'The hotel has not specified this information.';
    const cards = 'The hotel has not specified this information.';
    const cancellation = 'Cancellation depends on the chosen booking option and may be available for an additional fee.';

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
    console.log(`Elapsed time scrape getaroom details: ${elapsedTime}ms`);

    // browser.close().catch((e) => e);
    page.close().catch(e => e);

    return hotelDetails;
}

module.exports = {scrapeHotels, scrapeHotelDetails}
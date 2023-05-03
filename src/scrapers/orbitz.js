const puppeteerBrowser = require('../services/puppeteerBrowser')
const cheerio = require('cheerio');
const Hotel = require('../models/hotel');
const HotelDetails = require('../models/hotelDetails');
const SearchForm = require('../dto/searchForm');
const {
    normalizeString,
    autoScroll,
    fastAutoScroll
} = require('../services/utils');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const {TimeoutError} = require('puppeteer-core');
const {translate} = require("bing-translate-api");

// test();

async function test() {
    const searchForm = new SearchForm('londra', '2023', '05', '07',
        '2023', '05', '12', 2, 0, 1);

    // const hotels = await scrapeHotels(searchForm, "testId");
    // console.log(hotels)
    // console.log(hotels.length)

    const url = 'https://www.orbitz.com/London-Hotels-Arlington-House.h6516748.Hotel-Information?chkin=2023-05-07&chkout=2023-05-12&x_pwa=1&rfrr=HSR&pwa_ts=1683149434775&referrerUrl=aHR0cHM6Ly93d3cub3JiaXR6LmNvbS9Ib3RlbC1TZWFyY2g%3D&useRewards=false&rm1=a2&regionId=2114&destination=London%2C+England%2C+United+Kingdom&destType=MARKET&neighborhoodId=6144903&latLong=51.50746%2C-0.127673&sort=RECOMMENDED&top_dp=296&top_cur=USD&userIntent=&selectedRoomType=201054814&selectedRatePlan=205245137';
    const hotelDetails = await scrapeHotelDetails(url, 'testId')
    console.log(hotelDetails)
}

async function autoComplete(searchTerm) {
    const normalized = normalizeString(searchTerm);
    const encodedSearchTerm = encodeURIComponent(normalized);
    const url = 'https://www.orbitz.com/api/v4/typeahead/' + encodedSearchTerm +
        '?format=json&lob=HOTELS&locale=en_US&maxresults=8&siteid=70201';

    try {
        const {stdout} = await exec(`curl -s "${url}"`);
        const suggestions = JSON.parse(stdout).sr;
        const suggestion = suggestions.find(obj => obj["regionNames"]["shortName"].replace('(and vicinity)').trim()
            .toLowerCase() === normalized.toLowerCase()) ?? suggestions[0];
        const fullName = suggestion.regionNames.fullName;
        const regionId = suggestion.essId.sourceId;
        const coordinates = suggestion.coordinates;
        const lat = coordinates.lat;
        const long = coordinates.long;
        const encodedFullName = encodeURIComponent(fullName);

        return {encodedFullName, regionId, lat, long};
    } catch (error) {
        console.error(`Error in autoComplete function: ${error.message}`);
    }
}

async function scrapeHotels(searchForm, searchId) {
    const startTime = new Date();

    const browser = await puppeteerBrowser();

    const page = await browser.newPage();
    await page.setDefaultTimeout(60000);

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

    const suggestion = await autoComplete(translated);

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

    const peopleCount = parseInt(searchForm.adultCount) + parseInt(searchForm.childCount)

    const url = 'https://www.orbitz.com/Hotel-Search?locale=en_US&adults=' + peopleCount
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
    console.log(`Elapsed time go to hotels: ${elapsedTime}ms`);

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

    const website = 'orbitz.com'

    const selectors = [
        '[data-stid="open-hotel-information"]'
    ];

    const maxRetries = 5;
    let retries = 0;

    for (retries = 0; retries < maxRetries; retries++) {
        try {
            const timeout = retries >= 4 ? 20000 : 6250;
            await Promise.all(selectors.map(selector => page.waitForSelector(selector, {timeout})));
            break;
        } catch (e) {
            if (e instanceof TimeoutError) {
                console.log(`Retry ${retries + 1} of ${maxRetries} failed: Timed out while waiting for selectors`);
                await page.goto(page.url());
            } else {
                console.error(`An error occurred while waiting for selectors: ${e}`);
                break;
            }
        }
    }

    if (retries >= maxRetries) {
        throw new Error(`Failed to find selector after ${maxRetries} retries.`);
    }

    try {
        await autoScroll(page, 125, 40, 20000);
    } catch (error) {
        console.error(error)
    }

    endTime = new Date();
    elapsedTime = endTime - startTime;
    console.log(`Elapsed time waiting hotels: ${elapsedTime}ms`);

    const hotels = await page.evaluate(() => {
        const hotelElements = Array.from(document.querySelectorAll('[data-stid="open-hotel-information"]'));

        return hotelElements.flatMap((el) => {
            const parentEl = el.parentElement;
            const {textContent: title = ''} = parentEl.querySelector('.overflow-wrap') || '';
            const {textContent: address = ''} = parentEl.querySelector('.truncate-lines-2') || '';
            // let price = parentEl.querySelector('[class*=spacing] [class*=spacing-padding-block-half]') || '';
            let price = parentEl.querySelector('[data-test-id="price-summary-message-line"] > [class*=text-default-theme]') || '';

            if (price && price.textContent) {
                price = price.textContent.replace('total', '').replace(',', '').trim();
            } else {
                price = '';
            }

            const reviewTextElement = parentEl.querySelector('[class*=layout-flex] [class*=layout-flex-align-items-flex-start]');
            const reviewText = reviewTextElement?.textContent?.trim() || '';
            let reviewScore = '';
            let reviewCount = '';
            if (reviewText) {
                reviewScore = reviewText.match(/^(\d+\.\d+)\//)?.[1] || '';
                reviewCount = reviewText.match(/\(([\d,]+)\sreviews\)/)?.[1] || '';
            }

            const hotelUrl = `https://www.orbitz.com${el.getAttribute('href')}`;
            const imageUrl = parentEl.querySelector('[class*=image-media]')?.src;

            return {
                title,
                address,
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
            title: hotel.title,
            address: hotel.address,
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
            website,
            searchId
        });
    });

    endTime = new Date();
    elapsedTime = endTime - startTime;
    console.log(`Elapsed time scrape hotels hotels: ${elapsedTime}ms`);

    browser.close().catch((e) => e);

    return hotelList;
}

async function scrapeHotelDetails(url, hotelId) {
    const startTime = new Date();

    url = url + '&locale=en_US';

    const browser = await puppeteerBrowser();

    const page = await browser.newPage();
    await page.setDefaultTimeout(60000);

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
    console.log(`Elapsed time go to hotels: ${elapsedTime}ms`);

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
        '[class*=layout-flex-item] [class*=flex-item-flex-grow]',
        '#Overview',
        '[class*=image-link]'
    ];

    const maxRetries = 5;
    let retries = 0;

    for (retries = 0; retries < maxRetries; retries++) {
        try {
            const timeout = retries >= 4 ? 20000 : 6250;
            await Promise.all(selectors.map(selector => page.waitForSelector(selector, {timeout})));
            break;
        } catch (e) {
            if (e instanceof TimeoutError) {
                console.log(`Retry ${retries + 1} of ${maxRetries} failed: Timed out while waiting for selectors`);
                await page.goto(page.url());
            } else {
                console.error(`An error occurred while waiting for selectors: ${e}`);
                break;
            }
        }
    }

    if (retries >= maxRetries) {
        throw new Error(`Failed to find selector after ${maxRetries} retries.`);
    }

    try {
        await fastAutoScroll(page, 175, 40);
    } catch (error) {
        console.error(error)
    }

    endTime = new Date();
    elapsedTime = endTime - startTime;
    console.log(`Elapsed time waiting hotels: ${elapsedTime}ms`);

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
    const policy = $('#Policies');
    const policies = policy.find('[data-stid="content-item"]');

    const rules = policies.map((_, elem) => {
        const ruleName = $(elem).find('h3').text().trim();
        const ruleType = $(elem).find('[class*=text-spacing-two]')
            .map((_, subElem) => $(subElem).text().trim()).get();

        let isAllowed = null;

        if (ruleName.toLowerCase().includes('children')) {
            isAllowed = true;
        } else {
            if (Array.isArray(ruleType)) {
                if (ruleType.some(item => item.toLowerCase().includes('allowed') && item.toLowerCase().includes('no'))) {
                    isAllowed = false;
                } else if (ruleType.some(item => item.toLowerCase().includes('allowed'))) {
                    isAllowed = true;
                } else if (ruleType.some(item => item.toLowerCase().includes('no'))) {
                    isAllowed = false;
                }
            }
        }

        return {ruleName, ruleType, isAllowed};
    }).get();

    const ruleNames = rules.map(rule => rule.ruleName);

    const checkInRule = rules.find(rule => rule.ruleName === 'Check-in') || '';
    const checkOutRule = rules.find(rule => rule.ruleName === 'Check-out') || '';
    let checkInTime = '';
    let checkOutTime = '';
    let ageRestriction = '';

    if (checkInRule) {
        checkInTime = checkInRule.ruleType.find(checkIn => checkIn.toLowerCase().includes('check-in')).trim();
        const ageRestrictionString = checkInRule.ruleType.find(checkOut => checkOut.toLowerCase().includes('minimum check-in age:'));
        if (ageRestrictionString) {
            ageRestriction = ageRestrictionString.split(':')[1].trim();
        }
    }

    if (checkOutRule) {
        checkOutTime = checkOutRule.ruleType.find(checkIn => checkIn.toLowerCase().includes('check-out')).trim();
    }

    const isChildrenAllowed = rules.some(rule => rule.ruleName.toLowerCase().includes('children'));

    const cancellation = 'Cancellation depends on the chosen booking option and may be available for an additional fee.'

    const cards = $('meta[itemprop="paymentAccepted"]').map((_, elem) => {
        return $(elem).attr('content');
    }).get();

    hotelDetails.policies = {
        checkInTime,
        checkOutTime,
        isChildrenAllowed,
        ageRestriction,
        rules,
        cards,
        cancellation
    };

    hotelDetails.facilities = hotelDetails.facilities.filter(facility => {
        return !ruleNames.some(rule => {
            return facility.title === rule;
        });
    });

    endTime = new Date();
    elapsedTime = endTime - startTime;
    console.log(`Elapsed time scrape hotels hotels: ${elapsedTime}ms`);

    browser.close().catch((e) => e);

    return hotelDetails;
}

module.exports = {scrapeHotels, scrapeHotelDetails}
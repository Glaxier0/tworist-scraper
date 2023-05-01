const PuppeteerBrowser = require('../services//PuppeteerBrowser')
const cheerio = require('cheerio');
const Hotel = require('../models/hotel');
const HotelDetails = require('../models/hotelDetails');
const SearchForm = require("../dto/searchForm");
const normalizeString = require('../services/Utils');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

test();

async function test() {
    const searchForm = new SearchForm('istanbul', '2023', '05', '5',
        '2023', '05', '6', 2, 0, 1);

    const hotels = await scrapeHotels(searchForm);
    console.log(hotels);
    // console.log(await scrapeHotels(searchForm));
    // console.log(await scrapeHotelDetails('https://www.etstur.com/The-Gate-Kadikoy-Downtown?check_in=10.04.2023&check_out=11.04.2023&adult_1=2', 'test'));
}

async function autoComplete(searchTerm) {
    const normalized = normalizeString(searchTerm)
    const encodedSearchTerm = encodeURIComponent(normalized)
    const url = 'https://www.kayak.com.tr/mvm/smartyv2/search?f=j&s=50&where=' + encodedSearchTerm + '&lc_cc=EN&lc=en&sv=5';

    try {
        const {stdout} = await exec(`curl -s "${url}"`);
        const suggestions = JSON.parse(stdout);
        const suggestion = suggestions.find(obj => obj["name"].toLowerCase() === normalized.toLowerCase()) ?? suggestions[0];
        const place = suggestion["displayname"].replace(", ", ",").replaceAll(" ", "")
        const code = suggestion["ctid"]

        return place + "-c" + code;
    } catch (error) {
        console.error(`Error in autoComplete function: ${error.message}`);
    }
}

async function scrapeHotels(searchForm, searchId) {
    const startTime = new Date();

    const browser = await PuppeteerBrowser();

    const page = await browser.newPage();

    // await page.setRequestInterception(true);
    //
    // page.on('request', (req) => {
    //     if (req.resourceType() === 'font') {
    //         req.abort();
    //     } else {
    //         req.continue();
    //     }
    // });

    const searchTerm = await autoComplete(searchForm.search.toLowerCase());
    const checkInDate = searchForm.checkInYear + '-' + searchForm.checkInMonth + '-' + searchForm.checkInDay;
    const checkOutDate = searchForm.checkOutYear + '-' + searchForm.checkOutMonth + '-' + searchForm.checkOutDay;

    // const url = 'https://www.kayak.com/hotels/' + searchTerm + '/' + checkInDate + '/' + checkOutDate + '/'
    //     + searchForm.adultCount + 'adults/' + searchForm.childCount + 'children?sort=rank_a';

    const url = 'https://us.trip.com/hotels/list?city=4999&cityName=Balikesir&provinceId=97778&countryId=89&districtId=0&checkin=2023/05/05&checkout=2023/05/06&lowPrice=0&highPrice=-1&barCurr=USD&searchType=CT&searchWord=Balikesir&searchValue=19%7C4999_19_4999_1&searchCoordinate=BAIDU_-1_-1_0|GAODE_-1_-1_0|GOOGLE_-1_-1_0|NORMAL_39.648369_27.88261_0&crn=1&adult=2&children=0&searchBoxArg=t&travelPurpose=0&ctm_ref=ix_sb_dl&domestic=false&listFilters=80|0|0*80*0*2,29|1*29*1|2*2&oldLocale=en-US'

    const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36";
    await page.setUserAgent(ua);

    await page.goto(url).catch((e) => e)

    let endTime = new Date();
    let elapsedTime = endTime - startTime;
    console.log(`Elapsed time goto: ${elapsedTime}ms`);

    await page.waitForSelector('.long-list');

    endTime = new Date();
    elapsedTime = endTime - startTime;
    console.log(`Elapsed time waiting: ${elapsedTime}ms`);

    const html = await page.content();
    const $ = cheerio.load(html);

    console.log(html)

    const resultList = $('.resultsList')

    const hotels = $(resultList).find('[class*=resultInner]').map((i, el) => {
        const address = $(el).find('.hotelAddress').text().trim();
        const title = $(el).find('.hotelName').text().trim();
        const price = $(el).find('.price').text().trim();
        const reviewScore = $(el).find('.reviewScore').text().trim();
        const reviewCount = $(el).find('.reviewCount').text().trim();
        const hotelUrl = $(el).find('.hotelUrl').attr('href');
        const imageUrl = $(el).find('.imageUrl').attr('src');
        const hotel = new Hotel({
            address,
            title,
            price,
            reviewScore,
            reviewCount,
            hotelUrl,
            imageUrl,
            searchId
        });
        return hotel;
    }).get();


    endTime = new Date();
    elapsedTime = endTime - startTime;
    console.log(`Elapsed time scrape hotels: ${elapsedTime}ms`);

    // browser.close().catch((e) => e);

    return hotels;
}

async function scrapeHotelDetails(url, hotelId, lat, long) {
    const startTime = new Date();

    const browser = await PuppeteerBrowser();

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
        lat,
        long,
        closeLocations: '',
        summary: '',
        popularFacilities: '',
        facilities: '',
        policies: ''
    });

    await page.waitForSelector('#hotelTabMenu');

    endTime = new Date();
    elapsedTime = endTime - startTime;
    console.log(`Elapsed time waiting: ${elapsedTime}ms`);

    const html = await page.content();
    const $ = cheerio.load(html);

    // TODO get close places from google api

    // Working, gets the list of close places with title but slows scraping
    // properties.closeLocations = $('ul[data-location-block-list="true"]').map((i, element) => {
    //     const title = $(element).parent().text().trim().replace($(element).text(), "").replace("\n", "");
    //     const locations = $(element).find('li').map((j, li) =>
    //         $(li).text().replace(/([A-Z])/g, ' $1').replace('\n', ' ').trim()).get();
    //     return {title, locations}
    // }).get();

    // Working gives summary
    hotelDetails.summary = $('ul#printableArea li#GENERAL span.conditionsText').text().replaceAll("\n", "").trim();

    // Working get facilities and titles
    hotelDetails.facilities = $('ul.boxFacility-list li span.defaultFac').map((i, el) => $(el).text()).get();

    // Working hotel policies
    const colElement = $('.col-md-3.importantInfo');
    const conditions = colElement.find('li.condDesc');
    const checkTime = colElement.find('li.importantInfo-time-item');

    const checkInTime = checkTime.find('span.checkInTime').text().trim();
    const checkOutTime = checkTime.find('span.checkOutTime').text().trim();

    const conditionsTexts = conditions.find('span.conditionsText').map((i, el) => {
        return $(el).text().trim();
    }).get();

    const childrenRule = conditionsTexts.filter(x => x.toLocaleLowerCase().includes("çocuk")).toString().trim();

    const isChildrenAllowed = childrenRule ? !childrenRule.toLocaleLowerCase().includes("edilm")
        || childrenRule.toLocaleLowerCase().includes("edili") : null;

    const ageRestriction = 0;

    const rules = conditions.find('span.conditionsText').map((i, el) => {
        const ruleType = $(el).text().toLocaleLowerCase().trim();
        const ruleName = ruleType
            .replace('kabul edilmez', '')
            .replace('sağlanmaz', '')
            .replace('sağlanır', '')
            .replace('kabul edilir', '')
            .trim();
        let isAllowed = null;
        if (ruleType.includes('edilm') || ruleType.includes('sağlanmaz')) {
            isAllowed = false;
        } else if (ruleType.includes('edili') || ruleType.includes('sağlanı')) {
            isAllowed = true;
        }
        return {ruleName, ruleType, isAllowed};
    }).get();

    const cards = null;
    const cancellation = null;

    hotelDetails.policies = {
        checkInTime,
        checkOutTime,
        isChildrenAllowed,
        ageRestriction,
        rules,
        cards,
        cancellation,
    };

    endTime = new Date();
    elapsedTime = endTime - startTime;
    console.log(`Elapsed time scrape hotels: ${elapsedTime}ms`);

    browser.close().catch((e) => e);

    return hotelDetails;
}

module.exports = {scrapeHotels, scrapeHotelDetails}
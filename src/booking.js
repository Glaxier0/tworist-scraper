const puppeteer = require('puppeteer');

async function scrapeHotels() {
    const browser = await puppeteer.launch({
        headless:false
    });
    const page = await browser.newPage();

    const search = 'londra'
    const checkin_year = '2023'
    const checkin_month = '2'
    const checkin_monthday = '23'
    const checkout_year = '2023'
    const checkout_month = '2'
    const checkout_monthday = '24'
    const adultCount = 2
    const roomCount = 1
    const childrenCount = 0

    // working without ssne&ssne_untouched
    // https://www.booking.com/searchresults.en-gb.html?ss=köln&checkin_year=2023&checkin_month=2&checkin_monthday=23&checkout_year=2023&checkout_month=2&checkout_monthday=24&group_adults=2&no_rooms=1&group_children=0&dest_type=city&sb_travel_purpose=leisure
    // with ssne&ssne_untouched
    // https://www.booking.com/searchresults.en-gb.html?ss=köln&ssne=köln&ssne_untouched=köln&checkin_year=2023&checkin_month=2&checkin_monthday=23&checkout_year=2023&checkout_month=2&checkout_monthday=24&group_adults=2&no_rooms=1&group_children=0&dest_type=city&sb_travel_purpose=leisure
        const url = 'https://www.booking.com/searchresults.en-gb.html?ss=' + search + '&ssne='
        + search + '&ssne_untouched=' + search + '&checkin_year=' + checkin_year + '&checkin_month='
        + checkin_month + '&checkin_monthday=' + checkin_monthday + '&checkout_year=' + checkout_year
        + '&checkout_month=' + checkout_month + '&checkout_monthday=' + checkout_monthday + '&group_adults='
        + adultCount + '&no_rooms=' + roomCount + '&group_children=' + childrenCount + '&dest_type=city&sb_travel_purpose=leisure'

    // await page.goto('https://www.booking.com');
    await page.goto(url);


    await page.waitForSelector('[role="dialog"]');
    //
    // // Retrieve the button element
    const button = await page.$('button[aria-label="Dismiss sign in information."]');

    // Click the button
    await button.click();

    // await page.click('[role="dialog"]').then(
    //     const element = await page.$('svg[xmlns="http://www.w3.org/2000/svg"]')
    //     element.click());

    //await page.click('.xp__dates li:nth-child(1)'); // Click check-in date field
    // await page.click('.sb-date-field__icon sb-date-field__icon-btn bk-svg-wrapper calendar-restructure-sb'); // Click check-in date field
    // await page.click('[data-testid="date-display-field-start"]');

    // await page.click('.bui-calendar__main button[data-bui-ref="calendar-next"]'); // Click "next month" button
    //await page.click('.bui-calendar__main button[data-bui-ref="calendar-next"]'); // Click "next month" button again
    // await page.click('.bui-calendar__main button[data-bui-ref="calendar-date"][data-date="2023-02-23"]'); // Click check-in date
    // await page.click('[data-date="2023-02-23"]');

    //await page.click('.xp__dates li:nth-child(2)'); // Click check-out date field
    // await page.click('[data-date="2023-02-24"]');

    //await page.click('.bui-calendar__main button[data-bui-ref="calendar-next"]'); // Click "next month" button
    //await page.click('.bui-calendar__main button[data-bui-ref="calendar-next"]'); // Click "next month" button again
    // await page.click('.bui-calendar__main button[data-bui-ref="calendar-date"][data-date="2023-02-26"]'); // Click check-out date
    // await page.click('.sb-searchbox__button'); // Click search button

    // Wait for search results to load
    // await page.waitForSelector('#hotellist_inner');

    // Scrape hotel data from search results
    // const hotels = await page.$$eval('#hotellist_inner .sr_item', items => {
    //     return items.map(item => {
    //         const name = item.querySelector('.sr-hotel__name').innerText.trim();
    //         const price = item.querySelector('.bui-price-display__value').innerText.trim();
    //         const rating = item.querySelector('.bui-review-score__badge').innerText.trim();
    //         return { name, price, rating };
    //     });
    // });

    // console.log(hotels);

    // await browser.close();
}

scrapeHotels();
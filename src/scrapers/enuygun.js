const puppeteer = require('puppeteer');

async function scrapeHotels() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

   // istanbul-1639/search/?checkInDate=28.03.2023&checkOutDate=29.03.2023
   //  &roomDetail=4%2C10%2C10%2C10&country=TR&p=search&ref=homepage&requestId=228843649bbd58f6313246&funnelId=495210690ccd58f6313246
   //  // Navigate to enuygun.com hotels page
//bölge kodunu bir şekilde öğren
    //
        const search = 'londra';
        const checkin_year = '2023';
        const checkin_month = '3';
        const checkin_monthday = '11';
        const checkout_year = '2023';
        const checkout_month = '3';
        const checkout_monthday = '12';
        const adultCount = 2;
        const roomCount = 1;
        const childrenCount = 0;

        const url = 'https://www.enuygun.com/otel/' + search + '/search'
            + '?chechInDate=' + checkin_monthday + '.' + checkin_month + '.'+ checkin_year
            + '&checkOutDate=' + checkout_monthday + "." + checkout_month + "." + checkout_year
            + '&roomDetail=' + adultCount + '&no_rooms=' + roomCount + '&group_children=' + childrenCount + '&dest_type=city&sb_travel_purpose=leisure';

        // const url = 'https://www.booking.com/searchresults.en-gb.html?ss=' + searchForm.search + '&ssne='
        //     + searchForm.search + '&ssne_untouched=' + searchForm.search + '&checkin_year=' + searchForm.checkInYear + '&checkin_month='
        //     + searchForm.checkInMonth + '&checkin_monthday=' + searchForm.checkInDay + '&checkout_year=' + searchForm.checkOutYear
        //     + '&checkout_month=' + searchForm.checkOutMonth + '&checkout_monthday=' + searchForm.checkOutDay + '&group_adults='
        //     + searchForm.adultCount + '&no_rooms=' + searchForm.roomCount + '&group_children=' + searchForm.childCount + '&dest_type=city&sb_travel_purpose=leisure&selected_currency=TRY';

    await page.goto(url);

    // Enter the search criteria
    await page.type('[data-testid="autocomplete-form-title"]', 'Istanbul'); // Enter location
    await page.click('[data-testid="autocompelete-item"]'); // Select location from suggestions
    await page.click('#startDatePicker'); // Click check-in date field
    await page.click('.xdsoft_next'); // Click "next month" button
    await page.click('.xdsoft_next'); // Click "next month" button again
    await page.click('[data-date="2022-06-01"]'); // Click check-in date
    await page.click('[data-date="2022-06-10"]'); // Click check-out date
    await page.select('#adultCount', '2'); // Select number of adults
    await page.select('#childCount', '0'); // Select number of children
    await page.click('#searchBtn'); // Click search button

    // Wait for search results to load
    await page.waitForSelector('.hotel-item');

    // Scrape hotel data from search results
    const hotels = await page.$$eval('.hotel-item', items => {
        return items.map(item => {
            const name = item.querySelector('.hotel-title').innerText.trim();
            const price = item.querySelector('.hotel-price').innerText.trim();
            const rating = item.querySelector('.rating-score').innerText.trim();
            return { name, price, rating };
        });
    });

    console.log(hotels);

    await browser.close();
}

scrapeHotels();
const puppeteer = require('puppeteer');

async function scrapeHotels() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Navigate to enuygun.com hotels page
    await page.goto('https://www.enuygun.com/otel/');

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
const puppeteer = require('puppeteer');

async function scrapeHotels() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Navigate to Trivago Turkey homepage
    await page.goto('https://www.trivago.com.tr/');

    // Enter the search criteria
    await page.type('.input-auto-complete', 'Istanbul'); // Enter location
    await page.click('#cal-heading-dates'); // Click check-in date field
    await page.click('.cal-btn-next'); // Click "next month" button
    await page.click('.cal-btn-next'); // Click "next month" button again
    await page.click('[data-calendar-label="2023-02-23"]'); // Click check-in date
    await page.click('[data-calendar-label="2023-02-24"]'); // Click check-out date
    await page.click('.search-button__label'); // Click search button

    // Wait for search results to load
    await page.waitForSelector('.hotel-card');

    // Scrape hotel data from search results
    const hotels = await page.$$eval('.hotel-card', items => {
        return items.map(item => {
            const name = item.querySelector('.hotel-card__title').innerText.trim();
            const price = item.querySelector('.price-value').innerText.trim();
            const rating = item.querySelector('.hotel-card__reviews-summary').innerText.trim();
            return { name, price, rating };
        });
    });

    console.log(hotels);

    await browser.close();
}

scrapeHotels();
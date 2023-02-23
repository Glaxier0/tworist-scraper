const puppeteer = require('puppeteer');

async function scrapeHotels() {
    const browser = await puppeteer.launch({
        headless: false
    });
    const page = await browser.newPage();

    // Navigate to the hotels page
    await page.goto('https://www.kayak.com.tr/hotels', { waitUntil: 'networkidle2' });

    // Input search parameters
    await page.type('#searchboxinput', 'Istanbul, Turkey'); // Input location
    await page.type('#checkin-input', '2022-03-01'); // Input check-in date
    await page.type('#checkout-input', '2022-03-03'); // Input check-out date

    await page.click('#submitBtn'); // Click on the search button

    // Wait for the hotel search results to load
    await page.waitForSelector('.resultsList');

    // Extract hotel information
    const hotelCards = await page.$$('.HotelCard');

    const hotels = hotelCards.map(async (card) => {
        const name = await card.$eval('.name', (el) => el.textContent.trim());
        const location = await card.$eval('.location', (el) => el.textContent.trim());
        const rating = await card.$eval('.rating', (el) => el.textContent.trim());
        const price = await card.$eval('.price', (el) => el.textContent.trim());

        return { name, location, rating, price };
    });

    // Print the extracted hotel information
    console.log(hotels);

    await browser.close();
}

scrapeHotels();
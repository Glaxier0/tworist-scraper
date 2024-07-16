# Tworist Scraper
An on-demand hotel scraper developed using Node.js, Express.js, Puppeteer, and Cheerio, optimized for speed and efficiency in processing data. This project scrapes hotel data from specific websites, handles lazy-loaded content, and provides an API for seamless integration, mimicking the functionality of traditional hotel websites.

## Setup

1. Install dependencies
```
npm install
```

2. Edit the [env](https://github.com/Glaxier0/tworist-scraper/blob/main/.env) file
```
PORT=3000
MONGODB_URL=mongodb://admin:admin@localhost:27017/?authMechanism=DEFAULT&authSource=tworist
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK=
SESSION_SECRET=
JWT_SECRET=
DOMAIN=localhost:3000
```

3. Use docker to setup mongo
```
docker compose up
```

4. Run the application
```
npm start
```

## Disclaimer
This project was developed as my graduation project in July 2023. Please use it responsibly and adhere to the terms of service of the websites being scraped.

It scrapes data from the following hotel websites: 
- Booking - [Scraper](https://github.com/Glaxier0/tworist-scraper/blob/main/src/scrapers/booking.js)
- Expedia - [Scraper](https://github.com/Glaxier0/tworist-scraper/blob/main/src/scrapers/expedia.js)
- Getaroom - [Scraper](https://github.com/Glaxier0/tworist-scraper/blob/main/src/scrapers/getaroom.js)
- Hotels - [Scraper](https://github.com/Glaxier0/tworist-scraper/blob/main/src/scrapers/hotels.js)
- Orbitz - [Scraper](https://github.com/Glaxier0/tworist-scraper/blob/main/src/scrapers/orbitz.js)

 Also, keep in mind that scraped websites might change their div structure, which could render the scraper for that site useless.

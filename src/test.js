const puppeteer = require('puppeteer');

async function scrapeHotels() {
    const browser = await puppeteer.launch({
        headless: true
    });

    const page = await browser.newPage();

    const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36";
    await page.setUserAgent(ua);
    const startTime = new Date();
    page.goto("https://www.booking.com/hotel/gb/birds-nest-residency.en-gb.html?aid=304142&label=gen173nr-1FCAQoggI46wdICVgEaOQBiAEBmAEJuAEXyAEM2AEB6AEB-AEDiAIBqAIDuALZsv6fBsACAdICJDQ0MTliYzVjLTdkOTQtNDdjNy1hMTRjLWIxNmEzMmRjZGE0NNgCBeACAQ&sid=72a9d1104ff45429504706b924efcdd4&all_sr_blocks=889154202_358921867_2_0_0;checkin=2023-03-03;checkout=2023-03-04;dest_id=-2601889;dest_type=city;dist=0;group_adults=2;group_children=0;hapos=4;highlighted_blocks=889154202_358921867_2_0_0;hpos=4;matching_block_id=889154202_358921867_2_0_0;no_rooms=1;req_adults=2;req_children=0;room1=A%2CA;sb_price_type=total;sr_order=popularity;sr_pri_blocks=889154202_358921867_2_0_0__21600;srepoch=1677698182;srpvid=ce458782d6e902e0;type=total;ucfs=1&#hotelTmpl").catch((e) => e);

    await page.waitForSelector('[data-testid="location-block-container"]');
    // const test = await page.$eval('[data-testid="location-block-container"]', (el) => el.innerHTML)
    //
    // console.log(test)



    // const test = await page.$eval('[data-testid="location-block-container"]', (el) => {
    //     const element = el.querySelector('[data-testid="property-section--content"]');
    //     return element.outerHTML
    // });
    //
    // console.log(test)



    await page.waitForSelector('ul[data-location-block-list="true"]');
    // const testArray = await page.$$eval('ul[data-location-block-list="true"]', (elements) => {
    //     return elements.map((element) => {
    //         const liListElement = element.innerHTML;
    //         // liListElement.
    //     });
    // });



    // const testArray = await page.$$eval('ul[data-location-block-list="true"]', (liLists) => {
    //     return liLists.map(liList => {
    //         return Array.from(liList.querySelectorAll('li'))
    //     });
    // })

    // const testArray = await page.$$eval('ul[data-location-block-list="true"] li', (liElements) => {
    //     return liElements.map(li => li.textContent.trim());
    // });

    // const ulList = await page.$$('ul[data-location-block-list="true"]');
    // const testArray = await Promise.all(ulList.map(async (ul) => {
    //     const liList = await ul.$$('li');
    //     return liList.map((li) => li.textContent);
    // }));
    //
    // console.log(testArray);

    //working
    const testArray = await page.$$eval('ul[data-location-block-list="true"]', (liLists) => {
        return liLists.map(liList => {
            return Array.from(liList.querySelectorAll('li')).map(li =>
                li.innerText.replace(/([A-Z])/g, ' $1').replace('\n', ' ').trim());
        });
    });

    console.log(testArray);

    // gives titles

    const elements = await page.$$('div.b3d1cacd40.cc56d568f0 > div.ac78a73c96.f0d4d6a2f5.fda3b74d0d');
    const texts = await Promise.all(elements.map(element => element.evaluate(node => node.textContent.trim())));
    console.log(texts);



    // const content = await page.$('[data-testid="location-block-container"]');
    // const ul = await content.$('ul[data-location-block-list="true"]');
    // console.log(ul)

    const endTime = new Date();
    const elapsedTime = endTime - startTime;
    // browser.close().catch((e) => e);
    console.log(`Elapsed time scrape hotels: ${elapsedTime}ms`);
}
scrapeHotels().then(r => r)
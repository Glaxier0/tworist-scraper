// const puppeteer = require('puppeteer');
const axios = require('axios')
async function autoComplete() {
    const searchTerm = 'Balıkesir'.toLocaleLowerCase();
    // bal%C4%B1kesir
    const encodedSearchTerm = encodeURIComponent(searchTerm)
    const suggestions = await (await axios.get('https://www.etstur.com/Otel/ajax/autocomplete?pagetype=SEARCH&q=' + encodedSearchTerm))
        .data["suggestions"]
    const url = suggestions.find(obj => obj.name.toLocaleLowerCase().includes(searchTerm + ' otelleri')).url;
    // suggestions.find(x => x.)
    // console.log(suggestions)
    // console.log(url)
}

autoComplete().then(r => r);
// async function scrapeHotels(url) {
//     const browser = await puppeteer.launch({
//         headless: true
//     });
//
//     const page = await browser.newPage();
//     // const url = 'https://www.booking.com/hotel/gb/comfortinnedgware.en-gb.html?aid=397594&label=gog235jc-1FCAEoggI46AdIKFgDaOQBiAEBmAEouAEXyAEM2AEB6AEB-AECiAIBqAIDuAKAwKygBsACAdICJDBkM2MzYTVlLTQwMjgtNGY2Yy05ZDQxLTc2MjRmYmU4ZmEyNNgCBeACAQ&sid=72a9d1104ff45429504706b924efcdd4&all_sr_blocks=23180306_190199343_3_0_0;checkin=2023-03-10;checkout=2023-03-11;dest_id=-2601889;dest_type=city;dist=0;group_adults=2;group_children=0;hapos=3;highlighted_blocks=23180306_190199343_3_0_0;hpos=3;matching_block_id=23180306_190199343_3_0_0;no_rooms=1;req_adults=2;req_children=0;room1=A%2CA;sb_price_type=total;sr_order=popularity;sr_pri_blocks=23180306_190199343_3_0_0__11993;srepoch=1678451288;srpvid=fd5957ab31d700a7;type=total;ucfs=1&#hotelTmpl';
//     const ua =
//         "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36";
//     await page.setUserAgent(ua);
//     const startTime = new Date();
//     // page.goto("https://www.booking.com/hotel/gb/birds-nest-residency.en-gb.html?aid=304142&label=gen173nr-1FCAQoggI46wdICVgEaOQBiAEBmAEJuAEXyAEM2AEB6AEB-AEDiAIBqAIDuALZsv6fBsACAdICJDQ0MTliYzVjLTdkOTQtNDdjNy1hMTRjLWIxNmEzMmRjZGE0NNgCBeACAQ&sid=72a9d1104ff45429504706b924efcdd4&all_sr_blocks=889154202_358921867_2_0_0;checkin=2023-03-03;checkout=2023-03-04;dest_id=-2601889;dest_type=city;dist=0;group_adults=2;group_children=0;hapos=4;highlighted_blocks=889154202_358921867_2_0_0;hpos=4;matching_block_id=889154202_358921867_2_0_0;no_rooms=1;req_adults=2;req_children=0;room1=A%2CA;sb_price_type=total;sr_order=popularity;sr_pri_blocks=889154202_358921867_2_0_0__21600;srepoch=1677698182;srpvid=ce458782d6e902e0;type=total;ucfs=1&#hotelTmpl").catch((e) => e);
//     page.goto(new URL(url.url)).catch((e) => e);
//
//     const properties = {
//         closeLocations: '',
//         summary: '',
//         popularFacilities: '',
//         facilities: '',
//         policies: ''
//     }
//
//     // Working, gets the list of close places with title
//     await page.waitForSelector('ul[data-location-block-list="true"]');
//     const closeLocations = await page.$$eval('ul[data-location-block-list="true"]',
//         liLists => {
//             return liLists.map(liList => {
//                 const title = liList.parentElement.innerText.trim()
//                     .replace(liList.innerText, "").replace("\n", "");
//                 const locations = Array.from(liList.querySelectorAll('li')).map(li =>
//                     li.innerText.replace(/([A-Z])/g, ' $1')
//                         .replace('\n', ' ').trim());
//                 return {title, locations}
//             });
//         });
//     // console.log(closeLocations);
//     properties.closeLocations = closeLocations;
//
//     // Working gives location titles, redundant now
//     // const elements = await page.$$('div.b3d1cacd40.cc56d568f0 > div.ac78a73c96.f0d4d6a2f5.fda3b74d0d');
//     // const texts = await Promise.all(elements.map(element => element.evaluate(node => node.textContent.trim())));
//     // console.log(texts);
//
//     // Working gives summary
//     await page.waitForSelector('#property_description_content');
//     const summary = await page.$$eval('#property_description_content > p',
//         elements => elements.map(element => element["innerText"].trim()));
//     // console.log(summary)
//     properties.summary = summary;
//
//     // Working get Most popular facilities
//     const popularFacilities = await page.$$eval('[data-testid="facility-list-most-popular-facilities"] > div',
//         elements => {
//             const title = 'Most popular facilities';
//             const facilities = elements.map(element => element["innerText"].trim());
//             return {title, facilities};
//         });
//     // console.log(popularFacilities);
//     properties.popularFacilities = popularFacilities;
//
//     // Working get facilities and titles
//     const facilities = await page.$$eval('[data-testid="facility-group-icon"', elements => {
//         return elements.map(element => {
//             const parentElement = element.parentElement;
//             const title = parentElement.innerText;
//             const properties = parentElement.parentElement.parentElement.parentElement.innerText
//                 .replace(title, "").trim().split("\n")
//             return {title, properties}
//         });
//     });
//     // console.log(facilities);
//     properties.facilities = facilities;
//
//     // Working hotel policies
//     const policies = await page.$eval('#hotelPoliciesInc', element => {
//         const checkInTime = element.querySelector('#checkin_policy .timebar__caption')?.textContent.trim() ?? '';
//         const checkOutTime = element.querySelector('#checkout_policy .timebar__caption')?.textContent.trim() ?? '';
//         const isChildrenAllowed = !element.querySelector('[data-test-id="child-policies-block"]')?.textContent
//             .includes("not allowed") ?? false;
//         const ageRestriction = element.querySelector('#age_restriction_policy')
//             .textContent.match(/\d+/) ? [0].trim() : 0;
//         const rules = Array.from(element.querySelectorAll('.description--house-rule p.policy_name')).map(rule => {
//             const ruleName = rule.textContent.replaceAll("\n", "").trim()
//             const ruleType = rule.parentElement.textContent.replace(ruleName, "")
//                 .replaceAll("\n", "").trim();
//             let isAllowed = null;
//             if (ruleType.toLocaleLowerCase().includes("not allowed")) {
//                 isAllowed = false;
//             } else if (ruleType.toLocaleLowerCase().includes("allowed")) {
//                 isAllowed = true
//             }
//
//             return {ruleName, ruleType, isAllowed}
//         });
//         const paymentCards = Array.from(element.querySelectorAll('.payment_methods_overall img')).map(payment => {
//             return payment.getAttribute('title').trim()
//         })
//         const noImageCards = Array.from(element.querySelectorAll('.no-image-payment')).map(payment => {
//             return payment.textContent.trim()
//         })
//         const cards = paymentCards.concat(noImageCards)
//
//         // Placeholder in case of other cancellation throws error
//         // const cancellationPolicy = element.querySelector('#cancellation_policy .policy_name')
//         // const cancellation = cancellationPolicy.parentElement.textContent
//         //     .replace(cancellationPolicy.textContent, "")
//         //     .replaceAll("\n", "").trim();
//
//         const cancellation = element.querySelector('#cancellation_policy')
//             .textContent.replaceAll("\n", "")
//             .replace("Cancellation/prepayment", "").trim()
//
//         return {checkInTime, checkOutTime, isChildrenAllowed, ageRestriction, rules, cards, cancellation}
//     });
//     // console.log(policies)
//     properties.policies = policies;
//
//     const endTime = new Date();
//     const elapsedTime = endTime - startTime;
//     browser.close().catch((e) => e);
//     console.log(`Elapsed time scrape hotels: ${elapsedTime}ms`);
//
//     return properties;
// }
//
// // scrapeHotels().then(r => r)
//
// module.exports = scrapeHotels
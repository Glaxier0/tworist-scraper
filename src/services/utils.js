function normalizeString(str) {
    return str
        .replace(/ı/g, 'i')
        .replace(/İ/g, 'I')
        .replace(/ş/g, 's')
        .replace(/Ş/g, 'S')
        .replace(/ğ/g, 'g')
        .replace(/Ğ/g, 'G')
        .replace(/ç/g, 'c')
        .replace(/Ç/g, 'C')
        .replace(/ö/g, 'o')
        .replace(/Ö/g, 'O')
        .replace(/ü/g, 'u')
        .replace(/Ü/g, 'U')
        .toLowerCase();
}

async function autoScroll(page, distance, scrollDelay, maxScrollTime) {
    return await page.evaluate(async (distance, scrollDelay, maxScrollTime) => {
        return await new Promise((resolve) => {
            let reachedBottom = false;
            let timedOut = false;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                const totalHeight = window.scrollY + window.innerHeight;

                // Stop scrolling when it reaches the bottom.
                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    reachedBottom = true;
                    resolve({status: 'success', reachedBottom});
                }
            }, scrollDelay);

            // Stop scrolling and resolve the promise with a status message if it takes more than 20 seconds.
            setTimeout(() => {
                clearInterval(timer);
                timedOut = true;
                resolve({status: 'timeout', timedOut});
            }, maxScrollTime);

            // Check if the function has timed out or reached the bottom every 100ms.
            const checkTimer = setInterval(() => {
                if (reachedBottom || timedOut) {
                    clearInterval(checkTimer);
                }
            }, 100);
        });
    }, distance, scrollDelay, maxScrollTime);
}

async function fastAutoScroll(page, distance, scrollDelay) {
    return await page.evaluate(async (distance, scrollDelay) => {
        return await new Promise((resolve) => {
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                const totalHeight = window.scrollY + window.innerHeight;

                // Stop scrolling when reaches to the bottom.
                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve({reachedBottom: true});
                }
            }, scrollDelay);
        });
    }, distance, scrollDelay);
}

module.exports = {normalizeString, autoScroll, fastAutoScroll}
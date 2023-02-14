const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.setViewport({ width: 1100, height: 800 });
    await page.goto('https://linkedin.com/');
    await page.waitForSelector('input[name="session_key"]');
    await page.type('input[name="session_key"]', 'dok2308@gmail.com');
    await page.type('input[name="session_password"]', 'Cuong01242663149');

    // Wait for 10 seconds using setTimeout
    await new Promise(resolve => setTimeout(resolve, 10000));    
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'load' });
    if (page.url().includes('checkpoint')) {
        console.log('Checkpoint');
        await new Promise(resolve => setTimeout(resolve, 10000));
    }
                

    await page.waitForSelector('input[placeholder="Search"]');
    await page.type('input[placeholder="Search"]', '#opentowork');
    await page.keyboard.press('Enter');

    const buttonXPath = '//button[text()="People"]';
    await page.waitForXPath(buttonXPath);
    const [button] = await page.$x(buttonXPath);
    await button.click();

    await page.waitForNavigation({ waitUntil: 'load' });

    // Scroll to the end of the page
    await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
    });

    const link_users = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('.app-aware-link'))
                            .filter(el => el.getAttribute('href').includes('/in/'));
        return elements.map(el => el.getAttribute('href'));
    });
    
    console.log(link_users);

    // Go to each user's profile
    await page.goto(link_users[0]);

    await page.waitForNavigation({ waitUntil: 'load' });

    // Scroll to the end of the page
    await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
    });

    let selectorXpath = '//span[text()="Experience"]'
    const elementHandle = await page.$x(selectorXpath);

    if (elementHandle.length === 0) {
        throw new Error(`Cannot find element with XPath selector: ${selectorXpath}`);
    }

    // Get the class name of the section element
    const sectionClassName = await page.evaluate((el) => {
        return el.closest('section').classList.value;
    }, elementHandle);


    console.log(sectionClassName)



    // const parentClassName = await page.evaluate(async () => {
    //     const element = document.querySelector(selectorXpath);
    //     return element.parentElement.classList.value;
    // });

    
})();

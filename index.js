const puppeteer = require('puppeteer');
const fs = require('fs');
const { parse } = require('json2csv');
require('dotenv').config();

class Puppeteer {
    constructor() {
        this.browser = null;
        this.page = null;
        this.width = 1100;
        this.height = 800;
    }

    async launch() {
        try {
            this.browser = await puppeteer.launch({ headless: false });
            this.page = await this.browser.newPage();
            await this.page.setViewport({ width: this.width, height: this.height });
            return ({
                status: 'success',
                message: 'Browser launched successfully!'
            })
        } catch (error) {
            console.log("Error when launching browser!")
            return this.error(error);
        }
    }

    async close() {
        await this.browser.close();
    }

    async wait(ms) {
        await new Promise(resolve => setTimeout(resolve, 5000));    
    }

    async error(message) {
        console.log(message)
        return ({
            status: 'failed',
            message: message
        })
    }

    async appendToFile(filePath, data) {
        try {            
            if(fs.existsSync(filePath))
                fs.appendFileSync(filePath, data + "\n");
            else
                fs.writeFileSync(filePath, data + "\n");
            return ({
                status: 'success',
                message: 'Write to file successfully!'
            })
        } catch (error) {
            console.log("Error when writing to file!")
            return this.error(error);
        }
    }

    async LogIn() {
        try {
            const url = 'https://linkedin.com/';
            await this.page.goto(url);
            await this.page.waitForSelector('input[name="session_key"]');
            await this.page.type('input[name="session_key"]', process.env.EMAIL);
            await this.page.type('input[name="session_password"]', process.env.PASSWORD);
            await this.wait(5000);
            await this.page.click('button[type="submit"]');

            while (this.page.url().includes('checkpoint')) {
                console.log('Checkpoint! Please verify your account!');
                await this.wait(5000);
                if (this.page.url().includes('feed')) 
                    break;
            } 

            return ({
                status: 'success',
                message: 'Log in successfully!',
                url: this.page.url()
            })
        } catch (error) {
            console.log("Error when log in!")
            return this.error(error);
        }
    }

    async SearchPeople(keyword, type = 'People') {
        try {
            await this.page.waitForSelector('input[placeholder="Search"]');
            await this.page.type('input[placeholder="Search"]', keyword);
            await this.page.keyboard.press('Enter');
            // Click on People button in default to search people
            const buttonXPath = `//button[text()="${type}"]`;
            await this.page.waitForXPath(buttonXPath);
            const [button] = await this.page.$x(buttonXPath);
            await button.click();
            await this.page.waitForNavigation({ waitUntil: 'load' });

            // Scroll to the end of the page
            await this.page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });

            const link_users = await this.page.evaluate(() => {
                const elements = Array.from(document.querySelectorAll('span.entity-result__title-text.t-16 a.app-aware-link'))
                                    .filter(el => el.getAttribute('href').includes('/in/'));
                return elements.map(el => el.getAttribute('href'));
            });
            
            return ({
                status: 'success',
                message: 'Search successfully!',
                url: this.page.url(),
                link_users: link_users
            })
        } catch (error) {
            console.log("Error when search!")
            return this.error(error);
        }
    }

    async ExtractSelectorQuery(document, selector) {
        try {
            const element = document.querySelector(selector);
            return (element ? element.innerText : '');
        } catch (error) {
            console.log("Error when extract selector query!", selector)
            return this.error(error);
        }
    }

    async GetProfile(link) {
        try {
            await this.page.goto(link);
            // Wait for the page to load
            await this.wait(5000);
            // Get profile
            const profile = await this.page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);

                let name = document.querySelector("h1.text-heading-xlarge");
                let title = document.querySelector('div.text-body-medium');
                let location = document.querySelector('span.text-body-small.inline.t-black--light.break-words');
                let connections = document.querySelectorAll('span.t-black--light')[8];
                let about = document.querySelector('div.pv-about__summary-text');

                let data = Array.from(document.querySelectorAll("section.artdeco-card.ember-view.relative.break-words.pb3.mt2"))
                                .map(el => {
                                    let title = el.querySelector("h2 span[aria-hidden='true']").innerText;
                                    let content = Array.from(el.querySelectorAll('li')).map(elem_li => {
                                        let header = elem_li.querySelector(".mr1.t-bold span[aria-hidden='true']");
                                        let content = elem_li.querySelector(".inline-show-more-text.inline-show-more-text--is-collapsed span[aria-hidden='true']");

                                        if (header && content) 
                                            return header.innerText + ': ' + content.innerText;
                                        if (header) 
                                            return header.innerText
                                    });

                                    if (content)
                                        return {title, content};
                                })
                
                format_data = {
                    "Name": name ? name.innerText : '',
                    "Title": title ? title.innerText : '',
                    "Location": location ? location.innerText : '',
                    "Connection":  connections ? connections.innerText : '',
                    "About": about ? about.innerText : '',
                    "URL": window.location.href
                };

                data.forEach(el => {
                    content = el.content.filter(el => el != undefined)
                    format_data[el.title] = content.join(', ')
                })

                return {format_data}
            });

            return ({
                status: 'success',
                message: 'Get profile successfully!',
                url: this.page.url(),
                profile: profile
            })
        } catch (error) {
            console.log("Error when get profile!")
            return this.error(error);
        }
    }
}

const scraper = new Puppeteer();

(async () => {
    await scraper.launch();

    await scraper.LogIn();
    await scraper.wait(5000);
    let users_link = await scraper.SearchPeople('#opentowork');
    console.log(users_link)

    let user_info = [];

    for (let i = 0; i < users_link.link_users.length; i++) {
        let profile = await scraper.GetProfile(users_link.link_users[i]);
        console.log(profile);
        user_info.push(profile.profile.format_data);
    }

    let FileName = "data.csv";
    let data = parse(user_info, {header: true});
    scraper.appendToFile(FileName, data);

    await scraper.close();
})();

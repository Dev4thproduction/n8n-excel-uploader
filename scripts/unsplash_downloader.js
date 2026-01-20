const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function downloadUnsplashImage(config) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set download behavior
    const downloadPath = path.resolve(__dirname, '../temp/unsplash');
    if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath, { recursive: true });

    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadPath,
    });

    try {
        console.log('Logging into Unsplash...');
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        await page.goto(config.loginUrl, { waitUntil: 'domcontentloaded' });

        console.log('Checking login state...');
        try {
            await page.waitForSelector(config.usernameSelector, { timeout: 10000 });
            console.log('Login form found. Typing credentials...');
            await page.type(config.usernameSelector, config.username);
            await page.type(config.passwordSelector, config.password);

            const loginBtn = "form[action*='/nlog'] button[type='submit']";
            await page.waitForSelector(loginBtn);
            await page.click(loginBtn);

            console.log('Waiting for login redirection...');
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
        } catch (err) {
            console.log('Email selector not found. Checking if already logged in...');
            const isLoggedIn = await page.evaluate(() => {
                return !!document.querySelector('button[aria-label=\"Your profile\"], a[href*=\"/@\"]');
            });

            if (isLoggedIn) {
                console.log('Already logged in! Proceeding...');
            } else {
                throw new Error('Could not find login form and not logged in.');
            }
        }

        if (page.url().includes('login') && !page.url().includes('login_redirect')) {
            // Second check in case navigation happened but still on login
            const stillOnLogin = await page.evaluate(() => !!document.querySelector('input[name=\"email\"]'));
            if (stillOnLogin) throw new Error('Still on login page - Login failed?');
        }

        console.log('Login State: Verified.');
        await page.goto(config.searchUrl, { waitUntil: 'networkidle2' });

        console.log('Searching for download buttons...');
        await page.waitForSelector(config.downloadButtonSelector, { timeout: 30000 });

        console.log('Picking a random image from the first 10...');
        const randomIndex = await page.evaluate((selector) => {
            const buttons = document.querySelectorAll(selector);
            // Limit to the first 10 images to ensure they are likely loaded/visible
            const limit = Math.min(buttons.length, 10);
            const index = Math.floor(Math.random() * limit);

            const btn = buttons[index];
            if (btn) {
                btn.scrollIntoView({ behavior: 'auto', block: 'center' });
            }
            return index;
        }, config.downloadButtonSelector);

        await new Promise(r => setTimeout(r, 2000));

        const existingFiles = fs.readdirSync(downloadPath);
        console.log(`Clicking download button #${randomIndex + 1} via JS...`);
        await page.evaluate((selector, index) => {
            const buttons = document.querySelectorAll(selector);
            const btn = buttons[index];
            if (btn) btn.click();
            else console.log('Button not found during click phase');
        }, config.downloadButtonSelector, randomIndex);

        console.log('Download triggered. Monitoring folder for changes...');

        let downloadStarted = false;
        // Search for up to 120 seconds
        for (let i = 0; i < 120; i++) {
            await new Promise(r => setTimeout(r, 1000));

            const currentFiles = fs.readdirSync(downloadPath);
            const crFiles = currentFiles.filter(f => f.endsWith('.crdownload') || f.endsWith('.tmp'));
            const finishedFiles = currentFiles.filter(f => !f.endsWith('.crdownload') && !f.endsWith('.tmp'));

            // Detection Logic:
            // 1. If we see a .crdownload, a download has started.
            // 2. Once NO .crdownload files exist AND the folder has more files than before (or same if overwrite), we are done.
            if (crFiles.length > 0) {
                downloadStarted = true;
                if (i % 5 === 0) console.log(`Downloading: ${crFiles[0]}...`);
            } else if (downloadStarted) {
                console.log('Success! All downloads completed.');
                break;
            } else if (i > 15 && finishedFiles.length > existingFiles.length) {
                // If it was so fast we missed the .crdownload
                console.log('Success! New file detected (fast download).');
                break;
            }

            if (i % 10 === 0 && !downloadStarted) {
                console.log('Waiting for download to trigger...');
            }
        }

        const finalFiles = fs.readdirSync(downloadPath);
        console.log('Total files now in folder:', finalFiles.length);
        if (!downloadStarted && finalFiles.length <= existingFiles.length) {
            console.log('Warning: No new download detected.');
        }

    } catch (error) {
        console.error('Unsplash Error:', error.message);
        const errorPath = path.resolve(__dirname, '../temp/unsplash_error.png');
        await page.screenshot({ path: errorPath });
        console.log('Error screenshot saved to:', errorPath);
    } finally {
        await browser.close();
    }
}

// Standalone execution
if (require.main === module) {
    const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../config.json'), 'utf8'))
        .find(c => c.customerId === 'unsplash');

    downloadUnsplashImage(config);
}

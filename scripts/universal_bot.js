const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function runBot(siteId) {
    const configPath = path.resolve(__dirname, '../config.json');
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const site = configData.find(s => s.id === siteId);

    if (!site) {
        console.error(`Error: Site ID "${siteId}" not found in config.json`);
        process.exit(1);
    }

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    const downloadPath = site.type === 'excel'
        ? path.resolve(__dirname, '../websites')
        : path.resolve(__dirname, '../temp/unsplash');

    if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath, { recursive: true });

    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadPath });

    try {
        console.log(`[${site.id}] Navigating to Login...`);
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.goto(site.loginUrl, { waitUntil: 'domcontentloaded' });

        // Optional: Click a button to open login modal (e.g., Pngtree)
        if (site.preLoginBtn) {
            console.log(`[${site.id}] Opening login modal...`);
            try {
                await page.waitForSelector(site.preLoginBtn, { timeout: 15000 });
                await page.click(site.preLoginBtn);
                await new Promise(r => setTimeout(r, 2000));
            } catch (e) {
                console.log(`[${site.id}] Pre-login button not found, checking if already logged in...`);
            }
        }

        // Smart Login check
        const needsLogin = await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            return !!el && el.offsetParent !== null; // Must be visible
        }, site.usernameSelector);

        if (needsLogin) {
            console.log(`[${site.id}] Logging in...`);
            await page.type(site.usernameSelector, site.username);
            await page.type(site.passwordSelector, site.password);
            await page.click(site.loginBtn);

            console.log(`[${site.id}] Waiting for navigation...`);
            try {
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
            } catch (e) {
                console.log(`[${site.id}] Navigation timeout (proceeding...)`);
            }
        } else {
            // Final check if actually logged in
            const isLoggedIn = await page.evaluate(() => {
                return !!document.querySelector('button[aria-label="Your profile"], a[href*="/@"], .user-center, .logout-btn');
            });
            if (isLoggedIn) {
                console.log(`[${site.id}] Already logged in.`);
            } else if (!site.preLoginBtn) {
                console.log(`[${site.id}] Login fields not found. Bot might be stuck.`);
            }
        }

        console.log(`[${site.id}] Going to action URL: ${site.actionUrl}`);
        await page.goto(site.actionUrl, { waitUntil: 'domcontentloaded' });

        const existingFiles = fs.readdirSync(downloadPath);

        if (site.type === 'image') {
            console.log(`[${site.id}] Waiting for search results...`);
            await page.waitForSelector(site.downloadBtn, { timeout: 30000 });

            const randomIndex = Math.floor(Math.random() * 8); // Top 8 images
            console.log(`[${site.id}] Picking random image #${randomIndex + 1}...`);
            await page.evaluate((sel, idx) => {
                const btns = document.querySelectorAll(sel);
                if (btns[idx]) {
                    btns[idx].scrollIntoView({ behavior: 'auto', block: 'center' });
                }
            }, site.downloadBtn, randomIndex);

            await new Promise(r => setTimeout(r, 1500)); // Pause to let UI settle

            await page.evaluate((sel, idx) => {
                const btns = document.querySelectorAll(sel);
                if (btns[idx]) btns[idx].click();
            }, site.downloadBtn, randomIndex);
        } else {
            console.log(`[${site.id}] Clicking download...`);
            await page.waitForSelector(site.downloadBtn);
            await page.click(site.downloadBtn);
        }

        console.log(`[${site.id}] Monitoring folder for download...`);
        let downloadStarted = false;
        let success = false;

        for (let i = 0; i < 120; i++) {
            await new Promise(r => setTimeout(r, 1000));
            const currentFiles = fs.readdirSync(downloadPath);
            const crFiles = currentFiles.filter(f => f.endsWith('.crdownload') || f.endsWith('.tmp'));
            const finishedFiles = currentFiles.filter(f => !f.endsWith('.crdownload') && !f.endsWith('.tmp'));

            if (crFiles.length > 0) {
                downloadStarted = true;
                if (i % 10 === 0) console.log(`[${site.id}] Downloading: ${crFiles[0]}`);
            } else if (downloadStarted || (i > 15 && finishedFiles.length > existingFiles.length)) {
                console.log(`[${site.id}] SUCCESS: Download complete.`);
                success = true;
                break;
            }
            if (i % 20 === 0 && !downloadStarted) console.log(`[${site.id}] Still waiting for download to start...`);
        }

        if (!success) console.log(`[${site.id}] Timeout: No new file detected.`);

    } catch (error) {
        console.error(`[${site.id}] ERROR: ${error.message}`);
        const errorPath = path.resolve(__dirname, `../temp/${site.id}_error.png`);
        await page.screenshot({ path: errorPath });
    } finally {
        await browser.close();
    }
}

const siteArg = process.argv[2];
if (siteArg) runBot(siteArg);
else console.log("Missing Site ID");

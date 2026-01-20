const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// --- CONFIGURATION (Change these for different websites) ---
const SITE_CONFIG = {
    loginUrl: 'https://audio.com/auth/sign-in',
    targetUrl: 'https://audio.com/trending',
    email: 'neeraj43607@gmail.com',
    password: 'Aman2002',
    downloadPath: 'C:\\Users\\4D\\Desktop\\music',

    // Selectors for this specific site
    emailSelector: 'input[type="email"]',
    passwordSelector: 'input[type="password"]',
    loginButtonSelector: 'button[type="submit"]',
    audioLinkSelector: 'a[href*="/audio/"]', // Finds links to audio pages
    downloadButtonSelector: 'button:has-text("Download")', // Common button text
};

async function runAutomation() {
    const browser = await chromium.launch({ headless: false }); // Set to true for production
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log('Logging in...');
        await page.goto(SITE_CONFIG.loginUrl);
        await page.fill(SITE_CONFIG.emailSelector, SITE_CONFIG.email);
        await page.fill(SITE_CONFIG.passwordSelector, SITE_CONFIG.password);
        await page.click(SITE_CONFIG.loginButtonSelector);

        // Wait for login to complete (adjust time if needed)
        await page.waitForURL('https://audio.com/');
        console.log('Login successful!');

        // Go to trending/discovery page
        await page.goto(SITE_CONFIG.targetUrl);
        await page.waitForLoadState('networkidle');

        // Find all audio links
        const links = await page.locator(SITE_CONFIG.audioLinkSelector).all();
        if (links.length === 0) throw new Error('No audio found!');

        // Pick a random one
        const randomLink = links[Math.floor(Math.random() * links.length)];
        const href = await randomLink.getAttribute('href');
        console.log(`Navigating to audio: ${href}`);

        await page.goto(`https://audio.com${href}`);
        await page.waitForLoadState('networkidle');

        // Trigger Download
        console.log('Looking for download button...');
        const downloadBtn = page.locator('button').filter({ hasText: /^Download$/i }).first();

        if (await downloadBtn.isVisible()) {
            const [download] = await Promise.all([
                page.waitForEvent('download'),
                downloadBtn.click(),
            ]);

            const finalPath = path.join(SITE_CONFIG.downloadPath, download.suggestedFilename());
            await download.saveAs(finalPath);
            console.log(`✅ Success! Audio saved to: ${finalPath}`);
        } else {
            console.log('❌ Download button not found or not available for this track.');
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await browser.close();
    }
}

runAutomation();

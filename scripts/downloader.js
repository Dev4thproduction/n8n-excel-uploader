const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function downloadExcel(config, downloadPath) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        console.log(`[${config.customerId}] Navigating to ${config.loginUrl}...`);
        // Use 127.0.0.1 and longer timeout
        const loginUrl = config.loginUrl.replace('localhost', '127.0.0.1');
        await page.goto(loginUrl, {
            waitUntil: 'load',
            timeout: 60000
        });

        // Login
        console.log(`[${config.customerId}] Logging in...`);
        await page.waitForSelector(config.usernameSelector, { timeout: 10000 });
        await page.type(config.usernameSelector, config.username);
        await page.type(config.passwordSelector, config.password);

        await Promise.all([
            page.click(config.loginButtonSelector),
            page.waitForNavigation({ waitUntil: 'load', timeout: 10000 }).catch(e => console.log(`[${config.customerId}] Navigation wait after login: ${e.message}`))
        ]);

        // Get file name and download URL
        const fileInfo = await page.evaluate(() => {
            const firstFileItem = document.querySelector('.file-item');
            if (!firstFileItem) return null;
            const nameSpan = firstFileItem.querySelector('.file-info span');
            const downloadLink = firstFileItem.querySelector('a[title="Download"]');
            return {
                name: nameSpan ? nameSpan.textContent.trim() : null,
                url: downloadLink ? downloadLink.href : null
            };
        });

        if (!fileInfo || !fileInfo.name) {
            throw new Error('No files found on dashboard');
        }

        const fileName = fileInfo.name;
        const downloadUrl = fileInfo.url.replace('localhost', '127.0.0.1');
        console.log(`[${config.customerId}] Latest file: ${fileName}`);
        console.log(`[${config.customerId}] Download URL: ${downloadUrl}`);

        // Download the file using axios (more reliable than browser download)
        console.log(`[${config.customerId}] Starting download to: ${downloadPath}`);
        const axios = require('axios');
        const filePath = path.join(downloadPath, fileName);

        try {
            const response = await axios({
                method: 'get',
                url: downloadUrl,
                responseType: 'stream'
            });

            await new Promise((resolve, reject) => {
                const writer = fs.createWriteStream(filePath);
                response.data.pipe(writer);
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
            console.log(`[${config.customerId}] ✓ Download complete: ${fileName}`);
        } catch (downloadError) {
            throw new Error(`Axios download failed: ${downloadError.message}`);
        }

    } catch (error) {
        console.error(`[${config.customerId}] Error:`, error.message);
        throw error;
    } finally {
        await browser.close();
    }
}

// Example usage structure for n8n
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error('Usage: node downloader.js <config_json_base64>');
        process.exit(1);
    }

    const config = JSON.parse(Buffer.from(args[0], 'base64').toString());
    const targetDir = path.resolve(__dirname, '../temp', config.customerId);

    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    downloadExcel(config, targetDir)
        .then(() => console.log('Success'))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

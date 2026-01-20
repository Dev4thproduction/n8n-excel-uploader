const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Load tracking file to see which files have been processed
function loadProcessedFiles() {
    const trackingPath = path.resolve(__dirname, '../processed_files_tracker.json');
    if (fs.existsSync(trackingPath)) {
        return JSON.parse(fs.readFileSync(trackingPath, 'utf8'));
    }
    return {};
}

// Save tracking file
function saveProcessedFiles(data) {
    const trackingPath = path.resolve(__dirname, '../processed_files_tracker.json');
    fs.writeFileSync(trackingPath, JSON.stringify(data, null, 2));
}

// Download the latest file and return its name
async function downloadLatestFile(config, downloadPath) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        console.log(`[${config.customerId}] Navigating to ${config.loginUrl}...`);
        await page.goto(config.loginUrl, {
            waitUntil: 'load',
            timeout: 60000
        });

        // Login
        console.log(`[${config.customerId}] Logging in...`);
        await page.waitForSelector(config.usernameSelector, { timeout: 10000 });
        await page.type(config.usernameSelector, config.username);
        await page.type(config.passwordSelector, config.password);

        console.log(`[${config.customerId}] Clicking login button...`);
        await Promise.all([
            page.click(config.loginButtonSelector),
            page.waitForNavigation({ waitUntil: 'load', timeout: 10000 }).catch(e => console.log(`[${config.customerId}] Navigation wait after click: ${e.message}`))
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
            console.log(`[${config.customerId}] No files found on dashboard.`);
            await browser.close();
            return { success: false, fileName: null, reason: 'no_files' };
        }

        const fileName = fileInfo.name;
        const downloadUrl = fileInfo.url;
        console.log(`[${config.customerId}] Latest file: ${fileName}`);
        console.log(`[${config.customerId}] Download URL: ${downloadUrl}`);

        // Set download behavior - still set it just in case, but we'll use axios
        const client = await page.target().createCDPSession();
        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: downloadPath,
        });

        // Download the file using axios (more reliable than browser download)
        console.log(`[${config.customerId}] Starting download to: ${downloadPath}`);
        const axios = require('axios');
        const downloadedFileName = fileName; // We'll save it with its original name
        const filePath = path.join(downloadPath, downloadedFileName);

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
            console.log(`[${config.customerId}] ✓ Download complete via Axios: ${downloadedFileName}`);
        } catch (downloadError) {
            console.error(`[${config.customerId}] Axios download failed:`, downloadError.message);
            await browser.close();
            return { success: false, fileName: fileName, reason: 'download_failed' };
        }

        await browser.close();
        return { success: true, fileName: fileName, downloadedAs: downloadedFileName };

    } catch (error) {
        await browser.close();
        console.error(`[${config.customerId}] Error:`, error.message);
        return { success: false, fileName: null, reason: 'error', error: error.message };
    }
}

// Main smart download function
async function smartDownload(config) {
    const processedTracker = loadProcessedFiles();
    const customerId = config.customerId;

    // Initialize tracker for this customer if not exists
    if (!processedTracker[customerId]) {
        processedTracker[customerId] = [];
    }

    const targetDir = path.resolve(__dirname, '../temp', customerId);

    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    // Try to download the latest file
    const result = await downloadLatestFile(config, targetDir);

    if (!result.success) {
        if (result.reason === 'no_files') {
            console.log(`[${customerId}] No files found on website.`);
        } else if (result.reason === 'download_timeout') {
            console.log(`[${customerId}] Download timed out for: ${result.fileName}`);
        } else {
            console.log(`[${customerId}] Error: ${result.reason}`);
        }
        return { downloaded: false, fileName: result.fileName, reason: result.reason };
    }

    const fileName = result.fileName;

    // Check if this file has already been processed
    if (processedTracker[customerId].includes(fileName)) {
        console.log(`[${customerId}] ✓ File "${fileName}" already processed. Skipping.`);
        // Delete the downloaded file since we don't need it
        const filePath = path.join(targetDir, result.downloadedAs);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        return { downloaded: false, fileName: fileName, reason: 'already_processed' };
    }

    // Mark this file as processed
    processedTracker[customerId].push(fileName);
    saveProcessedFiles(processedTracker);

    console.log(`[${customerId}] ✓ New file downloaded and marked as processed.`);
    return { downloaded: true, fileName: fileName };
}

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error('Usage: node smart_downloader.js <config_json_base64>');
        process.exit(1);
    }

    const config = JSON.parse(Buffer.from(args[0], 'base64').toString());

    smartDownload(config)
        .then(result => {
            console.log('Result:', JSON.stringify(result));
            if (!result.downloaded) {
                process.exit(0); // Exit successfully but indicate no download
            }
        })
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = { smartDownload };

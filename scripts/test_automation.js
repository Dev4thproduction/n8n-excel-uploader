const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function runTest() {
    console.log('--- Starting n8n Automation Test ---');

    // NEW: Clear temp directory to avoid picking up old files
    const tempDir = path.resolve(__dirname, '../temp');
    if (fs.existsSync(tempDir)) {
        console.log('Cleaning temp directory...');
        fs.readdirSync(tempDir).forEach(file => {
            const p = path.join(tempDir, file);
            if (fs.lstatSync(p).isDirectory()) {
                fs.rmSync(p, { recursive: true, force: true });
            } else {
                fs.unlinkSync(p);
            }
        });
    }
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const configPath = path.join(__dirname, '../config.json');
    const configs = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    for (const config of configs) {
        console.log(`\nProcessing: ${config.customerId}`);

        // Convert config to base64 to pass as argument (simulating n8n dynamic command)
        const configBase64 = Buffer.from(JSON.stringify(config)).toString('base64');
        const scriptPath = path.join(__dirname, 'downloader.js');

        try {
            console.log(`Running downloader for ${config.customerId}...`);
            const output = execSync(`node "${scriptPath}" ${configBase64}`, { encoding: 'utf8' });
            console.log(output);
        } catch (error) {
            console.error(`Error processing ${config.customerId}:`, error.stdout || error.message);
        }
    }

    console.log('\n--- Automation Test Complete ---');
    console.log('Check the "temp" folder for the downloaded files.');
}

runTest();

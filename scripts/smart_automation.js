const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function logProcessingHistory(customer, downloadedFile, processedFile, recordCount) {
    try {
        // Check if already logged
        const historyRes = await axios.get('http://127.0.0.1:3000/api/processing-history');
        const isDuplicate = historyRes.data.some(h =>
            h.customer === customer &&
            h.downloadedFile === downloadedFile
        );

        if (isDuplicate) {
            console.log(`○ Skipped logging ${customer}: ${downloadedFile} already in history.`);
            return;
        }

        await axios.post('http://127.0.0.1:3000/api/processing-history', {
            customer: customer,
            downloadedFile: downloadedFile,
            processedFile: processedFile,
            recordCount: recordCount,
            status: 'success'
        });
        console.log(`✓ Logged processing history for ${customer}`);
    } catch (error) {
        console.error(`Failed to log history for ${customer}:`, error.message);
    }
}

async function runSmartAutomation() {
    console.log('=== Starting Smart Automation Workflow ===\n');

    const configPath = path.join(__dirname, '../config.json');
    const configs = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    let hasNewFiles = false;
    const downloadResults = [];
    const processedFiles = {}; // Track which files were downloaded

    // Step 1: Smart Download - Only download NEW files
    console.log('📥 STEP 1: Checking for new files...\n');

    for (const config of configs) {
        const configBase64 = Buffer.from(JSON.stringify(config)).toString('base64');
        const scriptPath = path.join(__dirname, 'smart_downloader.js');

        try {
            console.log(`Checking ${config.customerId}...`);
            const output = execSync(`node "${scriptPath}" ${configBase64}`, { encoding: 'utf8' });
            console.log(output);

            // Parse the result to get file name
            const resultMatch = output.match(/Result: ({.*})/);
            if (resultMatch) {
                const result = JSON.parse(resultMatch[1]);
                if (result.downloaded) {
                    hasNewFiles = true;
                    downloadResults.push({ customer: config.customerId, status: 'new_file' });
                    processedFiles[config.customerId] = result.fileName;
                } else {
                    downloadResults.push({ customer: config.customerId, status: 'no_new_file' });
                }
            }
        } catch (error) {
            console.error(`Error checking ${config.customerId}:`, error.message);
            downloadResults.push({ customer: config.customerId, status: 'error' });
        }
    }

    console.log('\n📊 Download Summary:');
    downloadResults.forEach(r => {
        const icon = r.status === 'new_file' ? '✓' : r.status === 'no_new_file' ? '○' : '✗';
        console.log(`  ${icon} ${r.customer}: ${r.status}`);
    });

    // If no new files, stop here
    if (!hasNewFiles) {
        console.log('\n✓ No new files to process. Workflow complete.');
        return;
    }

    // Step 2: Process downloaded files
    console.log('\n⚙️  STEP 2: Processing new files...\n');
    const templatePath = path.join(__dirname, '../template/DesktopTemplate.xlsx');
    try {
        const processOut = execSync(`node "${path.join(__dirname, 'processor.js')}" "${templatePath}"`, { encoding: 'utf8' });
        console.log(processOut);
    } catch (error) {
        console.error('Processing error:', error.message);
        throw error;
    }

    /* Step 3: Upload to Central Dashboard - DISABLING as per request to remove Data Records
    console.log('\n📤 STEP 3: Uploading to Central Dashboard...\n');
    try {
        const uploadOut = execSync(`node "${path.join(__dirname, 'uploader.js')}"`, { encoding: 'utf8' });
        console.log(uploadOut);
    } catch (error) {
        console.error('Upload error:', error.message);
        throw error;
    }
    */

    // Step 4: Log Processing History
    console.log('\n📝 STEP 4: Logging processing history...\n');
    for (const [customer, downloadedFile] of Object.entries(processedFiles)) {
        const processedFile = `processed_${customer}.xlsx`;

        // Count records in processed file
        let recordCount = 0;
        try {
            const ExcelJS = require('exceljs');
            const workbook = new ExcelJS.Workbook();
            const filePath = path.join(__dirname, '../processed', processedFile);
            if (fs.existsSync(filePath)) {
                await workbook.xlsx.readFile(filePath);
                const sheet = workbook.getWorksheet(1);
                recordCount = sheet.rowCount - 1; // Subtract header row
            }
        } catch (err) {
            console.error(`Error counting records for ${customer}:`, err.message);
        }

        await logProcessingHistory(customer, downloadedFile, processedFile, recordCount);
    }

    console.log('\n=== ✓ Smart Automation Complete ===');
}

runSmartAutomation().catch(err => {
    console.error('Automation failed:', err);
    process.exit(1);
});

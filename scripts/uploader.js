const path = require('path');
const fs = require('fs');
const axios = require('axios');
const ExcelJS = require('exceljs');

async function logToHistory() {
    const customers = ['customer1', 'customer2', 'customer3'];
    const results = [];

    console.log('--- Logging Processing Results to History ---');

    for (const customer of customers) {
        const fileName = `processed_${customer}.xlsx`;
        const filePath = path.resolve(__dirname, '../processed', fileName);

        if (!fs.existsSync(filePath)) {
            console.log(`Skipping ${customer}, processed file not found: ${fileName}`);
            continue;
        }

        // 1. Calculate record count for the history log
        let recordCount = 0;
        try {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);
            recordCount = workbook.getWorksheet(1).rowCount - 1;
        } catch (e) {
            console.error(`Error reading ${fileName}:`, e.message);
        }

        // 2. Find the original file name (best effort)
        // We look in temp/customer/ to find the most recent file
        let originalFile = 'N/A';
        const tempDir = path.resolve(__dirname, '../temp', customer);
        if (fs.existsSync(tempDir)) {
            const files = fs.readdirSync(tempDir).filter(f => f.endsWith('.xlsx'));
            if (files.length > 0) {
                // Get the most recently modified file
                const stats = files.map(f => ({ name: f, time: fs.statSync(path.join(tempDir, f)).mtime.getTime() }));
                originalFile = stats.sort((a, b) => b.time - a.time)[0].name;
            }
        }

        // 3. Fetch current history to check for duplicates
        let isDuplicate = false;
        try {
            const historyRes = await axios.get('http://127.0.0.1:3000/api/processing-history');
            const history = historyRes.data;
            isDuplicate = history.some(h =>
                h.customer === customer &&
                h.downloadedFile === originalFile
            );
        } catch (e) {
            console.warn('Could not fetch history for duplicate check, proceeding anyway...');
        }

        if (isDuplicate) {
            console.log(`Skipping ${customer}: File ${originalFile} already logged.`);
            results.push(`○ Skipped ${customer} (Already exists)`);
            continue;
        }

        console.log(`Logging ${customer}: ${recordCount} records...`);

        // 4. Post to Processing History API
        try {
            await axios.post('http://127.0.0.1:3000/api/processing-history', {
                customer: customer,
                downloadedFile: originalFile,
                processedFile: fileName,
                recordCount: recordCount,
                status: 'success'
            });
            results.push(`✓ Successfully logged ${customer}`);
        } catch (error) {
            results.push(`✗ Failed to log ${customer}: ${error.message}`);
        }
    }

    return results.join('\n');
}

if (require.main === module) {
    logToHistory()
        .then((msg) => {
            console.log('\nFinal Results:');
            console.log(msg);
            console.log('\nProcess Complete');
        })
        .catch(err => {
            console.error('Process Failed:', err.message);
            process.exit(1);
        });
}

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const FormData = require('form-data');

// Configuration for customers and mapping
const CONFIG = {
    customer1: {
        baseUrl: 'http://localhost:3001',
        mapping: { 'ID': 'id', 'Product': 'item_name', 'Amount': 'total_price', 'Date': 'date' }
    },
    customer2: {
        baseUrl: 'http://localhost:3002',
        mapping: { 'ID': 'id', 'Product': 'item_name', 'Amount': 'total_price', 'Date': 'date' }
    },
    customer3: {
        baseUrl: 'http://localhost:3003',
        mapping: { 'ID': 'id', 'Product': 'item_name', 'Amount': 'total_price', 'Date': 'date' }
    }
};

const CENTRAL_API = 'http://localhost:3000/api/upload';

async function runAgent() {
    console.log('🚀 Agent starting: Processing customer data...');

    for (const [custId, cfg] of Object.entries(CONFIG)) {
        try {
            console.log(`\nChecking ${custId}...`);

            // 1. Get file list
            const filesRes = await axios.get(`${cfg.baseUrl}/api/files`);
            const files = filesRes.data;

            if (files.length === 0) {
                console.log(`No files found for ${custId}. Skipping.`);
                continue;
            }

            const latestFile = files[0];
            console.log(`Downloading ${latestFile}...`);

            // 2. Download file
            const downloadRes = await axios({
                url: `${cfg.baseUrl}/api/download/${latestFile}`,
                method: 'GET',
                responseType: 'arraybuffer'
            });

            const tempInputPath = path.join(__dirname, '../temp', `input_${custId}.xlsx`);
            const tempOutputPath = path.join(__dirname, '../temp', `converted_${custId}.xlsx`);

            if (!fs.existsSync(path.join(__dirname, '../temp'))) fs.mkdirSync(path.join(__dirname, '../temp'));
            fs.writeFileSync(tempInputPath, downloadRes.data);

            // 3. Convert data
            console.log(`Converting ${latestFile} to central format...`);
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(tempInputPath);
            const sheet = workbook.getWorksheet(1);
            const headers = sheet.getRow(1).values.filter(v => v);

            const centralWorkbook = new ExcelJS.Workbook();
            const centralSheet = centralWorkbook.addWorksheet('Standardized Data');

            // Define standard headers
            const standardHeaders = ['id', 'item_name', 'total_price', 'date'];
            centralSheet.addRow(standardHeaders);

            sheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return;
                const vals = row.values;
                const newRow = [];

                // Map based on header name
                standardHeaders.forEach(sh => {
                    const originalHeader = Object.keys(cfg.mapping).find(key => cfg.mapping[key] === sh);
                    const colIndex = headers.indexOf(originalHeader);
                    if (colIndex !== -1) {
                        newRow.push(vals[colIndex + 1]);
                    } else {
                        newRow.push('');
                    }
                });
                centralSheet.addRow(newRow);
            });

            await centralWorkbook.xlsx.writeFile(tempOutputPath);

            // 4. Upload to Central
            console.log(`Uploading converted data to Central Dashboard...`);
            const form = new FormData();
            form.append('customer', custId);
            form.append('file', fs.createReadStream(tempOutputPath), `converted_${custId}_${Date.now()}.xlsx`);

            const uploadRes = await axios.post(CENTRAL_API, form, {
                headers: { ...form.getHeaders() }
            });

            if (uploadRes.status === 200) {
                console.log(`✅ ${custId} data successfully processed and uploaded!`);
            }

            // Cleanup
            fs.unlinkSync(tempInputPath);
            fs.unlinkSync(tempOutputPath);

        } catch (err) {
            console.error(`❌ Error processing ${custId}:`, err.message);
        }
    }

    console.log('\n✨ Agent task completed.');
}

runAgent();

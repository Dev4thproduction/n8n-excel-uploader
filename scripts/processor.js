const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function convertToDesktopFormat(templatePath) {
    const tempDir = path.resolve(__dirname, '../temp');
    const outputDir = path.resolve(__dirname, '../processed');

    // NEW: Clear processed directory to avoid old files
    if (fs.existsSync(outputDir)) {
        console.log('Cleaning processed directory...');
        fs.readdirSync(outputDir).forEach(file => fs.unlinkSync(path.join(outputDir, file)));
    } else {
        fs.mkdirSync(outputDir);
    }

    // 1. Read the Template to get column headers
    const templateWorkbook = new ExcelJS.Workbook();
    await templateWorkbook.xlsx.readFile(templatePath);
    const templateSheet = templateWorkbook.getWorksheet(1);
    const headers = templateSheet.getRow(1).values.filter(v => v); // Get non-empty headers

    const customers = ['customer1', 'customer2', 'customer3'];

    for (const customer of customers) {
        const customerDir = path.join(tempDir, customer);
        if (!fs.existsSync(customerDir)) continue;

        const customerFiles = fs.readdirSync(customerDir)
            .filter(f => f.endsWith('.xlsx'))
            .map(name => {
                const stats = fs.statSync(path.join(customerDir, name));
                return { name, time: stats.mtimeMs };
            })
            .sort((a, b) => b.time - a.time);

        if (customerFiles.length === 0) continue;

        const latestFile = customerFiles[0].name;

        // 2. Create a new workbook for THIS specific customer
        const finalWorkbook = new ExcelJS.Workbook();
        const finalSheet = finalWorkbook.addWorksheet('Standardized Data');
        finalSheet.getRow(1).values = headers; // Set headers from template

        const filePath = path.join(customerDir, latestFile);
        console.log(`Processing latest file for ${customer}: ${latestFile}`);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        const sheet = workbook.getWorksheet(1);

        // Helper to get clean cell value
        function getCellValue(cell) {
            const val = cell.value;
            if (val === null || val === undefined) return '';
            if (val instanceof Date) return val; // Keep Date objects for ExcelJS writing
            if (typeof val === 'object') {
                return val.result !== undefined ? val.result : (val.text || JSON.stringify(val));
            }
            return val;
        }

        let globalIdCounter = -1;
        let idPrefix = '';
        let idPadding = 0;

        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip source header

            // Initialize or update ID counter from the first non-empty ID
            const rawId = getCellValue(row.getCell(1));
            if (globalIdCounter === -1 && rawId) {
                const match = String(rawId).match(/^(.*?)(\d+)$/);
                if (match) {
                    idPrefix = match[1];
                    globalIdCounter = parseInt(match[2], 10);
                    idPadding = match[2].length;
                }
            }

            // Extract core values
            const productValue = String(getCellValue(row.getCell(2)) || '');

            // Check if we need to split this row (contains /)
            const itemsToProcess = productValue.includes('/')
                ? productValue.split('/').map(i => i.trim()).filter(i => i !== '')
                : [productValue];

            if (itemsToProcess.length > 1) {
                console.log(`   └─ Splitting row: "${productValue}" -> ${itemsToProcess.length} rows`);
            }

            itemsToProcess.forEach(item => {
                const rowData = [];

                // Generate sequential ID
                let finalId = rawId; // Default fallback
                if (globalIdCounter !== -1) {
                    finalId = idPrefix + String(globalIdCounter).padStart(idPadding, '0');
                    globalIdCounter++;
                }

                headers.forEach(header => {
                    const h = header.toUpperCase();
                    if (h.includes('ID')) rowData.push(finalId);
                    else if (h.includes('NAME') || h.includes('CUSTOMER')) rowData.push(customer.toUpperCase());
                    else if (h.includes('PRODUCT') || h.includes('DESC')) rowData.push(item);
                    else if (h.includes('PRICE') || h.includes('AMOUNT')) rowData.push(getCellValue(row.getCell(3)));
                    else if (h.includes('DATE')) rowData.push(getCellValue(row.getCell(4)));
                    else rowData.push(''); // Empty for unknown columns
                });
                finalSheet.addRow(rowData);
            });
        });

        // 3. Save as separate file for this customer
        const outputPath = path.join(outputDir, `processed_${customer}.xlsx`);
        await finalWorkbook.xlsx.writeFile(outputPath);
        console.log(`Success! File created for ${customer}: ${outputPath}`);
    }
}

// Get template path from command line
const args = process.argv.slice(2);
const tPath = args[0] || path.join(__dirname, '../template/DesktopTemplate.xlsx');
convertToDesktopFormat(tPath).catch(err => console.error(err));

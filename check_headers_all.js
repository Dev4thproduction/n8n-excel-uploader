const ExcelJS = require('exceljs');
const path = require('path');

async function checkHeaders() {
    const workbook = new ExcelJS.Workbook();

    try {
        await workbook.xlsx.readFile(path.join(__dirname, 'websites/customer2/public/data_c2.xlsx'));
        console.log('Customer 2 Headers:', workbook.getWorksheet(1).getRow(1).values.filter(v => v));
    } catch (e) { console.log('C2 file not found'); }

    try {
        await workbook.xlsx.readFile(path.join(__dirname, 'websites/customer3/public/data_c3.xlsx'));
        console.log('Customer 3 Headers:', workbook.getWorksheet(1).getRow(1).values.filter(v => v));
    } catch (e) { console.log('C3 file not found'); }
}

checkHeaders();

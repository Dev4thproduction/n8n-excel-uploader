const ExcelJS = require('exceljs');
const path = require('path');

async function checkHeaders() {
    const workbook = new ExcelJS.Workbook();
    const filePath = path.join(__dirname, 'websites/customer1/public/data_c1.xlsx');
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet(1);
    const headers = sheet.getRow(1).values.filter(v => v);
    console.log('Customer 1 Headers:', headers);
}

checkHeaders();

const ExcelJS = require('exceljs');
const path = require('path');

async function createTemplate() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Template');

    // These are the columns for your "Desktop Format"
    sheet.columns = [
        { header: 'REPORT_ID', width: 15 },
        { header: 'CUSTOMER_NAME', width: 20 },
        { header: 'PRODUCT_DESC', width: 30 },
        { header: 'UNIT_PRICE', width: 15 },
        { header: 'TOTAL_AMOUNT', width: 15 },
        { header: 'DATE_OF_SALE', width: 15 }
    ];

    const templatePath = path.join(__dirname, '../template/DesktopTemplate.xlsx');
    await workbook.xlsx.writeFile(templatePath);
    console.log(`Template created at: ${templatePath}`);
}

createTemplate();

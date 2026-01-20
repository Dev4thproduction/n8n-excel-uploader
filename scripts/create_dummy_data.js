const ExcelJS = require('exceljs');
const path = require('path');

async function createDummyExcels() {
    const products = ['Laptop', 'Mouse', 'Monitor', 'Keyboard', 'Headset', 'Webcam', 'Charger', 'USB Hub', 'Tablet', 'Phone'];

    for (let i = 1; i <= 3; i++) {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Sales Data');

        sheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Product', key: 'product', width: 25 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'Date', key: 'date', width: 15 }
        ];

        // Generate 10 rows
        for (let j = 1; j <= 10; j++) {
            sheet.addRow({
                id: 100 + j,
                product: `${products[j - 1]} (Cust ${i})`,
                amount: Math.floor(Math.random() * 500) + (100 * i), // More variety
                date: '2024-01-14'
            });
        }

        const filePath = path.join(__dirname, `../websites/customer${i}/public/data_c${i}.xlsx`);
        await workbook.xlsx.writeFile(filePath);
        console.log(`Created dummy Excel for Customer ${i} (10 rows): ${filePath}`);
    }
}

createDummyExcels();

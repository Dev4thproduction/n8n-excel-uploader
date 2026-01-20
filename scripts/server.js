const express = require('express');
const path = require('path');
const multer = require('multer');
const ExcelJS = require('exceljs');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Helper to get clean cell value from ExcelJS cell
function getCellValue(cell) {
    let val = cell.value;
    if (val === null || val === undefined) return '';

    // Handle complex objects (formulas, rich text)
    if (typeof val === 'object' && !(val instanceof Date)) {
        if (val.result !== undefined) val = val.result;
        else if (val.text !== undefined) val = val.text;
        else if (val.richText !== undefined) val = val.richText.map(rt => rt.text).join('');
    }

    // Now check if it's a Date
    if (val instanceof Date) {
        try {
            return val.toISOString().split('T')[0];
        } catch (e) {
            return val.toString();
        }
    }

    if (typeof val === 'object') return JSON.stringify(val);
    return val;
}

// Persistent storage paths
const DATA_FILE = path.join(__dirname, '../data/dataStore.json');
const HISTORY_FILE = path.join(__dirname, '../data/processingHistory.json');

// Load data from files
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            console.log(`Loaded ${data.length} records from storage`);
            return data;
        }
    } catch (err) {
        console.error('Error loading data:', err.message);
    }
    return [];
}

function loadHistory() {
    try {
        if (fs.existsSync(HISTORY_FILE)) {
            const history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
            console.log(`Loaded ${history.length} history entries from storage`);
            return history;
        }
    } catch (err) {
        console.error('Error loading history:', err.message);
    }
    return [];
}

// Save data to files
function saveData(data) {
    try {
        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error saving data:', err.message);
    }
}

function saveHistory(history) {
    try {
        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
    } catch (err) {
        console.error('Error saving history:', err.message);
    }
}

// Load data on startup
let dataStore = loadData();
let processingHistory = loadHistory();

// Serve Central Dashboard on Port 3000
const centralApp = express();
centralApp.use(express.json());
centralApp.use(express.static(path.join(__dirname, '../websites/central/public')));

// Request logger for debugging
const logger = (req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
};
centralApp.use(logger);

// Routes for clean URLs
centralApp.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../websites/central/public/login.html')));
centralApp.get('/processing-history', (req, res) => res.sendFile(path.join(__dirname, '../websites/central/public/data.html')));
centralApp.get('/upload', (req, res) => res.sendFile(path.join(__dirname, '../websites/central/public/upload.html')));
centralApp.get('/extract-excel', (req, res) => res.sendFile(path.join(__dirname, '../websites/central/public/extract.html')));
centralApp.get('/data-view', (req, res) => res.redirect('/processing-history'));
centralApp.get('/records', (req, res) => res.redirect('/processing-history'));
centralApp.get('/', (req, res) => res.redirect('/login'));

// API: Clear all records
centralApp.delete('/api/data/clear', (req, res) => {
    dataStore = [];
    saveData(dataStore);
    res.status(200).send('All data cleared');
});

// API: Handle file upload
centralApp.post('/api/upload', upload.single('file'), async (req, res) => {
    const customer = req.body.customer;
    const filePath = req.file.path;

    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        const sheet = workbook.getWorksheet(1);

        const headers = [];
        sheet.getRow(1).eachCell((cell, colNumber) => {
            headers.push({ name: cell.value, col: colNumber });
        });

        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const record = {
                id: Date.now() + Math.random().toString(36).substr(2, 9),
                customer: customer.toUpperCase()
            };
            headers.forEach(h => {
                const key = h.name.toString().toLowerCase().replace(/ /g, '_');
                record[key] = getCellValue(row.getCell(h.col));
            });
            dataStore.push(record);
        });

        saveData(dataStore);
        res.status(200).send('Upload successful');
    } catch (err) {
        console.error('Processing error:', err);
        res.status(500).send('Processing failed');
    } finally {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
});

// API: Fetch records
centralApp.get('/api/data', (req, res) => {
    const customer = req.query.customer;
    if (customer && customer !== 'all') {
        const filtered = dataStore.filter(r => r.customer.toLowerCase() === customer.toLowerCase());
        return res.json(filtered);
    }
    res.json(dataStore);
});

// API: Delete a record
centralApp.delete('/api/data/:id', (req, res) => {
    dataStore = dataStore.filter(r => r.id !== req.params.id);
    saveData(dataStore);
    res.status(200).send('Deleted');
});

// API: Bulk Delete records
centralApp.post('/api/data/bulk-delete', (req, res) => {
    const ids = req.body.ids;
    if (!Array.isArray(ids)) return res.status(400).send('Invalid IDs');
    dataStore = dataStore.filter(r => !ids.includes(r.id));
    saveData(dataStore);
    res.status(200).send(`${ids.length} records deleted`);
});

// API: Edit a record
centralApp.put('/api/data/:id', (req, res) => {
    const id = req.params.id;
    const index = dataStore.findIndex(r => r.id === id);
    if (index !== -1) {
        dataStore[index] = { ...dataStore[index], ...req.body };
        saveData(dataStore);
        return res.status(200).send('Updated');
    }
    res.status(404).send('Not found');
});

const { execSync } = require('child_process');

// API: Get Processing History
centralApp.get('/api/processing-history', (req, res) => {
    const customer = req.query.customer;
    let filtered = processingHistory;

    if (customer && customer !== 'all') {
        filtered = processingHistory.filter(h => h.customer.toLowerCase() === customer.toLowerCase());
    }

    // Sort by timestamp descending (newest first)
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(filtered);
});

// API: Add Processing History Entry
centralApp.post('/api/processing-history', (req, res) => {
    const entry = {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        ...req.body
    };
    processingHistory.push(entry);
    saveHistory(processingHistory);
    res.status(201).json(entry);
});

// API: Delete Processing History Entry
centralApp.delete('/api/processing-history/:id', (req, res) => {
    const { id } = req.params;
    processingHistory = processingHistory.filter(h => h.id !== id);
    saveHistory(processingHistory);
    res.status(200).send('History entry deleted');
});

// API: Download Original File
centralApp.get('/api/download-original/:customer/:filename', (req, res) => {
    const { customer, filename } = req.params;
    const filePath = path.join(__dirname, '../temp', customer, filename);

    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).send('File not found');
    }
});

// API: Download Processed File
centralApp.get('/api/download-processed/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../processed', filename);

    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).send('File not found');
    }
});

// API: Preview Original File Data
centralApp.get('/api/preview-original/:customer/:filename', async (req, res) => {
    const { customer, filename } = req.params;
    const filePath = path.join(__dirname, '../temp', customer, filename);
    if (!fs.existsSync(filePath)) return res.status(404).send('File not found');

    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        const sheet = workbook.getWorksheet(1);
        const data = [];
        const headers = sheet.getRow(1).values.filter(v => v);

        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const record = {};
            headers.forEach((h, i) => {
                record[h] = getCellValue(row.getCell(i + 1));
            });
            data.push(record);
        });
        res.json({ headers, data });
    } catch (err) {
        res.status(500).send('Error reading file');
    }
});

// API: Magic extraction from unstructured text
centralApp.post('/api/magic-extract', upload.single('image'), async (req, res) => {
    const { text } = req.body;

    // Heuristic: If there's an image but no text, we'd normally do OCR
    // For now, we'll assume the 'text' field contains the email/data content
    if (!text) return res.status(400).json({ success: false, error: 'No text provided' });

    console.log('--- AI Extraction Request Received ---');
    console.log('Raw Text Preview:', text.substring(0, 100) + '...');

    try {
        // AI Simulation Logic:
        // 1. Detect if it's a list (line by line)
        // 2. Identify common delimiters or keywords
        const lines = text.split('\n').filter(l => l.trim().length > 3);

        // Simple heuristic for columns: [Name, Qty, Price, Total] or [ID, Name, Date]
        // We'll aim for a standard Product structure if keywords match, otherwise generic
        let columns = ['Item Name', 'Quantity', 'Unit Price', 'Total'];
        const dataRows = [];

        lines.forEach(line => {
            // Try to extract numbers and currency
            const amountMatches = line.match(/(\$|£|€)?\s?\d+(\.\d+)?/g);
            const qtyMatch = line.match(/\b\d+\s?(unit|qty|x|pcs)?\b/i);

            const row = {
                'Item Name': line.replace(/(\$|£|€)?\s?\d+(\.\d+)?/g, '').replace(/\b\d+\s?(unit|qty|x|pcs)?\b/i, '').trim(),
                'Quantity': qtyMatch ? qtyMatch[0] : '1',
                'Unit Price': amountMatches && amountMatches[0] ? amountMatches[0] : '0',
                'Total': amountMatches && amountMatches.length > 1 ? amountMatches[amountMatches.length - 1] : (amountMatches && amountMatches[0] ? amountMatches[0] : '0')
            };

            if (row['Item Name'].length > 2) dataRows.push(row);
        });

        // Special check: if we found no structured data, return generic
        if (dataRows.length === 0) {
            return res.json({
                success: true,
                columns: ['Original Text'],
                data: lines.map(l => ({ 'Original Text': l }))
            });
        }

        res.json({ success: true, columns, data: dataRows });
    } catch (err) {
        console.error('AI Extraction Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
centralApp.post('/api/export-excel', async (req, res) => {
    const { columns, data } = req.body;
    if (!columns || !data) return res.status(400).send('Missing columns or data');

    try {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Exported Data');

        // Add headers
        sheet.getRow(1).values = columns;
        sheet.getRow(1).font = { bold: true };

        // Add rows
        data.forEach(item => {
            const rowValues = columns.map(col => item[col] || '');
            sheet.addRow(rowValues);
        });

        // Auto-fit columns
        sheet.columns.forEach(column => {
            column.width = 20;
        });

        const tempFilePath = path.join(__dirname, `../temp/export_${Date.now()}.xlsx`);
        await workbook.xlsx.writeFile(tempFilePath);

        res.download(tempFilePath, 'exported_data.xlsx', () => {
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        });
    } catch (err) {
        console.error('Export error:', err);
        res.status(500).send('Export failed');
    }
});
centralApp.get('/api/preview-processed/:filename', async (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../processed', filename);
    if (!fs.existsSync(filePath)) return res.status(404).send('File not found');

    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        const sheet = workbook.getWorksheet(1);
        const data = [];
        const headers = sheet.getRow(1).values.filter(v => v);

        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const record = {};
            headers.forEach((h, i) => {
                record[h] = getCellValue(row.getCell(i + 1));
            });
            data.push(record);
        });
        res.json({ headers, data });
    } catch (err) {
        res.status(500).send('Error reading file');
    }
});

// API: Run Automation Workflow
centralApp.post('/api/run-automation', (req, res) => {
    try {
        console.log('--- Starting Full Automation Triggered from UI ---');

        // Run Smart Automation (only processes NEW files)
        console.log('Running Smart Automation Workflow...');
        const automationOut = execSync(`node "${path.join(__dirname, 'smart_automation.js')}"`, { encoding: 'utf8' });

        console.log('--- Smart Automation Complete ---');

        res.status(200).json({ success: true, details: automationOut });
    } catch (err) {
        console.error('Automation Error:', err.message);
        res.status(500).json({ success: false, error: err.message, details: err.stdout });
    }
});

centralApp.listen(3000, () => console.log('Central Dashboard: http://localhost:3000/login'));

// Serve Customer 1 on Port 3001
const app1 = express();
app1.use(logger);
app1.use(express.static(path.join(__dirname, '../websites/customer1/public')));

// Serve Customer 2 on Port 3002
const app2 = express();
app2.use(logger);
app2.use(express.static(path.join(__dirname, '../websites/customer2/public')));

// Serve Customer 3 on Port 3003
const app3 = express();
app3.use(logger);
app3.use(express.static(path.join(__dirname, '../websites/customer3/public')));

// Setup common routes
setupCustomerRoutes(app1, 'customer1');
setupCustomerRoutes(app2, 'customer2');
setupCustomerRoutes(app3, 'customer3');

app1.listen(3001, () => console.log('Customer 1 Website: http://localhost:3001'));
app2.listen(3002, () => console.log('Customer 2 Website: http://localhost:3002'));
app3.listen(3003, () => console.log('Customer 3 Website: http://localhost:3003'));

// Common routes for Customer Apps
function setupCustomerRoutes(app, customerId) {
    const customerDir = path.join(__dirname, `../websites/${customerId}/public`);
    const uploadDir = path.join(__dirname, `../uploads/${customerId}`);

    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    app.use(express.json());

    // API: Upload Excel (Multiple)
    app.post('/api/upload', upload.array('files'), (req, res) => {
        if (!req.files || req.files.length === 0) return res.status(400).send('No files uploaded');

        req.files.forEach(file => {
            const targetPath = path.join(uploadDir, file.originalname);
            fs.renameSync(file.path, targetPath);
        });
        res.status(200).send('Upload successful');
    });

    // API: List Files (Sorted by newest)
    app.get('/api/files', (req, res) => {
        const files = fs.readdirSync(uploadDir)
            .filter(f => f.endsWith('.xlsx'))
            .map(name => {
                const stats = fs.statSync(path.join(uploadDir, name));
                return { name, time: stats.mtimeMs };
            })
            .sort((a, b) => b.time - a.time)
            .map(f => f.name);
        res.json(files);
    });

    // API: Delete File
    app.delete('/api/files/:filename', (req, res) => {
        const filename = req.params.filename;
        const filePath = path.join(uploadDir, filename);
        console.log(`[${customerId}] Attempting to delete: ${filePath}`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`[${customerId}] Successfully deleted: ${filename}`);
            res.status(200).send('Deleted');
        } else {
            console.log(`[${customerId}] Delete failed: File not found - ${filePath}`);
            res.status(404).send('File not found');
        }
    });

    // API: Download File
    app.get('/api/download/:filename', (req, res) => {
        const filePath = path.join(uploadDir, req.params.filename);
        if (fs.existsSync(filePath)) {
            res.download(filePath);
        } else {
            res.status(404).send('File not found');
        }
    });

    // API: Preview Excel Data
    app.get('/api/preview/:filename', async (req, res) => {
        const filePath = path.join(uploadDir, req.params.filename);
        if (!fs.existsSync(filePath)) return res.status(404).send('File not found');

        try {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);
            const sheet = workbook.getWorksheet(1);
            const data = [];
            const headers = [];
            sheet.getRow(1).eachCell((cell, colNumber) => {
                headers.push({ name: cell.value, col: colNumber });
            });

            sheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return;
                const record = {};
                headers.forEach(h => {
                    record[h.name] = getCellValue(row.getCell(h.col));
                });
                data.push(record);
            });
            res.json({ headers: headers.map(h => h.name), data });
        } catch (err) {
            res.status(500).send('Error reading file');
        }
    });
};

setupCustomerRoutes(app1, 'customer1');
setupCustomerRoutes(app2, 'customer2');
setupCustomerRoutes(app3, 'customer3');

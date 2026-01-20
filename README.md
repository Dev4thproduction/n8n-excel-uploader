# 📋 System Overview - N8N Auto Excel Uploader

## 🎯 What This System Does

**Your Goal:** When you upload files in Customer 1, 2, or 3 websites → n8n downloads them → processes them → shows them in central web dashboard

**Status:** ✅ **SYSTEM IS WORKING AS DESIGNED!**

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CUSTOMER LAYER                            │
│  3 Customer Websites (Ports 3001-3003)                      │
│  Users upload Excel files → Stored in /uploads/customerX/   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   AUTOMATION LAYER                           │
│  N8N Trigger (Every 5 min) OR Manual Trigger                │
│  Runs: scripts/smart_automation.js                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   PROCESSING PIPELINE                        │
│  Step 1: Smart Download → /temp/customerX/                  │
│  Step 2: Process Files → /processed/                        │
│  Step 3: Upload to Central → In-memory dataStore            │
│  Step 4: Log History → processingHistory array              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                         │
│  Central Dashboard (Port 3000)                              │
│  View data, filter by customer, manage records             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Features

### 1. Smart Duplicate Prevention ⭐
- Tracks processed files in `processed_files_tracker.json`
- Only downloads NEW files
- Prevents duplicate data in dashboard
- Efficient - skips unnecessary processing

### 2. Multi-Customer Support 🏢
- Handles 3 separate customer websites
- Isolated file storage per customer
- Data tagged with customer identifier
- Filter by customer in dashboard

### 3. Automated Processing 🤖
- Browser automation with Puppeteer
- Automatic login and file download
- Column mapping and standardization
- Hands-free operation

### 4. Data Standardization 📊
- Converts different formats to standard template
- Consistent column structure
- Automatic customer tagging
- Ready for analysis

---

## 📂 File Structure

```
n8n-auto-excel-uploader/
│
├── 📁 uploads/              ← Customer website uploads
│   ├── customer1/           ← Customer 1 files
│   ├── customer2/           ← Customer 2 files
│   └── customer3/           ← Customer 3 files
│
├── 📁 temp/                 ← Downloaded files (automation)
│   ├── customer1/           ← Downloaded from Customer 1
│   ├── customer2/           ← Downloaded from Customer 2
│   └── customer3/           ← Downloaded from Customer 3
│
├── 📁 processed/            ← Standardized files
│   ├── processed_customer1.xlsx
│   ├── processed_customer2.xlsx
│   └── processed_customer3.xlsx
│
├── 📁 scripts/              ← Automation scripts
│   ├── server.js            ← Main server (4 websites)
│   ├── smart_automation.js  ← Main orchestrator ⭐
│   ├── smart_downloader.js  ← Smart download logic
│   ├── processor.js         ← File processing
│   └── uploader.js          ← Central upload
│
├── 📁 websites/             ← Web applications
│   ├── central/             ← Central Dashboard (3000)
│   ├── customer1/           ← Customer 1 Site (3001)
│   ├── customer2/           ← Customer 2 Site (3002)
│   └── customer3/           ← Customer 3 Site (3003)
│
├── 📄 config.json           ← Customer credentials
├── 📄 processed_files_tracker.json  ← Duplicate prevention ⭐
└── 📄 n8n_smart_automation_corrected.json  ← N8N workflow ⭐
```

---

## 🚀 How to Use

### Quick Start
```bash
# 1. Start all servers
npm start

# 2. Upload files to customer websites
# Go to http://localhost:3001 (or 3002, 3003)
# Login and upload Excel files

# 3. Run automation
node scripts/smart_automation.js

# 4. View results
# Go to http://localhost:3000/data-view
```

### N8N Integration
```bash
# 1. Import workflow to n8n
# File: n8n_smart_automation_corrected.json

# 2. Activate workflow
# Runs every 5 minutes automatically

# 3. Monitor executions
# Check n8n execution logs
```

---

## 🌐 System URLs

| Service | URL | Login |
|---------|-----|-------|
| **Central Dashboard** | http://localhost:3000 | admin / password |
| Customer 1 | http://localhost:3001 | user1 / pass1 |
| Customer 2 | http://localhost:3002 | user2 / pass2 |
| Customer 3 | http://localhost:3003 | user3 / pass3 |

---

## 📊 Data Flow Example

### Scenario: New File Upload

```
1. User uploads "Sales_Jan.xlsx" to Customer 1 website
   → File saved to: /uploads/customer1/Sales_Jan.xlsx
   
2. N8N triggers automation (or manual run)
   → Runs: scripts/smart_automation.js
   
3. Smart Downloader checks Customer 1
   → Finds: Sales_Jan.xlsx
   → Checks tracker: Not processed before ✓
   → Downloads to: /temp/customer1/Sales_Jan.xlsx
   → Updates tracker: {"customer1": ["Sales_Jan.xlsx"]}
   
4. Processor converts file
   → Reads: /temp/customer1/Sales_Jan.xlsx
   → Maps columns to template format
   → Saves: /processed/processed_customer1.xlsx
   
5. Uploader sends to Central
   → Logs into: http://localhost:3000
   → Uploads: processed_customer1.xlsx
   → Data stored in: dataStore array (in-memory)
   
6. Processing History logged
   → Entry created with:
      - Customer: customer1
      - File: Sales_Jan.xlsx
      - Records: 150
      - Status: success
      
7. Data visible in Central Dashboard
   → Go to: http://localhost:3000/data-view
   → Filter: Customer 1
   → See: 150 records from Sales_Jan.xlsx
```

---

## ✅ System Status Check

### Current Status
- ✅ Server running (npm start)
- ✅ Customer websites accessible
- ✅ Central dashboard accessible
- ✅ Automation scripts functional
- ✅ File tracking working
- ✅ Data processing working
- ✅ Upload to central working

### Processed Files Tracker
```json
{
  "customer1": ["data_c1 (1).xlsx"],
  "customer2": ["data_c3.xlsx"]
}
```

### Available Processed Files
- processed_customer1.xlsx (6.9 KB)
- processed_customer2.xlsx (6.7 KB)

---

## 🔧 Common Operations

### Reset System (Reprocess All Files)
```bash
# Clear tracker
echo {} > processed_files_tracker.json

# Clear central data
curl -X DELETE http://localhost:3000/api/data/clear

# Run automation
node scripts/smart_automation.js
```

### View Current Data
```bash
# Check tracker
type processed_files_tracker.json

# Check processed files
dir processed

# Check customer uploads
dir uploads\customer1
dir uploads\customer2
dir uploads\customer3
```

### Debug Issues
```bash
# Test automation
node scripts/smart_automation.js

# Check server logs
# Look at terminal where "npm start" is running

# Check browser console
# Open http://localhost:3000/data-view
# Press F12 → Console tab
```

---

## ⚠️ Important Notes

1. **Data is NOT persistent**
   - Stored in memory (RAM)
   - Lost on server restart
   - Consider adding database for production

2. **Tracker IS persistent**
   - Stored in file
   - Survives server restarts
   - Prevents duplicate processing

3. **Only processes NEW files**
   - Won't reprocess same file twice
   - Clear tracker to reprocess

4. **All servers must run**
   - Use `npm start` to start all 4 servers
   - Central + 3 customer sites

---

## 🎯 Next Steps

### For Testing
1. ✅ Upload test file to customer website
2. ✅ Run automation manually
3. ✅ Verify data in central dashboard
4. ✅ Check processing history

### For Production
1. 🔲 Add persistent database
2. 🔲 Implement error notifications
3. 🔲 Add file validation
4. 🔲 Set up proper logging
5. 🔲 Configure n8n schedule
6. 🔲 Add monitoring/alerts

---

## 📚 Documentation Files

- **SYSTEM_FLOW_ANALYSIS.md** - Detailed flow explanation
- **QUICK_REFERENCE.md** - Commands and troubleshooting
- **FLOW_ANALYSIS.md** - Issues and recommendations
- **README.md** (this file) - System overview

---

## 🎉 Summary

**Your system is working correctly!** 

The flow you described is exactly what happens:
1. ✅ Upload files to Customer 1, 2, 3
2. ✅ N8N downloads them (smart download)
3. ✅ System processes them (standardization)
4. ✅ Shows in Central Dashboard (data view)

**Key Points:**
- Smart duplicate prevention
- Automated processing
- Multi-customer support
- Web-based dashboard

**Ready to use!** Just upload files and run the automation. 🚀

---

**Last Updated:** 2026-01-19  
**Version:** 2.0 (Smart Automation)  
**Status:** ✅ Operational

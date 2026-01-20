# 🚀 Quick Reference Guide - N8N Auto Excel Uploader

## 📍 System URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| **Central Dashboard** | http://localhost:3000/login | admin / password |
| Customer 1 Website | http://localhost:3001 | user1 / pass1 |
| Customer 2 Website | http://localhost:3002 | user2 / pass2 |
| Customer 3 Website | http://localhost:3003 | user3 / pass3 |

---

## ⚡ Quick Actions

### Start the System
```bash
npm start
```
This starts all 4 web servers (Central + 3 Customer sites)

### Run Automation Manually
```bash
node scripts/smart_automation.js
```

### Reset Tracking (Reprocess All Files)
```bash
# Delete tracker file
del processed_files_tracker.json

# Or clear it
echo {} > processed_files_tracker.json
```

### Clear Central Dashboard Data
```bash
# Via API
curl -X DELETE http://localhost:3000/api/data/clear
```

---

## 🔄 Complete Workflow

### 1️⃣ Upload Files to Customer Sites
1. Go to customer website (e.g., http://localhost:3001)
2. Login with customer credentials
3. Navigate to dashboard
4. Upload Excel file(s)
5. Files are stored in `/uploads/customer1/`

### 2️⃣ Run Automation
**Option A: From Central Dashboard**
1. Go to http://localhost:3000/login
2. Login: admin / password
3. Click "Upload" in navigation
4. Click "Run Automation" button

**Option B: From Command Line**
```bash
node scripts/smart_automation.js
```

**Option C: N8N Scheduled**
1. Import `n8n_agent_workflow.json` to n8n
2. Activate workflow
3. Runs every 5 minutes automatically

### 3️⃣ View Results
1. Go to http://localhost:3000/data-view
2. Select customer filter (All/Customer1/Customer2/Customer3)
3. View uploaded data in table
4. Check Processing History section

---

## 📂 Important Files & Directories

### Configuration
- `config.json` - Customer website login details
- `processed_files_tracker.json` - Tracks processed files (prevents duplicates)

### Data Directories
- `/uploads/customerX/` - Files uploaded via customer websites
- `/temp/customerX/` - Downloaded files (before processing)
- `/processed/` - Standardized files ready for upload
- `/template/` - Standard Excel template

### Scripts
- `scripts/server.js` - Main server (runs all 4 websites)
- `scripts/smart_automation.js` - Main automation orchestrator
- `scripts/smart_downloader.js` - Downloads NEW files only
- `scripts/processor.js` - Converts to standard format
- `scripts/uploader.js` - Uploads to central dashboard

---

## 🎯 Understanding the Flow

```
Customer Upload → /uploads/customerX/ 
    ↓
N8N Trigger (Manual/Scheduled)
    ↓
Smart Download → /temp/customerX/ (only NEW files)
    ↓
Process → /processed/processed_customerX.xlsx
    ↓
Upload → Central Dashboard (in-memory dataStore)
    ↓
View → http://localhost:3000/data-view
```

---

## 🔍 Troubleshooting

### Problem: "No new files to process"
**Cause:** Files already in tracker  
**Solution:** 
```bash
# Option 1: Clear entire tracker
echo {} > processed_files_tracker.json

# Option 2: Edit tracker and remove specific file names
# Edit: processed_files_tracker.json
```

### Problem: Data not showing in Central Dashboard
**Check:**
1. ✓ Did automation run successfully? (check console logs)
2. ✓ Are files in `/processed/` directory?
3. ✓ Is server running? (npm start)
4. ✓ Any errors in browser console?

**Debug:**
```bash
# Check processed files
dir processed

# Check tracker
type processed_files_tracker.json

# Run automation with verbose output
node scripts/smart_automation.js
```

### Problem: Duplicate data appearing
**Cause:** Running automation multiple times without clearing data  
**Solution:**
```bash
# Clear central dashboard data before running
curl -X DELETE http://localhost:3000/api/data/clear

# Or use the UI toggle "Clear previous data" before running automation
```

### Problem: Automation can't login to customer site
**Check:**
1. ✓ Is server running? (npm start)
2. ✓ Are credentials correct in `config.json`?
3. ✓ Is customer website accessible? (try manual login)

---

## 📊 Current System Status

### Processed Files Tracker
```json
{
  "customer1": ["data_c1 (1).xlsx"],
  "customer2": ["data_c3.xlsx"]
}
```

### Processed Files Available
- ✓ processed_customer1.xlsx (6.9 KB)
- ✓ processed_customer2.xlsx (6.7 KB)

---

## 🎓 Key Concepts

### Smart Download
- Only downloads files that haven't been processed before
- Prevents duplicate data in central dashboard
- Tracks files in `processed_files_tracker.json`

### Data Standardization
- Converts different Excel formats to standard template
- Maps columns automatically:
  - ID → ID
  - Product → Product/Description
  - Amount → Price/Amount
  - Date → Date
  - Adds Customer Name

### In-Memory Storage
- Data stored in RAM (lost on server restart)
- Fast access, no database needed
- Good for development/testing
- Consider adding database for production

---

## 🚨 Important Notes

1. **Data is NOT persistent** - Restarting server clears all data
2. **Tracker IS persistent** - Survives server restarts
3. **Only processes NEW files** - Won't reprocess same file twice
4. **Customer websites serve from /uploads/** - Automation downloads from there
5. **All 4 servers must be running** - Use `npm start` to start all

---

## 📞 Quick Commands Cheat Sheet

```bash
# Start system
npm start

# Run automation
node scripts/smart_automation.js

# Clear tracker (reprocess all)
echo {} > processed_files_tracker.json

# View processed files
dir processed

# View tracker
type processed_files_tracker.json

# Check if servers are running
netstat -ano | findstr "3000 3001 3002 3003"
```

---

## ✅ Testing Checklist

- [ ] All 4 servers running (ports 3000-3003)
- [ ] Can login to customer websites
- [ ] Can upload files to customer websites
- [ ] Files appear in `/uploads/customerX/`
- [ ] Can login to central dashboard
- [ ] Automation runs without errors
- [ ] Files downloaded to `/temp/customerX/`
- [ ] Files processed to `/processed/`
- [ ] Data appears in central dashboard data view
- [ ] Processing history shows entries
- [ ] Can filter by customer
- [ ] Can edit/delete records

---

## 🎯 Next Steps

### For Production Use:
1. Add database (SQLite/MongoDB) for persistent storage
2. Add error notifications (email/Slack)
3. Add file validation and error handling
4. Implement user authentication
5. Add data backup/export features
6. Set up proper logging system
7. Add monitoring and alerts

### For N8N Integration:
1. Import `n8n_agent_workflow.json`
2. Configure schedule (default: every 5 minutes)
3. Test manual execution
4. Activate workflow
5. Monitor execution logs
6. Set up error notifications

---

**Last Updated:** 2026-01-19  
**System Version:** Smart Automation v2.0  
**Status:** ✅ Fully Operational

# Smart Automation System - Preventing Duplicate Uploads

## 🎯 Problem Solved

Previously, the automation workflow would:
- ❌ Download ALL files every time it ran
- ❌ Process files that were already processed before
- ❌ Upload duplicate data to the central dashboard

Now, the smart automation:
- ✅ **Tracks which files have been processed**
- ✅ **Only downloads NEW files** that haven't been seen before
- ✅ **Skips the entire workflow** if no new files exist
- ✅ **Prevents duplicate data** in the central dashboard

---

## 📋 How It Works

### 1. **File Tracking System**
The system maintains a tracker file: `processed_files_tracker.json`

```json
{
  "customer1": ["Book1.xlsx", "Report_Jan.xlsx"],
  "customer2": ["Data_2024.xlsx"],
  "customer3": []
}
```

This file stores the names of all files that have been downloaded and processed for each customer.

### 2. **Smart Download Process**

When the automation runs:

1. **Check Customer Website** - Logs in and gets the list of available files
2. **Compare with Tracker** - Checks if the latest file has already been processed
3. **Decision:**
   - If **NEW file** → Download it, mark as processed, continue workflow
   - If **ALREADY PROCESSED** → Skip download, stop workflow for this customer

### 3. **Workflow Steps**

```
┌─────────────────────────────────────────────────────┐
│  STEP 1: Check for New Files                        │
│  ├─ Customer 1: Check latest file                   │
│  ├─ Customer 2: Check latest file                   │
│  └─ Customer 3: Check latest file                   │
└─────────────────────────────────────────────────────┘
                      ↓
        ┌─────────────────────────┐
        │  Any new files found?   │
        └─────────────────────────┘
                ↓           ↓
              YES          NO
                ↓           ↓
    ┌──────────────┐    ┌──────────────┐
    │ STEP 2:      │    │ STOP         │
    │ Process      │    │ Workflow     │
    │ Files        │    │ Complete     │
    └──────────────┘    └──────────────┘
          ↓
    ┌──────────────┐
    │ STEP 3:      │
    │ Upload to    │
    │ Central      │
    └──────────────┘
```

---

## 🚀 Usage

### Option 1: Run from Central Dashboard UI
1. Go to `http://localhost:3000/upload`
2. Click **"Run Automation"** button
3. The smart automation will run automatically

### Option 2: Run from Command Line
```bash
node scripts/smart_automation.js
```

### Option 3: Use with n8n
Import the workflow and set up a schedule trigger to run automatically.

---

## 📊 Example Scenario

### Scenario 1: First Upload
```
Customer 1 has: Book1.xlsx (uploaded today)
Tracker: {}

Result:
✓ Book1.xlsx is NEW → Download → Process → Upload
Tracker updated: { "customer1": ["Book1.xlsx"] }
```

### Scenario 2: No New Files
```
Customer 1 has: Book1.xlsx (same file)
Tracker: { "customer1": ["Book1.xlsx"] }

Result:
○ Book1.xlsx already processed → SKIP
No upload to central dashboard
```

### Scenario 3: New File Uploaded
```
Customer 1 has: Report_Jan.xlsx (newly uploaded)
Tracker: { "customer1": ["Book1.xlsx"] }

Result:
✓ Report_Jan.xlsx is NEW → Download → Process → Upload
Tracker updated: { "customer1": ["Book1.xlsx", "Report_Jan.xlsx"] }
```

---

## 🔧 Manual Reset (If Needed)

If you want to **reprocess all files** (e.g., for testing):

1. Delete or clear the tracker file:
```bash
# Option 1: Delete the file
del processed_files_tracker.json

# Option 2: Clear it manually
echo {} > processed_files_tracker.json
```

2. Run the automation again - it will treat all files as new

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `scripts/smart_downloader.js` | Checks for new files and downloads only if new |
| `scripts/smart_automation.js` | Main workflow orchestrator |
| `processed_files_tracker.json` | Tracks which files have been processed |
| `scripts/processor.js` | Converts downloaded files to standard format |
| `scripts/uploader.js` | Uploads processed files to central dashboard |

---

## ✅ Benefits

1. **No Duplicate Data** - Each file is processed exactly once
2. **Efficient** - Skips unnecessary downloads and processing
3. **Automatic** - Works seamlessly with scheduled n8n workflows
4. **Transparent** - Clear logging shows what's happening
5. **Recoverable** - Can reset tracker if needed

---

## 🔍 Troubleshooting

### Issue: "File already processed" but I want to reprocess it
**Solution:** Remove that file name from `processed_files_tracker.json`

### Issue: Tracker file is missing
**Solution:** The system will create it automatically on first run

### Issue: Want to force reprocess everything
**Solution:** Delete `processed_files_tracker.json` and run again

---

## 📝 Notes

- The tracker is **persistent** across automation runs
- File names are compared **exactly** (case-sensitive)
- The system always checks the **latest file** (first in the list) on each customer website
- If a customer has no files, they are safely skipped

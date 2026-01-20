# Implementation Plan - n8n Auto Excel Uploader

This project aims to automate the process of downloading Excel files from three different customer websites, converting them into a standardized format, and uploading them to a central dashboard.

## 1. Requirements & Discovery
- [ ] Obtain URLs for Website 1, 2, and 3.
- [ ] Obtain login/signup credentials for each website.
- [ ] Identify the download page and the specific download button selector for each site.
- [ ] Obtain the "Desktop Excel Format" template/specification.
- [ ] Obtain the destination website URL and its upload requirements (API endpoint or UI steps).

## 2. Technology Stack
- **Automation Core**: n8n (self-hosted or cloud).
- **Web Scraping/Automation**: Puppeteer (Node.js) or Playwright.
- **Excel Processing**: `exceljs` or `pandas` (Python).
- **Language**: JavaScript/Node.js is preferred for seamless integration with n8n.

## 3. Architecture
1. **Trigger**: Scheduled (e.g., daily) or manual trigger in n8n.
2. **Scraper Service**: 
   - A Node.js script that handles the login and download process for a given customer.
   - Saves the raw file to a temporary directory.
3. **Processor Service**:
   - Reads the raw Excel file.
   - Maps columns and formats data according to the "Desktop format".
   - Exports the standardized file.
4. **Uploader Service**:
   - Connects to the destination website.
   - Uploads the standardized file.
5. **Dashboard**: The destination website displays the data per customer.

## 4. Immediate Next Steps
1. Create a `config.json` structure for credentials and URLs.
2. Develop the Puppeteer script for one website as a proof of concept.
3. Develop the Excel conversion logic.
4. Build the n8n workflow JSON.

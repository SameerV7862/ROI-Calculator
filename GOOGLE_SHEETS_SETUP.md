# Google Sheets Integration Setup Guide

This guide will help you set up automatic data collection to Google Sheets whenever someone submits contact information on the ROI Calculator.

## Overview

- ✅ Contact data sent to Google Sheets automatically
- ✅ Team can view submissions in real-time
- ✅ No backend server needed (uses Google's infrastructure)
- ✅ Data also stored locally on user's device for backup
- ✅ Local storage has no cost, fully automated

## Setup Steps

### Step 1: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet (name it "ROI Calculator Leads" or similar)
3. Keep the default "Sheet1" name
4. Create column headers in the first row:
   - A: `Timestamp`
   - B: `Full Name`
   - C: `Email`
   - D: `Phone`
   - E: `Specialty`
   - F: `Patients per Week`
   - G: `Admin Hours`
   - H: `Net Benefit ($)`
   - I: `Extra Patients`
   - J: `Hours Back`
   - K: `Break Even (weeks)`

5. Save and note your sheet URL (you'll need the sheet ID from it)

### Step 2: Create a Google Apps Script Web App

1. In your Google Sheet, go to **Tools → Script Editor**
2. Replace all code with the script from `apps-script-template.gs` (provided in repo)
3. Click the **Deploy** button
   - Choose "New deployment"
   - Select type: **Web app**
   - Execute as: Your Google account
   - Who has access: **Anyone**
   - Click Deploy

4. Copy the deployment URL (looks like: `https://script.google.com/macros/d/ABC123.../userweb`)
5. Save this URL - you'll paste it into the calculator

### Step 3: Update the ROI Calculator

1. Open `index.html` in the repo
2. Find the line: `const GOOGLE_SHEET_URL = 'PASTE_YOUR_WEB_APP_URL_HERE';`
3. Replace `'PASTE_YOUR_WEB_APP_URL_HERE'` with your actual deployment URL
4. Save and commit the change

```javascript
// Example (replace with your actual URL):
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/d/YOUR_DEPLOYMENT_ID/userweb';
```

4. Push to GitHub - it will auto-deploy to GitHub Pages

### Step 4: Test It

1. Go to https://sameerv7862.github.io/ROI-Calculator/
2. Enter test data:
   - Specialty: Cardiology
   - Patients/week: 50
   - Admin hours: 10
   - Click "Calculate ROI"
3. Fill contact form:
   - Name: Test User
   - Email: test@example.com
   - Phone: 555-0123
   - Click "Unlock Downloads"
4. Check your Google Sheet - the data should appear in a new row within seconds!

## How It Works

```
User fills form → Click "Unlock Downloads"
         ↓
Browser validates & stores locally (sessionStorage)
         ↓
Browser sends data to Google Apps Script
         ↓
Apps Script appends row to Google Sheet
         ↓
Team can view submissions in real-time
         ↓
User can still download CSV/PDF/JSON locally
```

## Features

- ✅ **Real-time updates** - Data appears in sheet within seconds
- ✅ **Error handling** - If sheet write fails, form still works locally
- ✅ **No data loss** - Data stored both locally and in sheet
- ✅ **Privacy** - Users can download their data anytime
- ✅ **Team access** - Share the Google Sheet with your team
- ✅ **No cost** - Google Apps Script is free

## Viewing Submitted Data

1. Open your Google Sheet
2. New submissions appear automatically in new rows
3. You can:
   - Sort by date
   - Filter by email
   - Export to CSV
   - Create pivot tables
   - Add formulas to calculate totals

## Sharing with Your Team

1. Click the **Share** button on your Google Sheet
2. Enter team members' emails
3. They can view submissions in real-time

## Troubleshooting

### Data not appearing in Google Sheet?

1. Check browser console (F12 → Console) for errors
2. Verify your Google Apps Script deployment URL is correct in `index.html`
3. Check that Apps Script has "Anyone" access permission
4. Try reloading the calculator page

### Want to see detailed logs?

1. Open Google Apps Script editor
2. Go to **Executions** (left sidebar)
3. You'll see all requests and any errors

### How do I disable it?

1. Just leave `GOOGLE_SHEET_URL = ''` (empty string) in index.html
2. Form will still work, data will only store locally

## Security Notes

- ✅ Apps Script URL is publicly accessible (required for web app)
- ✅ Only accepts POST requests with specific data format
- ✅ Anyone can submit, but only your sheet is written to
- ✅ No authentication needed (for lead collection)
- ✅ If you want to restrict access, use Google's Advanced Services

## Next Steps

1. Create your Google Sheet
2. Deploy the Google Apps Script
3. Update `index.html` with your deployment URL
4. Test with sample data
5. Share sheet with your team
6. Monitor submissions coming in!

---

**Questions?** Check the troubleshooting section above or examine the browser console logs.

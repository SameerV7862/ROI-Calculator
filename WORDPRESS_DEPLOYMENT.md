# WordPress Deployment Guide for ROI Calculator

This guide walks you through hosting the ROI Calculator directly on your WordPress site with Google Sheets data collection.

## Overview

✅ Host calculator files on WordPress  
✅ Collect contact information in Google Sheets  
✅ Generate PDF reports (fixed in this version)  
✅ Download reports as CSV/PDF/JSON  
✅ No backend database needed  

---

## Part 1: Upload Files to WordPress

### Step 1: Download Calculator Files

You have two options:

**Option A: From GitHub (Recommended)**
1. Go to: https://github.com/SameerV7862/ROI-Calculator
2. Click green "Code" button → "Download ZIP"
3. Extract the ZIP file
4. You'll need these files:
   - `index.html`
   - `app.js`
   - `styles.css`

**Option B: Build from source**
```bash
git clone https://github.com/SameerV7862/ROI-Calculator.git
```

### Step 2: Upload to WordPress

1. **Log in to WordPress admin dashboard**
2. **Go to Media → Add New** (or Files → Add New, depending on your setup)
3. **Upload all three files:**
   - index.html
   - app.js
   - styles.css
4. **Note the file URLs** - you'll need them in the next step

**Alternative: FTP Upload**
If you prefer FTP:
1. Connect via FTP to your WordPress host
2. Navigate to `/wp-content/uploads/` folder
3. Create a new folder: `roi-calculator`
4. Upload the three files there
5. Note the URLs (usually: `yoursite.com/wp-content/uploads/roi-calculator/`)

### Step 3: Embed in WordPress Page/Post

You can embed the calculator in two ways:

**Option A: HTML Embed (Simple)**
1. Create a new WordPress page or post
2. Switch to **HTML/Code view**
3. Add this code:
```html
<iframe 
  src="YOUR_FULL_PATH_TO_INDEX.HTML" 
  width="100%" 
  height="1200px" 
  style="border: none; margin: 20px 0;"
  title="ROI Calculator">
</iframe>
```

Replace `YOUR_FULL_PATH_TO_INDEX.HTML` with the actual URL from Step 2

**Example:**
```html
<iframe 
  src="https://yoursite.com/wp-content/uploads/roi-calculator/index.html" 
  width="100%" 
  height="1200px" 
  style="border: none; margin: 20px 0;"
  title="ROI Calculator">
</iframe>
```

**Option B: Direct Link**
Simply create a link to the index.html URL:
```
https://yoursite.com/wp-content/uploads/roi-calculator/index.html
```

### Step 4: Test Calculator

1. Go to the WordPress page with the embedded calculator
2. Enter test data:
   - Select specialty
   - Adjust patients/week slider
   - Adjust admin hours slider
   - Click "Calculate ROI"
3. Verify:
   - ✅ Results display
   - ✅ Contact form appears
   - ✅ Can enter name, email, phone
   - ✅ Can click "Unlock Downloads"
   - ✅ Download buttons appear

If step 3 shows error "Error creating PDF":
- See troubleshooting section at the bottom

---

## Part 2: Google Sheets Integration

### Step 1: Create Google Sheet

1. Go to https://sheets.google.com
2. Click "+ New Spreadsheet"
3. Name it: "ROI Calculator Leads"
4. In the first row, create these column headers:
   - A: `Timestamp`
   - B: `Full Name`
   - C: `Email`
   - D: `Phone`
   - E: `Specialty`
   - F: `Patients per Week`
   - G: `Admin Hours`
   - H: `Revenue per Visit`
   - I: `Overhead per Visit`
   - J: `VA Count`
   - K: `Missed Appointments/Week`
   - L: `Prior Auths/Week`
   - M: `Net Benefit ($)`
   - N: `Extra Patients/Week`
   - O: `Hours Recovered/Week`
   - P: `Break Even (months)`

5. **Keep this sheet open** - you'll need to copy its ID

### Step 2: Create Google Apps Script

1. **In your Google Sheet**, go to **Tools → Script Editor**
2. **Delete all default code** (if any)
3. **Paste this code:**

```javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    // Extract values in order of columns
    const row = [
      data.timestamp,
      data.fullName,
      data.email,
      data.phone,
      data.specialty,
      data.patientsPerWeek,
      data.adminHours,
      data.revenuePerVisit || "",
      data.overheadPerVisit || "",
      data.vaCount,
      data.missedAppointmentsPerWeek || "",
      data.priorAuthsPerWeek || "",
      data.netBenefit,
      data.extraPatients,
      data.hoursRecovered,
      data.breakEven
    ];
    
    // Append row to sheet
    sheet.appendRow(row);
    
    return ContentService.createTextOutput(
      JSON.stringify({status: 'success'})
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({status: 'error', message: error.toString()})
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
```

4. **Click Save**
5. **Name the project** (e.g., "ROI Calculator Submission Handler")
6. Click Save again

### Step 3: Deploy as Web App

1. **In Script Editor**, click the **Deploy** button (blue button, top-right)
2. Choose "New deployment"
3. Select deployment type: **Web app**
4. Fill in:
   - **Execute as:** Your Google account
   - **Who has access:** Anyone
5. Click **Deploy**
6. **IMPORTANT:** Copy the deployment URL (looks like: `https://script.google.com/macros/d/ABC123XYZ/userweb`)
   - Save this URL - you'll need it in the next step

### Step 4: Update Calculator with Google Sheets URL

You need to add the deployment URL to your calculator. There are two ways:

**Option A: Edit index.html (Recommended)**
1. Download `index.html` again from GitHub
2. Open it in a text editor
3. Find this line (around line 3):
```javascript
const GOOGLE_SHEET_WEB_APP_URL = '';
```

Wait, actually it should be in `app.js`. Let me provide the correct instructions...

**Edit app.js:**
1. Download the latest `app.js` from GitHub repo
2. Open in text editor (VS Code, Notepad++, etc.)
3. Find line 1-2 (top of file):
```javascript
// Google Sheets Integration Configuration
const GOOGLE_SHEET_WEB_APP_URL = '';
```

4. Replace `''` with your deployment URL:
```javascript
const GOOGLE_SHEET_WEB_APP_URL = 'https://script.google.com/macros/d/YOUR_DEPLOYMENT_ID/userweb';
```

5. **Save the file**
6. **Re-upload the modified `app.js` to WordPress** (replace the old one)

**Option B: Edit via WordPress Code Editor**
1. Log in to WordPress admin
2. Go to Media or File Manager
3. Find and edit `app.js` directly
4. Make the same change (replace the empty URL with your deployment URL)
5. Save

### Step 5: Test Google Sheets Integration

1. Go back to your calculator on WordPress
2. Fill out the form:
   - Specialty: Cardiology
   - Patients/week: 50
   - Admin hours: 10
   - Click Calculate
3. Fill contact form:
   - Name: Test User
   - Email: test@example.com
   - Phone: 555-0123
4. Click "Unlock Downloads"
5. **Check your Google Sheet** - you should see a new row with the data!
6. If not, see troubleshooting below

---

## Part 3: Share with Your Team

### Give Team Access to Google Sheet

1. Open your "ROI Calculator Leads" Google Sheet
2. Click the **Share** button (top-right)
3. Enter team members' email addresses
4. Set permission to **Viewer** (they can see but not edit)
5. Click Share

Team members can now view submissions in real-time!

### Create Reports from Google Sheet

**Basic Reporting:**
1. Sort by date to see newest submissions first
2. Filter by specialty to analyze by department
3. Use formulas to calculate totals (e.g., average benefit)

**Advanced Reporting:**
1. Create a pivot table from the data
2. Export to CSV for analysis in Excel
3. Create charts and dashboards

---

## Troubleshooting

### PDF Generation Error

**Issue:** "Error creating PDF" when clicking Download PDF

**Solution:**
- This was fixed in the latest version
- Make sure you're using the latest `app.js` file
- The calculator now uses jsPDF which is more reliable
- If still failing, try downloading as CSV instead

**Fallback:** 
- Click "Download as PDF" 
- If it still fails, use your browser's Print function (Ctrl+P / Cmd+P)
- Select "Save as PDF" in the print dialog

### Data Not Appearing in Google Sheet

**Check:**
1. Is the deployment URL correct in app.js?
2. Did you save after editing app.js?
3. Did you re-upload the file to WordPress?

**Test:**
1. Open browser Developer Console (F12)
2. Click "Unlock Downloads"
3. Look for messages:
   - ✓ "Sending data to Google Sheets..."
   - ✓ "Data sent to Google Sheets successfully"
   - ❌ Any error messages?

**If error appears:**
1. Copy the error message
2. Go to Google Apps Script editor
3. Click **Executions** (left sidebar)
4. Look for failed executions with error details

### Form Submission Not Working

**Check:**
1. Open browser Console (F12 → Console tab)
2. Fill the contact form
3. Click "Unlock Downloads"
4. Look for error messages in console

**Common fixes:**
- Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)
- Clear browser cache
- Try different browser
- Disable browser extensions (especially ad blockers)

### Iframe Not Loading

**If embedded via iframe and it's blank:**
1. Check browser Console (F12)
2. Look for CORS errors
3. Verify file URLs are correct
4. Try opening index.html directly in browser

**Alternative:** Embed as full page link instead of iframe

---

## File Structure on WordPress

After uploading, your files should be at:
```
yoursite.com/wp-content/uploads/roi-calculator/
├── index.html
├── app.js
└── styles.css
```

You can verify by:
1. Opening index.html URL directly in browser
2. Checking that calculator loads
3. Testing form submission

---

## Security Notes

✅ **Safe:**
- Contact data stored locally in browser
- Also sent to your Google Sheet (your account)
- No external servers involved
- No backend database needed

⚠️ **Important:**
- Keep your Google Apps Script URL private
- Only you and authorized team members should access the Google Sheet
- Consider making the sheet read-only for team members

---

## Maintenance

### Regular Tasks

**Weekly:** Check Google Sheet for new submissions

**Monthly:** 
- Review contact data
- Export to CSV for records
- Verify form is working

**Quarterly:**
- Update calculator if new features needed
- Check for library updates (jsPDF, html2canvas)
- Backup Google Sheet data

### Updating Calculator

To update to a new version:
1. Download latest files from GitHub
2. Replace files on WordPress (Media manager or FTP)
3. Hard-refresh browser page to load new version

---

## Next Steps

1. ✅ Upload files to WordPress
2. ✅ Create Google Sheet with headers
3. ✅ Deploy Google Apps Script
4. ✅ Add deployment URL to app.js
5. ✅ Re-upload modified app.js
6. ✅ Test calculator and form
7. ✅ Share Google Sheet with team
8. ✅ Monitor submissions

---

## Support

If you encounter issues:

1. **Check console errors** (F12 → Console)
2. **Verify file URLs** - make sure all three files are accessible
3. **Test with simple data** - use straightforward values first
4. **Check Google Apps Script executions** for error details
5. **Hard refresh browser** (Ctrl+Shift+R)

**Still stuck?** Check GitHub repo for updates or post an issue there.

---

## Files Reference

- **index.html** - Main calculator interface
- **app.js** - All calculation logic and Google Sheets integration
- **styles.css** - Visual styling (SaiberMD brand colors)

All three files work together. They must be uploaded to the same folder for the calculator to function properly.

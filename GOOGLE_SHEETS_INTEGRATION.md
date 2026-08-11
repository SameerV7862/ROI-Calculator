# Google Sheets Integration Setup

## Step 1: Create a Google Sheet

1. Go to https://sheets.google.com
2. Click **"+ Create"** → **Blank spreadsheet**
3. Name it: `ROI Calculator Submissions`
4. Rename the first sheet from "Sheet1" to `Submissions` (right-click tab)

## Step 2: Add Column Headers

In row 1, add these headers:

| A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Timestamp | Full Name | Email | Phone | Specialty | Patients/Week | Admin Hours | Revenue/Visit | Overhead/Visit | VA Count | Missed Appts/Week | Prior Auths/Week | Net Benefit | Extra Patients | Hours Recovered | Break Even (mo) |

## Step 3: Create the Google Apps Script

## Step 3: Create the Google Apps Script

1. In your Google Sheet, click **Extensions → Apps Script**
2. Delete all code in the editor
3. Paste this code:

```javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    sheet.appendRow([
      data.timestamp || new Date().toLocaleString(),
      data.fullName || "",
      data.email || "",
      data.phone || "",
      data.specialty || "",
      data.patientsPerWeek || "",
      data.adminHours || "",
      data.revenuePerVisit || "",
      data.overheadPerVisit || "",
      data.vaCount || "",
      data.missedAppointmentsPerWeek || "",
      data.priorAuthsPerWeek || "",
      data.netBenefit || "",
      data.extraPatients || "",
      data.hoursRecovered || "",
      data.breakEven || ""
    ]);
    
    return ContentService.createTextOutput("OK");
  } catch(e) {
    console.error(e);
    return ContentService.createTextOutput("Error: " + e.toString());
  }
}
```

4. Click **Save**
5. Name the project: `ROI Calculator`
6. Click **Save**

## Step 4: Deploy as Web App

1. Click **Deploy** (top right) → **New deployment**
2. Click the gear icon → select **Web app**
3. Set:
   - **Execute as**: Your Google account
   - **Who has access**: `Anyone`
4. Click **Deploy**
5. **Copy the deployment URL** (looks like: `https://script.google.com/macros/d/[LONG_ID]/usercopy`)

## Step 5: Update the Calculator

1. Open `app.js` in the ROI Calculator
2. Find line 3:
   ```javascript
   const GOOGLE_SHEET_WEB_APP_URL = '';
   ```
3. Replace with your URL:
   ```javascript
   const GOOGLE_SHEET_WEB_APP_URL = 'https://script.google.com/macros/d/YOUR_ID/usercopy';
   ```
4. Commit and push:
   ```bash
   git add app.js
   git commit -m "Enable Google Sheets integration"
   git push
   ```

## Step 6: Share with Your Team

1. Go back to your Google Sheet
2. Click **Share** (top right)
3. Add team member emails
4. Give them **Editor** access

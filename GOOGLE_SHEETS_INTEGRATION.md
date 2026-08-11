# Google Sheets Integration Setup

This guide walks you through connecting the ROI Calculator to Google Sheets so your team can see contact information and ROI calculations as they're submitted.

## Why Google Sheets?

- **Real-time visibility**: See submissions instantly as they come in
- **Team collaboration**: Share the sheet with your entire team
- **Easy analysis**: Sort, filter, and analyze data in familiar spreadsheet format
- **No backend required**: Works entirely with Google's infrastructure

## Setup Steps

### Step 1: Create a Google Sheet (5 min)

1. Go to https://sheets.google.com
2. Click **"+ Create"** → **Blank spreadsheet**
3. Name it: `ROI Calculator Submissions`
4. Rename the first sheet from "Sheet1" to `Submissions` (right-click tab)

### Step 2: Add Column Headers (2 min)

In row 1, add these headers:

| A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Timestamp | Full Name | Email | Phone | Specialty | Patients/Week | Admin Hours | Revenue/Visit | Overhead/Visit | VA Count | Missed Appts/Week | Prior Auths/Week | Net Benefit | Extra Patients | Hours Recovered | Break Even (mo) |

This matches exactly what the calculator sends.

### Step 3: Create the Google Apps Script (3 min)

1. In your Google Sheet, click **Extensions → Apps Script**
2. Delete all code in the editor
3. Paste this code:

```javascript
function doPost(e) {
  try {
    // Get the first sheet in the spreadsheet
    const sheet = SpreadsheetApp.getActiveSheet();
    
    // Parse the incoming JSON data
    const data = JSON.parse(e.postData.contents);
    
    // Append a new row with all the data
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
    
    // Return success response
    return ContentService.createTextOutput("OK");
  } catch(e) {
    // Return error message for debugging
    console.error(e);
    return ContentService.createTextOutput("Error: " + e.toString());
  }
}
```

4. Click **Save** (top left)
5. Name the project: `ROI Calculator`
6. Click **Save**

### Step 4: Deploy as Web App (3 min)

1. Click **Deploy** (top right) → **New deployment**
2. Click the gear icon → select **Web app**
3. Fill in the deployment settings:
   - **Execute as**: Your Google account (the one that owns the sheet)
   - **Who has access**: `Anyone` (allows calculator to send data)
4. Click **Deploy**
5. **Copy the deployment URL** that appears
   - It looks like: `https://script.google.com/macros/d/[LONG_ID]/usercopy`
   - This is your **GOOGLE_SHEET_WEB_APP_URL**

### Step 5: Update the Calculator (1 min)

1. Open `app.js` in the ROI Calculator repository
2. Find line 3:
   ```javascript
   const GOOGLE_SHEET_WEB_APP_URL = '';
   ```
3. Replace with:
   ```javascript
   const GOOGLE_SHEET_WEB_APP_URL = 'https://script.google.com/macros/d/[YOUR_ID]/usercopy';
   ```
4. Save and commit:
   ```bash
   git add app.js
   git commit -m "Enable Google Sheets integration"
   git push origin main
   ```

### Step 6: Share with Your Team (1 min)

1. Go back to your Google Sheet
2. Click **Share** (top right)
3. Add team member emails
4. Give them **Editor** access
5. Uncheck "Notify people" if you prefer

Done! 🎉

## How It Works

1. **User fills form** on ROI Calculator
   - Enters name, email, phone
   - Selects specialty and other parameters
   
2. **User clicks Submit**
   - Contact info saved to browser (sessionStorage)
   - Data sent to your Google Apps Script
   - Script appends a new row to your sheet
   - All in the background—instant

3. **Your team sees the data**
   - Sheet updates in real-time
   - Shared sheet shows all team members
   - Data is persistent (backed up by Google)

## Troubleshooting

**"Not seeing data in the sheet?"**
- Check that `GOOGLE_SHEET_WEB_APP_URL` is correctly set in app.js
- Verify the deployment URL is correct (no typos)
- Open browser DevTools (F12) → Console and look for errors
- The script URL must match your deployed script exactly

**"Getting CORS errors?"**
- The calculator uses `mode: 'no-cors'` to bypass CORS
- This is normal and expected
- Data still gets through to Google Sheets

**"I want to add more columns"**
- Edit the script's `appendRow` to match your new columns
- The order must match your sheet headers
- Redeploy the script after changes

## Security Notes

- The deployment URL is **not a secret** (it's set to "Anyone" access)
- Only the exact data you send is saved to the sheet
- No file uploads or sensitive data beyond what's in the form
- Google Sheets has built-in access controls—share only with your team

## Support

For issues with Google Apps Script:
- Check the script's execution log: **Executions** panel in Apps Script editor
- View errors: **View execution logs** to see what went wrong
- Test with: **Test** (top left) → **Run** to verify script works

---

**Next Steps:**
1. Complete the 5 steps above
2. Submit a test form on the calculator
3. Verify data appears in your sheet
4. Share the sheet with your team

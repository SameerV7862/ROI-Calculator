# Saiberassist ROI Calculator - Setup Guide

## Email Integration Setup

The calculator includes email functionality to send reports to users. This requires a Formspree integration.

### Steps to Enable Email:

1. **Create a Formspree Account** (Free):
   - Go to https://formspree.io
   - Sign up with your email
   - Create a new form

2. **Get Your Form ID**:
   - After creating the form, Formspree will show you an ID (e.g., `f_abc12345xyz`)
   - Copy this ID

3. **Update app.js**:
   - Open `app.js` 
   - Find the line: `const response = await fetch("https://formspree.io/f/YOUR_FORM_ID", {`
   - Replace `YOUR_FORM_ID` with your actual Formspree ID
   - Save the file

4. **Test the email functionality**:
   - Fill out the calculator
   - Click "Unlock report"
   - Submit your contact info
   - You should receive an email with the report

## Download Feature

The download buttons are built-in and work automatically:
- **Download as CSV**: Creates a spreadsheet with all calculations
- **Download as PDF**: Generates a formatted PDF report

No setup required - these work immediately on any browser.

## Deployment to GitHub Pages

The calculator automatically deploys to GitHub Pages when you push to the `main` branch.

Site URL: `https://SameerV7862.github.io/ROI-Calculator/`

Make sure GitHub Pages is enabled in repo Settings > Pages, set to "GitHub Actions" as the source.

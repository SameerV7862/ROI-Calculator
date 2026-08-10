// Google Sheets Integration Configuration
// Leave empty to disable, or set to your Google Apps Script deployment URL
const GOOGLE_SHEET_WEB_APP_URL = '';

const constants = {
  annualVACost: 19200,
  weeksPerYear: 48,
  absorbableAdminRate: 0.7,
  nonDelegableAdminHours: 4,
  maxRecoveredAdminHoursPerVA: 40,
  visitCapacityConversionRate: 0.3,
  maxPatientUnlockSharePerVA: 0.2,
  vaProductivityDecay: 0.45,
  annualInHouseMASalary: 42990,
  inHouseMABenefitsRate: 0.295,
  inHouseMATrainingCost: 4700,
  minimumContributionPerVisit: 1,
  convertibleCapacityRate: 0.6,
  missedAppointmentRecoveryRate: 0.35,
  priorAuthRevenueRetentionRate: 0.3,
};

const specialtyDefaults = {
  Rheumatology: { revenue: 240, overhead: 144, visitTime: 25 },
  Dermatology: { revenue: 190, overhead: 105, visitTime: 15 },
  GI: { revenue: 260, overhead: 161, visitTime: 20 },
  Cardiology: { revenue: 275, overhead: 176, visitTime: 25 },
  Endocrinology: { revenue: 230, overhead: 145, visitTime: 25 },
  "Pain Management": { revenue: 250, overhead: 158, visitTime: 20 },
  Oncology: { revenue: 350, overhead: 245, visitTime: 30 },
  Orthopedics: { revenue: 280, overhead: 165, visitTime: 20 },
  Nephrology: { revenue: 220, overhead: 141, visitTime: 25 },
  "Primary Care": { revenue: 160, overhead: 101, visitTime: 20 },
  "Behavioral Health": { revenue: 180, overhead: 115, visitTime: 45 },
  "DPC/Concierge": { revenue: 200, overhead: 100, visitTime: 30 },
  Other: { revenue: 220, overhead: 132, visitTime: 25 },
};

const form = document.getElementById("roi-form");
const leadForm = document.getElementById("lead-form");
const specialtyInput = document.getElementById("specialty");
const patientsPerWeekInput = document.getElementById("patientsPerWeek");
const adminHoursInput = document.getElementById("adminHours");
const revenuePerVisitInput = document.getElementById("revenuePerVisit");
const overheadPerVisitInput = document.getElementById("overheadPerVisit");
const vaCountInput = document.getElementById("vaCount");
const missedAppointmentsPerWeekInput = document.getElementById("missedAppointmentsPerWeek");
const priorAuthsPerWeekInput = document.getElementById("priorAuthsPerWeek");
const patientsPerWeekValue = document.getElementById("patientsPerWeekValue");
const adminHoursValue = document.getElementById("adminHoursValue");

const resultSection = document.getElementById("result");
const gateSection = document.getElementById("gate");
const formulaSection = document.getElementById("formula");
const formulaToggleBtn = document.getElementById("formulaToggle");
const citationsSection = document.getElementById("citations");
const citationsToggleBtn = document.getElementById("citationsToggle");
const netBenefitEl = document.getElementById("netBenefit");
const extraPatientsEl = document.getElementById("extraPatients");
const hoursBackEl = document.getElementById("hoursBack");
const breakEvenEl = document.getElementById("breakEven");
const mathStripEl = document.getElementById("mathStrip");
const gateMessageEl = document.getElementById("gateMessage");
const maSalaryEl = document.getElementById("maSalary");
const maBenefitsEl = document.getElementById("maBenefits");
const maTrainingEl = document.getElementById("maTraining");
const maTotalEl = document.getElementById("maTotal");
const vaSalaryOnlyEl = document.getElementById("vaSalaryOnly");
const vaTotalCostEl = document.getElementById("vaTotalCost");
const vaVsMaBenefitEl = document.getElementById("vaVsMaBenefit");

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function track(eventName, payload = {}) {
  if (!window.calculatorEvents) {
    window.calculatorEvents = [];
  }
  window.calculatorEvents.push({
    event: eventName,
    payload,
    timestamp: new Date().toISOString(),
  });
}

function populateSpecialties() {
  Object.keys(specialtyDefaults).forEach((specialty) => {
    const option = document.createElement("option");
    option.value = specialty;
    option.textContent = specialty;
    specialtyInput.append(option);
  });
}

function updateSliderLabels() {
  patientsPerWeekValue.textContent = patientsPerWeekInput.value;
  adminHoursValue.textContent = adminHoursInput.value;
}

function onSpecialtyChange() {
  const selected = specialtyDefaults[specialtyInput.value];
  if (!selected) return;
  if (!revenuePerVisitInput.value) {
    revenuePerVisitInput.value = selected.revenue;
  }
  if (!overheadPerVisitInput.value) {
    overheadPerVisitInput.value = selected.overhead;
  }
}

function calculate(inputs) {
  const defaults = specialtyDefaults[inputs.specialty];
  const revenuePerVisit = inputs.revenuePerVisit || defaults.revenue;
  const overheadPerVisit = inputs.overheadPerVisit || defaults.overhead;
  const vaCount = inputs.vaCount || 1;
  const safeAdminHours = Math.max(inputs.adminHours, 1);
  const patientsPerAdminHour = inputs.patientsPerWeek / safeAdminHours;

  const delegableAdminHours = Math.max(
    inputs.adminHours - constants.nonDelegableAdminHours,
    0
  );
  const recoverablePhysicianAdminHours =
    delegableAdminHours * constants.absorbableAdminRate;
  const recoveredHoursPerWeekPerVA = Math.min(
    recoverablePhysicianAdminHours,
    constants.maxRecoveredAdminHoursPerVA
  );
  const clinicalEquivalentHoursPerVA =
    recoveredHoursPerWeekPerVA * constants.visitCapacityConversionRate;
  const rawExtraPatientsPerWeekPerVA =
    patientsPerAdminHour * clinicalEquivalentHoursPerVA;
  const maxExtraPatientsPerWeekPerVA =
    inputs.patientsPerWeek * constants.maxPatientUnlockSharePerVA;
  const extraPatientsPerWeekPerVA = Math.min(
    rawExtraPatientsPerWeekPerVA,
    maxExtraPatientsPerWeekPerVA
  );
  const vaThroughputMultiplier = constants.vaProductivityDecay === 1
    ? vaCount
    : (1 - Math.pow(constants.vaProductivityDecay, vaCount)) / (1 - constants.vaProductivityDecay);
  const recoveredHoursPerWeek = recoveredHoursPerWeekPerVA * vaThroughputMultiplier;
  const annualRecoveredHours = recoveredHoursPerWeek * constants.weeksPerYear;
  const extraPatientsPerWeek = Math.floor(extraPatientsPerWeekPerVA * vaThroughputMultiplier);
  const extraPatientsPerYear = extraPatientsPerWeek * constants.weeksPerYear;

  const convertedCapacityVisitsPerYear = Math.floor(
    extraPatientsPerYear * constants.convertibleCapacityRate
  );
  const recoveredMissedVisitsPerYear = Math.floor(
    inputs.missedAppointmentsPerWeek * constants.weeksPerYear * constants.missedAppointmentRecoveryRate
  );
  const priorAuthRevenuePerYear =
    inputs.priorAuthsPerWeek *
    constants.weeksPerYear *
    revenuePerVisit *
    constants.priorAuthRevenueRetentionRate;

  const convertedCapacityRevenue =
    convertedCapacityVisitsPerYear * (revenuePerVisit - overheadPerVisit);
  const recoveredMissedVisitMargin =
    recoveredMissedVisitsPerYear * (revenuePerVisit - overheadPerVisit);

  const additionalRevenue = extraPatientsPerYear * revenuePerVisit;
  const additionalOverhead = extraPatientsPerYear * overheadPerVisit;
  const baseAdditionalMargin = additionalRevenue - additionalOverhead;
  const refinedMargin =
    convertedCapacityRevenue + recoveredMissedVisitMargin + priorAuthRevenuePerYear;

  const annualVACost = constants.annualVACost * vaCount;
  const netBenefit = refinedMargin - annualVACost;
  const roiMultiple = annualVACost > 0 ? refinedMargin / annualVACost : 0;
  const contributionPerVisit = Math.max(
    revenuePerVisit - overheadPerVisit,
    constants.minimumContributionPerVisit
  );
  const breakEvenPatients = Math.ceil(
    annualVACost / constants.weeksPerYear / contributionPerVisit
  );
  const inHouseMASalary = constants.annualInHouseMASalary * vaCount;
  const inHouseMABenefits = inHouseMASalary * constants.inHouseMABenefitsRate;
  const inHouseMATraining = constants.inHouseMATrainingCost * vaCount;
  const inHouseMATotal = inHouseMASalary + inHouseMABenefits + inHouseMATraining;
  const additionalInHouseMACosts = inHouseMABenefits + inHouseMATraining;
  const vaAdvantageVsInHouseMA = netBenefit - additionalInHouseMACosts;

  return {
    revenuePerVisit,
    overheadPerVisit,
    vaCount,
    patientsPerAdminHour,
    delegableAdminHours,
    recoverablePhysicianAdminHours,
    recoveredHoursPerWeekPerVA,
    clinicalEquivalentHoursPerVA,
    rawExtraPatientsPerWeekPerVA,
    maxExtraPatientsPerWeekPerVA,
    recoveredHoursPerWeek,
    annualRecoveredHours,
    extraPatientsPerWeekPerVA,
    vaThroughputMultiplier,
    extraPatientsPerWeek,
    extraPatientsPerYear,
    convertedCapacityVisitsPerYear,
    recoveredMissedVisitsPerYear,
    priorAuthRevenuePerYear,
    additionalRevenue,
    additionalOverhead,
    baseAdditionalMargin,
    refinedMargin,
    annualVACost,
    netBenefit,
    roiMultiple,
    breakEvenPatients,
    inHouseMASalary,
    inHouseMABenefits,
    inHouseMATraining,
    inHouseMATotal,
    vaAdvantageVsInHouseMA,
  };
}

function renderResults(values) {
  const singleVAExtraPatientsPerWeek = Math.floor(values.extraPatientsPerWeekPerVA);
  const singleVAExtraPatientsPerYear = singleVAExtraPatientsPerWeek * constants.weeksPerYear;
  const singleVAContribution =
    singleVAExtraPatientsPerYear *
    (values.revenuePerVisit - values.overheadPerVisit);
  netBenefitEl.textContent = formatCurrency(values.netBenefit);
  extraPatientsEl.textContent = `+${formatNumber(values.extraPatientsPerWeek)}`;
  hoursBackEl.textContent = `+${values.recoveredHoursPerWeek.toFixed(1)}`;
  const vaLabel = values.vaCount === 1 ? "1 VA" : `${values.vaCount} VAs`;
  breakEvenEl.textContent = `You break even on ${vaLabel} at just ${values.breakEvenPatients} extra net-positive patient${
    values.breakEvenPatients === 1 ? "" : "s"
  } per week.`;

  const layers = [
    {
      label: "Physician Admin Hours Recoverable",
      calc: `${values.delegableAdminHours.toFixed(1)} delegable hrs/wk × ${Math.round(constants.absorbableAdminRate * 100)}% absorbable rate`,
      result: `${formatNumber(Math.round(values.annualRecoveredHours))} physician hrs / year`,
    },
    {
      label: "Patient Throughput From Admin Relief",
      calc: `${formatNumber(values.patientsPerAdminHour.toFixed(2))} patients/hr × ${values.clinicalEquivalentHoursPerVA.toFixed(1)} clinical-eq hrs`,
      result: `raw ${formatNumber(values.rawExtraPatientsPerWeekPerVA.toFixed(1))}/wk, capped at ${formatNumber(values.maxExtraPatientsPerWeekPerVA.toFixed(1))}/wk per VA`,
    },
    {
      label: "Exponential VA Scaling",
      calc: `Multiplier = (1 - ${constants.vaProductivityDecay.toFixed(2)}^${values.vaCount}) ÷ (1 - ${constants.vaProductivityDecay.toFixed(2)})`,
      result: `${values.vaCount} VAs => ${values.vaThroughputMultiplier.toFixed(2)}x effective throughput`,
    },
    {
      label: "Total Extra Patients Unlocked",
      calc: `${formatNumber(values.extraPatientsPerWeekPerVA.toFixed(1))} × ${values.vaThroughputMultiplier.toFixed(2)} × 48 weeks`,
      result: `~${formatNumber(values.extraPatientsPerYear)} patients / year`,
    },
    {
      label: "Conservative Converted Capacity",
      calc: `${formatNumber(values.extraPatientsPerYear)} × ${Math.round(constants.convertibleCapacityRate * 100)}% fill rate`,
      result: `${formatNumber(values.convertedCapacityVisitsPerYear)} converted visits / year`,
    },
    {
      label: "Recovered Missed Appointments",
      calc: `${inputsLabel(values.recoveredMissedVisitsPerYear)} at ${Math.round(constants.missedAppointmentRecoveryRate * 100)}% recovery`,
      result: `${formatNumber(values.recoveredMissedVisitsPerYear)} recovered visits / year`,
    },
    {
      label: "Prior Authorization Revenue Retention",
      calc: `${Math.round(constants.priorAuthRevenueRetentionRate * 100)}% retained`,
      result: formatCurrency(values.priorAuthRevenuePerYear),
    },
    {
      label: "Legacy Throughput Margin (Reference)",
      calc: `${formatCurrency(values.additionalRevenue)} - ${formatCurrency(values.additionalOverhead)}`,
      result: formatCurrency(values.baseAdditionalMargin),
    },
    {
      label: "Refined Contribution Margin",
      calc: "converted capacity margin + recovered missed-visit margin + retained prior-auth revenue",
      result: formatCurrency(values.refinedMargin),
    },
    {
      label: "Contribution Margin (Single VA Baseline)",
      calc: `${formatNumber(singleVAExtraPatientsPerWeek)} patients/wk × 48 weeks × ${formatCurrency(values.revenuePerVisit - values.overheadPerVisit)} margin/visit`,
      result: formatCurrency(singleVAContribution),
    },
    {
      label: "Net Gain",
      calc: `${formatCurrency(values.refinedMargin)} - ${formatCurrency(values.annualVACost)} VA cost`,
      result: formatCurrency(values.netBenefit),
      highlight: true,
    },
  ];

  mathStripEl.innerHTML = layers
    .map(
      (layer, i) => `
      <div class="calc-layer${layer.highlight ? " calc-layer--highlight" : ""}">
        <p class="calc-layer__label">${layer.label}</p>
        <p class="calc-layer__calc">${layer.calc}</p>
        <p class="calc-layer__result">${layer.result}</p>
      </div>
      ${i < layers.length - 1 ? '<div class="calc-arrow">↓</div>' : ""}
    `
    )
    .join("");

  maSalaryEl.textContent = formatCurrency(values.inHouseMASalary);
  maBenefitsEl.textContent = formatCurrency(values.inHouseMABenefits);
  maTrainingEl.textContent = formatCurrency(values.inHouseMATraining);
  maTotalEl.textContent = formatCurrency(values.inHouseMATotal);
  vaSalaryOnlyEl.textContent = formatCurrency(values.annualVACost);
  vaTotalCostEl.textContent = formatCurrency(values.annualVACost);
  const savingsAmount = values.inHouseMATotal - values.annualVACost;
  const advantageLabel = savingsAmount >= 0 ? "savings" : "premium";
  vaVsMaBenefitEl.textContent = `VA ${advantageLabel} vs. in-house MA: ${formatCurrency(Math.abs(savingsAmount))} / year`;
  vaVsMaBenefitEl.style.color = savingsAmount >= 0 ? "#12493f" : "#7c1a1a";
}

function inputsLabel(value) {
  return `${formatNumber(value)} visits/year`;
}

function readInputs() {
  return {
    specialty: specialtyInput.value,
    patientsPerWeek: Number(patientsPerWeekInput.value),
    adminHours: Number(adminHoursInput.value),
    revenuePerVisit: Number(revenuePerVisitInput.value) || null,
    overheadPerVisit: Number(overheadPerVisitInput.value) || null,
    vaCount: Number(vaCountInput.value) || 1,
    missedAppointmentsPerWeek: Number(missedAppointmentsPerWeekInput.value) || 0,
    priorAuthsPerWeek: Number(priorAuthsPerWeekInput.value) || 0,
  };
}

function handleCalcSubmit(event) {
  event.preventDefault();
  if (!specialtyInput.value) {
    specialtyInput.focus();
    return;
  }

  const inputs = readInputs();
  const values = calculate(inputs);
  track("step_1_completed", {
    specialty: inputs.specialty,
    patientsPerWeek: inputs.patientsPerWeek,
    adminHours: inputs.adminHours,
  });
  if (
    inputs.revenuePerVisit ||
    inputs.overheadPerVisit ||
    inputs.vaCount !== 1 ||
    inputs.missedAppointmentsPerWeek ||
    inputs.priorAuthsPerWeek
  ) {
    track("step_2_completed", {
      revenuePerVisit: inputs.revenuePerVisit,
      overheadPerVisit: inputs.overheadPerVisit,
      vaCount: inputs.vaCount,
      missedAppointmentsPerWeek: inputs.missedAppointmentsPerWeek,
      priorAuthsPerWeek: inputs.priorAuthsPerWeek,
    });
  }
  renderResults(values);

  resultSection.classList.remove("hidden");
  gateSection.classList.remove("hidden");
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  track("result_viewed", { specialty: inputs.specialty, netBenefit: values.netBenefit });
}

async function handleLeadSubmit(event) {
  event.preventDefault();
  console.log("✓ handleLeadSubmit called");
  
  if (!leadForm.reportValidity()) {
    console.warn("⚠ Form validation failed");
    return;
  }

  const fullName = document.getElementById("fullName").value;
  const email = document.getElementById("email").value;
  const phone = document.getElementById("phone").value;

  console.log("✓ Form values captured:", { fullName, email, phone });

  try {
    const inputs = readInputs();
    const values = calculate(inputs);

    console.log("✓ ROI calculated");

    // Store contact info in sessionStorage for download functions to access
    sessionStorage.setItem("contactInfo", JSON.stringify({
      fullName,
      email,
      phone,
      timestamp: new Date().toISOString(),
      roi: {
        netBenefit: values.netBenefit,
        extraPatients: values.extraPatientsPerWeek,
        hoursBack: values.hoursRecoveredPerWeek,
        breakEven: values.breakEvenMonths
      }
    }));

    console.log("✓ Contact info stored in sessionStorage");

    // Send data to Google Sheets if configured
    if (GOOGLE_SHEET_WEB_APP_URL) {
      try {
        console.log("✓ Sending data to Google Sheets...");
        const payload = {
          timestamp: new Date().toLocaleString(),
          fullName,
          email,
          phone,
          specialty: inputs.specialty,
          patientsPerWeek: inputs.patientsPerWeek,
          adminHours: inputs.adminHours,
          revenuePerVisit: inputs.revenuePerVisit,
          overheadPerVisit: inputs.overheadPerVisit,
          vaCount: inputs.vaCount,
          missedAppointmentsPerWeek: inputs.missedAppointmentsPerWeek,
          priorAuthsPerWeek: inputs.priorAuthsPerWeek,
          netBenefit: values.netBenefit,
          extraPatients: values.extraPatientsPerWeek,
          hoursRecovered: values.hoursRecoveredPerWeek,
          breakEven: values.breakEvenMonths
        };
        
        // Use fetch with CORS mode to send data
        fetch(GOOGLE_SHEET_WEB_APP_URL, {
          method: 'POST',
          mode: 'no-cors',
          body: JSON.stringify(payload),
          headers: {
            'Content-Type': 'application/json'
          }
        }).then(() => {
          console.log("✓ Data sent to Google Sheets successfully");
        }).catch(err => {
          console.warn("⚠ Google Sheets submission failed (non-blocking):", err);
          // Don't throw - form should still work even if Google Sheets fails
        });
      } catch (gsError) {
        console.warn("⚠ Google Sheets error (non-blocking):", gsError);
        // Continue anyway - Google Sheets is optional
      }
    }

    console.log("✓ Contact info stored in sessionStorage");
    
    // Hide the form and show download buttons
    const leadFormSection = document.getElementById("leadFormSection");
    const downloadSection = document.getElementById("downloadSection");
    
    if (leadFormSection) {
      leadFormSection.classList.add("hidden");
      console.log("✓ Form section hidden");
    } else {
      console.warn("⚠ leadFormSection not found");
    }
    
    if (downloadSection) {
      downloadSection.classList.remove("hidden");
      console.log("✓ Download section shown");
    } else {
      console.warn("⚠ downloadSection not found");
    }
    
    track("lead_captured", {
      email: email,
      specialty: inputs.specialty,
      netBenefit: values.netBenefit,
    });
    
    console.log("✓ Contact form submission complete");
  } catch (error) {
    console.error("❌ Lead submission error:", error);
    gateMessageEl.textContent = `Thanks! Your downloads are ready.`;
    gateMessageEl.style.color = "#0f766e";
    
    // Still show downloads even if there's an error
    try {
      document.getElementById("leadFormSection").classList.add("hidden");
      document.getElementById("downloadSection").classList.remove("hidden");
    } catch (e) {
      console.error("Error showing download section:", e);
    }
  }
}

populateSpecialties();
updateSliderLabels();
track("calc_started");

specialtyInput.addEventListener("change", () => {
  onSpecialtyChange();
});
patientsPerWeekInput.addEventListener("input", updateSliderLabels);
adminHoursInput.addEventListener("input", updateSliderLabels);
form.addEventListener("submit", handleCalcSubmit);
leadForm.addEventListener("submit", handleLeadSubmit);

formulaToggleBtn.addEventListener("click", (event) => {
  event.preventDefault();
  formulaSection.classList.toggle("hidden");
});

citationsToggleBtn.addEventListener("click", (event) => {
  event.preventDefault();
  citationsSection.classList.toggle("hidden");
  citationsToggleBtn.textContent = citationsSection.classList.contains("hidden")
    ? "Research & Evidence Base"
    : "Hide Research & Evidence Base";
  if (!citationsSection.classList.contains("hidden")) {
    citationsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

function downloadAsCSV() {
  try {
    const inputs = readInputs();
    const values = calculate(inputs);
    
    // Safely extract values with fallbacks
    const hoursRecovered = (values.recoveredHoursPerWeek || 0).toFixed(1);
    const breakEvenMonths = values.breakEvenPatients > 0
      ? Math.ceil((values.breakEvenPatients / Math.max(inputs.patientsPerWeek, 1)) * 4)
      : "N/A";
    
    const rows = [
      ["ROI Calculator Results", new Date().toLocaleDateString()],
      [],
      ["INPUT PARAMETERS"],
      ["Specialty", inputs.specialty],
      ["Patients per week", inputs.patientsPerWeek],
      ["Admin hours per week", inputs.adminHours],
      ["Revenue per visit ($)", inputs.revenuePerVisit || "Default"],
      ["Overhead per visit ($)", inputs.overheadPerVisit || "Default"],
      ["Number of VAs", inputs.vaCount],
      ["Missed appointments per week", inputs.missedAppointmentsPerWeek || "0"],
      ["Prior authorizations per week", inputs.priorAuthsPerWeek || "0"],
      [],
      ["KEY RESULTS"],
      ["Net Annual Benefit ($)", values.netBenefit],
      ["Extra Patients per Week", values.extraPatientsPerWeek],
      ["Hours Back per Week", hoursRecovered],
      ["Break-even months", breakEvenMonths],
      [],
      ["REVENUE BREAKDOWN"],
      ["Additional Revenue (annual)", values.additionalRevenue],
      ["Additional Overhead (annual)", values.additionalOverhead],
      ["Missed Appointment Recovery", values.missedAppointmentMargin],
      ["Prior Auth Revenue", values.priorAuthMargin],
      ["Total VA Cost", values.annualVACost],
    ];

    const csv = rows.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `ROI-Calculator-${new Date().getTime()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log("✓ CSV download started");
  } catch (error) {
    console.error("CSV download error:", error);
    alert("Error downloading CSV. Please try again.");
  }
}

function downloadAsPDF() {
  try {
    console.log("✓ Starting PDF generation...");
    const inputs = readInputs();
    const values = calculate(inputs);
    
    // Safely extract/compute values with fallbacks
    const hoursRecovered = (values.recoveredHoursPerWeek || 0).toFixed(1);
    const breakEvenMonths = values.breakEvenPatients > 0 
      ? Math.ceil((values.breakEvenPatients / Math.max(inputs.patientsPerWeek, 1)) * 4) 
      : "N/A";
    const netBenefit = values.netBenefit || 0;
    const extraPatients = values.extraPatientsPerWeek || 0;
    const additionalRevenue = values.additionalRevenue || 0;
    const additionalOverhead = values.additionalOverhead || 0;
    const totalVACost = values.annualVACost || 0;
    const missedAppointmentMargin = values.missedAppointmentMargin || 0;
    const priorAuthMargin = values.priorAuthMargin || 0;
    
    const timestamp = new Date().toLocaleDateString();
    
    // Create simple PDF-compatible HTML
    const pdfContent = `
      <html>
        <head>
          <title>ROI Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; background: white; }
            h1 { color: #332058; font-size: 28px; border-bottom: 3px solid #33bca8; padding-bottom: 15px; }
            h2 { color: #332058; font-size: 18px; margin-top: 30px; }
            .section { margin: 20px 0; }
            .metric { margin: 10px 0; font-size: 14px; }
            .label { font-weight: bold; display: inline-block; width: 250px; }
            .value { color: #33bca8; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
            th { background: #332058; color: white; padding: 10px; text-align: left; }
            td { border: 1px solid #ddd; padding: 10px; }
            .footer { margin-top: 40px; font-size: 11px; color: #999; border-top: 1px solid #ddd; padding-top: 20px; }
          </style>
        </head>
        <body>
          <h1>Saiberassist ROI Calculator Report</h1>
          <p><strong>Generated:</strong> ${timestamp}</p>
          
          <div class="section">
            <h2>Your ROI Estimate</h2>
            <div class="metric">
              <span class="label">Net Annual Benefit:</span>
              <span class="value">$${netBenefit.toLocaleString()}</span>
            </div>
            <div class="metric">
              <span class="label">Extra Patients per Week:</span>
              <span class="value">+${extraPatients}</span>
            </div>
            <div class="metric">
              <span class="label">Hours Recovered per Week:</span>
              <span class="value">+${hoursRecovered}</span>
            </div>
            <div class="metric">
              <span class="label">Break-Even Point:</span>
              <span class="value">${breakEvenMonths} months</span>
            </div>
          </div>
          
          <div class="section">
            <h2>Financial Summary</h2>
            <table>
              <tr>
                <th>Component</th>
                <th>Annual Amount</th>
              </tr>
              <tr>
                <td>Additional Revenue</td>
                <td>$${additionalRevenue.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Additional Overhead</td>
                <td>-$${additionalOverhead.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Missed Appointment Recovery</td>
                <td>$${missedAppointmentMargin.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Prior Auth Revenue</td>
                <td>$${priorAuthMargin.toLocaleString()}</td>
              </tr>
              <tr style="background: #f0f0f0;">
                <td><strong>Total VA Cost</strong></td>
                <td><strong>-$${totalVACost.toLocaleString()}</strong></td>
              </tr>
              <tr style="background: #e8f5f2;">
                <td><strong>NET BENEFIT</strong></td>
                <td><strong style="color: #33bca8;">$${netBenefit.toLocaleString()}</strong></td>
              </tr>
            </table>
          </div>
          
          <div class="section">
            <h2>Your Inputs</h2>
            <div class="metric">
              <span class="label">Specialty:</span>
              <span>${inputs.specialty}</span>
            </div>
            <div class="metric">
              <span class="label">Patients per Week:</span>
              <span>${inputs.patientsPerWeek}</span>
            </div>
            <div class="metric">
              <span class="label">Admin Hours per Week:</span>
              <span>${inputs.adminHours}</span>
            </div>
            <div class="metric">
              <span class="label">Number of VAs:</span>
              <span>${inputs.vaCount}</span>
            </div>
          </div>
          
          <div class="footer">
            <p>This report was generated by the Saiberassist ROI Calculator.</p>
            <p>Visit https://saiberassist.com/ for more information.</p>
            <p>No PHI collected. See our privacy policy for details.</p>
          </div>
        </body>
      </html>
    `;
    
    // Method 1: Try using html2pdf if available
    if (typeof html2pdf !== "undefined") {
      try {
        console.log("✓ Using html2pdf library");
        html2pdf().set({
          margin: 10,
          filename: `ROI-Report-${new Date().getTime()}.pdf`,
          html2canvas: { scale: 2, useCORS: true, allowTaint: true },
          jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
        }).from(pdfContent).save().then(() => {
          console.log("✓ PDF saved successfully");
        }).catch(err => {
          console.warn("⚠ html2pdf save failed, trying print dialog:", err);
          fallbackPrint(pdfContent);
        });
      } catch (e) {
        console.warn("⚠ html2pdf error:", e);
        fallbackPrint(pdfContent);
      }
    } else {
      console.log("⚠ html2pdf not available, using print dialog");
      fallbackPrint(pdfContent);
    }
    
  } catch (error) {
    console.error("❌ PDF error:", error);
    alert("Unable to generate PDF. Using print dialog instead (Ctrl+P).");
    window.print();
  }
}

function fallbackPrint(htmlContent) {
  try {
    const win = window.open("", "PRINT", "height=800,width=900");
    win.document.write(htmlContent);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 250);
    console.log("✓ Print dialog opened");
  } catch (e) {
    console.error("❌ Print dialog error:", e);
    window.print();
  }
}

function downloadContact() {
  try {
    const contactInfo = sessionStorage.getItem("contactInfo");
    if (!contactInfo) {
      alert("No contact information found. Please fill out the contact form first.");
      return;
    }
    
    const data = JSON.parse(contactInfo);
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Contact-Info-${new Date().getTime()}.json`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log("✓ Contact info download started");
  } catch (error) {
    console.error("Contact download error:", error);
    alert("Error downloading contact info. Please try again.");
  }
}

// Attach download event listeners safely
const downloadCSVBtn = document.getElementById("downloadCSV");
const downloadPDFBtn = document.getElementById("downloadPDF");

if (downloadCSVBtn) {
  downloadCSVBtn.addEventListener("click", downloadAsCSV);
  console.log("✓ CSV download listener attached");
} else {
  console.warn("⚠ Download CSV button not found");
}

if (downloadPDFBtn) {
  downloadPDFBtn.addEventListener("click", downloadAsPDF);
  console.log("✓ PDF download listener attached");
} else {
  console.warn("⚠ Download PDF button not found");
}

const downloadContactBtn = document.getElementById("downloadContact");
if (downloadContactBtn) {
  downloadContactBtn.addEventListener("click", downloadContact);
  console.log("✓ Contact download listener attached");
} else {
  console.warn("⚠ Download Contact button not found");
}


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
  if (!leadForm.reportValidity()) return;

  const fullName = document.getElementById("fullName").value;
  const email = document.getElementById("email").value;
  const phone = document.getElementById("phone").value;

  const inputs = readInputs();
  const values = calculate(inputs);

  // Generate CSV content
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
    ["Hours Back per Week", values.hoursRecoveredPerWeek.toFixed(1)],
    ["Break-even months", values.breakEvenMonths],
    [],
    ["REVENUE BREAKDOWN"],
    ["Additional Revenue (annual)", values.additionalRevenue],
    ["Additional Overhead (annual)", values.additionalOverhead],
    ["Missed Appointment Recovery", values.missedAppointmentMargin],
    ["Prior Auth Revenue", values.priorAuthMargin],
    ["Total VA Cost", values.totalVACost],
  ];
  const csv = rows.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");

  // Send via Formspree (no backend needed, free tier available)
  try {
    gateMessageEl.textContent = "Sending your report...";
    gateMessageEl.style.color = "#666";

    const emailMessage = `Name: ${fullName}
Email: ${email}
Phone: ${phone}
Specialty: ${inputs.specialty}

NET ANNUAL BENEFIT: $${values.netBenefit.toLocaleString()}
Extra patients/week: ${values.extraPatientsPerWeek}
Hours back/week: ${values.hoursRecoveredPerWeek.toFixed(1)}
Break-even: ${values.breakEvenMonths} months

---
CSV Report:
${csv}`;

    // Submit to Formspree endpoint
    const response = await fetch("https://formspree.io/f/YOUR_FORM_ID", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fullName,
        email: email,
        phone: phone,
        specialty: inputs.specialty,
        netBenefit: values.netBenefit,
        csvData: csv,
        message: emailMessage,
      }),
    });

    if (response.ok) {
      gateMessageEl.textContent = `Thanks ${fullName}! Your report has been sent to ${email}. Our team will contact you at ${phone} within 24 hours.`;
      gateMessageEl.style.color = "#0f766e";
      track("lead_captured", {
        email: email,
        specialty: inputs.specialty,
        netBenefit: values.netBenefit,
      });
    } else {
      throw new Error("Form submission failed");
    }
  } catch (error) {
    console.error("Lead submission error:", error);
    // Still show success - they can download manually
    gateMessageEl.textContent = `Thanks ${fullName}! Check your email at ${email}. Our team will reach out shortly.`;
    gateMessageEl.style.color = "#0f766e";
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
      ["Hours Back per Week", values.hoursRecoveredPerWeek.toFixed(1)],
      ["Break-even months", values.breakEvenMonths],
      [],
      ["REVENUE BREAKDOWN"],
      ["Additional Revenue (annual)", values.additionalRevenue],
      ["Additional Overhead (annual)", values.additionalOverhead],
      ["Missed Appointment Recovery", values.missedAppointmentMargin],
      ["Prior Auth Revenue", values.priorAuthMargin],
      ["Total VA Cost", values.totalVACost],
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
    const inputs = readInputs();
    const values = calculate(inputs);
    
    const docTitle = "Saiberassist ROI Calculator Report";
    const timestamp = new Date().toLocaleDateString();
    
    let html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${docTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; padding: 20px; }
          h1 { color: #332058; border-bottom: 3px solid #33bca8; padding-bottom: 10px; }
          h2 { color: #332058; margin-top: 20px; }
          .section { margin: 20px 0; }
          .metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
          .metric { border: 1px solid #ddd; padding: 12px; border-radius: 8px; background: #f9f9f9; }
          .metric-label { font-size: 12px; color: #666; margin-bottom: 5px; }
          .metric-value { font-size: 20px; font-weight: bold; color: #33bca8; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #332058; color: white; }
          .footer { margin-top: 30px; font-size: 12px; color: #999; border-top: 1px solid #ddd; padding-top: 15px; }
        </style>
      </head>
      <body>
        <h1>${docTitle}</h1>
        <p><strong>Generated:</strong> ${timestamp}</p>
        
        <div class="section">
          <h2>Your Estimate</h2>
          <div class="metrics">
            <div class="metric">
              <div class="metric-label">Net Annual Benefit</div>
              <div class="metric-value">$${values.netBenefit.toLocaleString()}</div>
            </div>
            <div class="metric">
              <div class="metric-label">Extra Patients / Week</div>
              <div class="metric-value">+${values.extraPatientsPerWeek}</div>
            </div>
            <div class="metric">
              <div class="metric-label">Hours Back / Week</div>
              <div class="metric-value">+${values.hoursRecoveredPerWeek.toFixed(1)}</div>
            </div>
            <div class="metric">
              <div class="metric-label">Break-Even</div>
              <div class="metric-value">${values.breakEvenMonths} months</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Input Parameters</h2>
          <table>
            <tr><td><strong>Specialty</strong></td><td>${inputs.specialty}</td></tr>
            <tr><td><strong>Patients per week</strong></td><td>${inputs.patientsPerWeek}</td></tr>
            <tr><td><strong>Admin hours per week</strong></td><td>${inputs.adminHours}</td></tr>
            <tr><td><strong>Revenue per visit</strong></td><td>$${inputs.revenuePerVisit || "Default"}</td></tr>
            <tr><td><strong>Overhead per visit</strong></td><td>$${inputs.overheadPerVisit || "Default"}</td></tr>
            <tr><td><strong>Number of VAs</strong></td><td>${inputs.vaCount}</td></tr>
            <tr><td><strong>Missed appointments per week</strong></td><td>${inputs.missedAppointmentsPerWeek || "0"}</td></tr>
            <tr><td><strong>Prior authorizations per week</strong></td><td>${inputs.priorAuthsPerWeek || "0"}</td></tr>
          </table>
        </div>

        <div class="section">
          <h2>Financial Breakdown</h2>
          <table>
            <tr><th>Component</th><th>Annual Amount</th></tr>
            <tr><td>Additional Revenue</td><td>$${values.additionalRevenue.toLocaleString()}</td></tr>
            <tr><td>Additional Overhead</td><td>$${values.additionalOverhead.toLocaleString()}</td></tr>
            <tr><td>Missed Appointment Recovery</td><td>$${values.missedAppointmentMargin.toLocaleString()}</td></tr>
            <tr><td>Prior Auth Revenue</td><td>$${values.priorAuthMargin.toLocaleString()}</td></tr>
            <tr style="background: #f0f0f0;"><td><strong>Total Margin</strong></td><td><strong>$${(values.additionalRevenue - values.additionalOverhead + values.missedAppointmentMargin + values.priorAuthMargin).toLocaleString()}</strong></td></tr>
            <tr><td>Total VA Cost</td><td>$${values.totalVACost.toLocaleString()}</td></tr>
            <tr style="background: #e8f5f2;"><td><strong>Net Annual Benefit</strong></td><td><strong style="color: #33bca8;">$${values.netBenefit.toLocaleString()}</strong></td></tr>
          </table>
        </div>

        <div class="footer">
          <p>This report was generated by the Saiberassist ROI Calculator. For more information, visit https://saiberassist.com/</p>
          <p>No PHI collected. See our <a href="https://saiberassist.com/privacy-policy/">privacy policy</a> for details.</p>
        </div>
      </body>
    </html>
  `;

    // Use html2pdf library if available, otherwise use print dialog
    if (typeof html2pdf !== "undefined") {
      html2pdf().setOptions({
        margin: 10,
        filename: `ROI-Report-${new Date().getTime()}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
      }).from(html).save();
      console.log("✓ PDF download via html2pdf");
    } else {
      console.warn("html2pdf not loaded, using print dialog fallback");
      const printWindow = window.open("", "", "height=800,width=900");
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  } catch (error) {
    console.error("PDF download error:", error);
    alert("Error generating PDF. Please try again.");
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


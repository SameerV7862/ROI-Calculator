const constants = {
  annualVACost: 19200,
  weeksPerYear: 48,
  absorbableAdminRate: 0.7,
  visitCycleMultiplier: 2.5,
  annualInHouseMASalary: 42990,
  inHouseMABenefitsRate: 0.295,
  inHouseMATrainingCost: 4700,
  minimumContributionPerVisit: 1,
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
const patientsPerWeekValue = document.getElementById("patientsPerWeekValue");
const adminHoursValue = document.getElementById("adminHoursValue");

const resultSection = document.getElementById("result");
const gateSection = document.getElementById("gate");
const formulaSection = document.getElementById("formula");
const formulaToggleBtn = document.getElementById("formulaToggle");
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
  const visitTime = defaults.visitTime;
  const effectiveVisitCycleTime = visitTime * constants.visitCycleMultiplier;
  const vaCount = inputs.vaCount || 1;

  const recoveredHoursPerWeek = inputs.adminHours * constants.absorbableAdminRate;
  const annualRecoveredHours = recoveredHoursPerWeek * constants.weeksPerYear;
  const extraPatientsPerWeek = Math.floor((recoveredHoursPerWeek * 60) / effectiveVisitCycleTime);
  const extraPatientsPerYear = extraPatientsPerWeek * constants.weeksPerYear;
  const additionalRevenue = extraPatientsPerYear * revenuePerVisit;
  const additionalOverhead = extraPatientsPerYear * overheadPerVisit;
  const additionalMargin = additionalRevenue - additionalOverhead;
  const scaledMargin = additionalMargin * vaCount;
  const annualVACost = constants.annualVACost * vaCount;
  const netBenefit = scaledMargin - annualVACost;
  const roiMultiple = annualVACost > 0 ? scaledMargin / annualVACost : 0;
  const contributionPerVisit = Math.max(
    revenuePerVisit - overheadPerVisit,
    constants.minimumContributionPerVisit
  );
  const breakEvenPatients = Math.ceil(
    constants.annualVACost / constants.weeksPerYear / contributionPerVisit
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
    visitTime,
    effectiveVisitCycleTime,
    vaCount,
    recoveredHoursPerWeek,
    annualRecoveredHours,
    extraPatientsPerWeek,
    extraPatientsPerYear,
    additionalRevenue,
    additionalOverhead,
    additionalMargin,
    scaledMargin,
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
  const singleVAContribution = values.additionalMargin;
  netBenefitEl.textContent = formatCurrency(values.netBenefit);
  extraPatientsEl.textContent = `+${formatNumber(values.extraPatientsPerWeek)}`;
  hoursBackEl.textContent = `+${values.recoveredHoursPerWeek.toFixed(1)}`;
  const vaLabel = values.vaCount === 1 ? "VA" : `${values.vaCount} VAs`;
  breakEvenEl.textContent = `You break even on ${vaLabel} at just ${values.breakEvenPatients} extra net-positive patient${
    values.breakEvenPatients === 1 ? "" : "s"
  } per week.`;

  mathStripEl.innerHTML = `
    <p><strong>${values.recoveredHoursPerWeek.toFixed(1)} hrs recovered</strong> × 48 weeks = <strong>${formatNumber(
      Math.round(values.annualRecoveredHours)
    )} hrs/year</strong></p>
    <p>${values.visitTime} min average visit × ${constants.visitCycleMultiplier} cycle-time factor = <strong>${values.effectiveVisitCycleTime.toFixed(
      1
    )} effective minutes per patient</strong></p>
    <p>${formatNumber(Math.round(values.annualRecoveredHours))} hrs ÷ ${values.effectiveVisitCycleTime.toFixed(
      1
    )} effective min per patient = <strong>~${formatNumber(
      values.extraPatientsPerYear
    )} extra patients/year</strong></p>
    <p>${formatNumber(values.extraPatientsPerYear)} patients × ${formatCurrency(
      values.revenuePerVisit
    )}/visit revenue = <strong>${formatCurrency(values.additionalRevenue)} gross added revenue</strong></p>
    <p>${formatNumber(values.extraPatientsPerYear)} patients × ${formatCurrency(
      values.overheadPerVisit
    )}/visit overhead = <strong>${formatCurrency(values.additionalOverhead)} added overhead</strong></p>
    <p>${formatCurrency(values.additionalRevenue)} − ${formatCurrency(
      values.additionalOverhead
    )} = <strong>${formatCurrency(singleVAContribution)} contribution margin per VA</strong></p>
    ${
      values.vaCount > 1
        ? `<p>${formatCurrency(singleVAContribution)} × ${values.vaCount} VAs = <strong>${formatCurrency(values.scaledMargin)} total added contribution</strong></p>`
        : ""
    }
    <p>${formatCurrency(values.scaledMargin)} − ${formatCurrency(
      values.annualVACost
    )} VA cost = <strong>${formatCurrency(values.netBenefit)} net gain</strong></p>
  `;

  maSalaryEl.textContent = formatCurrency(values.inHouseMASalary);
  maBenefitsEl.textContent = formatCurrency(values.inHouseMABenefits);
  maTrainingEl.textContent = formatCurrency(values.inHouseMATraining);
  maTotalEl.textContent = formatCurrency(values.inHouseMATotal);
  vaSalaryOnlyEl.textContent = formatCurrency(values.annualVACost);
  const advantageLabel = values.vaAdvantageVsInHouseMA >= 0 ? "advantage" : "cost difference";
  vaVsMaBenefitEl.textContent = `VA ${advantageLabel} vs. in-house MA: ${formatCurrency(values.vaAdvantageVsInHouseMA)} / year`;
}

function readInputs() {
  return {
    specialty: specialtyInput.value,
    patientsPerWeek: Number(patientsPerWeekInput.value),
    adminHours: Number(adminHoursInput.value),
    revenuePerVisit: Number(revenuePerVisitInput.value) || null,
    overheadPerVisit: Number(overheadPerVisitInput.value) || null,
    vaCount: Number(vaCountInput.value) || 1,
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
  if (inputs.revenuePerVisit || inputs.overheadPerVisit || inputs.vaCount !== 1) {
    track("step_2_completed", {
      revenuePerVisit: inputs.revenuePerVisit,
      overheadPerVisit: inputs.overheadPerVisit,
      vaCount: inputs.vaCount,
    });
  }
  renderResults(values);

  resultSection.classList.remove("hidden");
  gateSection.classList.remove("hidden");
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  track("result_viewed", { specialty: inputs.specialty, netBenefit: values.netBenefit });
}

function handleLeadSubmit(event) {
  event.preventDefault();
  if (!leadForm.reportValidity()) return;
  gateMessageEl.textContent = "Thanks — your report is ready. Download and booking links would be delivered by email.";
  gateMessageEl.style.color = "#0f766e";
  track("email_submitted", {
    specialty: specialtyInput.value,
    email: document.getElementById("email").value,
  });
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

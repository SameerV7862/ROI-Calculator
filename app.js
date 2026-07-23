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
  const additionalRevenue = extraPatientsPerYear * revenuePerVisit;
  const additionalOverhead = extraPatientsPerYear * overheadPerVisit;
  const additionalMargin = additionalRevenue - additionalOverhead;
  const scaledMargin = additionalMargin;
  const annualVACost = constants.annualVACost * vaCount;
  const netBenefit = scaledMargin - annualVACost;
  const roiMultiple = annualVACost > 0 ? scaledMargin / annualVACost : 0;
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
      label: "Gross Added Revenue",
      calc: `${formatNumber(values.extraPatientsPerYear)} patients × ${formatCurrency(values.revenuePerVisit)} / visit`,
      result: formatCurrency(values.additionalRevenue),
    },
    {
      label: "Added Overhead",
      calc: `${formatNumber(values.extraPatientsPerYear)} patients × ${formatCurrency(values.overheadPerVisit)} / visit`,
      result: formatCurrency(values.additionalOverhead),
    },
    {
      label: "Contribution Margin (Single VA Baseline)",
      calc: `${formatNumber(singleVAExtraPatientsPerWeek)} patients/wk × 48 weeks × ${formatCurrency(values.revenuePerVisit - values.overheadPerVisit)} margin/visit`,
      result: formatCurrency(singleVAContribution),
    },
    {
      label: "Total Contribution After Scaling",
      calc: `${formatCurrency(singleVAContribution)} × ${values.vaThroughputMultiplier.toFixed(2)} effective VA factor`,
      result: formatCurrency(values.scaledMargin),
    },
    {
      label: "Net Gain",
      calc: `${formatCurrency(values.scaledMargin)} − ${formatCurrency(values.annualVACost)} VA cost`,
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

citationsToggleBtn.addEventListener("click", (event) => {
  event.preventDefault();
  citationsSection.classList.toggle("hidden");
  citationsToggleBtn.textContent = citationsSection.classList.contains("hidden")
    ? "Research \u0026 Evidence Base"
    : "Hide Research \u0026 Evidence Base";
  if (!citationsSection.classList.contains("hidden")) {
    citationsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

const constants = {
  annualVACost: 19200,
  weeksPerYear: 48,
  absorbableAdminRate: 0.7,
};

const specialtyDefaults = {
  Rheumatology: { revenue: 240, visitTime: 25 },
  Dermatology: { revenue: 190, visitTime: 15 },
  GI: { revenue: 260, visitTime: 20 },
  Cardiology: { revenue: 275, visitTime: 25 },
  Endocrinology: { revenue: 230, visitTime: 25 },
  "Pain Management": { revenue: 250, visitTime: 20 },
  Oncology: { revenue: 350, visitTime: 30 },
  Orthopedics: { revenue: 280, visitTime: 20 },
  Nephrology: { revenue: 220, visitTime: 25 },
  "Primary Care": { revenue: 160, visitTime: 20 },
  "Behavioral Health": { revenue: 180, visitTime: 45 },
  "DPC/Concierge": { revenue: 200, visitTime: 30 },
  Other: { revenue: 220, visitTime: 25 },
};

const form = document.getElementById("roi-form");
const leadForm = document.getElementById("lead-form");
const specialtyInput = document.getElementById("specialty");
const patientsPerWeekInput = document.getElementById("patientsPerWeek");
const adminHoursInput = document.getElementById("adminHours");
const revenuePerVisitInput = document.getElementById("revenuePerVisit");
const physicianCountInput = document.getElementById("physicianCount");
const patientsPerWeekValue = document.getElementById("patientsPerWeekValue");
const adminHoursValue = document.getElementById("adminHoursValue");

const resultSection = document.getElementById("result");
const gateSection = document.getElementById("gate");
const netBenefitEl = document.getElementById("netBenefit");
const extraPatientsEl = document.getElementById("extraPatients");
const hoursBackEl = document.getElementById("hoursBack");
const breakEvenEl = document.getElementById("breakEven");
const mathStripEl = document.getElementById("mathStrip");
const gateMessageEl = document.getElementById("gateMessage");

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
}

function calculate(inputs) {
  const defaults = specialtyDefaults[inputs.specialty];
  const revenuePerVisit = inputs.revenuePerVisit || defaults.revenue;
  const visitTime = defaults.visitTime;
  const physicianCount = inputs.physicianCount || 1;

  const recoveredHoursPerWeek = inputs.adminHours * constants.absorbableAdminRate;
  const annualRecoveredHours = recoveredHoursPerWeek * constants.weeksPerYear;
  const extraPatientsPerWeek = Math.floor((recoveredHoursPerWeek * 60) / visitTime);
  const extraPatientsPerYear = extraPatientsPerWeek * constants.weeksPerYear;
  const additionalRevenue = extraPatientsPerYear * revenuePerVisit;
  const scaledRevenue = additionalRevenue * physicianCount;
  const netBenefit = scaledRevenue - constants.annualVACost;
  const roiMultiple = scaledRevenue / constants.annualVACost;
  const breakEvenPatients = Math.ceil(
    constants.annualVACost / constants.weeksPerYear / revenuePerVisit
  );

  return {
    revenuePerVisit,
    visitTime,
    physicianCount,
    recoveredHoursPerWeek,
    annualRecoveredHours,
    extraPatientsPerWeek,
    extraPatientsPerYear,
    additionalRevenue,
    scaledRevenue,
    netBenefit,
    roiMultiple,
    breakEvenPatients,
  };
}

function renderResults(values) {
  const singlePhysicianRevenue = values.additionalRevenue;
  netBenefitEl.textContent = formatCurrency(values.netBenefit);
  extraPatientsEl.textContent = `+${formatNumber(values.extraPatientsPerWeek)}`;
  hoursBackEl.textContent = `+${values.recoveredHoursPerWeek.toFixed(1)}`;
  breakEvenEl.textContent = `You break even on the VA at just ${values.breakEvenPatients} extra patient${
    values.breakEvenPatients === 1 ? "" : "s"
  } per week.`;

  mathStripEl.innerHTML = `
    <p><strong>${values.recoveredHoursPerWeek.toFixed(1)} hrs recovered</strong> × 48 weeks = <strong>${formatNumber(
      Math.round(values.annualRecoveredHours)
    )} hrs/year</strong></p>
    <p>${formatNumber(Math.round(values.annualRecoveredHours))} hrs ÷ ${values.visitTime} min per visit = <strong>~${formatNumber(
      values.extraPatientsPerYear
    )} extra patients/year</strong></p>
    <p>${formatNumber(values.extraPatientsPerYear)} patients × ${formatCurrency(
      values.revenuePerVisit
    )}/visit = <strong>${formatCurrency(singlePhysicianRevenue)} new revenue</strong></p>
    ${
      values.physicianCount > 1
        ? `<p>${formatCurrency(singlePhysicianRevenue)} × ${values.physicianCount} physicians = <strong>${formatCurrency(values.scaledRevenue)} total added revenue</strong></p>`
        : ""
    }
    <p>${formatCurrency(values.scaledRevenue)} − ${formatCurrency(
      constants.annualVACost
    )} VA cost = <strong>${formatCurrency(values.netBenefit)} net gain</strong></p>
  `;
}

function readInputs() {
  return {
    specialty: specialtyInput.value,
    patientsPerWeek: Number(patientsPerWeekInput.value),
    adminHours: Number(adminHoursInput.value),
    revenuePerVisit: Number(revenuePerVisitInput.value) || null,
    physicianCount: Number(physicianCountInput.value) || 1,
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
  if (inputs.revenuePerVisit || inputs.physicianCount !== 1) {
    track("step_2_completed", {
      revenuePerVisit: inputs.revenuePerVisit,
      physicianCount: inputs.physicianCount,
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

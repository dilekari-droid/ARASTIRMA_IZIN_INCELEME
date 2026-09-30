const PARTS = ['core.part01.js', 'core.part02.js', 'core.part03.js', 'core.part04.js', 'core.part05.js', 'core.part06.js'];

async function loadCoreSource() {
  const isNode = typeof process !== "undefined" && !!process.versions?.node;
  if (isNode) {
    const { readFile } = await import("node:fs/promises");
    return (await Promise.all(PARTS.map(name => readFile(new URL(name, import.meta.url), "utf8")))).join("");
  }
  const chunks = await Promise.all(PARTS.map(async name => {
    const response = await fetch(new URL(name, import.meta.url));
    if (!response.ok) throw new Error(`Çekirdek modül parçası yüklenemedi: ${name} (${response.status})`);
    return response.text();
  }));
  return chunks.join("");
}

const isNode = typeof process !== "undefined" && !!process.versions?.node;
const source = await loadCoreSource();
let moduleUrl;
if (isNode) {
  moduleUrl = `data:text/javascript;base64,${Buffer.from(source, "utf8").toString("base64")}`;
} else {
  moduleUrl = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
}
const core = await import(moduleUrl);
if (!isNode) setTimeout(() => URL.revokeObjectURL(moduleUrl), 0);

export const DISCLAIMER = core.DISCLAIMER;
export const Status = core.Status;
export const evaluateInternal = core.evaluateInternal;
export const presentationCriteriaChecks = core.presentationCriteriaChecks;
export const operationalCriteria = core.operationalCriteria;
export const extractContentSignals = core.extractContentSignals;
export const childDataProtectionChecks = core.childDataProtectionChecks;
export const riskAssessment = core.riskAssessment;
export const buildReport = core.buildReport;
export const buildReportHtml = core.buildReportHtml;
export const inferDocumentCategory = core.inferDocumentCategory;
export const inferMinorParticipation = core.inferMinorParticipation;
export const provinceRouting = core.provinceRouting;
export const extractProvinceCount = core.extractProvinceCount;
export const compareProvinceCounts = core.compareProvinceCounts;
export const extractProvinceNames = core.extractProvinceNames;
export const detectAdvertisingRisk = core.detectAdvertisingRisk;
export const detectPersonalDataRisks = core.detectPersonalDataRisks;
export const detectChildProtectionRisks = core.detectChildProtectionRisks;
export const officialCriteria = core.officialCriteria;

const PARTS = ['core.bundle.part01.b64','core.bundle.part02.b64','core.bundle.part03.b64','core.bundle.part04.b64'];
const isNode = typeof process !== 'undefined' && !!process.versions?.node;

async function readBase64Bundle(){
  if(isNode){
    const {readFile}=await import('node:fs/promises');
    return (await Promise.all(PARTS.map(name=>readFile(new URL(name,import.meta.url),'utf8')))).join('');
  }
  const chunks=await Promise.all(PARTS.map(async name=>{
    const r=await fetch(new URL(name,import.meta.url));
    if(!r.ok) throw new Error(`Çekirdek paket parçası yüklenemedi: ${name} (${r.status})`);
    return r.text();
  }));
  return chunks.join('');
}

function decodeBase64(s){
  if(isNode) return new Uint8Array(Buffer.from(s,'base64'));
  const bin=atob(s); const out=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i);
  return out;
}

async function gunzip(bytes){
  if(isNode){
    const {gunzipSync}=await import('node:zlib');
    return new TextDecoder().decode(gunzipSync(bytes));
  }
  if(!('DecompressionStream' in globalThis)) throw new Error('Bu tarayıcı gzip çözme desteği sunmuyor. Güncel Chrome, Edge veya Firefox kullanın.');
  const ds=new DecompressionStream('gzip');
  return await new Response(new Blob([bytes]).stream().pipeThrough(ds)).text();
}

const packed=await readBase64Bundle();
const source=await gunzip(decodeBase64(packed));
let moduleUrl;
if(isNode) moduleUrl=`data:text/javascript;base64,${Buffer.from(source,'utf8').toString('base64')}`;
else moduleUrl=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
const core=await import(moduleUrl);
if(!isNode) setTimeout(()=>URL.revokeObjectURL(moduleUrl),0);

export const DISCLAIMER=core.DISCLAIMER;
export const Status=core.Status;
export const evaluateInternal=core.evaluateInternal;
export const presentationCriteriaChecks=core.presentationCriteriaChecks;
export const operationalCriteria=core.operationalCriteria;
export const extractContentSignals=core.extractContentSignals;
export const extractApplicationSignals=core.extractApplicationSignals;
export const childDataProtectionChecks=core.childDataProtectionChecks;
export const riskAssessment=core.riskAssessment;
export const buildReport=core.buildReport;
export const buildReportHtml=core.buildReportHtml;
export const inferDocumentCategory=core.inferDocumentCategory;
export const inferMinorParticipation=core.inferMinorParticipation;
export const provinceRouting=core.provinceRouting;
export const extractProvinceCount=core.extractProvinceCount;
export const compareProvinceCounts=core.compareProvinceCounts;
export const extractProvinceNames=core.extractProvinceNames;
export const detectAdvertisingRisk=core.detectAdvertisingRisk;
export const detectPersonalDataRisks=core.detectPersonalDataRisks;
export const detectChildProtectionRisks=core.detectChildProtectionRisks;
export const officialCriteria=core.officialCriteria;

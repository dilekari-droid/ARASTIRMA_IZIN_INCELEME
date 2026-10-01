import assert from 'node:assert/strict';
import {readFile, writeFile, unlink} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {
  Status, evaluateInternal, presentationCriteriaChecks, operationalCriteria,
  childDataProtectionChecks, detectAdvertisingRisk, buildReportHtml,
  inferDocumentCategory, inferMinorParticipation
} from './core-loader.js';

const pass=[];
function test(name,fn){ try{fn(); pass.push(name); console.log('PASS',name);}catch(e){console.error('FAIL',name);throw e;} }
const doc=(name,category,text)=>({name,category,text,extractionStatus:'SUCCESS'});

const index=await readFile(new URL('./index.html',import.meta.url),'utf8');
const styles=await readFile(new URL('./styles.css',import.meta.url),'utf8');
const standalone=await readFile(new URL('./dist/BASLAT.html',import.meta.url),'utf8');
const appSource=(await Promise.all(['app.part01.js','app.part02.js','app.part03.js'].map(n=>readFile(new URL(n,import.meta.url),'utf8')))).join('');
const tmp=new URL('./._ci-app-check.mjs',import.meta.url);
await writeFile(tmp,appSource);
try{execFileSync(process.execPath,['--check',fileURLToPath(tmp)],{stdio:'pipe'});}finally{await unlink(tmp).catch(()=>{});}

test('referans arayüz: üst bar + sol menü',()=>{assert.match(index,/class="topbar"/);assert.match(index,/class="sidebar"/);});
test('referans arayüz: merkez + sağ sonuç sütunu',()=>{assert.match(index,/class="dashboard-shell"/);assert.match(index,/class="dashboard-side"/);});
test('başvuru ekranında belge ve kriter alanı aynı sayfada',()=>{assert.match(index,/>Belgeler</);assert.match(index,/Kriter Değerlendirme Sonuçları/);});
test('nihai kabul-ret ifadesi yok',()=>{assert.doesNotMatch(index,/BAŞVURU KABUL EDİLEBİLİR/i);assert.doesNotMatch(index,/BAŞVURU REDDEDİLMELİ/i);});
test('web-only: servis worker yok',()=>assert.doesNotMatch(appSource,/serviceWorker\.register/));
test('uygulama birleşik kaynak sözdizimi geçerli',()=>assert.ok(appSource.length>10000));
test('responsive stil mevcut',()=>assert.match(styles,/@media\(max-width:860px\)/));
test('tek dosyalı BASLAT üretildi',()=>{assert.match(standalone,/<style>/);assert.match(standalone,/<script type="module">/);assert.doesNotMatch(standalone,/src="app\.js"/);assert.doesNotMatch(standalone,/href="styles\.css"/);});
test('BASLAT içinde yeni dashboard var',()=>{assert.match(standalone,/Web 3\.6/);assert.match(standalone,/dashboard-shell/);assert.match(standalone,/Dikkat Gerektiren Hususlar/);});

test('veli onam dosyası tanınır',()=>assert.equal(inferDocumentCategory('veli_onam.pdf','').category,'PARENTAL_CONSENT'));
test('Facebook/WhatsApp reklam taramasında yakalanır',()=>{
  const r=detectAdvertisingRisk({title:'Eğitim araştırması'},[doc('anket.pdf','DATA_COLLECTION_TOOL','Facebook ve WhatsApp kullanım sıklığınız nedir?')]);
  assert.equal(r.hasNamedEntity,true);
});
test('çocuk katılımcı belgeden çıkarılır',()=>{
  const r=inferMinorParticipation({},[doc('veli_onam.pdf','PARENTAL_CONSENT','Veli Onam Formu, ilkokul 4. sınıf öğrencileri')]);
  assert.equal(r.applicable,true);
});
test('CK-01..CK-20 tam',()=>{
  const r=childDataProtectionChecks({hasMinors:true},[doc('anket.pdf','DATA_COLLECTION_TOOL','Babanızın telefon numarasını yazınız.')]);
  assert.equal(r.length,20); assert.equal(r[0].official,false); assert.ok(r.some(x=>x.status===Status.HIGH_RISK));
});
test('O-01..O-30 tam',()=>{
  const app={title:'Eğitim araştırması',researcher:'A',applicationType:'Akademisyen / Öğrenci',researchType:'Araştırma',purpose:'Öğrenci öğrenmesini incelemek',provinceCount:1};
  const checks=evaluateInternal(app,[]); const r=operationalCriteria(app,[],checks); assert.equal(r.length,30); assert.equal(r[0].official,false);
});
test('sunum kriterleri 5 kart',()=>assert.equal(presentationCriteriaChecks({},[]).length,5));
test('resmî rapor HTML üretir',()=>{
  const app={title:'Eğitim araştırması',researcher:'A',purpose:'Öğrencilerin öğrenme sürecini incelemek',provinceCount:1};
  const checks=evaluateInternal(app,[]); const criteria=operationalCriteria(app,[],checks);
  const html=buildReportHtml(app,[],checks,criteria,{level:'DÜŞÜK',score:0,reasons:[]},{},presentationCriteriaChecks(app,[]));
  assert.match(html,/Ön İnceleme ve Değerlendirme Raporu/i);
});

console.log(`CI_WEB_TESTS: ${pass.length} PASS`);

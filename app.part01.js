import {DISCLAIMER, Status, evaluateInternal, presentationCriteriaChecks, operationalCriteria, extractContentSignals, childDataProtectionChecks, riskAssessment, buildReport, buildReportHtml, inferDocumentCategory, inferMinorParticipation} from './core-loader.js';

const categories = [
  ["APPLICATION_INFO","Başvuru Bilgileri"],
  ["RESEARCH_PROJECT_INFO","Araştırma/Proje Bilgileri"],
  ["THESIS","Tez Önerisi / Tez Belgeleri"],
  ["INSTITUTE_BOARD_DECISION","Enstitü Yönetim Kurulu Kararı / Resmî Yazı"],
  ["STUDENT_DOCUMENT","Öğrenci Belgesi"],
  ["ETHICS","Etik Kurul Belgeleri"],
  ["UNDERTAKING","Taahhütname"],
  ["INFORMED_CONSENT","Gönüllü Katılım Formu"],
  ["PARENTAL_CONSENT","Veli Onam Formu"],
  ["DATA_COLLECTION_TOOL","Veri Toplama Araçları"],
  ["TOOL_PERMISSION","Veri Toplama Aracı Kullanım İzni"],
  ["FOREIGN_ORIGINAL","Yabancı Dilde Belgenin Aslı"],
  ["TRANSLATION","Türkçe Tercüme"],
  ["TRANSLATION_ACCURACY_DECLARATION","Tercüme Doğruluk Beyanı"],
  ["INSTITUTION_PERMISSION","Kurum İzinleri"],
  ["OTHER","Diğer"]
];
const categoryLabel = code => categories.find(([value])=>value===code)?.[1] || code;
const docs = [];
let latest = {checks:[], presentation:[], childProtection:[], criteria:[], risk:{level:"DÜŞÜK",score:0,reasons:[]}};
let deferredInstall = null;
const $ = id => document.getElementById(id);

function makeId(){
  if(globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  if(globalThis.crypto?.getRandomValues){
    const b=new Uint8Array(16); globalThis.crypto.getRandomValues(b);
    b[6]=(b[6]&15)|64; b[8]=(b[8]&63)|128;
    const h=[...b].map(x=>x.toString(16).padStart(2,'0')).join('');
    return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
  }
  return `meb-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function init(){
  $('docCategory').add(new Option('Otomatik belge türü tanıma','AUTO'));
  categories.forEach(([value,label])=>$('docCategory').add(new Option(label,value)));
  document.querySelectorAll('.tabs button').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));
  document.querySelectorAll('[data-go-tab]').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.goTab)));
  $('fileInput').addEventListener('change', e=>handleFiles([...e.target.files]));
  $('runAnalysis').addEventListener('click', runAnalysis);
  $('runFromApplication').addEventListener('click',()=>{runAnalysis();showTab('analysis')});
  $('saveDraft').addEventListener('click', saveDraft);
  $('refreshReport').addEventListener('click', refreshReport);
  $('downloadReport').addEventListener('click', downloadReport);
  $('copyReport').addEventListener('click', copyReport);
  $('archiveCurrent').addEventListener('click', archiveCurrent);
  $('clearArchive').addEventListener('click', clearArchive);
  window.addEventListener('online', updateOnline);
  window.addEventListener('offline', updateOnline);
  updateOnline();
  loadDraft();
  renderDocuments();
  runAnalysis();
  renderArchive();
}
function showTab(id){document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===id));document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));}
function formValue(id){return $(id)?.value?.trim()||''}
function currentApp(){return {title:formValue('title'),researcher:formValue('researcher'),applicationType:formValue('applicationType'),researchType:formValue('researchType'),purpose:formValue('purpose'),provinceCount:Number($('provinceCount').value||0),provinces:formValue('provinces'),institutions:formValue('institutions'),sampleGroup:formValue('sampleGroup'),researchDesign:formValue('researchDesign'),dataCollectionMethod:formValue('dataCollectionMethod'),dataAnalysisMethod:formValue('dataAnalysisMethod'),duration:formValue('duration'),scientificProvinceRationale:formValue('scientificProvinceRationale'),sampleSize:formValue('sampleSize'),scopeExplanation:formValue('scopeExplanation'),previousApplicationNumber:formValue('previousApplicationNumber'),hasMinors:$('hasMinors').checked,hasAudioRecording:$('hasAudioRecording').checked,hasVideoRecording:$('hasVideoRecording').checked,hasForeignLanguageDocument:$('hasForeignLanguageDocument').checked,usesPreviouslyDevelopedTool:$('usesPreviouslyDevelopedTool').checked,institutionsKnown:$('institutionsKnown').checked,isStudentResearcher:$('isStudentResearcher').checked,isTubitakProject:$('isTubitakProject').checked,hasPendingDuplicateApplication:$('hasPendingDuplicateApplication').checked};}

async function handleFiles(files){
  if(!files?.length) return;
  const selectedCategory=$('docCategory').value;
  for(const file of files){
    let doc=null;
    const nameInference=inferDocumentCategory(file.name,'');
    const autoMode=selectedCategory==='AUTO';
    const initialCategory=autoMode?(nameInference.confidence==='YÜKSEK'?nameInference.category:'OTHER'):selectedCategory;
    try{
      doc={id:makeId(),name:file.name,category:initialCategory,categoryAuto:autoMode,categoryReason:autoMode?nameInference.reason:'Kullanıcı tarafından seçildi',mimeType:file.type||'',size:file.size||0,extractionStatus:'PROCESSING',text:'',error:''};
    }catch(idError){
      doc={id:`meb-${Date.now()}-${Math.random().toString(16).slice(2)}`,name:file.name,category:initialCategory,categoryAuto:autoMode,categoryReason:autoMode?nameInference.reason:'Kullanıcı tarafından seçildi',mimeType:file.type||'',size:file.size||0,extractionStatus:'PROCESSING',text:'',error:''};
    }
    docs.push(doc);
    renderDocuments();
    runAnalysis();
    try{
      doc.text=await extractText(file);
      doc.extractionStatus=doc.text.trim()?'SUCCESS':'FAILED';
      if(!doc.text.trim()) doc.error='Belgeden metin çıkarılamadı.';
      if(autoMode && doc.text.trim()){
        const contentInference=inferDocumentCategory(file.name,doc.text);
        if(contentInference.confidence==='YÜKSEK'){
          doc.category=contentInference.category;
          doc.categoryReason=contentInference.reason;
        }else if(nameInference.confidence==='YÜKSEK'){
          doc.category=nameInference.category;
          doc.categoryReason=nameInference.reason;
        }else{
          doc.category='OTHER';
          doc.categoryReason='Belge türü otomatik olarak kesinleştirilemedi; kategori uzman tarafından seçilmelidir.';
        }
      }
    }catch(e){
      doc.extractionStatus=e?.unsupported?'UNSUPPORTED':'FAILED';
      doc.error=e?.message||'Belge işlenemedi.';
    }
    renderDocuments();
    runAnalysis();
  }
  $('fileInput').value='';
}

const PDFJS_URL='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs';
const PDFJS_WORKER_URL='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
let pdfJsModulePromise=null;

async function loadPdfJs(){
  if(!navigator.onLine){
    const e=new Error('PDF metin motoru ilk kullanımda internet bağlantısı gerektiriyor. İnternete bağlanıp belgeyi yeniden seçin.');
    e.unsupported=true; throw e;
  }
  if(!pdfJsModulePromise){
    pdfJsModulePromise=import(PDFJS_URL).then(pdfjs=>{pdfjs.GlobalWorkerOptions.workerSrc=PDFJS_WORKER_URL;return pdfjs;});
  }
  try{return await pdfJsModulePromise}catch(err){
    pdfJsModulePromise=null;
    const e=new Error('PDF okuma motoru yüklenemedi. İnternet bağlantısını kontrol edip yeniden deneyin.');
    e.cause=err; throw e;
  }
}

async function extractText(file){
  const ext=file.name.split('.').pop().toLowerCase();
  if(['txt','md','csv'].includes(ext))return await file.text();
  if(ext==='docx')return await extractDocx(await file.arrayBuffer());
  if(['jpg','jpeg','png'].includes(ext))return await extractImage(file);
  if(ext==='pdf')return await extractPdf(file);
  const e=new Error('Desteklenmeyen belge formatı.');e.unsupported=true;throw e;
}

async function extractPdf(file){
  const pdfjs=await loadPdfJs();
  const bytes=new Uint8Array(await file.arrayBuffer());
  const task=pdfjs.getDocument({data:bytes});
  task.onPassword=(updatePassword)=>{
    const password=window.prompt('Bu PDF parola korumalı. PDF parolasını girin:');
    if(password!==null)updatePassword(password);
  };
  let pdf;
  try{pdf=await task.promise}catch(err){
    if(err?.name==='PasswordExcep
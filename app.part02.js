tion')throw new Error('PDF parolası girilmedi veya yanlış.');
    throw new Error('PDF açılamadı veya dosya bozuk/uyumsuz.');
  }
  const pageTexts=[];
  let visibleChars=0;
  for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){
    const page=await pdf.getPage(pageNo);
    const tc=await page.getTextContent({normalizeWhitespace:true});
    const text=tc.items.map(it=>it.str||'').join(' ').replace(/\s+/g,' ').trim();
    if(text){pageTexts.push(`[Sayfa ${pageNo}]\n${text}`);visibleChars+=text.length;}
  }
  if(visibleChars>=20)return pageTexts.join('\n\n');

  // Taranmış PDF: metin katmanı yoksa tarayıcının yerleşik OCR özelliğini dene.
  if(!('TextDetector' in window)){
    const e=new Error('PDF açıldı ancak metin katmanı bulunamadı. Bu tarayıcı yerleşik OCR (TextDetector) desteklemediği için taranmış PDF otomatik okunamadı.');
    e.unsupported=true; throw e;
  }
  const detector=new TextDetector();
  const ocrPages=[];
  for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){
    const page=await pdf.getPage(pageNo);
    const viewport=page.getViewport({scale:2});
    const canvas=document.createElement('canvas');
    canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
    const ctx=canvas.getContext('2d',{alpha:false});
    await page.render({canvasContext:ctx,viewport}).promise;
    const bitmap=await createImageBitmap(canvas);
    const blocks=await detector.detect(bitmap);
    if(bitmap.close)bitmap.close();
    const text=blocks.map(b=>b.rawValue||'').join('\n').trim();
    if(text)ocrPages.push(`[Sayfa ${pageNo} OCR]\n${text}`);
  }
  const ocrText=ocrPages.join('\n\n').trim();
  if(!ocrText)throw new Error('PDF sayfalarından OCR ile güvenilir metin çıkarılamadı.');
  return ocrText;
}

async function extractImage(file){if(!('TextDetector' in window)){const e=new Error('Bu tarayıcı TextDetector OCR özelliğini desteklemiyor; OCR yapılmadı.');e.unsupported=true;throw e;}const bitmap=await createImageBitmap(file);const detector=new TextDetector();const blocks=await detector.detect(bitmap);if(bitmap.close)bitmap.close();return blocks.map(b=>b.rawValue||'').join('\n');}

async function extractDocx(buffer){const view=new DataView(buffer);const entries=[];let eocd=-1;for(let i=view.byteLength-22;i>=Math.max(0,view.byteLength-65557);i--){if(view.getUint32(i,true)===0x06054b50){eocd=i;break;}}if(eocd<0)throw new Error('DOCX/ZIP son kayıt yapısı bulunamadı.');const total=view.getUint16(eocd+10,true);let pos=view.getUint32(eocd+16,true);for(let i=0;i<total;i++){if(view.getUint32(pos,true)!==0x02014b50)break;const method=view.getUint16(pos+10,true),compSize=view.getUint32(pos+20,true),nameLen=view.getUint16(pos+28,true),extraLen=view.getUint16(pos+30,true),commentLen=view.getUint16(pos+32,true),localOffset=view.getUint32(pos+42,true);const name=new TextDecoder().decode(new Uint8Array(buffer,pos+46,nameLen));entries.push({name,method,compSize,localOffset});pos+=46+nameLen+extraLen+commentLen;}const target=entries.find(x=>x.name==='word/document.xml');if(!target)throw new Error('DOCX içinde word/document.xml bulunamadı.');const lp=target.localOffset;if(view.getUint32(lp,true)!==0x04034b50)throw new Error('DOCX yerel ZIP kaydı bozuk.');const nameLen=view.getUint16(lp+26,true),extraLen=view.getUint16(lp+28,true),start=lp+30+nameLen+extraLen;const compressed=new Uint8Array(buffer,start,target.compSize);let bytes;if(target.method===0)bytes=compressed;else if(target.method===8){const ds=new DecompressionStream('deflate-raw');bytes=new Uint8Array(await new Response(new Blob([compressed]).stream().pipeThrough(ds)).arrayBuffer());}else throw new Error('DOCX sıkıştırma yöntemi desteklenmiyor.');const xml=new TextDecoder().decode(bytes);return xml.replace(/<\/w:p>/g,'\n').replace(/<w:tab[^>]*\/>/g,'\t').replace(/<[^>]+>/g,'').replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&apos;',"'");}

function renderDocuments(){
  const cards=docs.length?docs.map((d,i)=>`<article class="document-card">
    <div class="file-icon">${escapeHtml((d.name.split('.').pop()||'DOC').slice(0,4).toUpperCase())}</div>
    <div><h4>${escapeHtml(d.name)}</h4><div class="muted">${formatBytes(d.size||0)}</div></div>
    <button class="doc-remove" data-remove="${i}" aria-label="${escapeHtml(d.name)} belgesini sil">×</button>
    <div class="doc-card-controls"><select class="doc-category-select" data-doc-category="${i}" aria-label="${escapeHtml(d.name)} belge kategorisi">${categories.map(([value,label])=>`<option value="${value}"${d.category===value?' selected':''}>${escapeHtml(label)}</option>`).join('')}</select>${d.categoryAuto?`<div class="muted auto-category-note">${escapeHtml(d.categoryReason||'Otomatik sınıflandırma')}</div>`:''}</div>
    <div class="doc-status"><span class="status" data-status="${displayDocStatus(d)}">${displayDocStatus(d)}</span><span>${escapeHtml(d.error|| (d.text?'Metin çıkarıldı':'İşlem bekliyor'))}</span></div>
  </article>`).join(''):`<div class="notice compact"><strong>Henüz belge yüklenmedi.</strong> “Dosya Yükle” düğmesiyle başvuru belgelerini ekleyin.</div>`;
  if($('docCards')) $('docCards').innerHTML=cards;
  if($('docRows')) $('docRows').innerHTML='';
  document.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>{docs.splice(Number(b.dataset.remove),1);renderDocuments();runAnalysis();}));
  document.querySelectorAll('[data-doc-category]').forEach(sel=>sel.addEventListener('change',()=>{
    const d=docs[Number(sel.dataset.docCategory)]; if(!d)return;
    d.category=sel.value; d.categoryAuto=false; d.categoryReason='Kullanıcı tarafından düzeltildi';
    renderDocuments(); runAnalysis();
  }));
}
function displayDocStatus(d){return d.extractionStatus==='SUCCESS'?'METİN ÇIKARILDI':d.extractionStatus==='PROCESSING'?'İŞLENİYOR':d.extractionStatus==='NOT_PROCESSED'?'KONTROL':'OKUNAMADI'}
function formatBytes(bytes){if(!bytes)return ''; if(bytes<1024)return `${bytes} B`; if(bytes<1024*1024)return `${(bytes/1024).toFixed(1)} KB`; return `${(bytes/1024/1024).toFixed(1)} MB`;}
function runAnalysis(){
  const app=currentApp();
  const checks=evaluateInternal(app,docs);
  const presentation=presentationCriteriaChecks(app,docs);
  const childProtection=childDataProtectionChecks(app,docs);
  const criteria=operationalCriteria(app,docs,checks);
  const signals=extractContentSignals(app,docs);
  const risk=riskAssessment(checks,childProtection);
  latest={checks,presentation,childProtection,criteria,risk,signals};
  renderContentSignals(signals);
  renderCards('presentationResults',presentation);
  renderCards('analysisResults',checks);
  renderChildProtection(childProtection);
  renderCriteria(criteria);
  renderOverview(checks,presentation,childProtection,criteria,risk);
  refreshReport();
  return latest;
}
function renderContentSignals(s){const rows=[['Okunabilir belge',String(s.readableDocumentCount)],['Amaç',s.purpose],['Problem',s.problem],['Araştırma sorusu / hipotez',s.questions],['Model / desen',s.design],['Örneklem / çalışma grubu',s.sample],['Örneklem büyüklüğü',s.sampleSize],['Belgede tespit edilen il sayısı',s.provinceCount==null?'':String(s.provinceCount)],['Veri toplama',s.dataCollection],['Veri analiz yöntemi',s.analysis],['Uygulama süresi',s.duration]]; $('contentSignals').innerHTML=rows.map(([k,v])=>`<div class="signal-row"><strong>${escapeHtml(k)}</strong><span>${escapeHtml(v||'Tespit edilemedi')}</span></div>`).join('');}
function renderCards(id,items){
  if(id==='analysisResults'){
    $(id).innerHTML=`<div class="dashboard-table-wrap"><table class="dashboard-table"><thead><tr><th>No</th><th>Kriter / kontrol</th><th>Durum</th><th>Açıklama</th></tr></thead><tbody>${items.map((x,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(x.title)}</td><td><span class="status" data-status="${escapeHtml(x.status)}">${escapeHtml(x.status===Status.UNVERIFIED?'DOĞRULANMADI':x.status)}</span></td><td>${escapeHtml(x.finding)}${x.evidence?`<div class="table-evidence">${escapeHtml(x.evidence)}</div>`:''}</td></tr>`).join('')}</tbody></table></div>`;
    return;
  }
  $(id).innerHTML=items.map(x=>`<article class="card"><div class="status" data-status="${x.status}">${x.status===Status.UNVERIFIED?'DOĞRULANMADI':x.status}</div><h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.finding)}</p>${x.evidence?`<p class="evidence"><strong>Kanıt:</strong> ${escapeHtml(x.evidence)}</p>`:''}</article>`).join('')
}

function tableStatusLabel(status){return status===Status.UNVERIFIED?'DOĞRULANMADI':status}
function renderChildProtection(items){
  const counts={};for(const x of items)counts[x.status]=(counts[x.status]||0)+1;
  const alertCount=items.filter(x=>[Status.HIGH_RISK,Status.CRITICAL,Status.SENSITIVE_REVIEW,Status.CONFLICT_HIGH,Status.CONFLICT,Status.MANUAL].includes(x.status)).length;
  const minorContext=inferMinorPartici
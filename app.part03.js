pation(currentApp(),docs);
  const contextNote=minorContext.inferred?' Çocuk katılımcı durumu belge içeriğinden çıkarılmıştır; Başvuru bölümündeki alan uzman tarafından doğrulanmalıdır.':'';
  $('childProtectionSummary').innerHTML=`<strong>20 çocuk koruma ön kontrolü çalıştırıldı.</strong> Yüksek/uzman inceleme sinyali: ${alertCount} • UYGULANMAZ: ${counts[Status.NA]||0}.${escapeHtml(contextNote)} <strong>CK-01…CK-20 resmî EK-1 kriter numarası değildir.</strong>`;
  $('childProtectionResults').innerHTML=`<table class="criteria-table"><thead><tr><th>No</th><th>Kontrol</th><th>Durum</th><th>Bulgu</th></tr></thead><tbody>${items.map(x=>`<tr><td class="criteria-no">CK-${String(x.number).padStart(2,'0')}</td><td class="criteria-name">${escapeHtml(x.title)}${x.relatedCriteria?`<span class="criteria-source-row">Bağlantılı MEB kriterleri: ${escapeHtml(x.relatedCriteria)}</span>`:''}</td><td class="criteria-status"><span class="status" data-status="${escapeHtml(x.status)}">${escapeHtml(tableStatusLabel(x.status))}</span></td><td class="criteria-finding">${escapeHtml(x.finding)}${x.evidence?`<span class="criteria-evidence-row"><strong>Kanıt:</strong> ${escapeHtml(x.evidence)}</span>`:''}<span class="criteria-source-row">${escapeHtml(x.source||'')}</span></td></tr>`).join('')}</tbody></table>`;
}
function renderCriteria(items){
  const counts={};for(const x of items)counts[x.status]=(counts[x.status]||0)+1;
  $('criteriaSummary').innerHTML=`<strong>30 operasyonel ön kontrol çalıştırıldı.</strong> GEÇTİ: ${counts[Status.PASSED]||0} • EKSİK: ${counts[Status.MISSING]||0} • ÇELİŞKİ: ${counts[Status.CONFLICT]||0} • KONTROL/MANUEL: ${(counts[Status.REVIEW]||0)+(counts[Status.MANUAL]||0)} • UYGULANMAZ: ${counts[Status.NA]||0}. <strong>O-01…O-30 numaraları resmî EK-1 madde numarası değildir.</strong>`;
  $('criteriaResults').innerHTML=`<table class="criteria-table"><thead><tr><th>No</th><th>Operasyonel kontrol</th><th>Durum</th><th>Bulgu ve açıklama</th></tr></thead><tbody>${items.map(x=>`<tr><td class="criteria-no">O-${String(x.number).padStart(2,'0')}</td><td class="criteria-name">${escapeHtml(x.title)}</td><td class="criteria-status"><span class="status" data-status="${escapeHtml(x.status)}">${escapeHtml(tableStatusLabel(x.status))}</span></td><td class="criteria-finding">${escapeHtml(x.finding)}${x.evidence?`<span class="criteria-evidence-row"><strong>Kanıt:</strong> ${escapeHtml(x.evidence)}</span>`:''}<span class="criteria-source-row">${escapeHtml(x.source||'')}</span></td></tr>`).join('')}</tbody></table>`;
}
function renderOverview(checks,presentation,childProtection,criteria,risk){
  const alertStatuses=new Set([Status.MISSING,Status.CONFLICT,Status.UNREADABLE,Status.HIGH_RISK,Status.CRITICAL,Status.SENSITIVE_REVIEW,Status.CONFLICT_HIGH]);
  const reviewStatuses=new Set([Status.REVIEW,Status.MANUAL,Status.UNVERIFIED]);
  const all=[...presentation,...checks,...childProtection,...criteria];
  const alerts=all.filter(x=>alertStatuses.has(x.status));
  const reviews=all.filter(x=>reviewStatuses.has(x.status));
  const positives=all.filter(x=>x.status===Status.PASSED);
  const card=$('overallResultCard');
  const title=$('overallResultTitle');
  const text=$('overallResultText');
  if(card&&title&&text){
    card.classList.remove('summary-good','summary-warn','summary-danger','summary-neutral');
    if(alerts.length){
      card.classList.add('summary-danger');title.textContent='Dikkat gerektiren bulgular var';
      text.textContent=`${alerts.length} eksik/çelişki/yüksek risk bulgusu ve ${reviews.length} uzman kontrolü bulundu. Nihai karar uzman tarafından verilmelidir.`;
      card.querySelector('.summary-icon').textContent='!';
    }else if(reviews.length){
      card.classList.add('summary-warn');title.textContent='Uzman incelemesi gerekiyor';
      text.textContent=`Belirgin kritik bulgu yok; ${reviews.length} konu uzman değerlendirmesi bekliyor. Nihai uygunluk kararı verilmedi.`;
      card.querySelector('.summary-icon').textContent='i';
    }else{
      card.classList.add('summary-good');title.textContent='Ön kontrollerde açık sorun bulunmadı';
      text.textContent='Otomatik ön kontrollerde açık eksik/çelişki tespit edilmedi. Bu sonuç nihai idari uygunluk kararı değildir.';
      card.querySelector('.summary-icon').textContent='✓';
    }
  }
  if($('attentionList')) $('attentionList').innerHTML=(alerts.length||reviews.length)?[...alerts,...reviews].slice(0,7).map(x=>`<div class="side-item alert"><span class="side-dot">!</span><span><strong>${escapeHtml(x.title||x.code||'Kontrol')}</strong><br>${escapeHtml(x.finding||x.status)}</span></div>`).join(''):'<div class="side-item ok"><span class="side-dot">✓</span><span>Açık eksik, çelişki veya uzman inceleme sinyali bulunmadı.</span></div>';
  if($('positiveList')) $('positiveList').innerHTML=positives.length?positives.slice(0,6).map(x=>`<div class="side-item ok"><span class="side-dot">✓</span><span>${escapeHtml(x.title||x.finding||'Kontrol geçti')}</span></div>`).join(''):'<p class="empty-state">Henüz GEÇTİ sonucu oluşmadı.</p>';
}

function refreshReport(){
  const app=currentApp();
  const checks=evaluateInternal(app,docs);
  const presentation=presentationCriteriaChecks(app,docs);
  const childProtection=childDataProtectionChecks(app,docs);
  const criteria=operationalCriteria(app,docs,checks);
  const signals=extractContentSignals(app,docs);
  const risk=riskAssessment(checks,childProtection);
  latest={checks,presentation,childProtection,criteria,risk,signals};
  const text=buildReport(app,docs,checks,criteria,risk,signals,presentation);
  $('reportText').value=text;
  $('reportPreview').innerHTML=buildReportHtml(app,docs,checks,criteria,risk,signals,presentation);
}
function downloadReport(){refreshReport();const blob=new Blob([$('reportText').value],{type:'text/plain;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='MEB_Arastirma_On_Inceleme_ve_Degerlendirme_Raporu.txt';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
async function copyReport(){refreshReport();try{await navigator.clipboard.writeText($('reportText').value);const b=$('copyReport');const old=b.textContent;b.textContent='Kopyalandı';setTimeout(()=>b.textContent=old,1400);}catch(e){$('reportText').hidden=false;$('reportText').select();document.execCommand?.('copy');}}

function saveDraft(){try{localStorage.setItem('meb-v3-draft',JSON.stringify(currentApp()));alert('Taslak bu tarayıcıda kaydedildi.');}catch(e){alert('Taslak kaydedilemedi. Tarayıcı yerel depolamaya izin vermiyor.');}}
function loadDraft(){try{const x=JSON.parse(localStorage.getItem('meb-v3-draft')||'null');if(!x)return;for(const [k,v] of Object.entries(x)){const el=$(k);if(!el)continue;if(el.type==='checkbox')el.checked=!!v;else el.value=v??'';}}catch{}}
function archiveCurrent(){
  refreshReport();
  const list=readArchive();
  list.unshift({id:makeId(),savedAt:new Date().toISOString(),app:currentApp(),risk:latest.risk,documents:docs.map(d=>({name:d.name,category:d.category,extractionStatus:d.extractionStatus}))});
  try{localStorage.setItem('meb-v3-archive',JSON.stringify(list.slice(0,100)));renderArchive();}
  catch(e){alert('Arşiv kaydedilemedi. Tarayıcı yerel depolamaya izin vermiyor.');}
}
function readArchive(){try{return JSON.parse(localStorage.getItem('meb-v3-archive')||'[]')}catch{return []}}
function renderArchive(){const list=readArchive();$('archiveList').innerHTML=list.length?list.map(x=>`<article class="card"><h3>${escapeHtml(x.app.title||'Adsız başvuru')}</h3><p>${escapeHtml(x.app.researcher||'-')} • ${new Date(x.savedAt).toLocaleString('tr-TR')}</p><span class="status">Risk: ${escapeHtml(x.risk?.level||'-')} ${x.risk?.score??0}/100</span></article>`).join(''):'<div class="notice">Arşiv kaydı yok.</div>'}
function clearArchive(){if(confirm('Yerel web arşivi silinsin mi?')){try{localStorage.removeItem('meb-v3-archive');renderArchive()}catch(e){alert('Arşiv silinemedi. Tarayıcı yerel depolamaya izin vermiyor.');}}}
function updateOnline(){$('offlineState').textContent=navigator.onLine?'Çevrimiçi':'Çevrimdışı'}
function escapeHtml(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
init();

// Web 3.6.2 — arayüz uyum katmanı ve güvenli başlangıç değerleri; değerlendirme motoru core içinde çalışır.
(function(){
  const q=(s,r=document)=>r.querySelector(s);
  const brand=q('.brand');
  if(brand){
    const strong=q('strong',brand), small=q('small',brand);
    if(strong) strong.textContent='Millî Eğitim Bakanlığı';
    if(small) small.textContent='Araştırma Uygulama İzinleri Başvuru ve Değerlendirme Sistemi';
  }
  document.title='Araştırma Uygulama İzinleri Başvuru ve Değerlendirme Sistemi';
  const version=q('.version-badge'); if(version) version.textContent='Web 3.6.2';

  // Eski HTML'deki 1 değeri gerçek kullanıcı girdisi değildir. Açılışta kaldırılır;
  // kullanıcı sonradan 1 yazarsa normal biçimde gerçek başvuru verisi olarak kullanılır.
  const provinceCount=document.getElementById('provinceCount');
  if(provinceCount && provinceCount.value==='1'){
    provinceCount.value='';
    provinceCount.placeholder='Belgeden de tespit edilebilir';
  }

  const topActions=q('.topbar-actions');
  if(topActions && !q('.ui361-notify',topActions)){
    const n=document.createElement('div'); n.className='ui361-notify'; n.setAttribute('aria-label','Bildirimler'); n.innerHTML='<span>♧</span><b>3</b>'; topActions.prepend(n);
    const chip=q('.user-chip',topActions); if(chip && !q('.ui361-chevron',chip)){const c=document.createElement('span');c.className='ui361-chevron';c.textContent='⌄';chip.appendChild(c);}
  }
  const basicCard=q('#application .content-card');
  if(basicCard && !q('.ui361-review-card')){
    const review=document.createElement('div'); review.className='ui361-review-card';
    review.innerHTML='<div class="ui361-review-head"><h3>Başvuru Bilgileri</h3><button type="button" class="ui361-edit">Bilgileri Düzenle</button></div><div class="ui361-kv"></div>';
    basicCard.parentNode.insertBefore(review,basicCard);
    q('.ui361-edit',review).addEventListener('click',()=>{review.classList.remove('show');basicCard.classList.remove('ui361-form-collapsed');});
    const fill=()=>{
      const val=id=>document.getElementById(id)?.value?.trim()||'—';
      const rows=[['Araştırmacı Adı',val('researcher')],['Araştırma Başlığı',val('title')],['Başvuru Türü',val('researchType')||val('applicationType')],['Uygulama Yapılacak İller',val('provinces')],['Uygulama Yapılacak Birim',val('institutions')],['Örneklem / Çalışma Grubu',val('sampleGroup')]];
      q('.ui361-kv',review).innerHTML=rows.map(([k,v])=>`<div><b>${k}</b><span>: ${String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}</span></div>`).join('');
      review.classList.add('show'); basicCard.classList.add('ui361-form-collapsed');
    };
    const run=document.getElementById('runFromApplication'); if(run) run.addEventListener('click',()=>setTimeout(fill,0));
  }
})();

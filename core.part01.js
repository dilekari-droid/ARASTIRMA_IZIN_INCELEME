export const DISCLAIMER = "Bu rapor ön inceleme ve karar destek amacıyla oluşturulmuştur. Nihai değerlendirme ve izin/ret kararı yetkili birim/uzman tarafından verilmelidir.";
export const PRESENTATION_SOURCE = "Araştırma Uygulama İzinleri Başvuru Değerlendirme Süreci, İzleme ve Değerlendirme Daire Başkanlığı, 29.09.2026";

export const Status = Object.freeze({
  PASSED: "GEÇTİ",
  MISSING: "EKSİK",
  CONFLICT: "ÇELİŞKİ",
  REVIEW: "KONTROL",
  NA: "UYGULANMAZ",
  MANUAL: "MANUEL İNCELEME",
  UNVERIFIED: "KAYNAK DOĞRULAMASI GEREKİYOR",
  UNREADABLE: "OKUNAMADI",
  HIGH_RISK: "YÜKSEK RİSK – UZMAN KONTROLÜ",
  CRITICAL: "KRİTİK UYARI",
  SENSITIVE_REVIEW: "HASSAS VERİ/ÇOCUK KORUMA – UZMAN İNCELEMESİ",
  CONFLICT_HIGH: "ÇELİŞKİ – YÜKSEK RİSK"
});

function result(code, title, status, finding, evidence = "", source = "") { return { code, title, status, finding, evidence, source }; }
const clean = v => String(v ?? "").replace(/\s+/g, " ").trim();
const lower = v => clean(v).toLocaleLowerCase("tr-TR");
function unique(xs){ return [...new Set(xs.filter(Boolean))]; }

const TURKEY_PROVINCES = ["adana","adıyaman","afyonkarahisar","ağrı","amasya","ankara","antalya","artvin","aydın","balıkesir","bilecik","bingöl","bitlis","bolu","burdur","bursa","çanakkale","çankırı","çorum","denizli","diyarbakır","edirne","elazığ","erzincan","erzurum","eskişehir","gaziantep","giresun","gümüşhane","hakkâri","hatay","ısparta","mersin","istanbul","izmir","kars","kastamonu","kayseri","kırklareli","kırşehir","kocaeli","konya","kütahya","malatya","manisa","kahramanmaraş","mardin","muğla","muş","nevşehir","niğde","ordu","rize","sakarya","samsun","siirt","sinop","sivas","tekirdağ","tokat","trabzon","tunceli","şanlıurfa","uşak","van","yozgat","zonguldak","aksaray","bayburt","karaman","kırıkkale","batman","şırnak","bartın","ardahan","ığdır","yalova","karabük","kilis","osmaniye","düzce"];

export function inferDocumentCategory(name="", text="") {
  const n=lower(name.replace(/[_-]+/g," "));
  const head=lower(String(text||"").slice(0,3500));
  const both=`${n}\n${head}`;
  const rules=[
    ["PARENTAL_CONSENT",/(?:veli\s*onam|ebeveyn\s*onam)/iu,"Veli onamı ifadesi"],
    ["INFORMED_CONSENT",/(?:ayrıntılı\s+bilgilendirme[^\n]{0,80}gönüllü\s+katılım|gönüllü\s+katılım\s+formu|gonullu(?:\s+katilim)?)/iu,"Gönüllü katılım formu ifadesi"],
    ["UNDERTAKING",/(?:araştırma\s+uygulama\s+izni[^\n]{0,80}taahhüt|taahhütname|taahhutname)/iu,"Taahhütname ifadesi"],
    ["INSTITUTE_BOARD_DECISION",/(?:enstitü\s+yönetim\s+kurulu\s+(?:kararı|karari)|enstitü[^\n]{0,80}(?:karar|resmî\s+yazı))/iu,"Enstitü yönetim kurulu/karar ifadesi"],
    ["STUDENT_DOCUMENT",/(?:öğrenci\s+belgesi|ogrenci\s+belgesi)/iu,"Öğrenci belgesi ifadesi"],
    ["ETHICS",/(?:etik\s+kurul\s+(?:onay|karar|belge)|etik\s+kurul\s+onayı)/iu,"Etik kurul ifadesi"],
    ["TOOL_PERMISSION",/(?:veri\s+toplama\s+aracı[^\n]{0,80}kullanım\s+izni|ölçek[^\n]{0,50}kullanım\s+izni)/iu,"Veri toplama aracı kullanım izni ifadesi"],
    ["RESEARCH_PROJECT_INFO",/(?:araştırma[\s/_-]*proje\s+bilgileri|araştırma\s*\/\s*proje\s+bilgileri)/iu,"Araştırma/Proje Bilgileri ifadesi"],
    ["THESIS",/(?:tez\s+konusu\s+[öo]neri\s+formu|tez\s+[öo]neri(?:si)?|tez\s+onay|tezli\s+(?:yüksek\s+lisans|doktora))/iu,"Tez/tez önerisi ifadesi"],
    ["DATA_COLLECTION_TOOL",/(?:g[öo]r[üu][şs]me\s+sorular|g[öo]r[üu][şs]me\s+formu|anket\s+formu|[öo]l[çc]ek\s+formu|g[öo]zlem\s+formu|ba[şs]ar[ıi]\s+testi|veri\s+toplama\s+arac[ıi]|sorgulama\s+formu)/iu,"Veri toplama aracı ifadesi"],
    ["TRANSLATION_ACCURACY_DECLARATION",/(?:tercüme\s+doğruluk\s+beyanı|tercume\s+dogruluk\s+beyani)/iu,"Tercüme doğruluk beyanı ifadesi"],
    ["TRANSLATION",/(?:türkçe\s+tercüme|turkce\s+tercume)/iu,"Türkçe tercüme ifadesi"],
    ["FOREIGN_ORIGINAL",/(?:yabancı\s+dilde\s+belge\s+aslı|yabanci\s+dilde\s+belge\s+asli)/iu,"Yabancı dil belge aslı ifadesi"]
  ];
  for(const [category,rx,reason] of rules){rx.lastIndex=0;if(rx.test(both))return {category,confidence:"YÜKSEK",reason};}
  return {category:"OTHER",confidence:"DÜŞÜK",reason:"Belge türü güçlü bir dosya adı/başlık sinyaliyle belirlenemedi"};
}

export function extractProvinceNames(text=""){
  const lc=lower(text);
  const found=[];
  for(const province of TURKEY_PROVINCES){
    const rx=new RegExp(`(^|[^\\p{L}])${province.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?:['’]?(?:da|de|ta|te|dan|den|tan|ten|ın|in|un|ün|a|e))?(?=$|[^\\p{L}])`,'iu');
    if(rx.test(lc))found.push(province);
  }
  return unique(found);
}

export function provinceRouting(count) {
  if (!Number.isInteger(count) || count < 1 || count > 81) return { status: Status.MISSING, route: "İl sayısı geçersiz", finding: "İl sayısı 1–81 arasında olmalıdır." };
  if (count <= 6) return { status: Status.REVIEW, route: "İlgili il millî eğitim müdürlüğü düzeyi", finding: "1–6 il yönlendirmesi." };
  if (count <= 12) return { status: Status.REVIEW, route: "Bakanlık ilgili merkez birimi/birimleri", finding: "7–12 il yönlendirmesi." };
  return { status: Status.REVIEW, route: "Başkanlık düzeyi kontrol", finding: "13 ve üzeri il için bilimsel gerekçe, örneklem büyüklüğü ve uygulama kapsamı birlikte incelenmelidir." };
}

export function extractProvinceCount(text = "") {
  const matches = [...String(text).matchAll(/(?:^|[^\d])(\d{1,2})\s*il(?:de|deki|de|\b)/giu)];
  for (const m of matches) { const n = Number(m[1]); if (n >= 1 && n <= 81) return n; }
  const names=extractProvinceNames(text);
  return names.length?names.length:null;
}

export function compareProvinceCounts(systemCount, documents = []) {
  const values = [];
  if (systemCount >= 1 && systemCount <= 81) values.push(["Başvuru bilgisi", systemCount]);
  for (const doc of documents) {
    if (!["RESEARCH_PROJECT_INFO", "THESIS", "OTHER", "APPLICATION_INFO"].includes(doc.category)) continue;
    if (doc.extractionStatus && doc.extractionStatus !== "SUCCESS") continue;
    const count = extractProvinceCount(doc.text || "");
    if (count != null) values.push([doc.name || "Belge", count]);
  }
  if (!values.length) return result("SAMPLE_PROVINCE_CONSISTENCY", "Örneklem / uygulama ili tutarlılığı", Status.MISSING, "Karşılaştırılabilir il sayısı bilgisi bulunamadı.");
  if (values.length < 2) return result("SAMPLE_PROVINCE_CONSISTENCY", "Örneklem / uygulama ili tutarlılığı", Status.REVIEW, `Karşılaştırma için en az iki bağımsız kaynak gerekir. Yalnız ${values[0][0]}=${values[0][1]} il bilgisi bulundu.`, `${values[0][0]}: ${values[0][1]} il`);
  const distinct = [...new Set(values.map(v => v[1]))];
  if (distinct.length > 1) return result("SAMPLE_PROVINCE_CONSISTENCY", "Örneklem / uygulama ili tutarlılığı", Status.CONFLICT, "Farklı il sayıları tespit edildi: " + values.map(v => `${v[0]}=${v[1]}`).join("; "), values.map(v => `${v[0]}: ${v[1]} il`).join(" | "));
  return result("SAMPLE_PROVINCE_CONSISTENCY", "Örneklem / uygulama ili tutarlılığı", Status.PASSED, `Karşılaştırılan ${values.length} kaynakta il sayısı uyumlu: ${distinct[0]} il.`, values.map(v => v[0]).join(" + "));
}

function readableDocs(docs = []) { return docs.filter(d => d.extractionStatus === "SUCCESS" && clean(d.text)); }
function corpusOf(docs = [], categories = null) {
  return readableDocs(docs).filter(d => !categories || categories.includes(d.category)).map(d => `\n[${d.name}]\n${d.text}`).join("\n");
}
function sentenceContaining(text, patterns) {
  const sentences = String(text || "").replace(/\r/g, "\n").split(/(?<=[.!?])\s+|\n+/).map(clean).filter(Boolean);
  for (const s of sentences) if (patterns.some(p => p.test(s))) return s.slice(0, 420);
  return "";
}
function snippetsForPatterns(docs, patterns, categories = null, limit = 6) {
  const out = [];
  for (const d of readableDocs(docs)) {
    if (categories && !categories.includes(d.category)) continue;
    const sentences = String(d.text || "").replace(/\r/g,"\n").split(/(?<=[.!?])\s+|\n+/).map(clean).filter(Boolean);
    for (const s of sentences) {
      if (patterns.some(p => { p.lastIndex = 0; return p.test(s); })) out.push(`${d.name}: ${s.slice(0,280)}`);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

function excerptFromHeading(text, headingRx, max=520){
  const raw=String(text||"").replace(/\r/g,"\n");
  headingRx.lastIndex=0;
  const m=headingRx.exec(raw);
  if(!m)return "";
  let piece=raw.slice(m.index,Math.min(raw.length,m.index+max));
  piece=piece.split(/\n\s*(?:ARAŞTIRMA|YÖNTEM|BULGULAR|VERİ ANALİZ|ÇALIŞMA GRUBU|ÖRNEKLEM|UYGULAMA SÜRESİ|KAYNAKÇA)\b/iu)[0];
  return clean(piece).slice(0,420);
}

export function inferMinorParticipation(app={},docs=[]){
  if(app.hasMinors)return {applicable:true,inferred:false,confidence:"AÇIK",evidence:["Başvuru formunda reşit olmayan katılımcı seçeneği işaretli."]};
  const evidence=[];
  for(const d of docs){
    if(d.category==="PARENTAL_CONSENT")evidence.push(`${d.name}: belge kategorisi Veli Onam Formu`);
  }
  for(const d of readableDocs(docs)){
    const text=String(d.text||"");
    const strong=[
      /veli\s+onam\s+formu/iu,
      /(?:çalışma\s+grubu|örneklem|katılımcı)[^.!?\n]{0,160}(?:ilkokul|ortaokul|[1-8]\.\s*sınıf|çocuk)/iu,
      /(?:ilkokul|ortaokul)\s+(?:öğrenci|çocuk)/iu,
      /(?:[1-8])\.\s*sınıf\s+öğrenci/iu,
      /reşit\s+olmayan\s+katılımc/iu
    ];
    const hit=sentenceContaining(text,strong);
    if(hit)evidence.push(`${d.name}: ${hit}`);
  }
  const appText=clean([app.sampleGroup,app.title,app.purpose].join(" "));
  const appHit=sentenceContaining(appText,[/(?:ilkokul|ortaokul|[1-8]\.\s*sınıf|reşit\s+olmayan)/iu]);
  if(appHit)evidence.push(`Başvuru bilgisi: ${appHit}`);
  return {applicable:evidence.length>0,inferred:evidence.length>0,confidence:evidence.length>0?"YÜKSEK":"YOK",evidence:unique(evidence).slice(0,5)};
}

export function inferStudentResearcher(app={},docs=[]){
  if(app.isStudentResearcher)return {applicable:true,inferred:false,evidence:["Başvuru formunda araştırmacı öğrenci seçeneği işaretli."]};
  const evidence=[];
  for(const d of docs){if(d.category==="THESIS")evidence.push(`${d.name}: belge kategorisi Tez Önerisi/Tez Belgeleri`);}
  for(const d of readableDocs(docs)){
    const hit=sentenceContaining(d.text,[/tez\s+konusu\s+öneri\s+formu/iu,/tezli\s+yüksek\s+lisans/iu,/öğrenci\s+bilgileri[^.!?\n]{0,160}tez/iu]);
    if(hit)evidence.push(`${d.name}: ${hit}`);
  }
  return {applicable:evidence.length>0,inferred:evidence.length>0,evidence:unique(evidence).slice(0,4)};
}

export function extractContentSignals(app = {}, docs = []) {
  const corpus = corpusOf(docs);
  const lc = lower(corpus);
  const purposeEvidence = clean(app.purpose) || sentenceContaining(corpus, [/(?<![\p{L}\p{N}_])amaç(?![\p{L}\p{N}_])/iu, /amaçlan/iu, /hedeflen/iu]);
  const problemEvidence = excerptFromHeading(corpus, /(?:problem durumu|araştırma problemi|problem cümlesi|problem\s*:)/iu) || sentenceContaining(corpus, [/problem durumu/iu, /araştırma problemi/iu]);
  const questionEvidence = excerptFromHeading(corpus, /(?:araştırma\s+soru(?:su|ları?)?|alt problemler?|hipotezler?|denenceler?)/iu);
  const designEvidence = clean(app.researchDesign) || sentenceContaining(corpus, [/araştırma modeli/iu, /araştırma deseni/iu, /tarama modeli/iu, /deneysel/iu, /nitel araştır/iu, /nicel araştır/iu, /karma yöntem/iu, /durum çalışması/iu, /fenomenoloji/iu]);
  const sampleEvidence = clean(app.sampleGroup) || excerptFromHeading(corpus, /(?:çalışma grubu|örneklem|araştırmanın evreni|katılımcılar?)/iu) || sentenceContaining(corpus, [/(?<![\p{L}\p{N}_])örneklem(?![\p{L}\p{N}_])/iu, /çalışma grubu/iu, /katılımcı/iu]);
  const sampleSizeMatch = clean(app.sampleSize) || (() => { const m = corpus.match(/(?:örneklem|çalışma grubu|katılımcı(?:lar)?|öğrenci(?:ler)?|öğretmen(?:ler)?)[^\d]{0,40}(\d{1,6})/iu) || corpus.match(/(\d{1,6})\s*(?:öğrenci|öğretmen|katılımcı)/iu); return m ? m[1] : ""; })();
  const dataCollectionEvidence = clean(app.dataCollectionMethod) || sentenceContaining(corpus, [/veri toplama arac/iu, /veri toplama yöntem/iu, /\banket\b/iu, /(?<![\p{L}\p{N}_])ölçek(?![\p{L}\p{N}_])/iu, /görüşme form/iu, /gözlem form/iu, /başarı testi/iu]);
  const analysisEvidence = clean(app.dataAnalysisMethod) || sentenceContaining(corpus, [/veri analiz/iu, /analiz yöntemi/iu, /\bspss\b/iu, /anova/iu, /t[- ]?test/iu, /regresyon/iu, /içerik analizi/iu, /betimsel analiz/iu, /tematik analiz/iu]);
  const durationEvidence = clean(app.duration) || sentenceContaining(corpus, [/uygulama süresi/iu, /\d+\s*(?:dakika|saat|gün|hafta|ay)\b/iu]);
  const provinceCount = extractProvinceCount(sampleEvidence || corpus);
  const toolType = ["anket", "ölçek", "görüşme", "gözlem", "başarı testi", "form"].filter(t => lc.includes(t)).join(", ");
  return { readableDocumentCount: readableDocs(docs).length, purpose: purposeEvidence, problem: problemEvidence, questions: questionEvidence, design: designEvidence, sample: sampleEvidence, sampleSize: sampleSizeMatch, provinceCount, dataCollection: dataCollectionEvidence || toolType, analysis: analysisEvidence, duration: durationEvidence };
}

const PERSONAL_PATTERNS = [
  ["11 haneli kimlik benzeri sayı", /\b[1-9]\d{10}\b/u],
  ["telefon numarası benzeri bilgi", /\b(?:\+?90\s*)?0?5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/u],
  ["e-posta adresi", /(?:[\w.+-]+@[\w.-]+\.[a-zçğıöşü]{2,}|\be[- ]?posta(?:\s+adresi)?\w*)/iu],
  ["açık adres / ikamet bilgisi", /(?<![\p{L}\p{N}_])(?:ev adresi|ikamet adresi|açık adres)(?![\p{L}\p{N}_])/iu],
  ["öğrenci numarası", /(?<![\p{L}\p{N}_])öğrenci\s*(?:no(?:su|nuz|nuzu)?|numara(?:sı|sını|nız|nızı|niz|nizi)?)(?![\p{L}\p{N}_])/iu],
  ["sosyal medya hesabı / kullanıcı adı", /(?<![\p{L}\p{N}_])(?:kullanıcı adı|sosyal medya hesabı|instagram hesabı|tiktok hesabı|x hesabı)(?![\p{L}\p{N}_])/iu],
  ["ad/soyad bilgisi", /(?<![\p{L}\p{N}_])(?:ad(?:ınız|ı)?\s*(?:ve\s*)?soyad(?:ınız|ı)?|isim\s*soyisim|adı\s*soyadı)(?![\p{L}\p{N}_])/iu],
  ["okul / sınıf-şube tanımlayıcısı", /(?<![\p{L}\p{N}_])(?:okul(?:unuz|u)?(?:un)?\s+adı|okul adı|sınıf(?:ınız)?\s*(?:ve|\/)?\s*şube(?:niz)?|sınıf şube)(?![\p{L}\p{N}_])/iu],
  ["doğum tarihi", /(?<![\p{L}\p{N}_])doğum tarihi(?![\p{L}\p{N}_])/iu],
  ["fotoğraf / görüntü", /(?<![\p{L}\p{N}_])(?:fotoğraf|görüntü kaydı|video kaydı)(?![\p{L}\p{N}_])/iu],
  ["ses kaydı", /(?<![\p{L}\p{N}_])ses kaydı(?![\p{L}\p{N}_])/iu]
];
const SENSITIVE_TOPIC_PATTERNS = [
  ["sağlık/engel bilgisi", /(?<![\p{L}\p{N}_])(?:sağlık durumu|hastalık|tanı|engellilik|engel durumu)(?![\p{L}\p{N}_])/iu],
  ["din/inanç bilgisi", /(?<![\p{L}\p{N}_])(?:dinî inanç|dini inanç|mezhep|inanç durumu)(?![\p{L}\p{N}_])/iu],
  ["siyasi görüş", /(?<![\p{L}\p{N}_])(?:siyasi görüş|politik görüş|oy verdi)(?![\p{L}\p{N}_])/iu],
  ["cinsel yaşam/yönelim", /(?<![\p{L}\p{N}_])(?:cinsel yaşam|cinsel yönelim)(?![\p{L}\p{N}_])/iu],
  ["aile gelir/ekonomik durum", /\b(?:aile geliri|hane geliri|ekonomik durum)\b/iu]
];

export function detectPersonalDataRisks(app = {}, docs = []) {
  // Kimlik/iletişim taraması katılımcıdan veri isteyen araçlara odaklanır. Araştırmacının tez/başvuru/onam üst bilgisindeki
  // iletişim bilgilerinin katılımcı verisiymiş gibi yanlış pozitif üretmesi özellikle engellenir.
  const targets = readableDocs(docs).filter(d => ["DATA_COLLECTION_TOOL"].includes(d.category));
  const corpus = targets.map(d=>d.text).join("\n");
  const found = [];
  for (const [label,rx] of [...PERSONAL_PATTERNS,...SENSITIVE_TOPIC_PATTERNS]) { rx.lastIndex=0; if (rx.test(corpus)) found.push(label); }
  if (app.hasAudioRecording) found.push("başvuruda ses kaydı işaretli");
  if (app.hasVideoRecording) found.push("başvuruda görüntü kaydı işaretli");
  const evidence = snippetsForPatterns(targets, [...PERSONAL_PATTERNS,...SENSITIVE_TOPIC_PATTERNS].map(x=>x[1]), null, 5);
  return { signals: unique(found), evidence };
}

const BRAND_PATTERNS = [
  /\bfacebook\b/iu,/\bwhatsapp\b/iu,/\binstagram\b/iu,/\byoutube\b/iu,/\btiktok\b/iu,/\btelegram\b/iu,/\bsnapchat\b/iu,
  /\bnetflix\b/iu,/\bspotify\b/iu,/\bgoogle\b/iu,/\bgmail\b/iu,/\bchrome\b/iu,/\bmicrosoft\b/iu,/\bteams\b/iu,/\bzoom\b/iu,
  /\bapple\b/iu,/\biphone\b/iu,/\bipad\b/iu,/\bmacbook\b/iu,/\bairpods\b/iu,/\bsamsung\b/iu,/\bgalaxy\b/iu,/\bhuawei\b/iu,/\bxiaomi\b/iu,
  /\bchatgpt\b/iu,/\bopenai\b/iu,/\bcopilot\b/iu,/\bgemini\b/iu,/\bcanva\b/iu,/\bkahoot\b/iu,/\bquizizz\b/iu,
  /\btrendyol\b/iu,
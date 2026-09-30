/\bhepsiburada\b/iu,/\bamazon\b/iu,/\bplaystation\b/iu,/\bxbox\b/iu
];
const AD_PATTERNS = [
  /\bsatın al(?:ın|ma|mak)?\b/iu,/\bkampanya\b/iu,/\bindirim\b/iu,/\bsponsor(?:lu|luk)?\b/iu,/\bpromosyon\b/iu,/\bkupon\b/iu,
  /(?<![\p{L}\p{N}_])ücretsiz dene(?![\p{L}\p{N}_])/iu,/\bhemen (?:indir|al|kullan)\b/iu,/\bkullanmanızı öner/iu,/\btavsiye eder/iu,/\ben iyi\b/iu,/\bavantajlı\b/iu,
  /\breklam\b/iu,/\bmarka\b/iu,/(?<![\p{L}\p{N}_])ürün adı(?![\p{L}\p{N}_])/iu,/(?<![\p{L}\p{N}_])ürün ismi(?![\p{L}\p{N}_])/iu,/(?<![\p{L}\p{N}_])model adı(?![\p{L}\p{N}_])/iu,/®/u,/™/u,
  /https?:\/\/[^\s)]+/iu,/\bwww\.[^\s)]+/iu,/\bqr\s*kod(?:u|unu)?\b/iu,/\blogo(?:su|nun)?\b/iu,/(?<![\p{L}\p{N}_])slogan(?:ı|ın)?(?![\p{L}\p{N}_])/iu
];
const COMMERCIAL_CONTEXT_PATTERNS = [
  /(?<![\p{L}\p{N}_])[\p{Lu}][\p{L}\d&.+-]{2,}(?:\s+[\p{Lu}][\p{L}\d&.+-]{2,}){0,2}\s+(?:uygulaması|platformu|markası|ürünü|servisi|hizmeti|modeli|oyunu)(?![\p{L}\p{N}_])/u,
  /(?<![\p{L}\p{N}_])(?:marka|ürün|uygulama|platform|servis|hizmet|model)\s+(?:adı|ismi)?\s*[:\-]?\s*[\p{Lu}][\p{L}\d&.+-]{2,}(?:\s+[\p{Lu}][\p{L}\d&.+-]{2,}){0,2}(?![\p{L}\p{N}_])/iu,
  /(?<![\p{L}\p{N}_])[\p{Lu}][\p{L}\d&.+-]{1,}(?:\s+[\p{Lu}][\p{L}\d&.+-]{1,}){0,3}\s+(?:A\.?Ş\.?|Ltd\.?|Şti\.?|Inc\.?|Corp\.?)(?![\p{L}\p{N}_])/u
];

function titleAdEvidence(title){
  const hits=[]; const t=String(title||"");
  for(const rx of [...BRAND_PATTERNS,...AD_PATTERNS]){rx.lastIndex=0;if(rx.test(t))hits.push(`Araştırma başlığı: ${clean(t).slice(0,280)}`);}
  return unique(hits).slice(0,2);
}

export function detectAdvertisingRisk(app = {}, docs = []) {
  const participantCategories = ["DATA_COLLECTION_TOOL","INFORMED_CONSENT","PARENTAL_CONSENT"];
  const participantDocs = readableDocs(docs).filter(d=>participantCategories.includes(d.category));
  const brandEvidence = [...titleAdEvidence(app.title), ...snippetsForPatterns(participantDocs, BRAND_PATTERNS, null, 8)];
  const promoEvidence = [...titleAdEvidence(app.title).filter(s=>AD_PATTERNS.some(rx=>{rx.lastIndex=0;return rx.test(s);})), ...snippetsForPatterns(participantDocs, AD_PATTERNS, null, 8)];
  const titleContextEvidence = COMMERCIAL_CONTEXT_PATTERNS.some(rx=>{rx.lastIndex=0;return rx.test(String(app.title||""));}) ? [`Araştırma başlığı: ${clean(app.title).slice(0,280)}`] : [];
  const brandOrProductContext = [...titleContextEvidence, ...snippetsForPatterns(participantDocs, COMMERCIAL_CONTEXT_PATTERNS, null, 8)];
  const evidence = unique([...brandEvidence,...promoEvidence,...brandOrProductContext]);
  const hasNamedEntity = brandEvidence.length>0 || brandOrProductContext.length>0;
  const hasPromotion = promoEvidence.length>0;
  return {
    status: (hasNamedEntity || hasPromotion) ? Status.MANUAL : Status.REVIEW,
    hasNamedEntity, hasPromotion, evidence,
    finding: (hasNamedEntity || hasPromotion)
      ? `29. madde açısından RET ADAYI / zorunlu uzman incelemesi: katılımcının göreceği başlık/form/veri toplama aracında ${hasNamedEntity?"ürün/marka/kurum/organizasyon adı veya buna işaret eden ifade":"reklam/tanıtım ifadesi"} tespit edildi. Sunumdaki Facebook/WhatsApp örneği doğrultusunda bu unsur göz ardı edilmemeli; nihai ret kararı bağlam incelenerek yetkili uzman tarafından verilmelidir.`
      : "Katılımcının göreceği başlık ve okunabilir form/veri toplama araçlarında sözlük ve örüntü tabanlı taramada açık ürün/marka/reklam sinyali bulunmadı. Bu sonuç kesin uygunluk kararı değildir; sözlük dışındaki adlar uzman tarafından ayrıca kontrol edilmelidir."
  };
}

function detectRecordingEvidence(docs=[]){
  const proposal = corpusOf(docs,["RESEARCH_PROJECT_INFO","THESIS"]);
  const consent = corpusOf(docs,["INFORMED_CONSENT","PARENTAL_CONSENT"]);
  const recRx=/(?<![\p{L}\p{N}_])(?:ses kaydı|görüntü kaydı|video kaydı|ses ve görüntü|audio|video)(?![\p{L}\p{N}_])/iu;
  return { proposal: recRx.test(proposal), consent: recRx.test(consent), proposalEvidence: sentenceContaining(proposal,[recRx]), consentEvidence: sentenceContaining(consent,[recRx]) };
}

function educationRelation(app={},docs=[]){
  const text=lower([app.title,app.purpose,app.sampleGroup,app.institutions,app.dataCollectionMethod,corpusOf(docs,["RESEARCH_PROJECT_INFO","THESIS","DATA_COLLECTION_TOOL"])].join("\n"));
  const terms=["eğitim","öğretim","öğrenci","öğretmen","okul","sınıf","ders","müfredat","öğrenme","öğretme","akademik başarı","rehberlik","pedagoj"];
  const hits=terms.filter(t=>text.includes(t));
  return {hits, related:hits.length>0};
}

function rightsRisk(docs=[]){
  const categories=["DATA_COLLECTION_TOOL","INFORMED_CONSENT","PARENTAL_CONSENT"];
  const patterns=[/(?<![\p{L}\p{N}_])(?:aptal|salak|tembel|beceriksiz|geri zek[aâ]lı)(?![\p{L}\p{N}_])/iu,/\b(?:aşağıla|küçük düşür|utandır)\w*\b/iu,/\b(?:zorla|mecbur|cezalandır)\w*\b/iu];
  return snippetsForPatterns(docs,patterns,categories,6);
}
function sensitivityRisk(docs=[]){
  const patterns=[/(?<![\p{L}\p{N}_])(?:şiddet|intihar|kendine zarar|cinsel içerik|uyuşturucu|alkol|sigara|kumar)(?![\p{L}\p{N}_])/iu];
  return snippetsForPatterns(docs,patterns,["DATA_COLLECTION_TOOL","INFORMED_CONSENT","PARENTAL_CONSENT"],6);
}

const CHILD_PROTECTION_PATTERNS = [
  ["zorlayıcı katılım dili", /(?:katılım|katılmak|anketi doldurmak|soruları cevaplamak)\s+(?:zorunludur|zorundasınız|mecburidir|mecbursunuz)/iu],
  ["katılmama/cevaplamama nedeniyle yaptırım iması", /(?:katılmazsanız|cevaplamazsanız|doldurmazsanız)[^.!?]{0,100}(?:ceza|puan|not|yaptırım|olumsuz)/iu],
  ["not/puan üzerinde baskı iması", /(?:notunuza|notuna|puanınıza|puanına)[^.!?]{0,80}(?:etki|yansı|art|azal)/iu],
  ["küçük düşürücü veya damgalayıcı ifade", /(?<![\p{L}\p{N}_])(?:aptal|salak|tembel|beceriksiz|geri zek[aâ]lı)(?![\p{L}\p{N}_])/iu]
];

export function detectChildProtectionRisks(app={}, docs=[]){
  const minorContext=inferMinorParticipation(app,docs);
  if(!minorContext.applicable) return {applicable:false,inferred:false,signals:[],evidence:[]};
  const targets=readableDocs(docs).filter(d=>["DATA_COLLECTION_TOOL","INFORMED_CONSENT","PARENTAL_CONSENT"].includes(d.category));
  const corpus=targets.map(d=>d.text).join("\n");
  const signals=[];
  for(const [label,rx] of CHILD_PROTECTION_PATTERNS){rx.lastIndex=0;if(rx.test(corpus))signals.push(label);}
  const sensitive=sensitivityRisk(targets);
  if(sensitive.length) signals.push("yaşa duyarlı/hassas konu içeriği");
  const evidence=unique([
    ...snippetsForPatterns(targets,CHILD_PROTECTION_PATTERNS.map(x=>x[1]),null,6),
    ...sensitive
  ]).slice(0,8);
  return {applicable:true,signals:unique(signals),evidence};
}

const CHILD_DATA_SOURCE = "Kullanıcı tarafından sağlanan çocuk ve kişisel veri koruma raporuna dayalı operasyonel ön kontrol; resmî EK-1 kriteri değildir.";

function childCheck(n,title,status,finding,evidence="",relatedCriteria=""){
  return {number:n,code:`CK-${String(n).padStart(2,"0")}`,title,status,finding,evidence:evidence||"",relatedCriteria,source:CHILD_DATA_SOURCE,official:false};
}
function patternHits(docs, pairs, categories=["DATA_COLLECTION_TOOL"], limit=8){
  const targets=readableDocs(docs).filter(d=>categories.includes(d.category));
  const labels=[]; const evidence=[];
  // Olumsuzluk eşleşen alanın yakın sonrasına uygulanır. Cümlenin başka bölümündeki
  // “istenmeyecek/alınmayacak” ifadesi gerçek bir veri talebini yanlışlıkla bastırmamalıdır.
  const localNegation=/(?:istenmeyecek(?:tir)?|istenmemektedir|istenmemiştir|istenmez|talep\s+edilmeyecek(?:tir)?|talep\s+edilmemektedir|talep\s+edilmez|alınmayacak(?:tır)?|alınmamaktadır|alınmamıştır|alınmaz|toplanmayacak(?:tır)?|toplanmamaktadır|toplanmamıştır|toplanmaz|kaydedilmeyecek(?:tir)?|kaydedilmemektedir|kaydedilmez|kayıt\s+alınmayacak(?:tır)?|kayıt\s+alınmamaktadır|paylaşılmayacak(?:tır)?|paylaşılmamaktadır|paylaşılmaz|erişilmeyecek(?:tir)?|erişilmemektedir|erişilmez|kullanılmayacak(?:tır)?|kullanılmamaktadır|kullanılmaz|yer\s+almamaktadır|bulunmamaktadır|yazmayınız|yazmayın|yazılmayacak(?:tır)?)/iu;
  const isLocallyNegated=(seg,m)=>{
    const after=seg.slice(m.index+m[0].length,Math.min(seg.length,m.index+m[0].length+72));
    localNegation.lastIndex=0;
    return localNegation.test(after);
  };
  for(const [label,rx] of pairs){
    let matched=false;
    for(const d of targets){
      const segments=String(d.text||"").replace(/\r/g,"\n").split(/(?<=[.!?])\s+|\n+/).map(clean).filter(Boolean);
      for(const seg of segments){
        const flags=rx.flags.includes("g")?rx.flags:`${rx.flags}g`;
        const scan=new RegExp(rx.source,flags);
        for(const m of seg.matchAll(scan)){
          if(!isLocallyNegated(seg,m)){
            matched=true;
            if(evidence.length<limit)evidence.push(`${d.name}: ${seg.slice(0,280)}`);
            break;
          }
        }
        if(matched)break;
      }
      if(matched)break;
    }
    if(matched)labels.push(label);
  }
  return {labels:unique(labels),evidence:unique(evidence),targets};
}
function hasAny(text, patterns){return patterns.some(rx=>{rx.lastIndex=0;return rx.test(String(text||""));});}
function purposeCorpus(app={},docs=[]){return [app.title,app.purpose,corpusOf(docs,["RESEARCH_PROJECT_INFO","THESIS","APPLICATION_INFO"])].filter(Boolean).join("\n");}

const CHILD_DIRECT_ID_PATTERNS=[
  ["ad-soyad",/(?<![\p{L}\p{N}_])(?:ad(?:ınız|ınızı)?\s*(?:ve\s*)?soyad(?:ınız|ınızı)?|isim(?:iniz)?\s*soyisim(?:iniz)?|adı\s*soyadı\s*[:?])(?![\p{L}\p{N}_])/iu],
  ["T.C. kimlik numarası",/(?<![\p{L}\p{N}_])(?:t\.?\s*c\.?\s*kimlik\s*(?:no|numara)(?:nız|nızı|sı)?|kimlik\s*numaranız)(?![\p{L}\p{N}_])/iu],
  ["öğrenci numarası",/(?<![\p{L}\p{N}_])öğrenci\s*(?:no(?:nuz|nuzu)?|numara(?:nız|nızı|sı|sını)?)(?![\p{L}\p{N}_])/iu],
  ["telefon",/(?<![\p{L}\p{N}_])(?:telefon(?:\s+numara(?:nız|nızı|sı)|unuz|unuzu)|cep\s*telefonu\s*numaranız|telefon\s*[:?])(?![\p{L}\p{N}_])/iu],
  ["e-posta",/(?<![\p{L}\p{N}_])(?:e[- ]?posta(?:\s+adres(?:iniz|inizi)|nız|nızı)|mail\s*adres(?:iniz|inizi)|e[- ]?posta\s*[:?])(?![\p{L}\p{N}_])/iu],
  ["açık adres",/(?<![\p{L}\p{N}_])(?:(?:ev|ikamet|açık)\s+adres(?:iniz|inizi)|adresinizi\s+yaz)(?![\p{L}\p{N}_])/iu]
];
const CHILD_INDIRECT_ID_PATTERNS=[
  ["okul adı",/(?:okulunuzun\s+adı|okul\s*adı\s*[:?])/iu],
  ["sınıf/şube",/(?:sınıf(?:ınız|ınızı)?\s*(?:ve|\/)?\s*şube(?:niz|nizi)?|sınıf\s*\/\s*şube\s*[:?])/iu],
  ["öğretmen adı",/(?:öğretmeninizin\s+adı|öğretmen\s*adı\s*[:?])/iu],
  ["mahalle/köy",/(?:yaşadığınız\s+(?:mahalle|köy)|mahalle(?:niz|nizi)|köy(?:ünüz|ünüzü))/iu],
  ["doğum tarihi",/(?:doğum\s+tarihiniz|doğum\s+tarihi\s*[:?])/iu],
  ["anne/baba mesleği",/(?:annenizin|babanızın|anne(?:nizin)?\s*[-/]?\s*baba(?:nızın)?)\s+mesleği/iu]
];
const FAMILY_THIRD_PARTY_PATTERNS=[
  ["aile üyesinin kimlik/iletişim/profil bilgisi",/(?:anneniz(?:in)?|babanız(?:ın)?|ebeveyn(?:iniz|inizin)?|veliniz(?:in)?)[^.!?\n]{0,90}(?:adı|soyadı|telefon|e[- ]?posta|iş\s*yeri|işyeri|meslek|gelir|eğitim\s+durumu|sağlık\s+durumu|sosyal\s+medya|hesap|kullanıcı\s+adı)/iu]
];
const TEACHER_THIRD_PARTY_PATTERNS=[
  ["öğretmen/personel kimlik veya iletişim bilgisi",/(?:öğretmeniniz(?:in)?|öğretmeniniz|okul\s+personeli(?:nin)?)[^.!?\n]{0,90}(?:adı|soyadı|telefon|e[- ]?posta|hesap|kullanıcı\s+adı)/iu]
];
const PEER_THIRD_PARTY_PATTERNS=[
  ["başka çocuk/arkadaş kimlik, iletişim veya hassas bilgisi",/(?:arkadaşınız(?:ın)?|sınıf\s+arkadaşınız(?:ın)?|başka\s+(?:bir\s+)?öğrenci(?:nin)?)[^.!?\n]{0,100}(?:adı|soyadı|telefon|e[- ]?posta|sosyal\s+medya|hesap|kullanıcı\s+adı|sağlık|psikolojik)/iu]
];
const CONTACT_PATTERNS=[
  ["telefon/iletişim numarası",/(?<![\p{L}\p{N}_])(?:telefon(?:\s+numara(?:nız|nızı|sı)|unuz|unuzu)|cep\s*telefonu\s*numaranız)(?![\p{L}\p{N}_])/iu],
  ["e-posta",/(?<![\p{L}\p{N}_])(?:e[- ]?posta(?:\s+adres(?:iniz|inizi)|nız|nızı)|mail\s*adres(?:iniz|inizi)|e[- ]?posta\s*[:?])(?![\p{L}\p{N}_])/iu],
  ["kullanıcı adı / sosyal medya hesabı",/(?<![\p{L}\p{N}_])(?:kullanıcı\s+ad(?:ınız|ınızı)|sosyal\s+medya\s+hesab(?:ınız|ınızı)|instagram\s+hesab(?:ınız|ınızı)|tiktok\s+hesab(?:ınız|ınızı))(?![\p{L}\p{N}_])/iu],
  ["profil/bağlantı URL'si",/(?:profil\s+(?:bağlantınız|linkiniz|url(?:'niz)? )|https?:\/\/[^\s)]+)/iu]
];
const LOCATION_PATTERNS=[
  ["ev/açık adres",/(?:ev\s+adres(?:iniz|inizi)|ikamet\s+adres(?:iniz|inizi)|açık\s+adres(?:iniz|inizi))/iu],
  ["canlı konum/GPS",/(?:canlı\s+konum|gps\s+(?:konum|veri)|konumunuzu\s+paylaş|konum\s+bilginizi)/iu],
  ["güzergâh/hareket",/(?:okuldan\s+eve\s+güzerg[aâ]h|servis\s+güzerg[aâ]h|düzenli\s+gittiğiniz\s+yer|günlük\s+güzerg[aâ]h)/iu]
];
const MEDIA_COLLECTION_PATTERNS=[
  ["fotoğraf",/(?:fotoğraf(?:ınızı|ınızı)?\s+(?:yükle|çek|paylaş)|fotoğraf\s+yükleyiniz)/iu],
  ["ses kaydı",/(?:ses\s+kayd(?:ı|ınızı)|sesinizi\s+kaydet|mikrofonu\s+aç)/iu],
  ["görüntü/video kaydı",/(?:görüntü\s+kayd(?:ı|ınızı)|video\s+kayd(?:ı|ınızı)|kamerayı\s+aç|video\s+çek)/iu]
];
const DEVICE_ACCESS_PATTERNS=[
  ["telefon içeriği",/(?:telefonunuzdaki|telefonunuzdan)[^.!?\n]{0,80}(?:veri|bilgi|uygulama|dosya|içerik)/iu],
  ["rehber",/(?:rehberiniz|telefon\s+rehberiniz)/iu],
  ["fotoğraf galerisi",/(?:fotoğraf\s+galeriniz|galerinizdeki)/iu],
  ["mesajlar",/(?:mesajlarınız|mesaj\s+geçmişiniz)/iu],
  ["arama geçmişi",/(?:arama\s+geçmişiniz|tarayıcı\s+geçmişiniz)/iu],
  ["uygulama kullanım geçmişi",/(?:uygulama\s+kullanım\s+geçmişiniz|ekran\s+süresi\s+geçmişiniz)/iu]
];
const CREDENTIAL_PATTERNS=[
  ["parola/şifre",/(?<![\p{L}\p{N}_])(?:parola(?:nız|nızı)?|şifre(?:niz|nizi)?)(?![\p{L}\p{N}_])/iu],
  ["doğrulama kodu/OTP",/(?:doğrulama\s+kodu|tek\s+kullanımlık\s+şifre|\botp\b)/iu],
  ["hesap giriş bilgisi",/(?:hesap\s+giriş\s+bilgi(?:si|lerinizi)|giriş\s+bilgilerinizi)/iu]
];
const SENSITIVE_CHILD_PATTERNS=[
  ["sağlık/engellilik",/(?:sağlık\s+durumu|hastalık|tanı|engellilik|engel\s+durumu|ilaç\s+kullan)/iu],
  ["psikolojik durum",/(?:psikolojik\s+durum|ruh\s+sağlığı|depresyon|anksiyete|kaygı\s+bozukluğu)/iu],
  ["aile içi durum",/(?:aile\s+içi\s+(?:şiddet|çatışma|sorun)|ebeveyn\s+ayrılığı|boşanma)/iu],
  ["din/inanç",/(?:din[iî]\s+inanç|mezhep|inanç\s+durumu)/iu],
  ["siyasi görüş",/(?:siyasi\s+görüş|politik\s+görüş|oy\s+ver)/iu],
  ["etnik köken",/(?:etnik\s+kök|etnisite|ırk(?:ınız)?)/iu],
  ["şiddet/istismar",/(?:şiddet\s+gör|istismar|ihmal\s+edil)/iu],
  ["cinsel yaşam/yönelim",/(?:cinsel\s+yaşam|cinsel\s+yönelim|cinsel\s+deneyim)/iu]
];
const RECONTACT_PATTERNS=[
  ["yeniden iletişim",/(?:daha\s+sonra\s+(?:sizinle\s+)?iletişim\s+kur|ikinci\s+görüşme\s+için|tekrar\s+ulaş(?:mak|acağız)|telefon(?:unuzu| numaranızı)\s+bırak)/iu],
  ["izleme/takip",/(?:hesabınızı\s+izle|takip\s+edeceğiz|düzenli\s+olarak\s+izlenecek)/iu]
];
const VOLUNTARINESS_PATTERNS=[
  ["zorunlu katılım/cevap",/(?:katılım|katılmak|anketi\s+doldurmak|soruları\s+cevaplamak|cevap\s+vermek)[^.!?\n]{0,40}(?:zorunludur|zorundasınız|mecburidir|mecbursunuz)/iu],
  ["öğretmene/yönetime bildirim baskısı",/(?:cevaplarınız|katılmamanız|cevap\s+vermemeniz)[^.!?\n]{0,90}(?:öğretmeninize|öğretmene|okul\s+yönetimine)[^.!?\n]{0,50}(?:bildir|ilet)/iu],
  ["yaptırım/not baskısı",/(?:katılmazsanız|cevaplamazsanız|doldurmazsanız)[^.!?\n]{0,100}(?:ceza|puan|not|yaptırım|olumsuz)/iu]
];
const PURCHASE_PROFILE_PATTERNS=[
  ["satın alma/marka tercihi",/(?:satın\s+alma\s+tercih|hangi\s+markayı\s+tercih|hangi\s+ürünü\s+satın|alışveriş\s+tercih)/iu],
  ["ilgi alanı/profil çıkarma",/(?:ilgi\s+alan(?:ınız|larınız)|tercihleriniz|beğenileriniz|hangi\s+içerikleri\s+sev)/iu]
];
const THIRD_PARTY_ACCESS_PATTERNS=[
  ["aileye çocuk üzerinden erişim",/(?:anneniz(?:in)?|babanız(?:ın)?|veliniz(?:in)?)[^.!?\n]{0,80}(?:telefon|e[- ]?posta|sosyal\s+medya|hesap|iletişim)/iu],
  ["öğretmene çocuk üzerinden erişim",/öğretmeniniz(?:in)?[^.!?\n]{0,80}(?:telefon|e[- ]?posta|sosyal\s+medya|hesap|iletişim)/iu],
  ["başka çocuğa çocuk üzerinden erişim",/(?:arkadaşınız(?:ın)?|sınıf\s+arkadaşınız(?:ın)?)[^.!?\n]{0,80}(?:telefon|e[- ]?posta|sosyal\s+medya|hesap|iletişim)/iu]
];

function purposeRelationship(app,docs,type){
  const p=lower(purposeCorpus(app,docs));
  const terms={
    family:["aile","ebeveyn","veli","sosyoekonomik","gelir","anne","baba"],
    teacher:["öğretmen","öğretim","öğretmen davranış"],
    peer:["akran","arkadaş","sosyal ilişki","zorbalık"],
    contact:["izlem","boylamsal","takip","ikinci görüşme","yeniden iletişim"],
    location:["ulaşım","konum","güzergâh","coğrafi","m
from __future__ import annotations
import re, zipfile
from io import BytesIO
from pathlib import Path

try:
    from pypdf import PdfReader
except Exception:
    PdfReader = None

CRITERIA = [
"Araştırma ve veri toplama araçlarının (anket, görüşme-gözlem formları) içeriği Türkiye Cumhuriyeti Anayasası, taraf olunan uluslararası anlaşmalar ve sözleşmeler başta olmak üzere, 6698 sayılı Kişisel Verilerin Korunması Kanunu ile yürürlükte olan tüm yasal düzenlemeler ve Türk millî eğitiminin genel ve özel amaçlarına uygun olacak şekilde hazırlanmıştır.",
"Araştırmacının kişisel bilgileri (adres, telefon, e-posta) belirtilmiştir.",
"Araştırmacının başvuru bilgileri (başvurunun yapıldığı ülke, başvuru şekli, başvuran ünvanı, meslek, çalıştığı kurum, bağlı olduğu kurum) belirtilmiştir.",
"Başvuru şekli kamu kurum/kuruluşu ya da sivil toplum kuruluşu temsilcileri ise kurum/kuruluşları veya sivil toplum kuruluşları adı, sorumlu kişinin ünvanı belirtilmiş ve ‘İlgili Araştırmayı Yürüteceğine Dair İmzalı İzin Belgesi’ yüklenmiştir. Başvuru şekli millî eğitim müdürlüklerine bağlı birim temsilcileri ise ‘Araştırma Yürütülen Birimdeki En Üst Makamdan Alınan Olur’ belgesi sisteme yüklenmiştir.",
"Araştırmacı öğrenci ise ‘Tez önerisi’ ve tez önerisinin onaylandığına dair ‘Enstitü Yönetim Kurulu Kararı/Resmî Yazı/Belge’ yüklenmiştir.",
"Araştırmacı öğrenci değil ise Araştırma/Proje Bilgileri adlı belge yüklenmiştir. Araştırma/Proje Bilgileri adlı belgede olması gereken içerikler yer almıştır.",
"‘Millî Eğitim Bakanlığı Araştırma Uygulama İzni Başvuru Taahhütnamesi’ imzalı hâli yüklenmiştir.",
"‘Yetkili Etik Kuruldan Alınan Onay Belgesi’ yüklenmiştir.",
"Alan yazında daha önce kullanılmış veri toplama aracı tercih ediliyorsa ‘Veri Toplama Aracı Kullanım İzni’ yüklenmiştir. Aracın kullanımına ilişkin izin gerekli değil ise araştırmacı açıklama yapmış, aracın geliştiricisine ve kaynağına yer vermiştir.",
"Araştırma uygulama izni başvurularında yabancı dilde hazırlanan belgeler için sisteme belgelerin asılları, Türkçe tercümeleri, Tercüme Doğruluk Beyanı yüklenmiştir.",
"‘Ayrıntılı Bilgilendirme ve Gönüllü Katılım Formu’ yüklenmiştir. Örneklemdeki/Çalışma grubundaki kişilerin reşit olmamaları durumunda ‘Veli Onam Formu’ yüklenmiştir. Araştırmada ses veya görüntü kaydı alınacaksa ses veya görüntü kaydına dair bilgilere öneride ya da araştırma/proje bilgileri adlı belgede yer verilmiştir. Ses görüntü kaydı onamına, Ayrıntılı Bilgilendirme ve Gönüllü Katılım Formu veya Veli Onam Formu’nda yer verilmiş ya da ayrı belge olarak sunulmuştur.",
"Araştırmanın içeriği (başlığı) eğitim ve öğretim ile ilişkilidir. Başvuru ‘Araştırma Uygulama İzinleri Yönergesi’ kapsamındadır.",
"Araştırmanın amacı eğitim ve öğretim ile ilişkilidir.",
"Araştırmanın problem durumu eğitim ve öğretim ile ilişkilidir.",
"Araştırmanın önemi eğitim ve öğretim ile ilişkilidir.",
"Araştırmanın modeli/deseni belirtilmiştir.",
"Araştırmanın örneklem/çalışma grubu belirtilmiştir. Sistemde yapılan seçimler ile tez önerisi ya da Araştırma/Proje Bilgileri adlı belgede belirtilen örneklem/çalışma grubuna ilişkin bilgiler uyuşmaktadır. Araştırma kapsamında yer alan illerin hangi kriterlere göre seçildiğine ve örneklem büyüklüğüne ilişkin bilimsel bir açıklamaya yer verilmiştir. Araştırma kapsamında uygulama yapılacak örneklem/çalışma grubuna ilişkin sistem üzerinden seçilen uygulama yapılacak birim doğrudur.",
"Araştırmanın örneklemi/çalışma grubu ekonomik, ulaşılabilir ve uygulanabilir şekilde belirlenmiştir.",
"Veri toplama sürecine ilişkin bilgi verilmiştir.",
"Veri toplama aracı/araçlarının başlıkları ile sisteme yüklenen araç/araçlar aynıdır. Veri toplama araçlarının tamamı (anket, görüşme formu vb.) yüklenmiştir.",
"Veri toplama aracı/araçları araştırmanın amacına ve konusuna uygun şekilde belirlenmiştir.",
"Veri toplama aracı/araçlarındaki maddeler açık ve anlaşılır şekilde oluşturulmuştur.",
"Veri toplama aracı/araçlarındaki maddeler uygulama yapacağı grubun seviyesine uygun olarak hazırlanmıştır.",
"Veri analizine ilişkin bilgiye yer verilmiştir.",
"Kaynakça yer almaktadır.",
"Uygulama süresine ilişkin bilgiye yer verilmiştir.",
"Araştırmada katılımcıların kişilik haklarını, kurum ve kuruluşlarının haklarını ihlal eder nitelikte unsur(lar)a yer verilmemiştir.",
"İçerikteki unsurlarda millî ve manevi değerler, toplumsal hassasiyetler göz önünde bulundurulmuştur.",
"Araştırma kapsamında uygulama yapılacak örneklem/çalışma grubunun bizzat göreceği belgelerde (formlar, veri toplama araçları) veya araştırmanın başlığında herhangi bir kişi, kurum, ürün, organizasyon lehine veya aleyhine reklam unsuru yer almamaktadır.",
"Aynı araştırma ile ilgili mükerrer (tekrar eden) başvuru yapılmamıştır. Aynı araştırma kapsamında uygulama açısından bir farklılık gerekmedikçe yeni bir başvuru izninde bulunulmamıştır."
]

RISK_NAMES = [
"Çocuktan doğrudan kimlik belirleyici veri isteme","Dolaylı kimliklendirme","Çocuk üzerinden aile verisi toplama","Çocuk üzerinden öğretmen/personel verisi toplama","Çocuk üzerinden başka çocukların verisini toplama","İletişim kurmaya yarayan veri","Konum ve hareket verisi","Fotoğraf, ses ve görüntü","Cihaz/veri erişimi","Hesap/kimlik bilgisi talebi","Hassas içerik/profil çıkarma","Gereğinden fazla veri toplama","Amaç–soru uyumsuzluğu","Beyan edilen amaç ile fiilen toplanan veri çelişkisi","Üçüncü kişiye çocuk üzerinden erişim","Yeniden iletişim/izleme","Onam–anket çelişkisi","Gönüllülüğü bozabilecek ifade","Ticari/profil çıkarma bağlantısı","Çocuğun üstün yararı ve risk açıklaması"
]

EDU_WORDS = ["eğitim","öğretim","öğrenci","öğretmen","okul","ders","akademik başarı","öğrenme","sınıf","pedagoj"]

def norm(s:str)->str:
    tr=str.maketrans({"İ":"i","I":"ı","Ç":"ç","Ğ":"ğ","Ö":"ö","Ş":"ş","Ü":"ü"})
    return re.sub(r"\s+"," ",(s or "").translate(tr).lower()).strip()

def fold(s:str)->str:
    return norm(s).translate(str.maketrans({"ç":"c","ğ":"g","ı":"i","ö":"o","ş":"s","ü":"u"}))

def has_any(text, words):
    t=fold(text)
    return any(fold(w) in t for w in words)

def evidence(text, words, limit=240):
    low=norm(text)
    for w in words:
        nw=norm(w); i=low.find(nw)
        if i>=0:
            a=max(0,i-90); b=min(len(text),i+len(w)+130)
            return re.sub(r"\s+"," ",text[a:b]).strip()[:limit]
    return ""

def extract_docx(data:bytes)->str:
    try:
        with zipfile.ZipFile(BytesIO(data)) as z:
            xml=z.read("word/document.xml").decode("utf-8","ignore")
        xml=re.sub(r"</w:p>","\n",xml)
        return re.sub(r"<[^>]+>","",xml).replace("&amp;","&").replace("&lt;","<").replace("&gt;",">")
    except Exception:
        return ""

def extract_text(name:str,data:bytes):
    ext=Path(name).suffix.lower()
    if ext in {".txt",".md",".csv"}:
        for enc in ("utf-8","utf-8-sig","cp1254","latin-1"):
            try:return data.decode(enc),None
            except Exception:pass
        return "","Metin kodlaması okunamadı."
    if ext==".docx":
        t=extract_docx(data); return t,(None if t.strip() else "DOCX metni çıkarılamadı.")
    if ext==".pdf":
        if PdfReader is None:return "","PDF okuma bileşeni yüklenemedi."
        try:
            r=PdfReader(BytesIO(data)); t="\n".join((p.extract_text() or "") for p in r.pages)
            return t,(None if len(t.strip())>=20 else "PDF metni çıkarılamadı; belge taranmış görüntü olabilir.")
        except Exception as e:return "",f"PDF okunamadı: {e}"
    return "","Desteklenmeyen dosya türü."

def classify(name,text):
    s=fold(re.sub(r"[_-]+"," ",name)+" "+text[:3000])
    rules=[
        ("Enstitü Kararı",["enstitu yonetim kurulu","tez onerisinin onaylandigi","enstitu karari"]),
        ("Tez Önerisi",["tez oneri"]),("Etik Kurul Onayı",["etik kurul"]),("Taahhütname",["taahhutname"]),
        ("Veli Onam Formu",["veli onam"]),("Gönüllü Katılım Formu",["gonullu katilim","ayrintili bilgilendirme"]),
        ("Veri Toplama Aracı Kullanım İzni",["veri toplama araci kullanim izni","kullanim izni"]),
        ("Veri Toplama Aracı",["veri toplama araci","anket","olcek","gorusme formu","gozlem formu"]),
        ("Araştırma/Proje Bilgileri",["arastirma/proje bilgileri","arastirma proje bilgileri"]),
        ("Tercüme/Doğruluk Beyanı",["tercume dogruluk","ceviri dogruluk"]),("Kurum İzni/Olur",["kurum izni","en ust makamdan alinan olur","arastirmayi yurutecegine dair"])
    ]
    for label,pats in rules:
        if any(p in s for p in pats):return label
    return "Diğer"

def item(no,status,reason,docs=None,ev="",missing=None):
    return {"no":no,"criterion":CRITERIA[no-1],"status":status,"reason":reason,"source_docs":docs or [],"evidence":ev,"missing":missing or []}

def analyze(meta, uploads):
    docs=[]; warnings=[]
    for f in uploads:
        text,w=extract_text(f["filename"],f["data"])
        typ=classify(f["filename"],text)
        docs.append({"name":f["filename"],"text":text,"type":typ,"size":len(f["data"]),"warning":w})
        if w:warnings.append(f"{f['filename']}: {w}")
    all_text="\n".join(d["text"] for d in docs)
    main_docs=[d for d in docs if d["type"] in {"Tez Önerisi","Araştırma/Proje Bilgileri"}]
    main_text="\n".join(d["text"] for d in main_docs)
    tools=[d for d in docs if d["type"]=="Veri Toplama Aracı"]
    tool_text="\n".join(d["text"] for d in tools)
    participant_text=tool_text
    def ds(t):return [d["name"] for d in docs if d["type"]==t]
    def have(t):return any(d["type"]==t for d in docs)
    app=fold(meta.get("application_type","")); student=meta.get("is_student")=="yes"; nature=fold(meta.get("research_nature",""))
    compulsory="zorunlu egitime devam eden ogrenci" in app
    foreign=meta.get("foreign_docs")=="yes"; minors=meta.get("minors")=="yes"; av=meta.get("av_record")=="yes"
    duplicate=meta.get("duplicate","unknown"); tool_origin=meta.get("tool_origin","unknown")
    R=[]
    # 1
    if not tools:R.append(item(1,"Eksik Belge","Veri toplama araçları olmadan mevzuat ve içerik uygunluğu değerlendirilemez."))
    else:R.append(item(1,"Uzman İncelemesi","Mevzuat, KVKK ve millî eğitim amaçlarına uygunluk bağlamsal ve hukuki uzman incelemesi gerektirir.",ds("Veri Toplama Aracı")))
    # 2-3
    miss=[k for k in ("address","phone","email") if not str(meta.get(k,"")).strip()]
    R.append(item(2,"Uygun" if not miss else "Eksik Belge","Adres, telefon ve e-posta mevcut." if not miss else "Araştırmacının iletişim bilgilerinde eksikler var.",missing=miss))
    required=["country","application_type","title","profession","institution","parent_institution"]
    miss=[k for k in required if not str(meta.get(k,"")).strip()]
    R.append(item(3,"Uygun" if not miss else "Eksik Belge","Başvuru bilgileri tamam." if not miss else "Başvuru bilgilerinde eksikler var.",missing=miss))
    # 4
    if "kamu" in app or "stk" in app or "milli egitim birim" in app:
        ok=have("Kurum İzni/Olur"); R.append(item(4,"Uygun" if ok else "Eksik Belge","Gerekli kurum izni/olur belgesi mevcut." if ok else "Başvuru türüne göre gerekli kurum izni/olur belgesi bulunamadı.",ds("Kurum İzni/Olur")))
    else:R.append(item(4,"Uygulanmaz","Bu başvuru türünde 4. kriterdeki kurumsal izin/olur koşulu doğrudan uygulanmaz."))
    # 5-6
    if student and not compulsory:
        ok=have("Tez Önerisi") and have("Enstitü Kararı")
        R.append(item(5,"Uygun" if ok else "Eksik Belge","Tez önerisi ve onay belgesi mevcut." if ok else "Tez önerisi ve/veya Enstitü Yönetim Kurulu Kararı/Resmî Yazı/Belge eksik.",ds("Tez Önerisi")+ds("Enstitü Kararı")))
        R.append(item(6,"Uygulanmaz","Öğrenci/tez başvurusunda 6. kriter uygulanmaz."))
    else:
        R.append(item(5,"Uygulanmaz","Bu başvuru için tez önerisi ve enstitü onayı koşulu uygulanmaz."))
        rp=next((d for d in docs if d["type"]=="Araştırma/Proje Bilgileri"),None)
        if rp:
            needed=[("amaç",["arastirmanin amaci","amac"]),("önem",["arastirmanin onemi","onem"]),("problem",["problem durumu"]),("yöntem",["yontem","model","desen"]),("örneklem",["orneklem","calisma grubu"]),("veri toplama",["veri toplama"]),("veri analizi",["veri analizi","verilerin analizi"]),("kaynakça",["kaynakca","references"])]
            miss=[label for label,pats in needed if not has_any(rp["text"],pats)]
            R.append(item(6,"Uygun" if not miss else "Uygun Değil","Araştırma/Proje Bilgileri içeriği yeterli." if not miss else "Araştırma/Proje Bilgileri belgesinde zorunlu içerikler eksik.",[rp["name"]],missing=miss))
        else:R.append(item(6,"Eksik Belge","Araştırma/Proje Bilgileri belgesi bulunamadı."))
    # 7-10
    R.append(item(7,"Uygun" if have("Taahhütname") else "Eksik Belge","Taahhütname mevcut." if have("Taahhütname") else "İmzalı taahhütname bulunamadı.",ds("Taahhütname")))
    ethics_exempt=compulsory and any(x in nature for x in ["2204","4006","ogrenci proje","ogrenci arastirma"])
    if ethics_exempt:R.append(item(8,"Uygulanmaz","Zorunlu eğitime devam eden öğrenci proje/araştırması istisnası kapsamında etik kurul belgesi aranmaz."))
    else:R.append(item(8,"Uygun" if have("Etik Kurul Onayı") else "Eksik Belge","Etik kurul onayı mevcut." if have("Etik Kurul Onayı") else "Etik kurul onayı bulunamadı.",ds("Etik Kurul Onayı")))
    if tool_origin=="self":R.append(item(9,"Uygulanmaz","Veri toplama aracının araştırmacı tarafından geliştirildiği beyan edildi."))
    elif tool_origin=="previous":
        ok=have("Veri Toplama Aracı Kullanım İzni") or (has_any(main_text,["izin gerekli degil","izin gerekmez"]) and has_any(main_text,["gelistirici","kaynak"]))
        R.append(item(9,"Uygun" if ok else "Eksik Belge","Kullanım izni/açıklama ve kaynak bilgisi mevcut." if ok else "Daha önce kullanılmış araç için kullanım izni veya izin gerekmediğine dair geliştirici-kaynak açıklaması eksik."))
    else:R.append(item(9,"Uzman İncelemesi","Veri toplama aracının daha önce kullanılmış olup olmadığı belirtilmedi."))
    if not foreign:R.append(item(10,"Uygulanmaz","Yabancı dilde belge olmadığı beyan edildi."))
    else:R.append(item(10,"Uygun" if have("Tercüme/Doğruluk Beyanı") else "Eksik Belge","Tercüme/doğruluk beyanı mevcut." if have("Tercüme/Doğruluk Beyanı") else "Yabancı dilde belge var ancak Tercüme Doğruluk Beyanı tespit edilemedi.",ds("Tercüme/Doğruluk Beyanı")))
    # 11
    miss=[]
    if not have("Gönüllü Katılım Formu"):miss.append("Ayrıntılı Bilgilendirme ve Gönüllü Katılım Formu")
    if minors and not have("Veli Onam Formu"):miss.append("Veli Onam Formu")
    if av:
        if not has_any(main_text,["ses kaydi","goruntu kaydi","video kaydi"]):miss.append("Ana belgede ses/görüntü açıklaması")
        consent="\n".join(d["text"] for d in docs if d["type"] in {"Gönüllü Katılım Formu","Veli Onam Formu"})
        if not has_any(consent,["ses kaydi","goruntu kaydi","video kaydi"]):miss.append("Ses/görüntü onamı")
    R.append(item(11,"Uygun" if not miss else "Eksik Belge","Bilgilendirme/onam koşulları sağlanmış." if not miss else "Bilgilendirme/onam belgelerinde eksik koşullar var.",missing=miss))
    # 12-16
    title=meta.get("research_title",""); title_edu=has_any(title,EDU_WORDS)
    R.append(item(12,"Uygun" if title_edu else ("Uzman İncelemesi" if title.strip() else "Eksik Belge"),"Başlık eğitim-öğretimle ilişkili görünüyor." if title_edu else ("Başlığın eğitim-öğretim ilişkisi uzman değerlendirmesi gerektirir." if title.strip() else "Araştırma başlığı girilmedi.")))
    def content_check(no,words,edu=False):
        if not main_docs:return item(no,"Eksik Belge","Tez Önerisi/Araştırma-Proje Bilgileri bulunmadığı için değerlendirilemedi.")
        ev=evidence(main_text,words)
        if not ev:return item(no,"Uygun Değil",f"{words[0]} bilgisi açık biçimde tespit edilemedi.",[d["name"] for d in main_docs])
        if edu and not has_any(ev+" "+title,EDU_WORDS):return item(no,"Uzman İncelemesi","İlgili bölüm bulundu ancak eğitim-öğretim ilişkisi otomatik kesinleştirilemedi.",[d["name"] for d in main_docs],ev)
        return item(no,"Uygun",f"{words[0]} bilgisi tespit edildi.",[d["name"] for d in main_docs],ev)
    R += [content_check(13,["araştırmanın amacı","amaç"],True),content_check(14,["problem durumu","araştırma problemi"],True),content_check(15,["araştırmanın önemi","önemi"],True),content_check(16,["araştırma modeli","araştırma deseni","model/desen","yöntem"])]
    # 17-19
    if not main_docs:R.append(item(17,"Eksik Belge","Örneklem/çalışma grubu bilgileri değerlendirilecek ana belge bulunamadı."))
    else:
        miss=[]; ev=evidence(main_text,["örneklem","çalışma grubu"])
        if not ev:miss.append("örneklem/çalışma grubu")
        if not has_any(main_text,["örneklem büyüklüğü","kişi sayısı","katılımcı sayısı","n="]):miss.append("örneklem büyüklüğü")
        if not has_any(main_text,["gerekçe","ölçüt","kriter","seçilmiştir","seçim"]):miss.append("bilimsel seçim gerekçesi")
        if not str(meta.get("cities","")).strip():miss.append("uygulama illeri")
        if not str(meta.get("unit","")).strip():miss.append("uygulama birimi")
        R.append(item(17,"Uygun" if not miss else "Uygun Değil","Örneklem ve uygulama bilgileri yeterli." if not miss else "Örneklem/uygulama bilgilerinde eksikler var.",[d["name"] for d in main_docs],ev,miss))
    R.append(item(18,"Uzman İncelemesi","Örneklemin ekonomiklik, ulaşılabilirlik ve uygulanabilirliği uzman değerlendirmesi gerektirir."))
    R.append(content_check(19,["veri toplama süreci","verilerin toplanması","uygulama süreci"]))
    # 20-23
    declared=[x.strip() for x in re.split(r"[,;\n]+",meta.get("declared_tools","")) if x.strip()]
    if not tools:R.append(item(20,"Eksik Belge","Veri toplama aracı yüklenmemiş."))
    elif declared:
        uploaded=" ".join(d["name"]+" "+d["text"][:800] for d in tools); missing=[x for x in declared if fold(x) not in fold(uploaded)]
        R.append(item(20,"Uygun" if not missing else "Uygun Değil","Beyan edilen araçlar yüklenen araçlarla eşleşiyor." if not missing else "Beyan edilen bazı araçlar yüklenen dosyalarda doğrulanamadı.",[d["name"] for d in tools],missing=missing))
    else:R.append(item(20,"Uzman İncelemesi","Araç mevcut ancak sistemde beyan edilen araç başlıkları girilmediği için tamlık karşılaştırması yapılamadı.",[d["name"] for d in tools]))
    purpose_ok=next((x for x in R if x["no"]==13),{}).get("status")=="Uygun"
    if not tools:R.append(item(21,"Eksik Belge","Veri toplama aracı bulunmadığı için amaç/konu uygunluğu değerlendirilemedi."))
    elif not purpose_ok:R.append(item(21,"Uzman İncelemesi","Araştırma amacı yeterince doğrulanmadığı için araç-amaç uygunluğu kesinleştirilemez.",[d["name"] for d in tools]))
    else:R.append(item(21,"Uzman İncelemesi","Araç ve amaç mevcut; içeriksel uygunluk uzman değerlendirmesi gerektirir.",[d["name"] for d in tools]))
    if not tools:R += [item(22,"Eksik Belge","Veri toplama aracı bulunmadı."),item(23,"Eksik Belge","Veri toplama aracı bulunmadı.")]
    else:
        R.append(item(22,"Uzman İncelemesi","Maddelerin açıklığı ve anlaşılırlığı uzman tarafından değerlendirilmelidir.",[d["name"] for d in tools]))
        R.append(item(23,"Uzman İncelemesi","Maddelerin hedef grubun seviyesine uygunluğu uzman tarafından değerlendirilmelidir.",[d["name"] for d in tools]))
    R += [content_check(24,["veri analizi","verilerin analizi","istatistiksel analiz","içerik analizi"]),content_check(25,["kaynakça","references","bibliyografya"])]
    if not main_docs:R.append(item(26,"Eksik Belge","Uygulama süresi değerlendirilecek ana belge bulunamadı."))
    else:
        ev=evidence(main_text,["uygulama süresi","ders saati","dakika sürecek","saat sürecek"])
        R.append(item(26,"Uygun" if ev else "Uygun Değil","Uygulama süresi tespit edildi." if ev else "MEB teşkilatındaki uygulama süresine ilişkin açık bilgi tespit edilemedi.",[d["name"] for d in main_docs],ev))
    # 27-30
    rights=evidence(participant_text,["zorunludur","cevap vermelisiniz","öğretmeninize bildirilecektir","tc kimlik numaranızı"])
    R.append(item(27,"Uzman İncelemesi","Katılımcı ve kurum hakları bağlamsal uzman değerlendirmesi gerektirir.",[d["name"] for d in tools],rights))
    R.append(item(28,"Uzman İncelemesi","Millî ve manevi değerler ile toplumsal hassasiyetler bağlamsal uzman değerlendirmesi gerektirir.",[d["name"] for d in tools]))
    scope=title+"\n"+participant_text
    brand_terms=["facebook","whatsapp","instagram","tiktok","youtube","telegram","twitter","coca-cola","pepsi","nike","adidas"]
    brand=evidence(scope,brand_terms); promo=evidence(scope,["satın al","indirim","kampanya","tercih ettiğiniz marka","önerir misiniz","beğendiğiniz marka","kullanmanızı öner"])
    if not tools and not title.strip():R.append(item(29,"Eksik Belge","Araştırma başlığı ve katılımcının göreceği araçlar olmadan reklam kontrolü tamamlanamaz."))
    elif brand:R.append(item(29,"Uygun Değil" if promo else "Uzman İncelemesi","Marka/ürün adı reklam-tanıtım bağlamıyla birlikte tespit edildi." if promo else "Marka/ürün adı tespit edildi; tek başına nihai ret değildir, uzman incelemesi gerekir.",[d["name"] for d in tools],brand))
    else:R.append(item(29,"Uygun","Başlık ve katılımcının göreceği araçlarda belirgin reklam/tanıtım sinyali tespit edilmedi.",[d["name"] for d in tools]))
    if duplicate=="yes":R.append(item(30,"Uygun Değil","Aynı araştırma için mükerrer başvuru bulunduğu beyan edildi."))
    elif duplicate=="no":R.append(item(30,"Uygun","Mükerrer başvuru bulunmadığı beyan edildi; kurum sistemiyle son doğrulama yapılmalıdır."))
    else:R.append(item(30,"Uzman İncelemesi","Mükerrerlik yalnız sistem geçmişiyle kesin kontrol edilebilir; kayıt karşılaştırması gerekir."))
    # 20 operational risks
    risks=[]
    def risk(no,patterns,level="Yüksek",reason="Katılımcıya yöneltilmiş riskli veri talebi tespit edildi."):
        ev=evidence(participant_text,patterns)
        risks.append({"no":no,"name":RISK_NAMES[no-1],"level":level if ev else "Sinyal Yok","reason":reason if ev else "Belirgin sinyal tespit edilmedi.","evidence":ev})
    if not tools:
        for i,n in enumerate(RISK_NAMES,1):risks.append({"no":i,"name":n,"level":"Değerlendirilemedi","reason":"Katılımcının göreceği veri toplama aracı yüklenmediği için değerlendirilemedi.","evidence":""})
    else:
        risk(1,["adınızı soyadınızı yazınız","ad soyad:","tc kimlik numaranızı","öğrenci numaranızı","telefon numaranızı","e-posta adresinizi","açık adresinizi"])
        risk(2,["okulunuzun adını yazınız","sınıf/şube","öğretmeninizin adı","mahalleniz","doğum tarihiniz"],"Orta")
        risk(3,["annenizin adı","babanızın adı","annenizin telefonu","babanızın telefonu","ailenizin geliri"])
        risk(4,["öğretmeninizin adı","öğretmeninizin telefonu","öğretmeninizin e-posta"])
        risk(5,["arkadaşınızın adı","arkadaşınızın telefonu","arkadaşınızın sosyal medya"])
        risk(6,["telefon numaranız","e-posta adresiniz","instagram hesabınız","whatsapp numaranız","sosyal medya hesabınız"])
        risk(7,["gps","konumunuz","ev adresiniz","okula geliş güzergâhınız"],"Orta")
        risk(8,["fotoğrafınız","ses kaydı","görüntü kaydı","video kaydı"],"Orta")
        risk(9,["rehberinize erişim","galerinize erişim","mesaj geçmişiniz","arama geçmişiniz","uygulama geçmişiniz"])
        risk(10,["şifrenizi","parolanızı","doğrulama kodunu","giriş kodunu"],"Kritik")
        risk(11,["sağlık durumunuz","engellilik","psikolojik","dini inancınız","siyasi görüş","etnik köken","şiddet","istismar","cinsel yaşam"])
        risk(12,["gereksiz kişisel bilgi","tüm kişisel bilgileriniz"],"Orta")
        for no in (13,14):risks.append({"no":no,"name":RISK_NAMES[no-1],"level":"Değerlendirilemedi" if not purpose_ok else "Sinyal Yok","reason":"Araştırma amacı doğrulanmadığı için değerlendirilemedi." if not purpose_ok else "Belirgin uyumsuzluk otomatik olarak saptanmadı.","evidence":""})
        risk(15,["annenizin telefonunu yazınız","babanızın telefonunu yazınız","öğretmeninizin iletişim","arkadaşınızın hesabını"])
        risk(16,["daha sonra sizinle iletişim","ikinci görüşme için telefon","hesabınızı izleyeceğiz","takip edeceğiz"],"Orta")
        consent="\n".join(d["text"] for d in docs if d["type"] in {"Veli Onam Formu","Gönüllü Katılım Formu"})
        noid=has_any(consent,["kimlik belirleyici hiçbir bilgi istenmemektedir","kimlik belirleyici bilgi istenmeyecektir"]); direct=next((x for x in risks if x["no"]==1),{}).get("evidence","")
        risks.append({"no":17,"name":RISK_NAMES[16],"level":"Yüksek" if noid and direct else "Sinyal Yok","reason":"Onam formundaki kimliksiz veri beyanı ile veri toplama aracındaki tanımlayıcı veri talebi çelişiyor." if noid and direct else "Belirgin onam-anket çelişkisi saptanmadı.","evidence":direct})
        risk(18,["zorunludur","cevap vermelisiniz","öğretmeninize bildirilecektir","katılmak zorundasınız"])
        commercial=evidence(participant_text,brand_terms+["satın alma","kampanya","indirim"]); contact=next((x for x in risks if x["no"]==6),{}).get("evidence","")
        risks.append({"no":19,"name":RISK_NAMES[18],"level":"Yüksek" if commercial and contact else ("Orta" if commercial else "Sinyal Yok"),"reason":"Marka/ticari içerik ile iletişim/profil verisi birlikte toplanıyor." if commercial and contact else ("Ticari/marka içeriği tespit edildi; bağlam uzman tarafından değerlendirilmelidir." if commercial else "Belirgin ticari profil çıkarma sinyali saptanmadı."),"evidence":commercial})
        protective=has_any(main_text,["çocuğun üstün yararı","mahremiyet","gizlilik","güvenlik","risk","koruyucu önlem"])
        risks.append({"no":20,"name":RISK_NAMES[19],"level":"Sinyal Yok" if (not minors or protective) else "Orta","reason":"Çocuk katılımcı yok." if not minors else ("Çocuk katılımcılar için koruyucu önlemler açıklanmış." if protective else "Çocuk katılımcı var; üstün yarar, mahremiyet, güvenlik ve risk önlemleri ayrıca aranmalıdır."),"evidence":evidence(main_text,["çocuğun üstün yararı","mahremiyet","gizlilik","güvenlik","risk"])})
    counts={k:0 for k in ["Uygun","Eksik Belge","Uygun Değil","Uzman İncelemesi","Uygulanmaz"]}
    for r in R:counts[r["status"]]+=1
    high=[r for r in risks if r["level"] in {"Yüksek","Kritik"}]
    overall="Ret Adayı" if counts["Uygun Değil"] or high else ("Eksik Başvuru" if counts["Eksik Belge"] else ("Uzman İncelemesi" if counts["Uzman İncelemesi"] else "Kabul Adayı"))
    note=f"Başvuru kapsamında yüklenen belgeler 30 resmî kriter ile çocuk koruma ve kişisel veri ön kontrolleri yönünden incelenmiştir. Sonuç: {counts['Uygun']} kriter uygun, {counts['Eksik Belge']} kriter eksik belge, {counts['Uygun Değil']} kriter uygun değil, {counts['Uzman İncelemesi']} kriter uzman incelemesi ve {counts['Uygulanmaz']} kriter uygulanmaz olarak değerlendirilmiştir. Çocuk/kişisel veri modülünde {len(high)} yüksek/kritik risk sinyali bulunmaktadır. Bu çıktı otomatik ön inceleme niteliğindedir; nihai izin/ret kararı yetkili makamın değerlendirmesine tabidir."
    return {"criteria":R,"risks":risks,"counts":counts,"overall":overall,"note":note,"warnings":warnings,"documents":[{"name":d["name"],"type":d["type"],"size":d["size"],"warning":d["warning"]} for d in docs]}

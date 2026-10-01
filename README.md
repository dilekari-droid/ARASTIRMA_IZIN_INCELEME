# Araştırma İzin İnceleme — Web

Tarayıcıda çalışan Araştırma Uygulama İzni Ön İnceleme ve Karar Destek Sistemi.

## Sürüm

Web 3.6.0 — referans görsele göre yeniden düzenlenen birleşik başvuru inceleme arayüzü.

## Son kullanıcı için tek dosya

```bash
npm run build
```

Bu komut `dist/BASLAT.html` dosyasını üretir. Son kullanıcı bu dosyaya çift tıklayarak web uygulamasını açabilir; temel arayüz ve değerlendirme motoru için ayrı CSS/JS dosyası gerekmez.

PDF metin çıkarma motoru ilk kullanımda CDN üzerinden yüklenir; bu nedenle PDF işleme sırasında internet bağlantısı gerekebilir.

## Geliştirme sunucusu

```bash
python3 -m http.server 8080
```

Ardından `http://localhost:8080` adresini açın.

## Test

```bash
npm test
```

Test zinciri çekirdek değerlendirme kontrollerini, çocuk koruma kontrollerini, referans dashboard yerleşimini ve tek dosyalı `BASLAT.html` üretimini doğrular.

## Önemli

- Uygulama yalnız ön inceleme ve karar desteği sağlar; nihai idari izin/ret kararı üretmez.
- O-01…O-30 kontrolleri operasyonel ön kontrollerdir; resmî EK-1 madde numarası değildir.
- CK-01…CK-20 çocuk koruma kontrolleri operasyonel ön kontrollerdir.
- Metin katmanı bulunmayan taranmış PDF'lerde tarayıcının OCR desteği yoksa belge `OKUNAMADI` olarak gösterilir.

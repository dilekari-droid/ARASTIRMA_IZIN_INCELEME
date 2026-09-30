# Araştırma İzin İnceleme — Web

Tarayıcıda çalışan Araştırma Uygulama İzni Ön İnceleme ve Karar Destek Sistemi.

## Sürüm

Web 3.5.0 — referans tasarıma göre yenilenmiş arayüz.

## Çalıştırma

```bash
python3 -m http.server 8080
```

Ardından `http://localhost:8080` adresini açın.

## Test

```bash
npm test
```

Test paketi çekirdek değerlendirme kontrolleri, çocuk koruma kontrolleri ve arayüz sözleşmesini doğrular.

## Önemli

- Uygulama yalnız ön inceleme ve karar desteği sağlar; nihai idari izin/ret kararı üretmez.
- O-01…O-30 kontrolleri operasyonel ön kontrollerdir; resmî EK-1 madde numarası değildir.
- CK-01…CK-20 çocuk koruma kontrolleri operasyonel ön kontrollerdir.
- PDF metin çıkarma motoru ilk kullanımda CDN üzerinden yüklenir. Metin katmanı bulunmayan taranmış PDF'lerde tarayıcının OCR desteği yoksa belge `OKUNAMADI` olarak gösterilir.

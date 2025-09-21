# VivoLearn — Fonksiyonel Şartname

## 1. Giriş
### 1.1 Amaç
Bu doküman, VivoLearn platformunun iş hedeflerini, kapsamını ve fonksiyonel gereksinimlerini tanımlar. Hedef, Medeniyet Üniversitesi teorik derslerinin dijitalleştirilmesi, öğrencilerin ilerleme takibi ve uygulamalı derslere kabul süreçlerinin standartlaştırılmasıdır.

### 1.2 Kapsam
- MVP; kurs katalogu, dönem yönetimi, video ders akışı, quiz değerlendirme ve başvuru onay süreçlerini kapsar.
- Canlı yayın, ödeme tahsilatı, sertifika üretimi, anlık bildirimler ve içerik DRM bu fazın kapsamı dışındadır.
- Sistem modern web tarayıcılarının güncel sürümlerini hedefler (Chrome, Edge, Firefox, Safari). Mobil web deneyimi desteklenir.

### 1.3 Varsayımlar
- Kullanıcılar üniversite e-posta adreslerine sahiptir; dış kullanıcı senaryosu planlanmamıştır.
- Videolar Google Drive üzerinden embed edilir; gelecekte Mux/Bunny gibi video CDN'lerine geçiş yapılabilir.
- Supabase altyapısı kimlik doğrulama, PostgreSQL veritabanı ve RLS (Row Level Security) politikalarıyla birlikte kullanılır.

## 2. Paydaşlar
| Paydaş | Beklentiler |
|--------|-------------|
| Üniversite yönetimi | Ders içeriklerinin çevrim içi yönetimi, öğrenci katılım verileri, kalite kontrol |
| Akademisyenler | Kolay ders/quiz yönetimi, başvuru ve kontenjan takibi |
| Öğrenciler | Ders içeriklerine zamanında erişim, quiz geri bildirimi, başvuru sonuçları |
| Teknik ekip | Genişleyebilir veri modeli, kolay devreye alma ve bakım |

## 3. Kullanıcı Rollerinin Tanımı ve Yetkileri
| Rol | Tanım | Temel Yetkiler | Kısıtlamalar |
|-----|-------|----------------|--------------|
| **Öğrenci** | Teorik derslere katılan son kullanıcı | Kurs kataloğunu görüntüleme, uygun dönemlere başvuru, onaylı dersleri izleme, quiz tamamlama, ilerleme takibi | Onaylanmamış başvurularla ders/quiz erişimi yoktur; başvuru başına tek deneme |
| **Eğitmen** | Kurs içeriğini yöneten akademisyen | Kurs ve ders oluşturma/güncelleme, dönem açma, başvuruları onaylama veya reddetme, quiz yönetimi, öğrenci ilerlemesini izleme | Sadece kendine ait kurs ve kayıtlar üzerinde tam yetki; diğer kurslarda salt görüntüleme yok |
| **Admin** | Platform yöneticisi | Tüm kursları ve başvuruları görüntüleme, kullanıcı rolleri atama, eğitmenlere destek | Prod ortamında manuel veri müdahalesi sadece acil durumlarda önerilir |

## 4. Kullanım Senaryoları ve Akışlar
### 4.1 Öğrenci Başvurusu
1. Öğrenci kurs detay sayfasını açar ve erişilebilir dönemleri görüntüler.
2. Başvuru formunda dekont numarası ve açıklama alanını doldurur.
3. Sistem başvuru penceresini doğrular, Supabase'e `requested` statüsüyle kayıt atar.
4. Eğitmen onayına kadar öğrenci ders içeriklerine erişemez; başvuru durumu profil ekranında gösterilir.

### 4.2 Ders İzleme ve İlerleme
1. Onaylı öğrenci ders sayfasını açar; sistem erişim penceresi ve yayın durumunu kontrol eder.
2. Video embed iFrame'i gösterilir, ders açıklaması ve diğer dersler listelenir.
3. Öğrenci "Dersi tamamladım" aksiyonunu tetikler; `progress` tablosuna kayıt düşülür, `completed_at` zamanı işlenir.

### 4.3 Quiz Tamamlama
1. Öğrenci dersin quiz ekranına yönlendirilir.
2. Tüm sorular yanıtlanmadan form gönderilemez; hatalı seçenekler vurgulanır.
3. Server action, cevapları doğrular, puanı hesaplar ve `quiz_attempts` tablosunu günceller.
4. Quiz sonucu anında öğrenciye gösterilir; profil ekranında görüntülenir.

### 4.4 Eğitmen Kurs Yönetimi
1. Eğitmen panelde "Kurs Oluştur" formunu kullanarak temel metadata'yı girer.
2. Dersler ve dönemler eklendikten sonra yayın durumu `is_published=true` olarak güncellenir.
3. Başvurular `approved` veya `rejected` statülerine çekilir, karar tarihi kaydedilir.
4. Quizler oluşturulur, sorular sıralanır ve doğru cevaplar işaretlenir.

### 4.5 Yönetici Rol Atama
1. Admin kullanıcı kullanıcı listesi ekranını açar.
2. İlgili kullanıcı için rol dropdown'ı üzerinden `student`, `instructor` veya `admin` seçilir.
3. Server action yeni rolü Supabase profiline işler; değişiklik anında geçerlidir.

## 5. Yönetimsel ve İş Kuralları
- Kurs başlığı, ders başlığı, video URL'si ve quiz soruları boş bırakılamaz.
- Her ders için en fazla bir quiz tanımlanabilir; `quiz` kaydı mevcutsa tekrar oluşturulamaz.
- Başvurular aynı kullanıcı ve dönem kombinasyonu için benzersizdir.
- Başvuru penceresi dışında yapılan denemeler hata mesajı ile reddedilir.
- `receipt_no` alanı en az 6 karakter olmalı, harf/rakam içerebilir.
- Eğitmenler sadece kendi kurslarına bağlı kayıtları yönetebilir.

## 6. Fonksiyonel Gereksinimler
### 6.1 Kimlik ve Yetkilendirme
- **FG-01**: Kullanıcılar Supabase Auth üzerinden e-posta/parola ile kayıt olabilir ve giriş yapabilir.
- **FG-02**: Yeni kayıt olan kullanıcılara otomatik olarak `student` rolü atanır.
- **FG-03**: Oturum açma işlemi sonunda Supabase session cookie'leri ayarlanmalı ve istemci/sunucu tarafında doğrulanmalıdır.
- **FG-04**: Admin kullanıcılar profil tablosu üzerinden rol güncellemesi yapabilmelidir.

### 6.2 Kurs Kataloğu ve Detayları
- **FG-05**: Anasayfa yayınlanmış kursları "Açık", "Yakında" ve "Tamamlandı" olarak gruplar.
- **FG-06**: Kurs detay sayfası ders listesi, dönemler, eğitmen bilgisi ve başvuru formunu içerir.
- **FG-07**: Dersler `order_index` alanına göre sıralanır ve yalnızca `is_published=true` olan dersler öğrencilerce görülür.

### 6.3 Dönem ve Başvuru Yönetimi
- **FG-08**: Öğrenci her dönem için en fazla bir kez başvuru yapabilir (`student_id + course_run_id` eşsiz).
- **FG-09**: Başvuru, dönem `application_start` ve `application_end` aralığında yapılabilir.
- **FG-10**: Eğitmen/admin başvuruları `approved` veya `rejected` durumuna getirebilir; karar zamanı (`decided_at`) kaydedilir.
- **FG-11**: Onaylanan öğrenciler ders ve quiz içeriklerine erişebilir; reddedilenler sadece katalogu görüntüler.

### 6.4 Ders ve İlerleme Yönetimi
- **FG-12**: Eğitmenler ders başlığı, video URL'si, içerik özetini yönetebilir; hatalı URL'lerde kullanıcı bilgilendirilir.
- **FG-13**: Öğrenciler ders tamamlanma durumunu güncelleyebilir; `progress` tablosunda `completed_at` saklanır.
- **FG-14**: Ders erişimi, dönem `access_start`/`access_end` aralığına göre kısıtlanır.

### 6.5 Quiz Yönetimi ve Değerlendirme
- **FG-15**: Quiz oluştururken her soru için en az iki seçenek ve en az bir doğru seçenek bulunmalıdır.
- **FG-16**: Öğrenci tüm soruları yanıtlamadan quiz göndermeye çalışırsa doğrulama hatası dönmelidir.
- **FG-17**: Puan, doğru cevap sayısının toplam soruya oranıyla hesaplanıp yüzde olarak saklanmalıdır.
- **FG-18**: Quiz denemeleri `quiz_attempts` tablosunda "son deneme" olarak tutulur; tekrarında üzerine yazılır.
- **FG-19**: Eğitmenler quiz sonuçlarını görüntüleyebilir ve manuel not girişi yapabilir (gelecek faz için bırakılabilir).

### 6.6 Profil ve Raporlama
- **FG-20**: Öğrenci profil sayfası başvuru durumu, tamamlanan ders sayısı, quiz başarısı gibi özet kartlar sunar.
- **FG-21**: Eğitmen paneli kurs bazında toplam başvuru, onay, bekleyen başvuru bilgilerini listeler.
- **FG-22**: Admin paneli tüm kullanıcıları rol bilgisi ile sıralayarak hızlı arama imkânı verir.

## 7. Hata Yönetimi ve Bildirimler
- Form gönderimleri sırasında `useTransition` veya loading durumlarıyla çift tıklama engellenmelidir.
- Server action hataları kullanıcıya Türkçe, yönlendirici mesajlarla (`"Başvuru gönderilemedi"`) iletilmelidir.
- Kritik hatalar (Supabase erişim problemi, oturum eksikliği) loglanmalı ve gerektiğinde Sentry gibi bir araca taşınmalıdır.
- Başarılı işlemlerde toast veya inline bildirimler gösterilmelidir.

## 8. Doğrulama ve Güvenlik Önlemleri
- Tüm tablolar Supabase RLS politikalarıyla korunur; roller bazlı filtreleme zorunludur.
- `SUPABASE_SERVICE_ROLE_KEY` yalnızca sunucu tarafı kodunda kullanılmalıdır.
- Eğitmen paneline erişim sadece `instructor` ve `admin` rollerine, admin paneline erişim sadece `admin` rolüne açılmalıdır.
- Quiz ve ders içerikleri, öğrencinin onaylanmış ve erişim penceresi açık run'a bağlı olarak gösterilmelidir.
- Parola politikası minimum 6 karakterdir; ileride MFA entegrasyonu için altyapı planlanmalıdır.

## 9. Fonksiyonel Olmayan Gereksinimler
- **Performans**: Listeleme sayfaları 2 saniye altında ilk yanıt süresi hedefler; Supabase sorgularında gerekli indeksler kurulu olmalıdır.
- **Ölçeklenebilirlik**: Veritabanı tabloları UUID kullanır; Supabase yatay ölçeklenmeye hazırdır. Gelecekte cache/ISR kullanılabilir.
- **Kullanılabilirlik**: UI bileşenleri mobil uyumlu, klavye gezilebilir ve WAI-ARIA etiketleri ile desteklenmelidir.
- **Erişilebilirlik**: Renk kontrastları AA seviyesini karşılamalı; videolar için altyazı desteği roadmap'e eklenmelidir.
- **Gözlemlenebilirlik**: Loglar Vercel/Supabase üzerinde incelenebilir; kritik aksiyonlara özel log seviyeleri belirlenmelidir.

## 10. Açık Sorular ve Gelecek İyileştirmeler
- Ödeme dekont numaralarının gerçek zamanlı doğrulanması için banka entegrasyonu planlanacaktır.
- Ders içerikleri için versiyonlama ve değişiklik geçmişi gereksinimi değerlendirilmelidir.
- Quizler için soru bankası, randomizasyon ve zamanlayıcı geliştirmeleri sonraki sprintlerde ele alınacaktır.
- Video altyapısının Mux veya BunnyCDN ile güçlendirilmesi bant genişliği sorunlarını azaltacaktır.


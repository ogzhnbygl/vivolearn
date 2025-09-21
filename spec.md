# VivoLearn — Fonksiyonel Şartname

## 1. Amaç ve Hedefler
- Medeniyet Üniversitesi teorik derslerini çevrim içi ortamda sunmak, öğrenci ilerlemesini izlemek ve uygulama derslerine kabul sürecini otomatikleştirmek.
- Eğitmenlere kurs/ders/quiz yönetimi sağlayarak içerik güncelliğini korumak.
- Yöneticilere kullanıcı rol yönetimi ve operasyonel görünürlük sağlamak.
- Tüm akışları Supabase üzerinde tanımlı RLS politikaları ile güvence altına almak.

## 2. Kapsam ve Varsayımlar
- MVP, teorik dersler, quizler ve uygulama dersi uygunluk hesaplamasını kapsar; canlı ders, ödeme tahsilatı ve sertifika üretimi kapsam dışıdır.
- Videolar Google Drive embed olarak sağlanır; ileri aşamada Mux/Bunny entegrasyonu yapılabilir.
- Kullanıcılar üniversite e-posta adresleriyle kayıt olur; dış kullanıcı erişimi planlanmamıştır.
- Sistem, modern tarayıcıların güncel sürümlerini hedefler (Chrome, Edge, Firefox, Safari).

## 3. Paydaşlar ve Roller
| Rol | Tanım | Temel Yetkiler |
|-----|-------|----------------|
| **Öğrenci** | Teorik derslere katılan son kullanıcı | Kurs başvurusu oluşturma, onaylı dönem derslerini izleme, quiz tamamlama, ilerleme görüntüleme |
| **Eğitmen** | Kurs içeriğini yöneten akademisyen | Kurs/lesson/quiz oluşturma, dönem açma, başvuruları onaylama/red, öğrenci ilerlemesini izleme |
| **Admin** | Platform yöneticisi | Kullanıcı rolleri değiştirme, tüm kurs ve başvuruları görüntüleme, eğitmenlere destek |

## 4. Kullanım Senaryoları
- **Öğrenci başvurusu**: Öğrenci kurs detayına girer → aktif dönemi seçer → dekont numarası girer → başvuruyu gönderir → eğitmen onayı sonrası derslere erişir.
- **Ders izleme**: Onaylı öğrenci ders sayfasına gider → erişim penceresi içindeyse video embed açılır → tamamlandı olarak işaretlenir → ilgili quiz kilidi açılır.
- **Quiz tamamlama**: Öğrenci quiz sorularını yanıtlar → tüm sorular zorunludur → sonuç puanı hesaplanır → başarı durumu profil ekranında gösterilir.
- **Eğitmen kurs yönetimi**: Eğitmen yeni kurs açar → ders ve dönem ekler → bekleyen başvuruları uygular → quiz soruları tanımlar → kursu yayına alır.
- **Admin rol yönetimi**: Admin kullanıcı liste ekranını açar → rol dropdown ile güncelleme yapar → güncel rol anında uygulanır.

## 5. Fonksiyonel Gereksinimler
### 5.1 Kimlik & Yetkilendirme
- FG-01: Kullanıcılar e-posta/şifre ile kayıt olabilir ve giriş yapabilir.
- FG-02: Yeni kayıt olan kullanıcılara `student` rolü atanır.
- FG-03: Oturum açmış kullanıcılar Supabase session cookie'leri ile tanınır.
- FG-04: RLS politikaları, kullanıcı rolüne ve sahipliğine göre tüm tablo erişimini sınırlar.

### 5.2 Kurs Kataloğu
- FG-05: Anasayfa ve `/courses` sayfası yayınlanmış kursları "açık", "yakında" ve "tamamlanmış" durumlarına göre listeler.
- FG-06: Kurs detay sayfası ders listesi, dönemler, eğitmen bilgisi ve başvuru formunu gösterir.
- FG-07: Dersler `order_index` alanına göre sıralanır ve yalnızca `is_published=true` olanlar öğrencilere gösterilir.

### 5.3 Başvuru Yönetimi
- FG-08: Öğrenci kurs run'ı için bir defa başvuru yapabilir (`student_id + course_run_id` benzersizdir).
- FG-09: Başvuru yalnızca başvuru penceresi veya erişim penceresi içinde yapılabilir.
- FG-10: Eğitmen veya admin, başvuruyu `approved` veya `rejected` durumuna getirir; karar zamanı kaydedilir.
- FG-11: Onaylanan öğrenciler ilgili ders ve quiz içeriklerine erişebilir.

### 5.4 Ders ve İçerik Yönetimi
- FG-12: Eğitmenler ders başlığı, video URL'si, içerik özeti ve yayın durumunu yönetir.
- FG-13: Video URL'leri Google Drive formatına normalize edilir; hatalı URL girildiğinde kullanıcı bilgilendirilir.
- FG-14: Öğrenciler ders tamamlandı bilgisini güncelleyebilir; veriler `progress` tablosunda saklanır.

### 5.5 Quiz Yönetimi
- FG-15: Her ders için en fazla bir quiz tanımlanabilir.
- FG-16: Quiz soruları sıralanabilir ve her soru için bir veya daha fazla seçenek eklenebilir.
- FG-17: En az bir doğru seçenek işaretlenmelidir; doğru cevap değiştirme işlemi support edilir.
- FG-18: Öğrenci tüm soruları yanıtlamadan quiz gönderemez; puan yüzdelik olarak hesaplanır.
- FG-19: Quiz sonucu `quiz_attempts` tablosunda saklanır ve tekrar gönderimde üzerine yazılır.

### 5.6 Profil ve Raporlama
- FG-20: Öğrenci `profile` ekranında başvurularını, ilerleme sayısını, quiz adetlerini ve uygunluk durumunu görür.
- FG-21: Eğitmen panelinde kurs bazlı toplam başvuru, onay sayısı ve dönem bilgileri listelenir.
- FG-22: Admin kullanıcılar tüm kullanıcı profillerini rol bilgisi ile görüntüler ve günceller.

## 6. İş Kuralları ve Doğrulamalar
- Kurs başlığı boş olamaz; ders başlığı ve video URL'si zorunludur.
- Quiz soruları ve seçenekleri boş metin içeremez.
- Başvuru dönem dışında yapıldığında kullanıcıya Türkçe hata mesajı döndürülür.
- Quiz tüm sorular yanıtlanmadan gönderilemez; geçersiz seçenek seçiminde hata döndürülür.
- Video erişim penceresi dışında ders görüntülenemez; kullanıcı bilgilendirme ekranı gösterilir.

## 7. Hata Yönetimi & Bildirimler
- Tüm server action'lar başarısızlık durumunda kullanıcıya anlaşılır Türkçe mesaj döndürür (ör. "Kurs kaydedilemedi", "Giriş başarısız").
- Kritik hatalar (Supabase erişimi, session eksikliği) `console.error` ile loglanır.
- Kullanıcıya gösterilen formlar `useTransition` ile gönderim sırasında disable edilir ve durum mesajı yayımlar.

## 8. Güvenlik Gereksinimleri
- Supabase RLS politikaları öğrenci, eğitmen ve admin rollerine göre satır bazlı filtreleme uygular.
- `SUPABASE_SERVICE_ROLE_KEY` yalnızca sunucu tarafında kullanılmalıdır; istemci bundle'ında yer almamalıdır.
- Admin paneli yalnızca `admin` rolüne sahip kullanıcılar için erişilebilir; eğitmen paneli `instructor` ve `admin` rollerine açıktır.
- Quiz ve ders erişimi, ilgili öğrencinin onaylı ve erişim penceresi içindeki run'a bağlıdır.

## 9. Fonksiyonel Olmayan Gereksinimler
- **Performans**: Listeleme sayfaları ilk render'da 2 saniye altında yanıt vermelidir (Supabase sorguları optimize edilmiş).
- **Ölçeklenebilirlik**: Kurs, ders ve quiz tabloları UUID kullanır; Supabase yatay ölçeklenme özelliklerinden yararlanır.
- **Kullanılabilirlik**: UI bileşenleri mobil uyumlu ve klavye erişimine uygun olmalıdır.
- **Erişilebilirlik**: Form bileşenleri etiketlerle ilişkilidir, renk kontrastları kurumsal yönergelere uygundur.
- **Güncellenebilirlik**: Supabase migration dosyaları ile versiyonlama yapılır; yeni değişiklikler sıralı migration olarak eklenmelidir.

## 10. Açık Sorular & Gelecek İyileştirmeler
- Video barındırma için kurumsal depolama (Mux, Bunny) entegrasyonu ve içerik DRM gereksinimleri değerlendirilecek.
- Quiz sonuçlarına göre otomatik uygulama dersi randevu planlama akışı oluşturulabilir.
- Gerçek ödeme entegrasyonu ve dekont doğrulaması sonraki fazda planlanmaktadır.


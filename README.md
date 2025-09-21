# VivoLearn

## Genel Bakış
VivoLearn, Medeniyet Üniversitesi teorik derslerinin dijital ortamda yönetilmesi için geliştirilen bir öğrenme platformudur. Öğrenciler çevrim içi derslere erişip quiz çözer, eğitmenler içerik ile dönemleri tasarlar, yöneticiler ise yetkilendirme ve kalite kontrol süreçlerini yürütür. Uygulama Next.js 15 App Router mimarisi, Supabase tabanlı kimlik doğrulama ve rol tabanlı erişim (RLS) politikaları ile tam entegre bir deneyim sunar.

## Ana Özellikler
- **Kurs kataloğu ve dönem yönetimi**: Yayında olan kurslar, geçmiş dönemler ve yaklaşan programlar tek ekranda listelenir.
- **Başvuru ve onay süreci**: Öğrenciler dekont numarası ile kurs başvurusu yapar, eğitmenler başvuruları değerlendirir ve kontenjan yönetimi gerçekleştirir.
- **Ders izleme ve ilerleme takibi**: Google Drive üzerinden gömülü video oynatıcı, ders tamamlama işaretleme ve otomatik ilerleme kaydı sunar.
- **Quiz altyapısı**: Eğitmenler soru ve seçenekler ekleyerek quiz oluşturur, öğrenciler tek girişte quiz tamamlar ve başarı durumunu görür.
- **Rol tabanlı paneller**: Öğrenciler için profil & ilerleme, eğitmenler için kurs/quiz yönetimi, yöneticiler için rol atama ekranları bulunur.
- **Supabase RLS güvenliği**: Tüm veri erişimi kullanıcı rolü, sahiplik ve dönem erişim pencereleri ile kısıtlanır.

## Mimarinin Kısa Özeti
```
İstemci: Next.js 15 App Router (React 19, server & client component mix)
Sunucu: Next.js Server Actions + Supabase REST
Veritabanı: Supabase PostgreSQL + Row Level Security
Depolama: Google Drive embed (MVP), ileri aşamada Mux/Bunny entegrasyonuna hazır
Dağıtım: Vercel (Next.js) + Supabase (DB & Auth)
```

## Teknoloji Yığını
- **Uygulama**: Next.js 15, React 19, TypeScript, App Router, Server Actions
- **UI**: Tailwind CSS 4, kurumsal temalı shadcn-türevi bileşen seti
- **Veri & Auth**: Supabase (PostgreSQL, Auth, RLS, Edge functions opsiyonel)
- **Durum Yönetimi**: Yerel component state + Server Actions üzerinden veri güncelleme
- **Araçlar**: ESLint 9, TypeScript 5, date-fns, clsx

## Dizin & Modül Yapısı
```
src/
  app/
    (route segmentleri, server actions ve rol tabanlı paneller)
  components/
    admin/        # Yönetici arayüz bileşenleri
    auth/         # Giriş/Kayıt formları
    instructor/   # Eğitmen özel formları (kurs, ders, quiz)
    quiz/, ui/, layout/
  lib/
    auth.ts       # Supabase session & profil yardımcıları
    courses.ts    # Kurs sorguları ve sınıflandırma yardımcıları
    lessons.ts    # Ders+quiz detay sorguları
    supabase-*    # Server/Browser Supabase client factory'leri
supabase/
  migrations/0001_init.sql  # PostgreSQL şema + RLS politikaları
```

## Kurulum
### 1. Ön Koşullar
- Node.js 20+
- npm 10+
- Supabase hesabı ve proje erişimi
- (Opsiyonel) Supabase CLI ve Vercel hesabı

### 2. Depoyu Hazırlama
```bash
git clone https://github.com/medeniyet/vivolearn.git
cd vivolearn
npm install
```

### 3. Supabase Projesini Yapılandırma
1. Supabase Dashboard üzerinden yeni proje oluşturun.
2. **Authentication → Providers** sekmesinde Email/Password metodunu aktif edin.
3. **Auth → Policies** bölümünden ek ayar gerekmiyor; RLS politikaları migration dosyasında tanımlıdır.
4. "SQL Editor" sekmesinde `supabase/migrations/0001_init.sql` dosyasının tamamını çalıştırarak şema, enum'lar, trigger'lar ve RLS politikalarını oluşturun.

### 4. Ortam Değişkenleri
Proje kökünde `.env.local` dosyası oluşturun:
```env
NEXT_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="anon-public-key"
SUPABASE_SERVICE_ROLE_KEY="service-role-key"
```
> `SUPABASE_SERVICE_ROLE_KEY` yalnızca sunucu tarafında (server actions) kullanılır ve istemciye sızdırılmamalıdır.

### 5. Veritabanı Migrasyonunu Çalıştırma
Supabase SQL Editor ile migration'ı tetiklediyseniz ek adıma gerek yoktur. CLI kullanıyorsanız:
```bash
supabase db push
```

## Geliştirme Komutları
| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Geliştirme sunucusunu `http://localhost:3000` üzerinde başlatır |
| `npm run build` | Prodüksiyon için Next.js derlemesi üretir |
| `npm run start` | Derlenmiş uygulamayı prodüksiyon modunda çalıştırır |
| `npm run lint` | ESLint ile statik analiz yapar |

## Uygulamayı Çalıştırma ve Dağıtma
### Yerel Çalıştırma
```bash
npm run dev
```
- İlk kullanıcı kayıtlarında rol otomatik olarak `student` şeklinde atanır.
- Admin kullanıcı oluşturmak için Supabase `profiles` tablosunda ilgili kaydın `role` alanını `admin` olarak güncelleyin.

### Vercel Üzerine Dağıtım
1. Depoyu Vercel ile eşitleyin ve "Next.js" şablonu ile deploy alın.
2. Vercel ortam değişkenleri paneline `.env.local` değerlerini girin.
3. Supabase projesinde **Auth → URL configuration** kısmına Vercel domain'inizi ekleyin.
4. Deploy sonrası `npm run build` aşamasının sorunsuz tamamlandığını doğrulayın.

### Diğer Ortamlar
- Dockerfile bulunmamaktadır; kurumsal ortamlarda container imajı üretmek için `next build` + `next start` tabanlı çok aşamalı Dockerfile hazırlanabilir.
- CI/CD için Vercel + Supabase native entegrasyonu önerilir. Alternatif olarak GitHub Actions ile lint/build adımlarını tetikleyebilirsiniz.

## Kullanım Senaryoları ve Örnekler
- **Öğrenci akışı**: Kayıt → Giriş → Kurs sayfasından dönem seçerek başvuru → Onay aldıktan sonra ders/quiz ekranlarına erişim → Quiz sonucu profil ekranında görüntülenir.
- **Eğitmen akışı**: Eğitmen rolü atandıktan sonra *Eğitmen Paneli* üzerinden kurs oluşturma → Ders videoları ekleme → Dönem açma → Başvuruları onaylama → Quiz tanımlama.
- **Yönetici akışı**: Admin kullanıcıları `/admin/users` ekranında roller arasında geçiş yapabilir, böylece yeni eğitmenler atanır.

### Supabase REST API Örneği
Platformun veri modeli Supabase üzerinde barındığı için gerekli durumlarda REST arayüzü kullanılabilir:
```bash
curl --request GET \
  "https://YOUR-PROJECT.supabase.co/rest/v1/courses?select=title,summary&is_published=eq.true" \
  --header "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --header "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```
> Üstteki çağrı, yayında olan kurs başlıklarını listeler. Eğitmen yetkileriyle kayıt/başvuru güncellemesi gibi işlemler için service role anahtarını yalnızca güvenli sunucu ortamlarında kullanın.

## Katkıda Bulunma
1. Yeni bir konu için issue açın veya mevcut issue'ya atanın.
2. `feat/`, `fix/`, `docs/` gibi öneklerle anlamlı branch isimleri kullanın.
3. Pull request'lerde ilgili ekran görüntüsü veya test çıktısını paylaşın.
4. Veri şemasında değişiklik yapıyorsanız yeni Supabase migration dosyası ekleyin.

## Lisans
Bu depo için henüz açık kaynak lisansı tanımlanmamıştır. İçeriğin paylaşımı veya yeniden kullanımı için proje sahipleriyle iletişime geçiniz.

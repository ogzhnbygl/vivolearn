# VivoLearn

VivoLearn, İstanbul Medeniyet Üniversitesi'nin teorik derslerini dijital ortama taşıyarak öğrencilerin video içeriklere erişmesini, quiz çözmesini ve ilerlemesini takip etmesini sağlayan tam entegre bir öğrenme platformudur. Eğitmenler ders ve dönem planlarını yönetir, yöneticiler rol tabanlı yetkilendirmeyi kontrol eder, öğrenciler ise onaylanan başvuruları sayesinde ders içeriklerine ulaşır.

## İçindekiler
- [Genel Bakış](#genel-bakış)
- [Ana Özellikler](#ana-özellikler)
- [Kullanılan Teknolojiler](#kullanılan-teknolojiler)
- [Kurulum Adımları](#kurulum-adımları)
- [Uygulamayı Çalıştırma](#uygulamayı-çalıştırma)
- [Dağıtım Stratejileri](#dağıtım-stratejileri)
- [Kullanım Örnekleri](#kullanım-örnekleri)
- [Katkı Rehberi](#katkı-rehberi)
- [Lisans](#lisans)

## Genel Bakış
- Next.js 15 App Router ve Supabase PostgreSQL üzerine kurulu, server-first yaklaşımını benimseyen bir web uygulamasıdır.
- Üç ana kullanıcı rolü (öğrenci, eğitmen, yönetici) için kişiselleştirilmiş paneller sunar.
- Row Level Security (RLS) politikaları ile veri gizliliğini uygulama seviyesinde korur.
- Google Drive üzerinden gömülü video akışı ile MVP ihtiyacını karşılayacak şekilde tasarlanmıştır; Mux/Bunny gibi sağlayıcılara geçişe hazırdır.

## Ana Özellikler
- **Kurs kataloğu**: Yayındaki, yaklaşan ve tamamlanan kursları durum bazlı listeler.
- **Başvuru süreci**: Öğrenciler dekont numarasıyla başvuru yapar; eğitmenler kontenjan ve uygunluk doğrulaması yaparak onaylar.
- **Ders akışı**: Video oynatma, ders tamamlama işaretleme, quiz erişim kilidi ve ilerleme kaydı.
- **Quiz yönetimi**: Çoktan seçmeli sorular, doğru seçenek işaretleme, süre/passing score tanımları.
- **Rol tabanlı paneller**: Öğrenci profil ekranı, eğitmen kurs yönetimi, admin rol atama ve sistem görünürlüğü.
- **Supabase RLS**: Ders, başvuru, quiz ve ilerleme verilerinin rol bazlı filtrelenmesi.

## Kullanılan Teknolojiler
**Uygulama Çatısı**
- Next.js 15 (App Router, Server Actions)
- React 19 + TypeScript 5

**Veri ve Kimlik Doğrulama**
- Supabase PostgreSQL
- Supabase Auth (email/şifre), Row Level Security

**Arayüz ve UX**
- Tailwind CSS 4 ve kurumsal tema bileşenleri
- shadcn türevi bileşen kütüphanesi, Radix UI primitives
- `@dnd-kit` ile sürükle-bırak sıralama
- `lucide-react` ikon seti

**Yardımcı Kitaplıklar**
- `date-fns` tarih formatlama
- `clsx`, `class-variance-authority` durum bazlı sınıf yönetimi

**Geliştirme Araçları**
- ESLint 9 + `eslint-config-next`
- TypeScript strict mod
- Tailwind/PostCSS pipeline

## Kurulum Adımları
### 1. Ön Koşullar
- Node.js 20 veya üzeri
- npm 10 veya üzeri
- Supabase hesabı ve proje yetkisi
- (Opsiyonel) Supabase CLI ve Vercel hesabı

### 2. Depoyu Hazırlama
```bash
git clone https://github.com/medeniyet/vivolearn.git
cd vivolearn
npm install
```

### 3. Supabase Altyapısını Oluşturma
1. Supabase Dashboard üzerinden yeni proje açın.
2. `Authentication → Providers` altında Email/Password metodunu aktif edin.
3. SQL Editor'da `supabase/migrations/0001_init.sql` dosyasının tamamını çalıştırın.
4. Eğer CLI kullanıyorsanız `supabase db push` komutuyla aynı migration'ı uygulayabilirsiniz.

### 4. Ortam Değişkenleri
Proje kökünde `.env.local` dosyası oluşturun:
```env
NEXT_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="anon-public-key"
SUPABASE_SERVICE_ROLE_KEY="service-role-key"
```
- `SUPABASE_SERVICE_ROLE_KEY` yalnızca server action'larda kullanılmalı, istemci bundle'ına eklenmemelidir.
- Vercel veya diğer dağıtım ortamlarında aynı değerleri gizli değişken olarak tanımlayın.

### 5. Opsiyonel İyileştirmeler
- `supabase` CLI ile yerel geliştirme için `supabase start` kullanabilirsiniz.
- Google Drive paylaşım linklerini embed formatına dönüştürmek için `src/lib/lessons.ts` yardımcılarını inceleyin.

## Uygulamayı Çalıştırma
```bash
npm run dev       # Geliştirme sunucusu (http://localhost:3000)
npm run lint      # ESLint ile statik analiz
npm run build     # Prodüksiyon derlemesi
npm run start     # Derlenmiş uygulamayı prod modda çalıştırır
```
- İlk kullanıcı kayıtlarında rol otomatik olarak `student` şeklinde atanır.
- Admin veya eğitmen rolü atamak için Supabase Dashboard → `profiles` tablosunda ilgili kullanıcının `role` alanını güncelleyin.
- Ders/quiz oluşturma akışları için eğitmen rolü gereklidir.

## Dağıtım Stratejileri
### Vercel Üzerine Dağıtım
1. Depoyu Vercel ile eşitleyin ve "Next.js" şablonuyla projeyi oluşturun.
2. Ortam değişkenlerini Vercel projenize ekleyin (`Settings → Environment Variables`).
3. Supabase projenizde `Authentication → URL Configuration` bölümüne Vercel domain'inizi tanımlayın.
4. Her dağıtımda `next build` başarılı tamamlanıyorsa yayın otomatik olarak devreye girer.

### Kurumsal / On-Premise Dağıtım
- Çok aşamalı bir Dockerfile ile `next build` sonucu üretilen çıktıyı Nginx tabanlı statik sunucuya kopyalayabilir, `next start` ile Node.js üzerinde çalıştırabilirsiniz.
- Supabase yerine kurum içi PostgreSQL + GoTrue kurulumu tercih edilecekse RLS politikalarının birebir taşınması gerekir.
- CI/CD için GitHub Actions örneği:
  - `npm ci`
  - `npm run lint`
  - `npm run build`
  - (Opsiyonel) E2E testleri (`playwright test`)

## Kullanım Örnekleri
### 1. Başvuru API Çağrısı (Supabase REST)
```bash
curl --request POST \
  "https://YOUR-PROJECT.supabase.co/rest/v1/enrollments" \
  --header "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  --header "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  --header "Content-Type: application/json" \
  --data '{
    "student_id": "UUID",
    "course_run_id": "UUID",
    "receipt_no": "2024-TR-001"
  }'
```
> Bu uç nokta yalnızca güvenli sunucu ortamlarından çağrılmalıdır; istemci tarafı başvuruları Next.js Server Actions üzerinden yapılır.

### 2. Kurs Kataloğu Segmenti
- `/` ve `/courses` sayfaları yayınlanmış kursları `open`, `upcoming`, `completed` olarak gruplar.
- Kataloğa yeni kurs eklemek için eğitmen panelinden `Kurs Oluştur` formunu doldurmanız yeterlidir; slug otomatik üretilir.

### 3. Quiz Denemesi Gönderimi
```bash
curl --request POST http://localhost:3000/api/mock/submit-quiz \
  --header "Content-Type: application/json" \
  --data '{
    "quizId": "UUID",
    "answers": [
      { "questionId": "UUID", "optionId": "UUID" }
    ]
  }'
```
> Yerel geliştirme sırasında server action'ların manuel testini kolaylaştırmak için `src/app/api/mock/submit-quiz/route.ts` gibi yardımcı uç noktalar tanımlanabilir.

## Katkı Rehberi
- Yeni özellik veya hata düzeltmesi için issue açarak tartışmayı başlatın.
- Branch isimlerinde `feat/`, `fix/`, `docs/` gibi önekler kullanın.
- PR açıklamalarında ilgili ekran görüntüsü, hata senaryosu veya test çıktısını paylaşın.
- Veri modelini etkileyen değişikliklerde yeni bir SQL migration dosyası eklemeyi unutmayın.
- Kod standartlarını korumak için PR göndermeden önce `npm run lint` çalıştırın.

## Lisans
Bu repo için henüz açık kaynak lisansı tanımlanmamıştır. İçeriğin yeniden kullanımı için proje sahipleri ile iletişime geçin.

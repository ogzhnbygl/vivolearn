# VivoLearn

VivoLearn, Medeniyet Üniversitesi için teorik derslerin çevrim içi yönetimini sağlayan bir Next.js uygulamasıdır. Öğrenciler kurs başvuruları yapabilir, onaylanmış run içerisinde dersleri izleyip quiz çözebilir. Eğitmenler kurs/run/ders ve quiz içeriklerini yönetir, başvuruları değerlendirir. Admin kullanıcılar ise rolleri düzenler.

## Teknoloji Yığını

- [Next.js 15](https://nextjs.org/) (App Router, TypeScript, React 19)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) (PostgreSQL + Auth + RLS)
- Yerleşik server actions ile API katmanı

## Dizin Yapısı

```
src/
  app/                 # Route segmentleri ve server bileşenleri
  components/          # UI, form ve pano bileşenleri
  lib/                 # Supabase client'ları, tipler, yardımcılar
supabase/
  migrations/0001_init.sql  # Şema ve RLS tanımları
```

## Kurulum

1. **Bağımlılıkları yükleyin**
   ```bash
   npm install
   ```

2. **Supabase projesi oluşturun**
   - [Supabase Dashboard](https://supabase.com/) üzerinden yeni bir proje açın.
   - `Authentication > Providers` bölümünde Email/Password yöntemini etkinleştirin.
   - `SQL Editor` sekmesinde `supabase/migrations/0001_init.sql` dosyasının içeriğini çalıştırarak şemayı ve RLS politikalarını oluşturun.

3. **Ortam değişkenlerini hazırlayın**
   `.env.local` dosyasını oluşturup aşağıdaki değerleri doldurun:
   ```env
   NEXT_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="anon-public-key"
   SUPABASE_SERVICE_ROLE_KEY="service-role-key"
   ```
   > `SUPABASE_SERVICE_ROLE_KEY` yalnızca server ortamında kullanılır; istemciye sızdırmayın.

4. **Geliştirme sunucusunu başlatın**
   ```bash
   npm run dev
   ```
   Uygulama varsayılan olarak [http://localhost:3000](http://localhost:3000) adresinde çalışır.

## Komutlar

| Komut           | Açıklama                         |
|-----------------|----------------------------------|
| `npm run dev`   | Geliştirme sunucusunu başlatır   |
| `npm run build` | Prodüksiyon derlemesi yapar      |
| `npm run start` | Prodüksiyon sunucusunu çalıştırır|
| `npm run lint`  | ESLint ile tip ve stil denetimi  |

## Supabase Notları

- Şema `supabase/migrations/0001_init.sql` dosyasında yer alır. Yeni değişiklikler için benzer SQL migration dosyaları eklenmelidir.
- RLS politikaları öğrencilerin yalnızca onaylı run içindeki derslere erişmesini ve eğitmen/admin yetkilerinin korunmasını sağlar.
- Yeni kullanıcılar email/password ile kayıt olduğunda `profiles` tablosuna varsayılan olarak `student` rolü ile eklenir.

## Vercel Deploy

1. Depoyu Vercel'e bağlayın ve "Next.js" şablonu ile deploy talimatlarını izleyin.
2. Vercel projesinde aşağıdaki Environment Variable değerlerini girin:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Supabase origin'inizi `Auth > URL configuration` bölümünde Vercel domain'i ile güncelleyin.
4. Deploy sonrasında `npm run build` sırasında hata olmaması için Supabase anahtarlarının doğru olduğundan emin olun.

## Yol Haritası / Geliştirme Önerileri

- Quiz sonuçlarına göre uygulama dersi uygunluk mekanizmasının genişletilmesi
- Supabase Storage ile video yönetiminin eklenmesi
- Eğitmen paneli için detaylı raporlama ekranları

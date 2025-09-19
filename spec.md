VivoLearn — Üniversite Kurs Platformu
Amaç

VivoLearn, üniversitedeki teorik dersleri online sunmak için geliştirilmiş bir platformdur.

Öğrenciler belirlenen tarihlerde sisteme girip ders videolarını izler.

Teorik dersleri tamamlayanlar uygulama derslerine kabul edilir.

Sistem ileride farklı kurslar, fakülteler ve programlar için esnek ve yeniden kullanılabilir olacak şekilde tasarlanır.

Teknolojiler

Frontend: Next.js (App Router, TypeScript, Tailwind CSS)

Backend: Next.js API Routes (Node.js, Vercel)

Database & Auth: Supabase (PostgreSQL + RLS, Supabase Auth)

Video: Google Drive embed (MVP), ileride Mux/Bunny gibi servislerle entegre edilebilir.

Deploy: GitHub → Vercel CI/CD entegrasyonu

Roller

Öğrenci: Kurs listesine bakar, başvuru yapar (dekont no ile). Kabul edilirse dersleri izler, quiz çözer, ilerlemesini görür.

Eğitmen (Kurs Sahibi): Kurs oluşturur, ders ve videoları ekler, quiz hazırlar, öğrencilerin başvurularını onaylar veya reddeder.

Admin: Kullanıcıların rolünü değiştirir (öğrenci ↔ eğitmen), genel sistemi yönetir.

İş Kuralları

Öğrenciler kurslara başvuru yapar → dekont numarasını girer.

Eğitmen başvuruyu onaylarsa, öğrenci kurs run’ına dahil olur.

Kursların her biri için bir erişim penceresi vardır (başlangıç & bitiş tarihi). Öğrenciler yalnızca bu aralıkta dersleri izleyebilir.

Uygulama dersine kabul için: tüm teorik dersler tamamlanmış ve quiz başarı eşiği aşılmış olmalı.

MVP’de video oynatıcı sadece embed → ancak ileride ileri sarma engeli ve sekme değişince duraklatma gibi özellikler kolay eklenebilir.

Sayfalar

/ → Ana sayfa: Açık, yakında ve bitmiş kurs listesi

/courses → Tüm kursların listesi

/courses/[id] → Kurs detay sayfası + başvuru formu

/lessons/[id] → Ders izleme sayfası (video + ilerleme)

/login / /register → Kullanıcı girişi ve kaydı (Supabase Auth)

/profile → Kullanıcının kayıtlı kursları ve ilerleme durumu

/instructor/... → Eğitmen paneli (kurs ekleme, ders ekleme, quiz hazırlama, başvuru yönetimi)

/admin/users → Kullanıcı rol yönetimi

Veri Modeli (özet)

profiles: kullanıcı bilgisi (rol, ad, email)

courses: kurs bilgileri

course_runs: kursun dönemleri (erişim tarihleri)

lessons: ders içerikleri (video linki, sıralama)

enrollments: öğrencilerin kurs başvuruları (status: requested/approved/rejected, receipt_no)

progress: öğrencilerin ders bazlı ilerlemesi

quizzes, quiz_questions, quiz_options, quiz_attempts: çoktan seçmeli sınav yapısı

UI / UX

Minimalist tasarım

Üniversitenin medeniyet.edu.tr
 kurumsal renklerine ve stiline uygun.

Tailwind ile component bazlı tasarım (Button, Card, Form bileşenleri).

Mobil uyumlu.

MVP Kapsamı

Auth (kayıt/giriş/logout)

Kurs listesi ve kurs detay sayfası

Başvuru formu (dekont no girişi) ve eğitmen onayı

Ders izleme sayfası + ilerleme takibi

Quiz oluşturma ve çözme (eğitmen/öğrenci)

Uygulama dersi uygunluk göstergesi
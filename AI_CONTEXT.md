# AI_CONTEXT.md — AI Agent Single Source of Truth (ZORUNLU REHBER)

> **DİKKAT (TÜM AI KODLAMA AJANLARI İÇİN):**
> Bu projede herhangi bir kod yazmadan, dosya düzenlemeden veya veritabanı/UI değişikliği yapmadan önce **BU DOSYAYI BAŞTAN SONA OKU**.
> Projede çalışan tüm AI ajanları bu dosyadaki mimariye, iş kurallarına, PostgreSQL veritabanı şemasına, Astryx kurallarına ve parça (`P0`–`P11`) sırasına **%100 uymak zorundadır**.

---

## 1. Projenin Amacı ve GİB Case Bağlamı

Bu proje, **Gelir İdaresi Başkanlığı (GİB) İş Analisti Case Çalışması — Emlakçı Platformu** kapsamında geliştirilmektedir.

### Mimari Yaklaşım: Emlak İşletmesi Odaklı Çoklu Acente Platformu (Multi-Agency + Public Marketplace)
- **Emlakçı (Agent) Paneli:** Sisteme giriş yapan her emlak işletmesi (`agency_id`) kendi ekranında **sadece kendi işyeri tanımını, kendi müşterilerini, kendi portföyünü (emlaklarını), kendi randevu takvimini ve kendi raporlarını** görür ve yönetir. (GİB Case'indeki 1. İşyeri Tanımı, 2. Müşteri Tanımı, 3. Emlak Tanımı, 4. Emlak Arama & Yazıcı Çıktısı maddelerini bir emlak işletmesi için %100 karşılar).
- **Müşteri / Ziyaretçi Vitrini:** Platformda birden fazla emlak işletmesi kayıtlı olabildiği için alıcı/kiracı müşteriler tüm emlakçıların aktif ilanlarını ortak vitrinde gezebilir, tüm kriterlere göre filtreleyebilir; giriş yaptıklarında doğal dille AI akıllı arama yapabilir, favorilere ekleyebilir, fiziki/telefon randevusu alabilir veya "Ev Satacağım / Kiraya Vereceğim" akışıyla kayıtlı emlak işletmelerini listeleyip başvurabilir.

---

## 2. GİB Altın Senaryosu (Kesinlikle Bozulmaması Gereken Çekirdek Akış)

Uygulama şu uçtan uca senaryoyu her zaman kusursuz çalıştırmalıdır:
1. **İşyeri Tanımı:** Emlak işletmesi bilgileri (İşletme adı, Yetkili, Adres, Telefon, Fax, Vergi No, Taşınmaz Ticareti Yetki Belge No, Logo) tanımlanır.
2. **1. Müşteri Kaydı (Mülk Sahibi):** Kiralık/satılık evini verecek müşteri (`KIRALAYAN` veya `SATICI`) kaydedilir.
3. **Emlak Girişi:** Bu müşteriye bağlı olarak kiralık bir ev tüm özellikleriyle (emlak türü, m², oda sayısı, bulunduğu kat, bina katı, ısınma türü, fiyat, konum, emlakçı özel tasviri) kaydedilir. (**İş Kuralı:** Sahipsiz ev olamaz; müşteri yoksa form içinden anında yeni müşteri eklenip bağlanır ve mülk sahibi TC Kimlik doğrulamasından geçer).
4. **2. Müşteri Kaydı (Arayan Müşteri):** Kiralık ev arayan ikinci müşteri (`KIRACI` veya `ALICI`) kaydedilir.
5. **Emlak Arama, Filtreleme & Yazıcı Çıktısı (PDF):** İkinci müşteri için özellikler/filtreler seçilerek arama yapılır, uygun kayıt bulunur ve **emlak bilgilerini içeren kurumsal yazıcı çıktısı (PDF/Print Bilgi Fişi)** alınır.

---

## 3. Teknoloji Yığını ve Katı Kurallar

### Backend (`backend/`)
- **Framework:** Python 3.11+ & **FastAPI** (Otomatik Swagger `/docs` aktif kalmalı).
- **ORM & DB:** **SQLAlchemy 2.0** + **PostgreSQL 16** (`psycopg[binary]`).
  - *Yasak:* Microsoft SQL Server veya SQLite ana veritabanı olarak kullanılmayacak; PostgreSQL ilişkisel şeması esas alınacak.
- **API Standartları:**
  - Tüm endpoint'ler `/api/...` altında gruplanır (`/api/health`, `/api/system/overview`, `/api/auth`, `/api/agencies`, `/api/customers`, `/api/properties`, `/api/appointments`, `/api/reports`, `/api/verify`).
  - İş kuralı ihlallerinde anlamlı Türkçe hata mesajı ve iş kuralı kodu dönülür (örn: `{"detail": "BR-03: Sahipsiz gayrimenkul kaydedilemez. Lütfen bir mülk sahibi müşteri seçiniz."}`).

### Frontend (`frontend/`)
- **Framework:** **React 19** (`react` ve `react-dom >= 19.0.0`) + **Vite** + **TypeScript**. *(Next.js KULLANILMAYACAK!)*
- **UI & Tasarım Sistemi:** **Astryx Design System** (`@astryxdesign/core`, `@stylexjs/stylex`, `@astryxdesign/theme-neutral`, `@astryxdesign/cli`).
- **Astryx Zorunlu Kuralları:**
  1. `frontend/AGENTS.md` içindeki kurallara her zaman uyulacak.
  2. `src/main.tsx` içinde `@astryxdesign/core/reset.css` ve `@astryxdesign/core/astryx.css` importları ile `<Theme theme={themes[defaultThemeSlug]}>` sarmalayıcısı korunacak.
  3. Raw `<div>` veya `<span>` KULLANILMAYACAK — tüm yerleşim ve metinler Astryx bileşenleriyle (`AppShell`, `SideNav`, `Layout`, `Section`, `VStack`, `HStack`, `Grid`, `Card`, `Table`, `Drawer`, `Modal`, `Tabs`, `Text`, `Heading`, `Button`, `Token`, `Badge`, `Banner`, `TextInput`, `Select` vb.) kurulacak.
  4. Her parçanın tesliminden önce `cd frontend && npm run build && npm run astryx -- doctor --built .` çalıştırılıp **0 fail** olduğu doğrulanacak.

---

## 4. Ortak Veritabanı Şeması (PostgreSQL 8 Tablo — P1'den İtibaren Sabit Omurga)

Tüm parçalar `backend/app/models.py` içindeki şu 8 PostgreSQL tablosunu temel alır:

1. **`agencies` (İşyeri / Emlak İşletmesi Tanımı - GİB Madde 1)**
   - `id`, `name` (İşletme adı), `authorized_person` (Yetkili adı soyadı), `address` (Açık adres), `phone` (Ofis sabit tel), `mobile_phone` (Yetkili cep tel), `fax` (Fax), `tax_office` (Vergi dairesi), `tax_number` (Vergi no), `ttbs_document_no` (Taşınmaz Ticareti Yetki Belge No - Tekil), `is_ttbs_verified` (Boolean), `logo_url`, `description`, `created_at`
2. **`users` (Sistem Kullanıcıları - Emlakçı & Kayıtlı Müşteri)**
   - `id`, `full_name`, `email` (Tekil), `password_hash`, `phone`, `role` (`AGENT` | `CUSTOMER`), `agency_id` (FK -> `agencies.id`, emlakçı ise zorunlu), `customer_id` (FK -> `customers.id`, müşteri ise bağlı), `created_at`
3. **`customers` (Müşteri Tanımı - GİB Madde 2)**
   - `id`, `agency_id` (FK -> `agencies.id`, nullable), `first_name`, `last_name`, `mobile_phone` (Cep Tel - Zorunlu), `home_phone` (Ev Tel - Opsiyonel, GİB slaytta istedi), `email` (Self-kayıtta zorunlu, manuel kayıtta opsiyonel), `tc_identity_no` (11 hane, ilan yüklerken mülk sahibinde zorunlu), `is_tc_verified` (Boolean), `customer_type` (`ALICI` | `SATICI` | `KIRALAYAN` | `KIRACI`), `source` (`MANUEL` | `SELF_KAYIT`), `notes`, `created_at`
4. **`properties` (Emlak / Portföy Tanımı - GİB Madde 3)**
   - `id`, `agency_id` (FK -> `agencies.id`, Zorunlu), `owner_customer_id` (FK -> `customers.id`, **ZORUNLU - Sahipsiz ev olamaz!**), `title`, `listing_type` (`SATILIK` | `KIRALIK`), `property_type` (`DAIRE` | `VILLA` | `ISYERI` | `ARSA`), `gross_sqm` (Brüt m²), `net_sqm` (Net m²), `room_count` (`1+0`, `1+1`, `2+1`, `3+1`, `4+1`, `5+1`), `floor_number` (Bulunduğu kat), `building_floors` (Bina toplam katı), `heating_type` (`DOGALGAZ_KOMBI` | `MERKEZI` | `YERDEN_ISITMA` | `KLIMA` | `SOBA`), `price` (Numeric/Integer TL), `city`, `district`, `neighborhood`, `address_detail`, `agent_description` (Emlakçının kendi doğal dil tasviri - AI arama için kritik), `status` (`AKTIF` | `SATILDI` | `KIRALANDI` | `PASIF`), `is_owner_id_verified` (Boolean - İlan yüklerken kimlik kontrolü), `image_url`, `created_at`
5. **`customer_search_requests` (Müşteri Emlak Arama Talepleri - GİB Madde 4)**
   - `id`, `agency_id` (FK), `customer_id` (FK -> `customers.id`), `listing_type`, `property_type`, `min_sqm`, `max_sqm`, `room_count`, `floor_preference`, `heating_type`, `min_price`, `max_price`, `city`, `district`, `natural_language_prompt` (AI arama metni), `created_at`
6. **`appointments` (Randevu Yönetimi)**
   - `id`, `agency_id` (FK -> `agencies.id`), `property_id` (FK -> `properties.id`, nullable), `customer_id` (FK -> `customers.id`), `appointment_type` (`FIZIKI` | `TELEFON`), `purpose` (`ILAN_GOSTERIMI` | `MULK_SATIS_YETKISI` | `GENEL_DANISMANLIK`), `start_time`, `end_time`, `status` (`AKTIF` | `TAMAMLANDI` | `IPTAL_EDILDI`), `meeting_notes` (Geçmiş randevu görüşme notu), `cancelled_at`, `created_at`
7. **`blocked_slots` (Emlakçının Manuel Kapattığı Saat Dilimleri)**
   - `id`, `agency_id` (FK -> `agencies.id`), `start_time`, `end_time`, `reason` (Örn: "19:00-20:00 Manuel Kapalı")
8. **`favorites` (Müşteri Favori İlanları)**
   - `id`, `user_id` (FK -> `users.id`), `property_id` (FK -> `properties.id`), `created_at`

---

## 5. Kritik İş Kuralları (Business Rules)

- **`BR-01 (Taşınmaz Ticareti Yetki Belgesi):`** Emlakçı kaydında `ttbs_document_no` Ticaret Bakanlığı mock doğrulama servisinden geçmeden emlakçı hesabı aktifleşemez.
- **`BR-02 (Tekil E-Posta):`** Sisteme kayıt olan kullanıcılarda (`users.email`) e-posta adresi tekildir; aynı e-posta ile ikinci kayıt açılamaz.
- **`BR-03 (Sahipsiz Ev Olmaz):`** `properties.owner_customer_id` boş bırakılamaz. Emlak ekleme ekranında müşteri listede yoksa aynı ekrandaki hızlı müşteri ekleme modalı ile müşteri oluşturulup ilana bağlanır.
- **`BR-04 (İlan Yüklerken Kimlik Doğrulama):`** İlan kaydedilirken mülk sahibinin 11 haneli TC Kimlik Numarası kontrol edilir (`is_owner_id_verified = True`).
- **`BR-05 (Detaylı Arama & Yazıcı Çıktısı / Bilgi Fişi):`** Emlak arama sonucunda eşleşen her kayıt için işyeri bilgileri, emlak özellikleri, emlakçı tasviri ve müşteri bilgisini içeren kurumsal A4 yazıcı/PDF çıktısı alınabilmelidir.
- **`BR-06 (Randevu Saat Kapatma Çakışma Kontrolü):`** Emlakçı belirli bir saat aralığını manuel kapatmak istediğinde o saatte zaten aktif bir randevu varsa sistem kapatma işlemini engeller ve uyarı verir.
- **`BR-07 (Son 6 Saat İptal Kuralı):`** Randevu başlangıç saatine **6 saatten az** süre kalmışsa randevu iptal edilemez.
- **`BR-08 (Rol & Girişsiz Erişim):`** Giriş yapmayan ziyaretçiler tüm aktif ilanları görebilir ve klasik filtrelerle arama yapabilir; ancak **AI Doğal Dil Akıllı Arama**, **Favorilere Ekleme** ve **Randevu Alma** işlemleri için müşteri girişi zorunludur.

---

## 6. Parça Parça Geliştirme Sırası (Önem ve Karmaşıklığa Göre P0 – P11)

- **`P0`**: Repo İskeleti, PostgreSQL Bağlantısı & Astryx UI Kurulumu (`chore(P0): ...`) — **[TAMAMLANDI]**
- **`P1`**: PostgreSQL İlişkisel Veritabanı Şeması (8 Tablo) & Başlangıç Verileri (`feat(P1): ...`) — **[TAMAMLANDI]**
- **`P2`**: Kullanıcı Kayıt / Giriş (Emlakçı & Müşteri) ve Yetki Belgesi Doğrulama (`feat(P2): ...`) — **[TAMAMLANDI]**
- **`P3`**: İşyeri (Emlak Ofisi) Tanımı ve Kurumsal Profil Yönetimi - GİB Madde 1 (`feat(P3): ...`) — **[TAMAMLANDI]**
- **`P4`**: Müşteri Yönetimi, Filtreleme Tablosu ve Yan Panel (Drawer) Detay - GİB Madde 2 (`feat(P4): ...`) — **[SIRADAKİ]**
- **`P5`**: Portföy Yönetimi, "Sahipsiz Ev Olmaz" Kuralı, Hızlı Müşteri Bağlama ve Kimlik Kontrolü - GİB Madde 3 (`feat(P5): ...`)
- **`P6`**: Detaylı İlan Arama, Çoklu Filtreleme ve Yazıcı / PDF Bilgi Fişi Çıktısı - GİB Madde 4 (`feat(P6): ...`)
- **`P7`**: Müşteri Vitrini: Girişsiz İlan Gezme, Favoriler ve "Ev Satacağım" Emlakçı Listeleme (`feat(P7): ...`)
- **`P8`**: Randevu Yönetimi 1: Google Calendar Takvim Görünümü ve Manuel Saat Kapatma (`feat(P8): ...`)
- **`P9`**: Randevu Yönetimi 2: Fiziki/Telefon Randevu Alma, Son 6 Saat İptal Kuralı ve Geçmiş Randevu Notları (`feat(P9): ...`)
- **`P10`**: Yapay Zeka (AI) Destekli Doğal Dil Akıllı Arama ve Müşteri–Ev Eşleştirme (`feat(P10): ...`)
- **`P11`**: Raporlama ve Performans Analitiği Ekranı (Randevu Saatleri, Satılan/Kiralanan Evler, Müşteri Kırılımı) (`feat(P11): ...`)

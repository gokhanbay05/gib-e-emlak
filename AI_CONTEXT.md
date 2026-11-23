# AI_CONTEXT.md — AI Agent Single Source of Truth (ZORUNLU REHBER)

> **DİKKAT (TÜM AI KODLAMA AJANLARI İÇİN):**
> Bu projede herhangi bir kod yazmadan, dosya düzenlemeden veya veritabanı/UI değişikliği yapmadan önce **BU DOSYAYI BAŞTAN SONA OKU**.
> Hem Gökhan'ın hem Güven'in kullandığı AI ajanları bu dosyadaki mimariye, iş kurallarına, veritabanı şemasına, Astryx kurallarına ve parça (`P0`–`P9`) sırasına **%100 uymak zorundadır**.

---

## 1. Projenin Amacı ve GİB Case Bağlamı

Bu proje, **Gelir İdaresi Başkanlığı (GİB) İş Analisti Case Çalışması — Emlakçı Platformu** kapsamında 4 kişilik ekip (2 Yazılımcı + 2 İş Analisti) tarafından geliştirilmektedir.
Kod ile İş Analizi dokümanları (ERD, Veri Sözlüğü, İş Kuralları, User Story, Ekran Alanları, Test Senaryoları) **birebir uyumlu** olmak zorundadır.

### Mimari Yaklaşım: Emlak İşletmesi Odaklı Çoklu Acente Platformu (Multi-Agency + Public Marketplace)
- **Emlakçı (Agent) Paneli:** Sisteme giriş yapan her emlak işletmesi (`agency_id`) kendi ekranında **sadece kendi işyeri tanımını, kendi müşterilerini, kendi portföyünü (emlaklarını), kendi randevu takvimini ve kendi raporlarını** görür ve yönetir. (GİB Case'indeki 1. İşyeri Tanımı, 2. Müşteri Tanımı, 3. Emlak Tanımı, 4. Emlak Arama & Yazıcı Çıktısı maddelerini bir emlak işletmesi için %100 karşılar).
- **Müşteri / Ziyaretçi Vitrini:** Platformda birden fazla emlak işletmesi kayıtlı olabildiği için alıcı/kiracı müşteriler tüm emlakçıların aktif ilanlarını ortak vitrinde gezebilir, doğal dille AI akıllı arama yapabilir, favorilere ekleyebilir, randevu alabilir veya "Ev Satacağım / Kiraya Vereceğim" akışıyla kayıtlı emlak işletmelerini listeleyip başvurabilir.

---

## 2. GİB Altın Senaryosu (Kesinlikle Bozulmaması Gereken Çekirdek Akış)

Uygulama şu uçtan uca senaryoyu her zaman kusursuz çalıştırmalıdır:
1. **İşyeri Tanımı:** Emlak işletmesi bilgileri (İşletme adı, Yetkili, Adres, Telefon, Fax, Vergi No, Taşınmaz Ticareti Yetki Belge No, Logo) tanımlanır.
2. **1. Müşteri Kaydı (Mülk Sahibi):** Kiralık/satılık evini verecek müşteri (`KIRALAYAN` veya `SATICI`) kaydedilir.
3. **Emlak Girişi:** Bu müşteriye bağlı olarak kiralık bir ev tüm özellikleriyle (emlak türü, m², oda sayısı, kat, bina katı, ısınma türü, fiyat, konum, emlakçı tasviri) kaydedilir. (**İş Kuralı:** Sahipsiz ev olamaz ve mülk sahibi TC Kimlik doğrulamasından geçer).
4. **2. Müşteri Kaydı (Arayan Müşteri):** Kiralık ev arayan ikinci müşteri (`KIRACI` veya `ALICI`) kaydedilir.
5. **Emlak Arama & Yazıcı Çıktısı (PDF):** İkinci müşteri için özellikler seçilerek (veya AI doğal dil ile) arama yapılır, uygun kayıt bulunur ve **emlak bilgilerini içeren kurumsal yazıcı çıktısı (PDF/Print Bilgi Fişi)** alınır.

---

## 3. Teknoloji Yığını ve Katı Kurallar

### Backend (`backend/`)
- **Framework:** Python 3.11+ & **FastAPI** (Otomatik Swagger `/docs` aktif kalmalı).
- **ORM & DB:** **SQLAlchemy 2.0** + **PostgreSQL 16** (`psycopg[binary]`).
  - *Yasak:* Microsoft SQL Server veya SQLite ana veritabanı olarak kullanılmayacak; PostgreSQL şeması esas alınacak.
- **API Standartları:**
  - Tüm endpoint'ler `/api/...` altında versiyonlanır veya gruplanır (`/api/health`, `/api/auth`, `/api/agencies`, `/api/customers`, `/api/properties`, `/api/appointments`, `/api/reports`, `/api/verify`).
  - İş kuralı ihlallerinde anlamlı Türkçe hata mesajı ve iş kuralı kodu dönülür (örn: `{"detail": "BR-PORTFOY-01: Sahipsiz gayrimenkul kaydedilemez. Lütfen bir mülk sahibi müşteri seçiniz."}`).

### Frontend (`frontend/`)
- **Framework:** **React 19** (`react` ve `react-dom >= 19.0.0`) + **Vite** + **TypeScript**. *(Next.js KULLANILMAYACAK!)*
- **UI & Tasarım Sistemi:** **Astryx Design System** (`@astryxdesign/core`, `@stylexjs/stylex`, `@astryxdesign/theme-neutral`, `@astryxdesign/cli`).
- **Astryx Zorunlu Kuralları:**
  1. `frontend/AGENTS.md` (veya `CLAUDE.md`) içindeki `npx @astryxdesign/cli init` kurallarına her zaman uyulacak.
  2. Global CSS dosyasında (`src/index.css` veya `src/globals.css`) mutlaka şu sıra korunacak:
     ```css
     @import '@astryxdesign/core/reset.css';
     @import '@astryxdesign/core/astryx.css';
     ```
  3. Uygulama kökü `<Theme theme={themes[defaultThemeSlug]}>` ile sarmalanacak (`./astryx-themes` modülünden).
  4. Bileşenler toplu barrel import yerine kendi giriş yolundan import edilecek (örn. `import {Button} from '@astryxdesign/core/Button';`). Emin olmadığın bileşen prop'larını görmek için `npx @astryxdesign/cli component <ComponentName>` komutunu çalıştır.
  5. Özel stil gerektiğinde `@stylexjs/stylex` (`stylex.create()`) ve `xstyle` prop'u tercih edilecek; cascade layer (`@layer reset, astryx-base`) ezilmeyecek.

---

## 4. Ortak Veritabanı Şeması (PostgreSQL Tabloları — P1'den İtibaren Sabit Omurga)

Parçalar arasında bağlam kopmaması için tüm parçalar şu 7 ana tablo yapısını temel alır:

1. **`agencies` (İşyeri / Emlak İşletmesi Tanımı - GİB Madde 1)**
   - `id`, `name` (İşletme adı), `authorized_person` (Yetkili), `address` (Adres), `phone` (Sabit/Ofis Tel), `fax` (Fax), `tax_number` (Vergi No), `ttbs_document_no` (Taşınmaz Ticareti Yetki Belge No - Tekil), `is_ttbs_verified` (Boolean), `logo_url`, `description`, `created_at`
2. **`users` (Sistem Kullanıcıları - Emlakçı & Kayıtlı Müşteri)**
   - `id`, `full_name`, `email` (Tekil), `password_hash`, `phone`, `role` (`AGENT` | `CUSTOMER`), `agency_id` (FK -> `agencies.id`, emlakçı ise zorunlu), `customer_id` (FK -> `customers.id`, müşteri ise bağlı), `created_at`
3. **`customers` (Müşteri Tanımı - GİB Madde 2)**
   - `id`, `agency_id` (FK -> `agencies.id`, nullable: self-kayıt müşteriler genel, emlakçının eklediği müşteriler acenteye bağlı), `first_name`, `last_name`, `mobile_phone` (Cep Tel - Zorunlu), `home_phone` (Ev Tel - Opsiyonel, GİB slaytta istedi), `email` (Self-kayıtta zorunlu, manuel kayıtta opsiyonel), `tc_identity_no` (11 hane, ilan yüklerken mülk sahibinde zorunlu), `is_tc_verified` (Boolean), `customer_type` (`ALICI` | `SATICI` | `KIRALAYAN` | `KIRACI`), `source` (`MANUEL` | `SELF_KAYIT`), `notes`, `created_at`
4. **`properties` (Emlak / Portföy Tanımı - GİB Madde 3)**
   - `id`, `agency_id` (FK -> `agencies.id`, Zorunlu), `owner_customer_id` (FK -> `customers.id`, **ZORUNLU - Sahipsiz ev olamaz!**), `title`, `listing_type` (`SATILIK` | `KIRALIK`), `property_type` (`DAIRE` | `VILLA` | `ISYERI` | `ARSA`), `gross_sqm` (Brüt m²), `net_sqm` (Net m²), `room_count` (Oda sayısı: `1+1`, `2+1`, `3+1` vb.), `floor_number` (Bulunduğu kat), `building_floors` (Bina toplam katı), `heating_type` (`DOGALGAZ_KOMBI` | `MERKEZI` | `YERDEN_ISITMA` | `KLIMA` | `SOBA`), `price`, `city`, `district`, `neighborhood`, `address_detail`, `agent_description` (Emlakçının kendi doğal dil tasviri - AI arama için kritik), `status` (`AKTIF` | `SATILDI` | `KIRALANDI` | `PASIF`), `is_owner_id_verified` (Boolean - İlan yüklerken kimlik kontrolü), `image_url`, `created_at`
5. **`customer_search_requests` (Müşteri Emlak Arama Talepleri - GİB Madde 4)**
   - `id`, `agency_id`, `customer_id` (FK -> `customers.id`), `listing_type`, `property_type`, `min_sqm`, `max_sqm`, `room_count`, `floor_preference`, `heating_type`, `min_price`, `max_price`, `city`, `district`, `natural_language_prompt` (AI arama metni), `created_at`
6. **`appointments` & `blocked_slots` (Randevu ve Takvim Yönetimi)**
   - `appointments`: `id`, `agency_id` (FK), `property_id` (FK, nullable), `customer_id` (FK), `appointment_type` (`FIZIKI` | `TELEFON`), `purpose` (`ILAN_GORME` | `MULK_SATIS_KIRALAMA` | `GENEL_DANISMANLIK`), `start_time`, `end_time`, `status` (`AKTIF` | `TAMAMLANDI` | `IPTAL_EDILDI`), `meeting_notes` (Geçmiş randevu notu), `cancelled_at`, `created_at`
   - `blocked_slots`: `id`, `agency_id` (FK), `start_time`, `end_time`, `reason` (Emlakçının manuel kapattığı saat aralığı, örn. 19:00-20:00)
7. **`favorites` (Müşteri Favori İlanları)**
   - `id`, `user_id` (FK -> `users.id`), `property_id` (FK -> `properties.id`), `created_at`

---

## 5. Kritik İş Kuralları (Business Rules — Kodda ve Dokümanda Birebir Olacak)

- **`BR-01 (Taşınmaz Ticareti Yetki Belgesi):`** Emlakçı kaydında `ttbs_document_no` Ticaret Bakanlığı mock doğrulama servisinden geçmeden emlakçı hesabı aktifleşemez.
- **`BR-02 (Tekil E-Posta):`** Sisteme kayıt olan kullanıcılarda (`users.email`) e-posta adresi tekildir; aynı e-posta ile ikinci kayıt açılamaz.
- **`BR-03 (Sahipsiz Ev Olmaz):`** `properties.owner_customer_id` boş bırakılamaz. Emlak ekleme ekranında müşteri listede yoksa aynı ekrandaki hızlı müşteri ekleme modalı ile müşteri oluşturulup ilana bağlanır.
- **`BR-04 (İlan Yüklerken Kimlik Doğrulama):`** İlan kaydedilirken mülk sahibinin 11 haneli TC Kimlik Numarası kontrol edilir (`is_owner_id_verified = True`).
- **`BR-05 (Yazıcı Çıktısı / Bilgi Fişi):`** Emlak arama sonucunda eşleşen her kayıt için işyeri bilgileri, emlak özellikleri ve müşteri bilgisini içeren kurumsal yazıcı/PDF çıktısı alınabilmelidir.
- **`BR-06 (Randevu Saat Kapatma Çakışma Kontrolü):`** Emlakçı belirli bir saat aralığını manuel kapatmak istediğinde o saatte zaten aktif bir randevu varsa sistem kapatma işlemini engeller ve uyarı verir.
- **`BR-07 (Son 6 Saat İptal Kuralı):`** Randevu başlangıç saatine **6 saatten az** süre kalmışsa randevu ne müşteri ne emlakçı tarafından iptal edilemez.
- **`BR-08 (Rol & Girişsiz Erişim):`** Giriş yapmayan ziyaretçiler tüm aktif ilanları görebilir ve klasik arama yapabilir; ancak **AI Doğal Dil Akıllı Arama**, **Favorilere Ekleme** ve **Randevu Alma** işlemleri için müşteri girişi zorunludur.

---

## 6. Parça Parça Geliştirme Sırası ve Commit Standardı

Yeni bir parça istendiğinde sadece o parçanın kapsamını tam ve eksiksiz uygula, önceki parçaları bozma:

- **`P0`**: Repo İskeleti, PostgreSQL Bağlantısı & Astryx Kurulumu (`chore(P0): ...`) — **[TAMAMLANDI / AKTİF]**
- **`P1`**: PostgreSQL Veritabanı Şeması (7 Tablo) & Gerçekçi Seed Data (`feat(P1): ...`)
- **`P2`**: Kayıt/Giriş (Emlakçı & Müşteri) + İşyeri Tanımı & TTBS Yetki Belgesi Doğrulama (`feat(P2): ...`)
- **`P3`**: Müşteri Yönetimi (Alıcı/Satıcı/Kiralayan/Kiracı) & Yan Panel (Slide-over Drawer) Detay (`feat(P3): ...`)
- **`P4`**: Portföy Yönetimi — Sahipsiz Ev Engeli, Hızlı Müşteri Bağlama & Kimlik Kontrolü (`feat(P4): ...`)
- **`P5`**: Emlak Arama, Müşteri Talebi Eşleştirme & Kurumsal Yazıcı/PDF Çıktısı (`feat(P5): ...`) *(GİB MVP Bitişi)*
- **`P6`**: Yapay Zeka (AI) Doğal Dil Akıllı Arama & Müşteri–Ev Eşleştirme (`feat(P6): ...`)
- **`P7`**: Müşteri Vitrini (Girişsiz İlan Gezme, Favoriler & Ev Satma / Emlakçı Seçme Talebi) (`feat(P7): ...`)
- **`P8`**: Randevu & Takvim Yönetimi (Google Calendar Görünümü, Manuel Saat Kapatma, 6 Saat Kuralı, Geçmiş Notlar) (`feat(P8): ...`)
- **`P9`**: Raporlama Dashboard'u, Pytest İş Kuralları Test Paketi & Analist Veritabanı Dokümanı Üretici (`feat(P9): ...`)

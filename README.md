# GİB e-Emlak — Kurumsal Taşınmaz ve Emlak İşletmesi Yönetim Platformu

> **Gelir İdaresi Başkanlığı (GİB) İş Analisti Case Çalışması — Emlakçı Platformu**
>
> **AI Ajanları İçin Zorunlu Not:** Bu repoda çalışan tüm AI asistanları (Antigravity, Cursor, Claude Code, Copilot vb.) herhangi bir geliştirme yapmadan önce **[`AI_CONTEXT.md`](./AI_CONTEXT.md)** ve **[`frontend/AGENTS.md`](./frontend/AGENTS.md)** dosyalarını okumak zorundadır.

---

## 1. Proje Özeti ve Vizyon

**GİB e-Emlak**, emlak işletmelerinin günlük operasyonlarını (işyeri tanımı, müşteri portföyü, gayrimenkul yönetimi, talep eşleştirme, kurumsal yazıcı/PDF bilgi fişi çıktısı, randevu takvimi ve performans raporlaması) yönetirken; kamu mevzuatı (**Ticaret Bakanlığı Taşınmaz Ticareti Yetki Belgesi** ve **Kimlik/İlan Doğrulama**) ile tam uyumlu çalışan, yapay zeka destekli bir platformdur.

### Neden "Tekil Emlak İşletmesi + Çoklu Acente Vitrini" Mimarisi?
GİB Case çalışmasında istenen 4 temel modül (**1. İşyeri Tanımı, 2. Müşteri Tanımı, 3. Emlak Tanımı, 4. Emlak Arama & Yazıcı Çıktısı**) emlakçı panelinde **her emlak işletmesi için izole (`agency_id`)** olarak birebir çalışır. Bunun üzerine eklediğimiz **Müşteri Vitrini** sayesinde:
- Sisteme giriş yapan bir **Emlakçı**, kendi ofisini, kendi müşterilerini, kendi portföyünü ve takvimini tek bir emlak işletmesi programı gibi yönetir.
- **Alıcı / Kiracı Müşteriler** ise vitrin arayüzünde kayıtlı emlak işletmelerinin aktif ilanlarını inceleyebilir, doğal dille AI akıllı arama yapabilir, favorilerine ekleyebilir ve emlakçılardan randevu talep edebilir.

---

## 2. Teknoloji Yığını (Tech Stack)

| Katman | Teknoloji | Açıklama |
| :--- | :--- | :--- |
| **Frontend** | **React 19 + Vite + TypeScript** | Hızlı, modüler SPA mimarisi (Next.js kullanılmaz) |
| **UI / Tasarım** | **Astryx Design System + StyleX** | `@astryxdesign/core`, `@astryxdesign/theme-neutral`, `@stylexjs/stylex` |
| **Backend** | **FastAPI (Python 3.11+)** | REST API + Otomatik OpenAPI / Swagger UI (`/docs`) |
| **Veritabanı** | **PostgreSQL 16 + SQLAlchemy 2.0** | Tam ilişkisel veritabanı (Foreign Key, Enum, Constraint yapısı) |
| **DB Görsel Arayüz** | **pgAdmin 4 (Web GUI)** | MongoDB Compass benzeri tarayıcı tabanlı PostgreSQL tablo görüntüleyici (`http://localhost:5050`) |
| **Test Araçları** | **Pytest + FastAPI TestClient** | İş kuralları (`BR-01`..`BR-08`) ve GİB Altın Senaryo otomatik testleri |

---

## 3. PostgreSQL'i Mac'te MongoDB Compass Gibi Görsel Kullanma Rehberi

Bilgisayarında ekstra bir veritabanı programı kurmana gerek kalmadan **2 farklı şekilde** PostgreSQL tablolarını görsel olarak (MongoDB Compass gibi) açıp inceleyebilirsin:

### Yöntem A: Docker ile Lokal PostgreSQL 16 + pgAdmin 4 (Tarayıcıda Görsel Tablo Ekranı)
Repodaki `docker-compose.yml` hem **PostgreSQL 16** veritabanını hem de **pgAdmin 4** görsel arayüzünü otomatik bağlı şekilde ayağa kaldırır:

```bash
docker compose up -d
```

1. Tarayıcıdan **[http://localhost:5050](http://localhost:5050)** adresine git.
2. Otomatik giriş açık olduğu için (veya `admin@gibemlak.local` / şifre: `admin123`) direkt açılır.
3. Sol menüde **Servers → GIB e-Emlak PostgreSQL → Databases → gib_emlak_db → Schemas → public → Tables** altında tüm tabloları görebilir, sağ tıklayıp **"View/Edit Data → All Rows"** diyerek MongoDB Compass gibi satırları inceleyip düzenleyebilirsin!

### Yöntem B: Mac Masaüstü Uygulaması İstersen (Opsiyonel)
Mac'te MongoDB Compass kadar şık ve ücretsiz bir masaüstü uygulaması istersen **[TablePlus](https://tableplus.com/)** veya **[DBeaver](https://dbeaver.io/)** indirip şu bilgilerle tek tıkla bağlanabilirsin:
- **Host:** `localhost` | **Port:** `5432`
- **User:** `gib_user` | **Password:** `gib_password`
- **Database:** `gib_emlak_db`

*(Not: İsterseniz `backend/.env` içindeki `DATABASE_URL` satırına ücretsiz bir **Neon.tech** veya **Supabase** bulut PostgreSQL linki yapıştırarak Docker bile açmadan Gökhan ve Güven aynı ortak bulut PostgreSQL veritabanına bağlanabilir!)*

---

## 4. Hızlı Kurulum ve Çalıştırma

### 1) Veritabanını Başlat (Docker)
```bash
docker compose up -d
```

### 2) Backend'i Başlat (`http://localhost:8000`)
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
- **Swagger API Dokümantasyonu:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Sağlık & DB Kontrolü:** [http://localhost:8000/api/health](http://localhost:8000/api/health)

### 3) Frontend'i Başlat (`http://localhost:5173`)
```bash
cd frontend
npm install
npm run dev
```

---

## 5. Parça Parça (P0 – P9) Geliştirme Planı ve Commit Standardı

Gökhan ve Güven olarak `main` dalı üzerinde sıra bazlı (**"Bayrak kimde?"**) ilerliyoruz. Her parçayı AI'a verirken **"AI_CONTEXT.md dosyasını oku ve Parça PX'i uygula"** dememiz yeterlidir.

| Parça | Durum | Başlık & Kapsam | Standart Commit Mesajı |
| :--- | :---: | :--- | :--- |
| **`P0`** | ✅ | **Repo İskeleti, PostgreSQL & Astryx Kurulumu:** FastAPI + PostgreSQL bağlantısı, React 19 + Vite + Astryx (`neutral` tema) kurumsal App Shell, `AI_CONTEXT.md` ve `docker-compose.yml`. | `chore(P0): repo iskeleti postgresql ve astryx design system kurulumu` |
| **`P1`** | ⏳ | **PostgreSQL Veritabanı Şeması & Seed Data:** 7 ana tablonun (`agencies`, `users`, `customers`, `properties`, `customer_search_requests`, `appointments`, `blocked_slots`, `favorites`) ilişkisel kurulumu ve gerçekçi başlangıç verileri. | `feat(P1): postgresql iliskisel veritabani semasi ve ornek seed verileri` |
| **`P2`** | ⏳ | **Auth, İşyeri Tanımı & Yetki Belgesi Doğrulama:** Emlakçı/Müşteri kayıt ve giriş ekranları, Ticaret Bakanlığı Taşınmaz Ticareti Yetki Belgesi mock doğrulaması, GİB Madde 1 İşyeri Tanımı ekranı. | `feat(P2): auth kurgusu isyeri tanimi ve ticaret bakanligi yetki belgesi dogrulama` |
| **`P3`** | ⏳ | **Müşteri Yönetimi & Yan Panel (Drawer) Detay:** Alıcı, Satıcı, Kiralayan, Kiracı müşteri tablosu, yeni müşteri kaydı ve sayfadan ayrılmadan yan panelde müşteri + gayrimenkul detayları (GİB Madde 2). | `feat(P3): musteri yonetimi ekranlari filtreleme ve yan panel detay gorunumu` |
| **`P4`** | ⏳ | **Portföy Yönetimi (Sahipsiz Ev Olmaz & Kimlik Kontrolü):** Emlak kaydı, mülk sahibi seçimi zorunluluğu, form içinden hızlı müşteri ekleme modalı ve TC Kimlik doğrulaması (GİB Madde 3). | `feat(P4): portfoy yonetimi sahipsiz ev engeli hizli musteri baglama ve kimlik kontrolu` |
| **`P5`** | ⏳ | **Emlak Arama, Talep Eşleştirme & Yazıcı/PDF Çıktısı:** Alıcı/Kiracı müşteri talebine göre emlak sorgulama ve kurumsal A4 Emlak Bilgi Fişi yazıcı/PDF çıktısı (GİB Madde 4 & Altın Senaryo tamamlanması). | `feat(P5): musteri talebine gore emlak arama ve kurumsal yazici pdf ciktisi` |
| **`P6`** | ⏳ | **Yapay Zeka (AI) Doğal Dil Akıllı Arama & Eşleştirme:** Doğal dil tasviriyle ilan eşleştirme (% uyum skoru + gerekçe) ve Müşteri Yönetimi içinde Akıllı Eşleştirme. | `feat(P6): yapay zeka destekli dogal dil akilli emlak arama ve musteri eslestirme` |
| **`P7`** | ⏳ | **Müşteri Vitrini, Favoriler & Ev Satma Talebi:** Girişsiz ilan gezme, üye müşteriye özel AI arama, favorilere ekleme ve emlakçı listeleyerek mülk satış/kiralama başvurusu. | `feat(P7): musteri vitrini girissiz ilan gezme favoriler ve emlakci secerek mulk satma talebi` |
| **`P8`** | ⏳ | **Randevu & Takvim Yönetimi:** Google Calendar görünümü, emlakçı manuel saat kapatma (çakışma kontrolüyle), fiziki/telefon randevu, son 6 saat iptal yasağı ve geçmiş randevulara not ekleme. | `feat(P8): takvim ve randevu yonetimi manuel saat kapatma 6 saat iptal kurali ve gecmis notlar` |
| **`P9`** | ⏳ | **Raporlama, Pytest Test Paketi & Analist DB Çıktısı:** Randevu/satış/kiralama raporları, `pytest` iş kuralları testleri ve iş analisti ekibi için otomatik ERD + Tablo Sözlüğü üretimi. | `feat(P9): raporlama ekrani pytest is kurallari test paketi ve analist veritabani dokumani` |

---

## 6. Ekip Çalışma Kuralı (Gökhan & Güven)

1. Başlamadan önce mutlaka: `git pull origin main`
2. AI asistanına komutu şu kalıpla ver:
   > *"Önce `AI_CONTEXT.md` ve `frontend/AGENTS.md` dosyalarını oku. Şimdi `PX` parçasını eksiksiz uygula ve test et."*
3. Bitince tabloda yazan standart commit mesajıyla pushla:
   ```bash
   git add .
   git commit -m "feat(PX): ..."
   git push origin main
   ```

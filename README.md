# GİB e-Emlak — Kurumsal Taşınmaz ve Emlak İşletmesi Yönetim Platformu

> **Gelir İdaresi Başkanlığı (GİB) İş Analisti Case Çalışması — Emlakçı Platformu**
>
> **AI Ajanları İçin Zorunlu Not:** Bu repoda çalışan tüm AI asistanları (Antigravity, Cursor, Claude Code, Copilot vb.) herhangi bir geliştirme yapmadan önce **[`AI_CONTEXT.md`](./AI_CONTEXT.md)** ve **[`frontend/AGENTS.md`](./frontend/AGENTS.md)** dosyalarını okumak zorundadır.

---

## 1. Proje Özeti ve Mimari Yaklaşım

**GİB e-Emlak**, emlak işletmelerinin günlük operasyonlarını (işyeri tanımı, müşteri portföyü, gayrimenkul yönetimi, detaylı ilan arama/filtreleme, kurumsal yazıcı/PDF bilgi fişi çıktısı, randevu takvimi, yapay zeka destekli eşleştirme ve performans raporlaması) yönetirken; kamu mevzuatı (**Ticaret Bakanlığı Taşınmaz Ticareti Yetki Belgesi** ve **Kimlik/İlan Doğrulama**) ile tam uyumlu çalışan bir platformdur.

### Emlak İşletmesi Paneli + Ortak Müşteri Vitrini
- **Emlakçı (İşletme) Paneli:** Sisteme giriş yapan her emlak işletmesi (`agency_id` izolasyonu ile) kendi ekranında **sadece kendi işyeri bilgilerini, kendi müşterilerini, kendi gayrimenkul portföyünü, kendi randevu takvimini ve kendi raporlarını** yönetir. (GİB Case çalışmasındaki 1. İşyeri Tanımı, 2. Müşteri Tanımı, 3. Emlak Tanımı, 4. Emlak Arama & Yazıcı Çıktısı gereksinimlerini birebir karşılar).
- **Müşteri Vitrini:** Kayıtlı emlak işletmelerinin aktif ilanları ortak müşteri vitrininde listelenir. Alıcı ve kiracılar giriş yapmadan tüm ilanları gezebilir ve filtreleyebilir; giriş yaptıklarında ise doğal dille AI akıllı arama yapabilir, favorilere ekleyebilir, randevu alabilir veya *"Ev Satacağım / Kiraya Vereceğim"* akışıyla kayıtlı emlakçıları listeleyip başvurabilir.

---

## 2. Teknoloji Yığını (Tech Stack)

| Katman | Teknoloji | Açıklama |
| :--- | :--- | :--- |
| **Frontend** | **React 19 + Vite + TypeScript** | Hızlı, modüler SPA mimarisi (Next.js kullanılmaz) |
| **UI / Tasarım** | **Astryx Design System + StyleX** | `@astryxdesign/core`, `@astryxdesign/theme-neutral`, `@stylexjs/stylex` |
| **Backend** | **FastAPI (Python 3.11+)** | REST API + Otomatik OpenAPI / Swagger UI (`/docs`) |
| **Veritabanı** | **PostgreSQL 16 + SQLAlchemy 2.0** | Tam ilişkisel veritabanı (Foreign Key, Enum, Constraint yapısı) |
| **DB Görsel Arayüz** | **pgAdmin 4 (Web GUI)** | Tarayıcı tabanlı görsel PostgreSQL tablo yönetim ekranı (`http://localhost:5050`) |

---

## 3. Hızlı Kurulum ve Çalıştırma

### 1) PostgreSQL Veritabanını ve Görsel Arayüzü Başlat (Docker)
```bash
docker compose up -d
```
- **Görsel Tablo Arayüzü (pgAdmin 4):** [http://localhost:5050](http://localhost:5050) (Sol menüden `Servers -> GIB e-Emlak PostgreSQL -> Databases -> gib_emlak_db -> Schemas -> public -> Tables` yolunu izleyin; şifre sorarsa: `gib_password`).

### 2) Backend'i Başlat (`http://localhost:8000`)
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.seed
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

## 4. Parça Parça (P0 – P11) Geliştirme Planı (Önem ve Karmaşıklık Sırasına Göre)

Proje, temel omurgadan başlayıp en karmaşık özelliklere (Takvim kuralları, AI doğal dil arama ve Raporlama) doğru ilerleyen **12 bağımsız ama birbiriyle tam uyumlu parçaya** ayrılmıştır:

### `P0` — Repo İskeleti, PostgreSQL Bağlantısı ve Astryx UI Kurulumu ✅
- **Kapsam:**
  - `backend/`: FastAPI kurulumu, PostgreSQL bağlantı katmanı (`database.py`), CORS, `/api/health` endpoint'i.
  - `frontend/`: React 19 + Vite + TypeScript + Astryx (`neutral` teması) kurulumu, `AppShell` ve `SideNav` kurumsal şablonu.
  - `docker-compose.yml`: PostgreSQL 16 + pgAdmin 4 görsel veritabanı arayüzü.
- **Standart Commit:** `chore(P0): repo iskeleti, postgresql, astryx ui ve ai ajan rehberleri kuruldu`

---

### `P1` — PostgreSQL İlişkisel Veritabanı Şeması (8 Tablo) ve Başlangıç Verileri (Seed Data) ✅
- **Kapsam:**
  - Tüm parçaların bağlamdan kopmadan kullanacağı ilişkisel PostgreSQL tablolarının oluşturulması:
    1. `agencies` (İşyeri / Emlak Ofisi bilgileri ve Yetki Belge No)
    2. `users` (Emlakçı ve Kayıtlı Müşteri giriş hesapları)
    3. `customers` (Alıcı, Satıcı, Kiralık Mülk Sahibi ve Kiracı müşteri kayıtları)
    4. `properties` (Satılık/Kiralık gayrimenkul portföyü, teknik özellikler ve emlakçı tasviri)
    5. `customer_search_requests` (Müşterilerin aradığı emlak kriterleri ve talep kayıtları)
    6. `appointments` (Fiziki / Telefon randevuları ve geçmiş görüşme notları)
    7. `blocked_slots` (Emlakçının takvimde manuel kapattığı saat aralıkları)
    8. `favorites` (Kayıtlı müşterilerin favori ilanları)
  - `app/seed.py`: Gerçekçi başlangıç verileri (2 emlak ofisi, 6 müşteri, 8 detaylı gayrimenkul ilanı, örnek arama talepleri, randevular ve kapatılmış saat dilimleri).
- **Standart Commit:** `feat(P1): postgresql iliskisel veritabani semasi ve ornek seed verileri eklendi`

---

### `P2` — Kullanıcı Kayıt / Giriş (Emlakçı & Müşteri) ve Yetki Belgesi Doğrulama ✅
- **Kapsam:**
  - **Ortak Kayıt Alanları:** Ad / Soyad, E-posta (**tek kayıt kuralı** — aynı e-posta ile ikinci kayıt engeli), Şifre oluşturma, Cep Telefonu.
  - **Emlakçıya Özel Kayıt Alanları:** **Taşınmaz Ticareti Yetki Belgesi No** (Ticaret Bakanlığı mock servisi üzerinden doğrulama kontrolü), Emlak Ofisi İsmi, Emlak Ofisi Logosu, Ofis Telefonu.
  - **Giriş Ekranı & Rol Yönetimi:** Emlakçı girişi, Müşteri girişi ve **Kayıt Olmadan (Ziyaretçi Olarak) İlanlara Bakma** geçişi.
- **Standart Commit:** `feat(P2): emlakci ve musteri kayit giris ekranlari ile yetki belgesi dogrulama`

---

### `P3` — İşyeri (Emlak Ofisi) Tanımı ve Kurumsal Profil Yönetimi (GİB 1. Madde) ⏳
- **Kapsam:**
  - Programı kullanan emlak işletmesinin tüm kurumsal bilgilerinin görüntülendiği ve güncellendiği ekran:
    - **Alanlar:** İşletme Adı (Emlak Ofisi İsmi), Yetkili Kişi Adı Soyadı, Açık Adres, Ofis Sabit Telefonu, Cep Telefonu, Fax, Vergi Dairesi / Vergi No, Taşınmaz Ticareti Yetki Belgesi No (doğrulanmış durum rozeti), Emlak Ofisi Logosu ve Kurumsal Tanıtım Yazısı.
  - Bu bilgiler arama sonuçlarında alınan **Yazıcı / PDF Bilgi Fişi** çıktısının üst başlığında otomatik kullanılır.
- **Standart Commit:** `feat(P3): isyeri tanimi ekrani ve emlak ofisi kurumsal bilgi yonetimi`

---

### `P4` — Müşteri Yönetimi, Filtreleme Tablosu ve Yan Panel (Drawer) Detay (GİB 2. Madde) ⏳
- **Kapsam:**
  - **Manuel Müşteri Kayıt Ekranı:** Emlakçının müşterilerini kaydettiği form (Adı, Soyadı, Cep Telefonu [zorunlu], Ev Telefonu [opsiyonel], E-posta Adresi, TC Kimlik No, Müşteri Tipi: **Alıcı / Satıcı / Kiralık Mülk Sahibi / Kiracı**, Açıklama/Not).
  - **Müşteri Listeleme, Arama ve Sıralama Tablosu:**
    - Müşteri kategorisine göre filtreleme sekmeleri (**Tümü, Alıcı, Satıcı, Kiralık Mülk Sahibi, Kiracı**),
    - İsim, telefon veya e-postaya göre anlık arama ve tablo sıralama.
  - **Yan Sayfada (Slide-over Drawer) Detay Görünümü:** Tablodaki her müşterinin yanında bulunan **"Detaylar / Gayrimenkuller"** butonuna basıldığında sayfadan geri gitmeden yan panel açılır; müşterinin iletişim bilgileri, **üzerine kayıtlı gayrimenkuller (evler)** ve randevu/arama geçmişi aynı ekranda incelenir.
- **Standart Commit:** `feat(P4): musteri yonetimi filtreleme tablosu ve yan panel gayrimenkul detay ekrani`

---

### `P5` — Portföy (Emlak) Yönetimi, "Sahipsiz Ev Olmaz" Kuralı ve Kimlik Kontrolü (GİB 3. Madde) ⏳
- **Kapsam:**
  - **Yeni Emlak / İlan Kayıt Ekranı:**
    - **Teknik Özellikler:** İlan Başlığı, İşlem Türü (**Satılık / Kiralık**), Emlak Türü (**Daire, Villa, İşyeri, Arsa**), Fiyat (TL), Brüt Metrekare (m²), Net Metrekare (m²), Oda Sayısı (`1+0`, `1+1`, `2+1`, `3+1`, `4+1`, `5+1+`), Bulunduğu Kat, Bina Toplam Kat Sayısı, Isınma Türü (**Doğalgaz Kombi, Merkezi Sistem, Yerden Isıtma, Klima, Soba**), İl, İlçe, Mahalle, Açık Adres, İlan Görseli.
    - **Emlakçı Özel Tasviri:** Emlakçının ilanın altına kendi cümleleriyle eklediği detaylı açıklama ve ev tasviri.
  - **İş Kuralı 1 — Sahipsiz Ev Olmaz:** Sisteme mülk sahibi atanmamış (sahipsiz) hiçbir ev kaydedilemez. Yeni emlak kayıt ekranında mülk sahibi müşteri seçilir; **eğer müşteri henüz sistemde kayıtlı değilse aynı ekrandaki "+ Yeni Müşteri Ekle" butonu/modalı ile müşteri anında kaydedilir ve girilen ev ile otomatik bağlanır.**
  - **İş Kuralı 2 — Kimlik ID Kontrolü:** İlan yüklenirken mülk sahibinin 11 haneli TC Kimlik ID doğrulaması kontrol edilir.
  - **Portföy Listeleme & Durum Güncelleme:** Portföydeki evleri filtreleme ve durumunu **Aktif / Satıldı / Kiralandı** olarak güncelleme.
- **Standart Commit:** `feat(P5): portfoy yonetimi sahipsiz ev engeli hizli musteri baglama ve kimlik kontrolu`

---

### `P6` — Detaylı İlan Arama, Çoklu Filtreleme ve Yazıcı / PDF Çıktısı (GİB 4. Madde & Altın Senaryo) ⏳
- **Kapsam:**
  - **Alıcı / Kiracı Müşteri Talebi ve Çoklu Filtreleme Ekranı:**
    - Emlakçı, arayan müşteriyi seçerek (veya doğrudan arama ekranında) müşterinin taleplerini girer ve uygun emlak olup olmadığını sorgular.
    - **Detaylı Filtreler:** İşlem Türü (Satılık / Kiralık), Emlak Türü (Daire / Villa / İşyeri / Arsa), İl / İlçe / Mahalle arama, Fiyat Aralığı (Min–Max TL), Metrekare Aralığı (Min–Max m²), Oda Sayısı filtresi, Bulunduğu Kat ve Bina Katı filtresi, Isınma Türü filtresi, Kelime ile Arama ve Sıralama (Fiyat artan/azalan, Metrekare, Tarih).
  - **Kurumsal Yazıcı Çıktısı (PDF Bilgi Fişi):**
    - Talebe uygun kayıt geldiğinde **"Yazıcı Çıktısı Al / PDF"** butonuyla; üstte Emlak Ofisi Logosu, İşyeri ve Yetki Belgesi bilgileri, ortada Emlakın tüm teknik özellikleri ve emlakçı tasviri, altta müşteri ve danışman iletişim bilgilerini içeren **A4 Yazıcı / PDF Bilgi Fişi** üretilir.
  - *(Bu parça tamamlandığında GİB slaytlarındaki ana senaryo %100 uçtan uca çalışır hale gelir.)*
- **Standart Commit:** `feat(P6): detayli emlak arama filtreleme talep sorgulama ve yazici pdf ciktisi`

---

### `P7` — Müşteri Vitrini: Girişsiz İlan Gezme, Favoriler ve "Ev Satacağım" Emlakçı Listeleme ⏳
- **Kapsam:**
  - **Giriş Yapmadan (Ziyaretçi Modu):** Sisteme giriş yapmayan herkes tüm emlakçı ilanlarını görebilir, tüm klasik filtreleri (Satılık/Kiralık, tür, fiyat, m², oda, kat, ısınma, konum) kullanarak ilan arayabilir ve ilan detaylarını inceleyebilir.
  - **Kayıtlı Müşteri Özellikleri:**
    - İlanları **Favorilere Ekleme / Çıkarma** ve **Favorilerim** listesi,
    - İlan detayından doğrudan randevu alma penceresine geçiş,
    - **"Ev Satacağım / Kiraya Vereceğim" & Emlakçı Listeleme Seçeneği:** Müşteri evini satmak veya kiraya vermek istediğinde platformdaki yetki belgeli emlak ofislerini (ofis logosu, adı, adresi, telefonu ve aktif portföy sayısıyla) listeler, istediği emlakçıyı seçerek satış/kiralama başvurusu veya randevusu oluşturur.
- **Standart Commit:** `feat(P7): musteri vitrini girissiz ilan gezme favoriler ve ev satacagim emlakci listeleme`

---

### `P8` — Randevu Yönetimi — Bölüm 1: Google Calendar Takvim Görünümü ve Manuel Saat Kapatma ⏳
- **Kapsam:**
  - **Emlakçı Takvim Ekranı:** Google Calendar tarzı haftalık ve günlük saat dilimli (`09:00` – `21:00`) görsel takvim arayüzü.
  - **Müsaitlik Görme & Manuel Saat Kapatma (Reddetme Yok):**
    - Müşteri randevu alırken emlakçının gerçek zamanlı müsaitliğini görür.
    - Onay/reddetme karmaşası yerine emlakçı müsait olmadığı saatleri (örneğin `19:00–20:00` arasını) takvim üzerinde tek tıkla **"Manuel Kapalı / Meşgul"** olarak kapatır ve o saatler müşteri ekranında seçilemez olur.
    - **Çakışma Kontrolü:** Emlakçı zaten aktif randevusu olan bir saati kapatmaya çalışırsa sistem uyarı verir ve engeller.
- **Standart Commit:** `feat(P8): google calendar tarzi emlakci takvimi ve manuel saat kapatma sistemi`

---

### `P9` — Randevu Yönetimi — Bölüm 2: Randevu Alma (Fiziki/Telefon), 6 Saat Kuralı ve Geçmiş Notlar ⏳
- **Kapsam:**
  - **Randevu Oluşturma (Müşteri & Emlakçı):**
    - **Randevu Seçeneği:** **Fiziki Görüşme (Yerinde Gösterim / Ofis)** veya **Telefon Görüşmesi** seçimi.
    - Hem müşteri müsait saatlerden randevu alabilir hem de emlakçı kendi takvimine manuel randevu ayarlayabilir.
  - **Son 6 Saat İptal Kuralı:** Randevular başlangıç saatine **en geç 6 saat kala** iptal edilebilir. Randevuya 6 saatten az süre kalmışsa iptal butonu pasifleşir ve API iptal isteğini reddeder.
  - **Tarih Aralığı Seçerek Geçmiş Randevulara Not Ekleme Ekranı:** Emlakçı başlangıç ve bitiş tarihi seçerek geçmiş randevuları filtreler ve her randevunun içine görüşme özeti / müşteri değerlendirme notu ekler.
- **Standart Commit:** `feat(P9): fiziki ve telefon randevu alma son 6 saat iptal kurali ve gecmis randevu notlari`

---

### `P10` — Yapay Zeka (AI) Destekli Doğal Dil Akıllı Arama ve Müşteri–Ev Eşleştirme ⏳
- **Kapsam:**
  - **Müşteri Girişinde Doğal Dil ile Akıllı Arama:** Giriş yapan müşteri aradığı evi doğal dille tasvir eder (örn. *"Bahçeli veya geniş balkonlu, kombili, en az 3+1, ara katta, okul ve metroya yakın kiralık daire"*). Yapay zeka motoru hem ilanların teknik alanlarını hem de **emlakçının yazdığı özel tasviri** analiz ederek en uygun ilanları **% Eşleşme Oranı** ve eşleşme nedenleriyle sıralar.
  - **Müşteri Yönetimi İçinde Akıllı Emlak Eşleştirme:** Emlakçı, Müşteri Yönetimi ekranının içindeki **Akıllı Emlak Eşleştir** modülüyle seçtiği müşterinin profil ve taleplerini portföydeki evlerle yapay zeka üzerinden eşleştirir.
- **Standart Commit:** `feat(P10): yapay zeka destekli dogal dil akilli emlak arama ve musteri ev eslestirme`

---

### `P11` — Raporlama ve Performans Analitiği Ekranı ⏳
- **Kapsam:**
  - Emlakçının iş performansını görsel kartlar ve tablolarla izlediği raporlama ekranı:
    - **Randevu Saat Analizi:** Randevuların hangi saat dilimlerinde yoğunlaştığı (kaçta kaç randevu oluştuğu), fiziki vs telefon randevu dağılımı.
    - **Satış ve Kiralama Performansı:** Satılan evler listesi ve toplam sayısı, kiralanan evler listesi ve toplam sayısı, toplam portföy dönüşüm oranı.
    - **Müşteri İşlem Raporu:** Müşterilere göre kaç ev satıldığı / kaç ev kiralandığı kırılım tablosu.
- **Standart Commit:** `feat(P11): emlakci performans raporlama satis kiralama ve randevu saat istatistikleri`

---

## 5. Geliştirme ve Commit Çalışma Düzeni

1. Geliştirmeye başlamadan önce güncel kodu çekin:
   ```bash
   git pull origin main
   ```
2. AI asistanına ilgili parçayı şu komutla verin:
   > *"Önce `AI_CONTEXT.md` ve `frontend/AGENTS.md` dosyalarını oku. Şimdi `PX` parçasını eksiksiz uygula ve test et."*
3. Parça tamamlanıp test edildikten sonra standart commit mesajıyla gönderin:
   ```bash
   git add .
   git commit -m "feat(PX): ..."
   git push origin main
   ```

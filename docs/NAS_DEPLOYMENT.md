# Ev / NAS Sunucusu Kurulum Rehberi (CI/CD + Cloudflare Tunnel + Watchtower)

Bu rehber, **GİB e-Emlak** uygulamasını evdeki x86_64 (`linux/amd64`) NAS sunucunda **hiçbir port açmadan**, **GitHub Actions → GHCR → Watchtower** otomatik güncelleme hattıyla ve **Cloudflare Tunnel** üzerinden yayınlamak için hazırlanmıştır.

---

## Mimari Akış

```text
GitHub (main push)
   └─▶ GitHub Actions (.github/workflows/ci-cd.yml)
         ├─ 1. Verify: Backend compileall + Frontend tsc/vite build
         └─ 2. Build & Push (linux/amd64):
               • ghcr.io/gokhanbay05/gib-e-emlak-backend:latest
               • ghcr.io/gokhanbay05/gib-e-emlak-frontend:latest

Ev / NAS Sunucusu (docker-compose.prod.yml — Sıfır Açık Port)
   ├─ watchtower  ──(her 5 dk)──▶ sadece backend & frontend imajlarını günceller
   ├─ cloudflared ──(outbound)──▶ Cloudflare Zero Trust Tüneli
   │                                 └─▶ Public Hostname: http://frontend:80
   ├─ frontend (Nginx) ──▶ React SPA + /api/* & /uploads/* → http://backend:8000
   ├─ backend (FastAPI/Uvicorn) ──▶ postgres:5432 + gib_backend_uploads volume
   └─ postgres:16-alpine ──▶ gib_postgres_data volume (Watchtower dışı)
```

---

## Adım 1 — GitHub Actions & GHCR İmajlarını Hazırlama

1. Bu değişiklikleri `main` branch'ine pushladığında **GitHub → Actions** sekmesinde `CI/CD — Verify, Build & Push to GHCR` otomatik çalışır.
2. İşlem bittiğinde GitHub profilindeki **Packages** sekmesinde iki paket oluşur:
   - `gib-e-emlak-backend`
   - `gib-e-emlak-frontend`
3. **Erişim Ayarı (Seçenek A — En Kolay):**
   - Her iki paketin **Package Settings → Change visibility → Public** yaparsan NAS sunucusunda Watchtower için ekstra token/login gerekmez.
4. **Erişim Ayarı (Seçenek B — Paketler Private Kalacaksa):**
   - GitHub'dan `read:packages` yetkili bir Personal Access Token (PAT) oluştur.
   - NAS sunucusunda bir kez giriş yap:
     ```bash
     echo "<GITHUB_PAT>" | docker login ghcr.io -u gokhanbay05 --password-stdin
     ```
   - `docker-compose.prod.yml` içindeki `watchtower` servisinde `config.json` satırının yorumunu kaldır.

---

## Adım 2 — Cloudflare Tunnel Oluşturma (Port Açmadan)

1. [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/) → **Networks → Tunnels → Create a tunnel**.
2. **Cloudflared** seçeneğini seç, tünele bir isim ver (örn. `gib-e-emlak-nas`).
3. Ekranda verilen token'ı (`eyJhIjoi...`) kopyala.
4. Tünelin **Public Hostname** sekmesine gir → **Add a public hostname**:
   - **Subdomain / Domain:** `emlak.senindomainin.com`
   - **Service Type:** `HTTP`
   - **URL:** `frontend:80`
5. Kaydet. Artık modemde port yönlendirmesi (port forwarding) yapmana gerek yok.

---

## Adım 3 — NAS Sunucusunda Ayağa Kaldırma

NAS sunucunda bir klasör aç (tüm repoyu klonlamana gerek yok; yalnızca `docker-compose.prod.yml` ve `.env.prod.example` yeterlidir):

```bash
mkdir -p ~/gib-e-emlak && cd ~/gib-e-emlak
# docker-compose.prod.yml ve .env.prod.example dosyalarını bu klasöre kopyala
cp .env.prod.example .env.prod
nano .env.prod
```

`.env.prod` içinde en az şu iki alanı doldur:
- `POSTGRES_PASSWORD` (güçlü bir şifre)
- `CLOUDFLARE_TUNNEL_TOKEN` (Adım 2'de aldığın token)

Ardından tüm stack'i başlat:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

Durum ve log kontrolü:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f cloudflared watchtower
```

---

## Adım 4 — Opsiyonel Yerel pgAdmin (Sadece Gerektiğinde)

Güvenlik için `pgadmin` varsayılan olarak kapalıdır. İhtiyaç duyduğunda yalnızca NAS'ın `127.0.0.1:5050` adresinden (örneğin SSH tüneli ile) açmak için:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml --profile tools up -d
```

---

## Watchtower Nasıl Çalışıyor?

- `WATCHTOWER_LABEL_ENABLE=true` olduğu için **yalnızca** `com.centurylinklabs.watchtower.enable=true` etiketli **`backend`** ve **`frontend`** container'ları izlenir.
- `postgres` ve `cloudflared` otomatik yeniden başlatma kapsamı dışındadır.
- Her 5 dakikada bir (`WATCHTOWER_POLL_INTERVAL=300`) `ghcr.io` kontrol edilir; yeni `:latest` imajı varsa indirilir, container güncellenir ve `WATCHTOWER_CLEANUP=true` sayesinde eski kullanılmayan imajlar NAS diskinden otomatik silinir.

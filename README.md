# LynoCDN

Simple **GitHub-based CDN** menggunakan **Vercel Serverless Functions**.

File di-upload ke GitHub repository lalu diakses melalui URL Vercel dengan cache 1 tahun.

---

## ✨ Fitur

- Upload **semua jenis file** (image, video, audio, zip, pdf, dll)
- URL CDN bersih (tanpa raw.githubusercontent.com)
- Cache-Control **1 tahun (immutable)**
- Gratis (GitHub + Vercel)
- Tanpa database
- Cocok untuk bot, API, dan static asset

---

## 📁 Struktur Project

- lynocdn/
- api/upload.js
- api/file/[name].js
- index.html
- package.json
- vercel.json
- README.md


---

## 🚀 Cara Kerja

1. Client upload file ke `/api/upload`
2. Vercel upload file ke GitHub (`/cdn` folder)
3. API mengembalikan URL CDN
4. Client akses file via endpoint `/file/:name`

Client → Vercel → GitHub → Fastly CDN

---

## 🌐 Contoh URL CDN

https://namawebvercel.vercel.app/file/1734244234123.jpg

---

## ⚙️ Environment Variable

Set di **Vercel Dashboard → Settings → Environment Variables**

```env
GITHUB_TOKEN=token
GITHUB_OWNER=user github
GITHUB_REPO=repo
GITHUB_BRANCH=main
```
[!] Peringatan
> Token wajib memiliki scope repo

---

🧪 Upload via cURL

curl -X POST https://namawebvercel.vercel.app/api/upload \
  -H "Content-Type: image/jpeg" \
  --data-binary "@image.jpg"


---

📦 Jenis File yang Didukung

- Image: jpg, png, webp, gif
- Video: mp4
- Audio: mp3, ogg
- Document: pdf, txt
- Archive: zip
- Binary: apk, exe
> (Tidak ada pembatasan MIME)


---

🛡️ Cache Control

Endpoint CDN menggunakan header:
```bash
Cache-Control: public, max-age=31536000, immutable
```
Artinya:
>File di-cache 1 tahun penuh
>Sangat cepat untuk bot & media
>Filename harus unik (timestamp/hash)



---

⚠️ Batasan

- Maks file GitHub ±100MB
- Ada rate limit GitHub API
-  Tidak cocok untuk heavy traffic



---

📌 Rekomendasi Produksi
- Gunakan filename unik (sudah default)
-  Tambahkan Cloudflare di depan Vercel
-   Gunakan custom domain CDN



---

📜 Lisensi

MIT License

© 2025 LynoCDN | Bagian dari Lynovra Technology Solutions

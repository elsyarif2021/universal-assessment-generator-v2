# Universal Assessment Generator v2

Aplikasi pembuat soal asesmen berbasis AI yang diintegrasikan dengan Cloudflare Workers. Aplikasi menyajikan antarmuka, API generasi soal, dan ekspor tujuh dokumen Word dalam satu Worker.

## Deploy ke Cloudflare Workers

Di Cloudflare Dashboard, buka **Workers & Pages → Create application → Import a repository**, pilih **Workers**, lalu hubungkan repositori `elsyarif2021/universal-assessment-generator-v2`. Untuk Worker yang sudah terhubung ke repositori, periksa **Settings → Build**.

| Pengaturan | Nilai |
| --- | --- |
| Production branch | `main` |
| Root directory | Root repositori (kosongkan kolom) |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Worker name | `universal-assessment-generator-v2` |

Jika nama Worker yang sudah ada berbeda, sesuaikan `name` di `wrangler.jsonc` atau gunakan `npx wrangler deploy --name NAMA-WORKER` sebagai deploy command. Jika aplikasi sebelumnya dibuat sebagai proyek **Pages**, buat proyek **Workers** dari repositori ini dan gunakan URL yang diberikan Worker setelah deploy sukses.

`wrangler.jsonc` menetapkan `dist/server/index.js` sebagai entry point.

## Ollama Cloud

1. Buat API key di [Ollama](https://ollama.com/settings/keys).
2. Di **Cloudflare → Worker → Settings → Variables and Secrets**, tambahkan **Secret** bernama `OLLAMA_API_KEY` dan simpan/deploy. Alternatif melalui Wrangler: `npx wrangler secret put OLLAMA_API_KEY`.
3. Setelah deploy, buka URL Worker. Status **Ollama Cloud tersedia** menandakan secret terpasang. Kirim pertanyaan di **AI Chat Materi** untuk menguji respons.

AI Chat Materi, draf CP/ATP/TP, dan soal memakai model Ollama Cloud `deepseek-v4.1-flash:1017-cloud` secara default. Worker mengirim ID API `deepseek-v4.1-flash:1017`. Ubah `OLLAMA_MODEL` di `wrangler.jsonc` untuk memilih model cloud lain, misalnya `glm-5.3-flash:cloud`. API key hanya dibaca server.

Ilustrasi bebas tetap memakai binding Cloudflare Workers AI `AI`. Grafik numerik dibuat oleh aplikasi dari data soal. Jawaban AI Chat bisa dimasukkan ke kolom materi dengan **Tambahkan ke materi asesmen**. Chat menghasilkan jawaban tanpa penelusuran web.

## Pengembangan lokal

Jalankan `npm run dev`, lalu buka `http://localhost:3000`. Gunakan `npm run build` dan `npm test` untuk memeriksa build dan ekspor dokumen.

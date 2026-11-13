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

`wrangler.jsonc` menetapkan `dist/server/index.js` sebagai entry point. Worker ini menyajikan halaman utama, CSS, JavaScript, dan rute `/api/*`. Buka URL utama Worker yang tampil di dashboard Cloudflare. Status **Workers AI tersedia** menandakan binding `AI` sudah terpasang. Guru dapat langsung membuat draf asesmen tanpa mengisi Account ID atau API Token. Jika statusnya **Workers AI belum tersedia**, periksa **Bindings** pada Worker dan pastikan binding Workers AI bernama `AI` ikut terdeploy.

## AI Chat Materi

Buka **AI Chat Materi** untuk meminta penjelasan atau rangkuman dan mengajukan pertanyaan lanjutan. Klik **Tambahkan ke materi asesmen** pada jawaban yang ingin dipakai. Chat memakai binding Workers AI yang sama dan menghasilkan jawaban dari model tanpa penelusuran web.

## Pengembangan lokal

Jalankan `npm run dev`, lalu buka `http://localhost:3000`. Gunakan `npm run build` dan `npm test` untuk memeriksa build dan ekspor dokumen.

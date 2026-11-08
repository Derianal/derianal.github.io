# Portofolio Derian Alfriansyah — Versi 9

Website statis ringan menggunakan HTML, CSS, dan JavaScript. Dibuat untuk dijalankan melalui GitHub Pages tanpa framework atau build tools.

## Isi paket
- `index.html`, `style.css`, `script.js` — website portofolio utama, animasi platform, bilingual ID/EN, grafik analitik, dan tautan kontak.
- `assets/` — foto profil dan dokumentasi event yang digunakan di portofolio.
- `kasirku/` — demo interaktif KasirKu yang dapat dibuka dari tombol **Coba Demo KasirKu** pada kartu proyek.

## Pembaruan versi 9
- Demo KasirKu dirapikan agar lebih dekat dengan alur aplikasi KasirKu yang dikembangkan Derian.
- Menampilkan katalog sumber Benih Baik/Rempah, SKU, HPP, harga online, harga offline 1 pcs, 10 pcs, dan 20+ pcs.
- Simulasi sinkronisasi mempertahankan harga aktif yang diedit manual dan hanya mengisi nilai yang masih kosong.
- Pengelolaan stok, edit harga, kembalikan harga ke sumber, keranjang, edit harga satuan pada transaksi, validasi stok, checkout Tunai/QRIS, ID transaksi, dan kembalian.
- Riwayat transaksi, analisis omzet dan laba kotor per periode, grafik, lima produk terlaris, struk cetak, dan berbagi struk melalui WhatsApp.
- Demo publik berjalan terpisah menggunakan data contoh lokal. Tidak mengakses spreadsheet sumber atau data operasional toko.

## Batasan penting demo publik
- Nama produk, SKU, HPP, harga, stok, dan transaksi awal di folder `kasirku/` adalah data contoh, bukan data aktual.
- Data demo disimpan di `localStorage` browser dan tidak tersinkron antarperangkat.
- Sinkronisasi katalog adalah simulasi aturan sinkronisasi, bukan koneksi Google Sheets.
- QRIS hanya dicatat sebagai metode pembayaran demo. Tidak ada QR dinamis, payment gateway, atau verifikasi pembayaran.
- Struk dan pembagian WhatsApp diberi keterangan demo; bukan bukti pembayaran sungguhan.
- Jangan masukkan data pelanggan atau transaksi nyata ke demo publik.

## Alur aplikasi KasirKu asli
Versi kerja KasirKu menggunakan Google Apps Script untuk membaca sumber katalog HPP, mengelola tab stok, menyimpan transaksi, dan menyediakan analisis. Demo publik hanya merepresentasikan alur tersebut agar pengunjung portofolio dapat mencoba fitur tanpa mengakses spreadsheet asli.

## Publikasi ke GitHub Pages
1. Buka repository `derianal.github.io` yang sama.
2. Unggah dan ganti file root `index.html`, `style.css`, `script.js`, dan `README.md` dari paket ini.
3. Unggah folder `kasirku/` beserta seluruh isinya ke root repository. Pastikan file demo berada di `kasirku/index.html`, `kasirku/app.css`, dan `kasirku/app.js`.
4. Pertahankan folder `assets/` portofolio yang berisi foto profil dan dokumentasi. Paket ini menyertakan salinannya dengan nama yang sama.
5. Commit changes. GitHub Pages akan memperbarui website setelah proses deployment selesai.

Alamat utama: `https://derianal.github.io/`

Alamat demo: `https://derianal.github.io/kasirku/`

## Menjalankan secara lokal
Buka `index.html` portofolio melalui browser. Untuk demo KasirKu, buka `kasirku/index.html`. PWA/service worker memerlukan hosting HTTPS seperti GitHub Pages.

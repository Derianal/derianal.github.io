# KasirKu — Demo Portofolio Derian Alfriansyah

Demo web POS ringan yang **mengikuti alur aplikasi KasirKu asli**, tetapi berjalan memakai data contoh di browser agar aman dipamerkan di website portofolio.

## Alur yang direpresentasikan

1. Katalog produk dari tiga sumber konsep HPP: harga online Benih Baik, harga offline Benih Baik, dan katalog rempah.
2. SKU, nama produk, HPP, harga online, harga offline 1 pcs, 10 pcs, dan 20+ pcs.
3. Sinkronisasi katalog yang meniru perilaku aplikasi asli: harga/HPP manual yang sudah diisi dipertahankan; sinkronisasi mengisi nilai yang kosong. Produk baru diberi stok awal 0.
4. Perubahan HPP/harga aktif dari aplikasi, pengembalian harga ke nilai sumber, serta penambahan stok.
5. Kasir dengan pilihan mode harga, pencarian produk, keranjang, edit harga satuan pada transaksi, validasi stok, pembayaran Tunai atau pencatatan QRIS, dan perhitungan kembalian.
6. Checkout mengurangi stok, membuat ID transaksi, menghitung laba kotor dari harga jual dikurangi HPP, dan mencatat metode pembayaran.
7. Riwayat transaksi, ringkasan omzet/laba, analisis periode hari ini/7 hari/30 hari/tanggal tertentu, grafik, dan 5 produk terlaris.
8. Struk dapat dicetak atau dibagikan ke WhatsApp pelanggan melalui tautan berbagi.

## Batasan demo publik

- Seluruh produk, SKU, HPP, harga, stok, dan transaksi awal adalah **data contoh yang dibuat untuk demonstrasi**. Bukan data aktual dari toko atau spreadsheet Derian.
- Penyimpanan menggunakan `localStorage` browser. Tidak sinkron antarperangkat dan tidak terhubung ke Google Sheets.
- Tombol sinkronisasi menjalankan simulasi aturan sinkronisasi katalog. Tombol tidak mengakses spreadsheet.
- QRIS adalah pencatatan metode pembayaran simulasi. Tidak menghasilkan QR dinamis, tidak terhubung ke bank/payment gateway, dan tidak memverifikasi pembayaran.
- Struk dan WhatsApp berisi keterangan demo; bukan bukti pembayaran sungguhan.
- Jangan memasukkan transaksi atau data pelanggan nyata ke demo publik.

## Hubungan dengan proyek asli

Kode KasirKu asli menggunakan Google Apps Script sebagai backend dan Google Sheets sebagai sumber katalog HPP, penyimpanan stok, dan pencatatan transaksi. Demo ini mempertahankan alur/konsep utama tersebut untuk presentasi portofolio, tanpa mengekspos spreadsheet, ID, atau data operasional asli.

## Menjalankan dan menerbitkan

- Lokal: buka `index.html` di browser modern.
- GitHub Pages: unggah isi folder `kasirku/` ke folder `kasirku/` di root repository portofolio. URL demo menjadi `https://USERNAME.github.io/kasirku/`.
- PWA: setelah dibuka dari HTTPS, Chrome Android dapat menawarkan menu Install app / Add to Home screen. Ini aplikasi web yang dipasang ke layar utama, bukan file APK native.

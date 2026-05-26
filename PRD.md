# PRODUCT REQUIREMENT DOCUMENT (PRD)
**Project Name:** Sistem Manajemen Timesheet & Cuti Hibrida (The Fluid Enterprise)
**Platform:** Web Application
**Tech Stack:** Next.js 15 (App Router, RSC), Tailwind CSS, Framer Motion, Supabase

## [UPDATE V1.2] - Fitur Baru, Export, & Dinamisasi PDF Template
Iterasi ini berfokus pada penambahan kendali administratif kontrol akun, fitur pelaporan data (*export*), dan peningkatan fungsionalitas *PDF Layout Editor* agar templat dokumen dapat diunggah dan diatur posisinya secara visual.
1. **New Feature (Admin):** Fungsi Reset Password pengguna langsung dari panel kontrol Admin.
2. **New Feature (Admin):** Layout kartu monitoring baru di menu Monitoring untuk memilih pengguna, melihat ringkasan, dan mengekspor *timesheet* spesifik ke format `.xlsx` atau `.pdf`.
3. **Enhancement Feature (Admin - PDF Editor):** Kemampuan mengunggah file templat PDF baru untuk pengajuan cuti dan memetakan koordinat penempatan teks field secara dinamis melalui antarmuka web.
4. **New Feature (User):** Penambahan tab "Riwayat" di menu Timesheet yang dilengkapi tombol *export* data ke format `.xlsx` atau `.pdf`.

---

## 1. Pendahuluan
Aplikasi ini adalah sistem manajemen kehadiran dan pelaporan aktivitas harian yang dirancang untuk menggantikan pencatatan manual. Sistem dilengkapi portal karyawan (untuk timesheet & cuti) dan portal Admin (untuk monitoring, manajemen user, ekspor laporan, dan konfigurasi dinamis PDF).

## 2. Manajemen Pengguna & Autentikasi
Sistem menggunakan autentikasi standar (Email & Password) dari Supabase Auth.
* **Alur Pembuatan Akun:** Admin membuatkan akun melalui menu Add User.
* **Force Password Change:** Akun baru wajib memperbarui *password* default pada saat *login* pertama kali sebelum bisa mengakses dashboard utama.
* **Reset Password oleh Admin:** Admin memiliki wewenang untuk mengatur ulang *password* pengguna yang lupa kredensialnya melalui kontrol panel tanpa perlu intervensi email reset mandiri dari pengguna.
* **Mapping Identitas:** Data autentikasi (`auth.users`) terhubung 1-to-1 dengan tabel `public.profiles`.

## 3. Hak Akses & Batasan (Roles)
Sistem membagi pengguna ke dalam tiga *role* utama menggunakan Supabase **Row Level Security (RLS)**.

| Role | Deskripsi & Batasan Akses |
| :--- | :--- |
| **User (PM / Staff)** | Hanya dapat memanipulasi datanya sendiri berdasarkan `auth.uid()`. Dapat melihat proyeknya sendiri serta mengekspor riwayat *timesheet* pribadinya. |
| **Admin (HR / Manajer)** | Akses penuh (*Full CRUD*) terhadap seluruh data transaksi, manajemen user (termasuk reset password), melihat monitoring seluruh staf, ekspor data multi-user, dan manajemen template. |

## 4. Spesifikasi Fitur Utama

### A. Portal Admin (HR/Manajer)
1. **User Management (Add User & Control):**
   * Operasi pembuatan akun baru sesuai hierarki Proyek -> Cluster -> Aplikasi (Multi-select).
   * Tambahan tombol **Reset Password** pada detail komponen user untuk mengganti password akun target secara instan.
2. **Monitoring Dashboard & Export Multi-User:**
   * Penambahan *layout/card* visual baru khusus untuk memonitor ringkasan akumulasi komponen *timesheet* seluruh pegawai.
   * Admin dapat memilih salah satu nama pengguna dari daftar monitoring untuk membuka opsi pelaporan.
   * Menyediakan tombol **Export** dengan pilihan format output: `.xlsx` (spreadsheet) atau `.pdf`.
3. **Peningkatan PDF Layout Editor:**
   * Antarmuka bagi Admin untuk mengunggah file mentah PDF (`.pdf`) sebagai dasar dokumen templat baru (misal: modifikasi form baru dari divisi HRD).
   * Menyediakan visual mapper di web untuk mengatur letak teks, ukuran font, serta memetakan koordinat (*X/Y axis*) dari parameter profil (Nama, NPP, Tanggal Cuti) ke atas canvas dokumen PDF tersebut secara dinamis.

### B. Portal User (Pegawai)
1. **Timesheet History & Export:**
   * Pada menu **Timesheet**, terdapat pembagian visual menggunakan sistem *tabbing*: Tab "Input Form" dan Tab "Riwayat".
   * Di dalam Tab **Riwayat**, user disajikan visualisasi tabel rekaman aktivitas harian yang telah diisi sebelumnya.
   * Menyediakan tombol **Export** pada pojok kanan atas komponen riwayat. Ketika diklik, pengguna dapat memilih mengunduh rekapitulasi data mereka dalam format `.xlsx` atau `.pdf`.
2. **Ubah Password Wajib:** Pemaksaan ganti kredensial otomatis untuk pengguna baru.

---

## 5. Pemodelan Data / Skema Database (Supabase PostgreSQL)

**1. Tabel Master & Konfigurasi Templat**
* **`projects`**, **`clusters`**, **`applications`** *(Sama seperti V1.1)*
* **`pdf_templates`** *(Baru - Untuk menyimpan koordinat pemetaan PDF secara dinamis)*
    * `id` (UUID, PK)
    * `template_name` (Varchar)
    * `file_path` (Varchar) -- Path penunjuk file PDF mentah di Supabase Storage
    * `field_mappings` (JSONB) -- Menyimpan struktur koordinat, misal: `{"full_name": {"x": 100, "y": 250, "size": 12}, "npp": {"x": 100, "y": 230, "size": 12}}`
    * `is_active` (Boolean, Default: true)
    * `updated_at` (Timestamp)

**2. Tabel `profiles` & Relasi User** *(Sama seperti V1.1)*

**3. Tabel Transaksional**
* **`timesheets`**, **`timesheet_applications`**, **`leave_requests`** *(Sama seperti V1.1)*

---

## 6. Arsitektur Teknis & Dependensi Tambahan
* **Excel Export Library:** Gunakan `exceljs` atau `xlsx` (SheetJS) di sisi server/client menggunakan eksklusif NPM untuk memproses konversi array data timesheet menjadi berkas `.xlsx`.
* **PDF Processing:** `pdf-lib` digunakan secara optimal baik untuk *generate* tabel timesheet statis maupun membaca skema *JSONB* dari `pdf_templates.field_mappings` untuk menyisipkan teks profil di atas koordinat halaman yang tepat.
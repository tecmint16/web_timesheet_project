# PRODUCT REQUIREMENT DOCUMENT (PRD)
**Project Name:** Sistem Manajemen Timesheet & Cuti Hibrida (The Fluid Enterprise)
**Platform:** Web Application
**Tech Stack:** Next.js 15 (App Router, RSC), Tailwind CSS, Framer Motion, Supabase

## 1. Pendahuluan
Aplikasi ini adalah sistem manajemen kehadiran dan pelaporan aktivitas harian yang dirancang untuk menggantikan pencatatan manual (Excel). Sistem ini dilengkapi dengan portal karyawan untuk pengisian *timesheet* dan pengajuan cuti, serta portal Admin untuk *monitoring*, manajemen data master, dan verifikasi dokumen dengan alur kerja hibrida (digital-manual).

## 2. Manajemen Pengguna & Autentikasi (Saran Mapping Identitas)
Sistem menggunakan autentikasi standar (Email & Password) dari Supabase Auth.

**Solusi Mapping Identitas:**
Karena ini adalah sistem internal perusahaan, cara terbaik untuk memetakan identitas adalah memisahkan data autentikasi (Supabase `auth.users`) dengan profil data pegawai (tabel `public.profiles`). 
*   **Alur:** Admin membuatkan akun (Email/Password) untuk pegawai baru. Saat akun terbuat, sebuah *Trigger* di PostgreSQL akan otomatis membuat baris baru di tabel `public.profiles` dengan `id` yang sama persis (UUID) dengan tabel `auth.users`. Setelah itu, Admin bisa melengkapi data spesifik seperti NPP, Nama Lengkap, dan Divisi. 

## 3. Hak Akses & Batasan (Roles)
Sistem membagi pengguna ke dalam dua *role* utama yang diatur secara ketat menggunakan Supabase **Row Level Security (RLS)**.

| Role | Deskripsi & Batasan Akses |
| :--- | :--- |
| **User (Pegawai)** | Hanya dapat melakukan operasi (SELECT, INSERT, UPDATE, DELETE) pada datanya sendiri berdasarkan `auth.uid()`. Tidak dapat mengakses rute halaman `/admin`. |
| **Admin (HR/Manajer)** | Memiliki hak akses penuh untuk melakukan *read* pada semua tabel *timesheet* dan cuti, serta *write* pada tabel data master dan persetujuan cuti. |

## 4. Spesifikasi Fitur Utama

### A. Portal User (Pegawai)
1. **Dashboard Pribadi:** Menampilkan ringkasan sisa cuti, total jam kerja minggu berjalan, status pengajuan terbaru, dan pengumuman internal.
2. **Manajemen Timesheet (Laporan Harian):**
   *   **Input Data:** Tanggal, Shifting, Jam Masuk, Jam Pulang, Project, Project Code, Cluster, Aplikasi, dan Kegiatan/Deskripsi.
   *   **Soft Warning Jam Kerja:** Jika selisih Jam Pulang dan Jam Masuk < 8 jam, sistem tidak akan memblokir (*hard block*), tetapi akan memunculkan peringatan visual merah (*soft warning*) dan **mewajibkan** pengguna mengisi kolom tambahan: "Alasan/Keterangan Kekurangan Jam".
   *   **Fleksibilitas Edit:** Tidak ada batas waktu (*cut-off*) pengisian. Pegawai dapat menambah atau mengedit entri kapan saja sebelum data ditarik/dikunci oleh Admin untuk rekap bulanan.
3. **Sistem Pengajuan Cuti Hibrida:**
   *   **Form Digital:** Memasukkan Jenis Cuti, Tahun, Total Hari, Rentang Tanggal, Alamat & No. Telp Cuti, dan Keterangan.
   *   **Auto-fill PDF:** Sistem menghasilkan dokumen PDF yang sudah terisi otomatis (Nama, NPP, detail cuti) siap cetak.
   *   **Upload Scan:** Pegawai mengunggah kembali PDF yang sudah ditandatangani basah oleh atasan (*Max upload size: 5MB*, format PDF/JPG/PNG).
4. **Riwayat:** Melihat rekap *timesheet* dan status dokumen cuti.

### B. Portal Admin (HR/Manajer)
1. **Monitoring Dashboard:** Visualisasi grafik batang untuk tren shifting pegawai dan diagram lingkaran untuk metrik alokasi waktu pengerjaan aplikasi.
2. **Verifikasi Cuti:** Antrean dokumen cuti (*Signed Scan Upload*) yang menunggu persetujuan. Terdapat aksi **Approve** dan **Reject**.
3. **Notifikasi Otomatis:** Saat pegawai mengunggah dokumen scan bertanda tangan, sistem akan langsung mengirimkan *Email Notifikasi* ke tim Admin.
4. **Master Data Management:** Admin dapat melakukan operasi CRUD untuk daftar proyek, kode proyek, cluster, dan aplikasi.
5. **PDF Layout Editor:** Antarmuka untuk mengatur letak teks, koordinat (*X/Y axis*), dan variabel pada *template* dokumen (seperti SDD-FM-HRD) yang akan di-*generate* oleh pengguna.

## 5. Arsitektur Teknis & Rekomendasi Library

*   **Frontend & UI Framework:** Next.js 15 (App Router, Server Actions), React Server Components (RSC) untuk efisiensi *load time*. Tailwind CSS dipadukan dengan `next-themes` untuk transisi Light/Dark Mode. Framer Motion untuk animasi mulus (misal: transisi modal, *loading states*, dan notifikasi).
*   **Gaya Visual:** Modern Glassmorphism (penggunaan utilitas `backdrop-blur` pada Tailwind). Light mode menggunakan palet warna *vibrant* (gradasi biru/ungu), Dark mode menggunakan `bg-slate-950` dengan elemen kaca gelap (`bg-black/30`).
*   **Database & Backend:** Supabase (PostgreSQL, GoTrue Auth, Storage untuk file PDF/Scan).
*   **Library Engine PDF (Rekomendasi AI):**
    *   Gunakan `pdf-lib` (berjalan di Server/Edge). Sangat handal untuk membaca *template* PDF kosong yang sudah ada (misal: form asli HRD), lalu mengisi teks pada koordinat tertentu sesuai koordinat dari PDF Layout Editor Admin.
*   **Library Email Engine (Rekomendasi AI):**
    *   Gunakan integrasi **Resend API** yang dieksekusi di dalam **Supabase Edge Functions**. *Trigger* otomatis menyala saat ada baris baru di tabel cuti dengan status `pending_upload`.

## 6. Pemodelan Data / Skema Database (Supabase PostgreSQL)

Berikut adalah desain *Entity-Relationship* yang mendukung efisiensi kueri dan *Clean Architecture*.

**1. Tabel `profiles`**
*Menyimpan informasi identitas pegawai, terhubung 1-to-1 dengan Supabase Auth.*
*   `id` (UUID, Primary Key, Foreign Key -> `auth.users.id`)
*   `npp` (Varchar, Unique)
*   `full_name` (Varchar)
*   `role` (Enum: 'user', 'admin')
*   `leave_balance` (Int, Default: 12)
*   `created_at` (Timestamp)

**2. Tabel `master_projects`**
*Menyimpan data referensi proyek yang dikelola admin agar input dropdown konsisten.*
*   `id` (UUID, Primary Key)
*   `project_name` (Varchar)
*   `project_code` (Varchar, Unique)
*   `cluster_name` (Varchar)
*   `app_name` (Varchar)
*   `is_active` (Boolean, Default: true)

**3. Tabel `timesheets`**
*Menyimpan data log harian pegawai.*
*   `id` (UUID, Primary Key)
*   `profile_id` (UUID, Foreign Key -> `profiles.id`)
*   `log_date` (Date)
*   `shift_type` (Enum: 'Morning', 'Evening', dll)
*   `time_in` (Time)
*   `time_out` (Time)
*   `status` (Enum: 'Hadir', 'Izin', 'Sakit', 'Lembur')
*   `project_id` (UUID, Foreign Key -> `master_projects.id`)
*   `activity_desc` (Text)
*   `short_hours_reason` (Text, *Nullable* - Diisi wajib jika waktu kerja < 8 jam)
*   `is_locked` (Boolean, Default: false - Diubah menjadi true oleh Admin saat rekap bulanan)

**4. Tabel `leave_requests`**
*Menyimpan alur proses cuti hibrida.*
*   `id` (UUID, Primary Key)
*   `profile_id` (UUID, Foreign Key -> `profiles.id`)
*   `leave_type` (Enum: 'Tahunan', 'Melahirkan', 'Khusus')
*   `start_date` (Date)
*   `end_date` (Date)
*   `total_days` (Int)
*   `address_phone_during_leave` (Varchar)
*   `description` (Text)
*   `pdf_generated_url` (Varchar, *Nullable*)
*   `signed_scan_url` (Varchar, *Nullable* - Path di Supabase Storage)
*   `status` (Enum: 'Draft', 'Pending_Approval', 'Approved', 'Rejected')
*   `created_at` (Timestamp)
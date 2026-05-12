# PRODUCT REQUIREMENT DOCUMENT (PRD)
**Project Name:** Sistem Manajemen Timesheet & Cuti Hibrida (The Fluid Enterprise)
**Platform:** Web Application
**Tech Stack:** Next.js 15 (App Router, RSC), Tailwind CSS, Framer Motion, Supabase

## [UPDATE V1.1] - Fitur Baru & Perbaikan Database
Iterasi ini berfokus pada perombakan struktur data Master, penambahan sistem *User Management* yang komprehensif dari sisi Admin, serta modifikasi *logic* input timesheet pada sisi User.
1. **New Feature (Admin):** Modul "Add User" dengan penugasan spesifik hingga level aplikasi.
2. **New Feature (User):** Wajib ubah *password* saat *login* pertama kali.
3. **Database Update:** Normalisasi tabel `master_projects` dipecah menjadi tabel `projects`, `clusters`, dan `applications`. Tabel `timesheets` dimodifikasi agar mendukung *multi-select* aplikasi.

---

## 1. Pendahuluan
Aplikasi ini adalah sistem manajemen kehadiran dan pelaporan aktivitas harian yang dirancang untuk menggantikan pencatatan manual. Sistem dilengkapi portal karyawan (untuk timesheet & cuti) dan portal Admin (untuk monitoring, manajemen user, dan data master hierarkis).

## 2. Manajemen Pengguna & Autentikasi
Sistem menggunakan autentikasi standar (Email & Password) dari Supabase Auth.
* **Alur Pembuatan Akun:** Admin yang membuatkan akun (Email/Password) untuk pegawai baru melalui menu Add User.
* **Force Password Change:** Saat akun baru berhasil *login* dengan *password default* yang diberikan Admin, sistem akan mendeteksi *flag* dan memaksa (me-rute ulang) pengguna ke halaman **Ubah Password** sebelum mereka dapat mengakses Dashboard.
* **Mapping Identitas:** Data autentikasi (`auth.users`) terhubung 1-to-1 dengan tabel `public.profiles`.

## 3. Hak Akses & Batasan (Roles)
Sistem membagi pengguna ke dalam tiga *role* utama menggunakan Supabase **Row Level Security (RLS)**.

| Role | Deskripsi & Batasan Akses |
| :--- | :--- |
| **User (PM / Staff)** | Hanya dapat melakukan operasi pada datanya sendiri berdasarkan `auth.uid()`. Data Project dan Cluster bersifat *Read-Only* (otomatis terikat dari profil). |
| **Admin (HR / Manajer)** | Akses penuh (*Full CRUD*) terhadap seluruh data transaksi (timesheet, cuti), Manajemen User, dan Master Data. |

## 4. Spesifikasi Fitur Utama

### A. Portal Admin (HR/Manajer)
1. **User Management (Add User):**
   * Admin dapat membuat user baru dengan mengisi: Email, NPP, Nama Lengkap, Password, No Telepon, Alamat Tempat Tinggal, dan Role (Admin/PM/Staff).
   * **Penugasan Proyek:** * Admin memilih **Kode Proyek** (Hanya 1 proyek).
       * Berdasarkan Proyek, Admin memilih **Nama Cluster** (Hanya 1 cluster).
       * Berdasarkan Cluster, Admin memilih **Aplikasi** (Bisa *multi-select* / lebih dari 1).
2. **Manajemen Project:**
   * Admin dapat menginput Kode Project, Nama Project, dan Cluster.
   * *Logic*: Satu Project dapat menampung banyak Cluster (1-to-Many).
3. **Manajemen Aplikasi:**
   * Admin dapat menginput Kode Aplikasi, Cluster Induk, dan Nama Aplikasi.
   * *Logic*: Satu Cluster dapat menampung banyak Aplikasi (1-to-Many).
4. **Monitoring & Verifikasi:** Dashboard analitik dan persetujuan/penolakan dokumen cuti berbasis PDF basah.

### B. Portal User (Pegawai)
1. **Ubah Password Wajib:** Form interaktif yang mencegat pengguna baru agar memperbarui *password* mereka.
2. **Manajemen Timesheet (Laporan Harian):**
   * **Input User:** Tanggal, Jadwal Shift, Jam Masuk, Jam Pulang, Status Kehadiran, dan Kegiatan/Deskripsi.
   * **Auto-Populated (View-Only):** Kode Proyek, Nama Proyek, dan Cluster otomatis terisi berdasarkan profil user dan **tidak dapat diedit**.
   * **Multi-Select Aplikasi:** User dapat memilih 1 atau lebih aplikasi (hanya menampilkan daftar aplikasi yang sudah di-*assign* oleh Admin ke akun mereka).
   * **Soft Warning Jam Kerja:** Jika kerja < 8 jam, sistem memunculkan field "Alasan Kekurangan Jam" (wajib diisi).
3. **Sistem Pengajuan Cuti Hibrida:** Pengajuan *form digital*, *auto-fill* PDF, cetak & TTD basah, lalu *upload scan*.

---

## 5. Pemodelan Data / Skema Database (Supabase PostgreSQL)

Berikut adalah desain *Entity-Relationship* yang sudah dinormalisasi untuk mendukung pemetaan hierarki Proyek -> Cluster -> Aplikasi.

**1. Tabel Master (Data Referensi)**
* **`projects`**
    * `id` (UUID, PK)
    * `project_code` (Varchar, Unique)
    * `project_name` (Varchar)
* **`clusters`**
    * `id` (UUID, PK)
    * `project_id` (UUID, FK -> `projects.id`)
    * `cluster_name` (Varchar)
* **`applications`**
    * `id` (UUID, PK)
    * `cluster_id` (UUID, FK -> `clusters.id`)
    * `app_code` (Varchar, Unique)
    * `app_name` (Varchar)

**2. Tabel `profiles` & Relasi User**
* **`profiles`**
    * `id` (UUID, PK, FK -> `auth.users.id`)
    * `npp` (Varchar, Unique)
    * `full_name` (Varchar)
    * `phone_number` (Varchar)
    * `address` (Text)
    * `role` (Enum: 'Admin', 'PM', 'Staff')
    * `project_id` (UUID, FK -> `projects.id`)
    * `cluster_id` (UUID, FK -> `clusters.id`)
    * `must_change_password` (Boolean, Default: true)
    * `leave_balance` (Int, Default: 12)
    * `created_at` (Timestamp)
* **`profile_applications` (Junction Table untuk Multi-Select App)**
    * `profile_id` (UUID, FK -> `profiles.id`)
    * `application_id` (UUID, FK -> `applications.id`)
    * `Primary Key` (profile_id, application_id)

**3. Tabel Transaksional**
* **`timesheets`**
    * `id` (UUID, PK)
    * `profile_id` (UUID, FK -> `profiles.id`)
    * `log_date` (Date)
    * `shift_type` (Varchar)
    * `time_in` (Time)
    * `time_out` (Time)
    * `status` (Enum: 'Hadir', 'Izin', 'Sakit', 'Lembur')
    * `activity_desc` (Text)
    * `short_hours_reason` (Text, Nullable)
* **`timesheet_applications` (Junction Table karena 1 timesheet bisa mencakup > 1 app)**
    * `timesheet_id` (UUID, FK -> `timesheets.id`)
    * `application_id` (UUID, FK -> `applications.id`)
* **`leave_requests`**
    * `(Struktur sama dengan V1)`
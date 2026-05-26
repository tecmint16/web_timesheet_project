-- ============================================================
-- Migration 005: V1.2 RLS Fix
-- Run in Supabase SQL Editor
-- ============================================================

-- ─── STEP 1 (Run ini dulu, COMMIT, lalu jalankan STEP 2) ───

-- FIX 1: Update get_my_role() agar case-insensitive
-- Ini yang paling penting — sekarang 'admin' DAN 'Admin' keduanya match.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT LOWER(role::TEXT) FROM public.profiles WHERE id = auth.uid()
$$;

-- FIX 2: Tambah nilai ENUM yang ditambahkan di V1.1 (PM, Staff, Admin)
-- ADD VALUE IF NOT EXISTS aman dijalankan berulang kali.
-- CATATAN: Nilai ENUM baru TIDAK BISA dipakai dalam transaksi yang sama.
--          Jalankan block ini sendiri (pisah dari UPDATE di bawah).
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'PM';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'Staff';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'Admin';

-- ─── SETELAH STEP 1 BERHASIL, jalankan STEP 2 di query baru ───

-- FIX 3 (STEP 2 — jalankan di query baru setelah STEP 1 commit):
-- Jika ada profil dengan role 'admin' (lowercase) yang seharusnya 'Admin',
-- normalisasi di sini. SKIP jika semua admin sudah menggunakan 'Admin'.
--
-- UPDATE public.profiles
-- SET role = 'Admin'::public.user_role
-- WHERE role::text = 'admin';

-- ─── VERIFIKASI ───────────────────────────────────────────
-- Jalankan query ini untuk cek distribusi role saat ini:
-- SELECT role, count(*) FROM public.profiles GROUP BY role;

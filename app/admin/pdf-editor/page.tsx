import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin — PDF Layout Editor' }

export default function PdfEditorPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1000px' }}>
      <div>
        <h1 className="page-title">PDF Layout Editor</h1>
        <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Konfigurasi koordinat dan variabel pada template dokumen cuti (SDD-FM-HRD).
        </p>
      </div>

      <div className="glass-card" style={{ padding: '2rem' }}>
        <h2 style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--fg)' }}>
          Variabel Template PDF
        </h2>
        <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Koordinat di bawah ini menentukan posisi teks pada dokumen PDF yang digenerate.
          Satuan: <strong>pt</strong> (PDF point), titik referensi dari pojok kiri-bawah halaman.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table className="table-glass">
            <thead>
              <tr>
                <th>Variabel</th>
                <th>Deskripsi</th>
                <th>X (pt)</th>
                <th>Y (pt)</th>
                <th>Font Size</th>
              </tr>
            </thead>
            <tbody>
              {[
                { var: '{{full_name}}',     desc: 'Nama Lengkap Karyawan',      x: 60, y: 680, size: 11 },
                { var: '{{npp}}',           desc: 'Nomor Pegawai (NPP)',          x: 320, y: 680, size: 11 },
                { var: '{{leave_type}}',    desc: 'Jenis Cuti',                   x: 60, y: 640, size: 11 },
                { var: '{{total_days}}',    desc: 'Total Hari Cuti',              x: 320, y: 640, size: 11 },
                { var: '{{start_date}}',    desc: 'Tanggal Mulai Cuti',           x: 60, y: 600, size: 11 },
                { var: '{{end_date}}',      desc: 'Tanggal Selesai Cuti',         x: 320, y: 600, size: 11 },
                { var: '{{address_phone}}', desc: 'Alamat & Telepon Cuti',        x: 60, y: 560, size: 11 },
                { var: '{{description}}',   desc: 'Keterangan Tambahan',          x: 60, y: 520, size: 10 },
                { var: '{{created_at}}',    desc: 'Tanggal Pengajuan',            x: 380, y: 780, size: 9 },
              ].map(row => (
                <tr key={row.var}>
                  <td><code style={{ fontSize: '0.8rem', background: 'var(--muted-bg)', padding: '2px 6px', borderRadius: '4px' }}>{row.var}</code></td>
                  <td style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{row.desc}</td>
                  <td style={{ fontFamily: 'monospace', color: '#3b82f6' }}>{row.x}</td>
                  <td style={{ fontFamily: 'monospace', color: '#8b5cf6' }}>{row.y}</td>
                  <td style={{ fontFamily: 'monospace' }}>{row.size}pt</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="alert-info" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
          <span>ℹ️</span>
          <div>
            <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Cara Kustomisasi Template</strong>
            <span style={{ fontSize: '0.875rem' }}>
              Untuk menggunakan template PDF kustom (SDD-FM-HRD), upload file PDF kosong ke bucket Supabase Storage{' '}
              <code style={{ background: 'rgba(6,182,212,0.1)', padding: '1px 4px', borderRadius: '3px' }}>pdf-templates</code>.
              Koordinat di atas akan digunakan oleh <code>pdf-lib</code> untuk menempatkan teks pada posisi yang tepat.
              Gunakan Adobe Acrobat atau alat PDF viewer untuk mengidentifikasi koordinat X/Y pada template Anda.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

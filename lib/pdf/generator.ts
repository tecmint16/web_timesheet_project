import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

interface LeaveData {
  full_name: string
  npp: string
  leave_type: string
  start_date: string
  end_date: string
  total_days: number
  address_phone_during_leave: string
  description: string
  created_at: string
}

/**
 * Generates a leave request PDF using pdf-lib.
 * Since no template file is provided, this creates a structured document from scratch.
 */
export async function generateLeavePdf(data: LeaveData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89]) // A4

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const { width, height } = page.getSize()
  const margin = 60
  const textColor = rgb(0.1, 0.1, 0.1)
  const mutedColor = rgb(0.4, 0.4, 0.4)
  const brandColor = rgb(0.15, 0.35, 0.9)
  const lineColor = rgb(0.8, 0.8, 0.85)

  // Header bar
  page.drawRectangle({
    x: 0, y: height - 100, width, height: 100,
    color: rgb(0.15, 0.35, 0.9),
  })

  // Title
  page.drawText('FORM PENGAJUAN CUTI', {
    x: margin, y: height - 48,
    size: 20, font: fontBold, color: rgb(1, 1, 1),
  })
  page.drawText('SDD-FM-HRD | The Fluid Enterprise', {
    x: margin, y: height - 72,
    size: 10, font, color: rgb(0.8, 0.88, 1),
  })

  // Document number / date
  const dateStr = new Date(data.created_at).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  page.drawText(`Tanggal Pengajuan: ${dateStr}`, {
    x: width - margin - 180, y: height - 60,
    size: 9, font, color: rgb(0.8, 0.88, 1),
  })

  let y = height - 140

  // Section helper
  const drawSection = (title: string) => {
    page.drawText(title.toUpperCase(), {
      x: margin, y, size: 8, font: fontBold, color: brandColor,
    })
    y -= 6
    page.drawLine({
      start: { x: margin, y }, end: { x: width - margin, y },
      thickness: 0.5, color: lineColor,
    })
    y -= 18
  }

  // Field helper
  const drawField = (label: string, value: string, fullWidth = false) => {
    page.drawText(label, { x: margin, y, size: 9, font, color: mutedColor })
    page.drawText(value || '—', {
      x: fullWidth ? margin : margin + 160, y,
      size: 10, font: fontBold, color: textColor,
    })
    y -= 22
  }

  const drawFieldRight = (label: string, value: string) => {
    const cx = margin + 260
    page.drawText(label, { x: cx, y, size: 9, font, color: mutedColor })
    page.drawText(value || '—', {
      x: cx + 130, y, size: 10, font: fontBold, color: textColor,
    })
  }

  // 1. Data Pegawai
  drawSection('A. Data Pegawai')
  drawField('Nama Lengkap', data.full_name)
  drawFieldRight('NPP', data.npp)
  y -= 22

  // 2. Detail Cuti
  drawSection('B. Detail Permohonan Cuti')

  const leaveTypeLabels: Record<string, string> = {
    Tahunan: 'Cuti Tahunan',
    Melahirkan: 'Cuti Melahirkan',
    Khusus: 'Cuti Khusus',
  }
  drawField('Jenis Cuti', leaveTypeLabels[data.leave_type] ?? data.leave_type)
  drawFieldRight('Total Hari', `${data.total_days} Hari Kerja`)
  y -= 22

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })

  drawField('Tanggal Mulai', fmtDate(data.start_date))
  drawFieldRight('Tanggal Selesai', fmtDate(data.end_date))
  y -= 22

  drawField('Alamat & No. Telp Cuti', data.address_phone_during_leave, true)
  y -= 8

  if (data.description) {
    drawField('Keterangan', data.description, true)
    y -= 8
  }

  // 3. Signature section
  y -= 20
  drawSection('C. Tanda Tangan')

  const sigY = y - 80
  const cols = [margin, margin + 160, margin + 320]
  const sigLabels = ['Pemohon', 'Atasan Langsung', 'Mengetahui HR']
  const sigNames = [data.full_name, '___________________', '___________________']

  cols.forEach((x, i) => {
    page.drawText(sigLabels[i], { x, y, size: 9, font, color: mutedColor })
    page.drawRectangle({
      x, y: sigY - 10, width: 130, height: 60,
      borderColor: lineColor, borderWidth: 1,
      color: rgb(0.97, 0.97, 0.99),
    })
    page.drawText('(tanda tangan)', {
      x: x + 25, y: sigY + 12, size: 7, font, color: rgb(0.7, 0.7, 0.7),
    })
    page.drawText(sigNames[i], {
      x, y: sigY - 20, size: 8, font: fontBold, color: textColor,
    })
  })

  // Footer
  page.drawLine({
    start: { x: margin, y: 40 }, end: { x: width - margin, y: 40 },
    thickness: 0.5, color: lineColor,
  })
  page.drawText(
    'Dokumen ini digenerate secara digital oleh sistem The Fluid Enterprise. Harap ditandatangani dan di-scan kembali.',
    { x: margin, y: 25, size: 7, font, color: mutedColor }
  )

  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}

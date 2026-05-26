import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { createAdminClient } from '@/lib/supabase/server'

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

type FieldCoord = { x: number; y: number; size: number }
type FieldMappings = Record<string, FieldCoord>

// ─── Format helpers ───────────────────────────────────────
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })

const leaveTypeLabels: Record<string, string> = {
  Tahunan: 'Cuti Tahunan',
  Melahirkan: 'Cuti Melahirkan',
  Khusus: 'Cuti Khusus',
}

/**
 * Builds the field value map from LeaveData.
 * Keys must match what's stored in pdf_templates.field_mappings.
 */
function buildFieldValues(data: LeaveData): Record<string, string> {
  return {
    full_name:     data.full_name,
    npp:           data.npp,
    leave_type:    leaveTypeLabels[data.leave_type] ?? data.leave_type,
    total_days:    `${data.total_days} Hari Kerja`,
    start_date:    fmtDate(data.start_date),
    end_date:      fmtDate(data.end_date),
    address_phone: data.address_phone_during_leave,
    description:   data.description ?? '',
    created_at:    fmtDate(data.created_at),
  }
}

// ─── Strategy A: Use active template from pdf_templates ───
async function generateFromTemplate(
  templateFilePath: string,
  fieldMappings: FieldMappings,
  fieldValues: Record<string, string>
): Promise<Uint8Array> {
  const db = createAdminClient() as any

  // Download the template PDF from Supabase Storage
  const { data: fileBlob, error } = await db.storage
    .from('pdf-templates')
    .download(templateFilePath)

  if (error || !fileBlob) {
    throw new Error(`Gagal download template PDF: ${error?.message ?? 'file tidak ditemukan'}`)
  }

  const arrayBuffer = await fileBlob.arrayBuffer()
  const pdfDoc = await PDFDocument.load(arrayBuffer)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const page = pdfDoc.getPages()[0]
  const { height } = page.getSize()

  // Place each field according to its stored coordinates
  for (const [fieldKey, coords] of Object.entries(fieldMappings)) {
    const text = fieldValues[fieldKey] ?? ''
    if (!text) continue
    page.drawText(text, {
      x: coords.x,
      // pdf-lib origin is bottom-left; Supabase stores from bottom, so use y directly
      y: coords.y,
      size: coords.size,
      font,
      color: rgb(0.05, 0.05, 0.05),
    })
  }

  return pdfDoc.save()
}

// ─── Strategy B: Generate styled PDF from scratch (fallback) ───
async function generateFromScratch(data: LeaveData): Promise<Uint8Array> {
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
  page.drawRectangle({ x: 0, y: height - 100, width, height: 100, color: rgb(0.15, 0.35, 0.9) })

  page.drawText('FORM PENGAJUAN CUTI', {
    x: margin, y: height - 48, size: 20, font: fontBold, color: rgb(1, 1, 1),
  })
  page.drawText('SDD-FM-HRD | The Fluid Enterprise', {
    x: margin, y: height - 72, size: 10, font, color: rgb(0.8, 0.88, 1),
  })

  const dateStr = fmtDate(data.created_at)
  page.drawText(`Tanggal Pengajuan: ${dateStr}`, {
    x: width - margin - 180, y: height - 60, size: 9, font, color: rgb(0.8, 0.88, 1),
  })

  let y = height - 140

  const drawSection = (title: string) => {
    page.drawText(title.toUpperCase(), { x: margin, y, size: 8, font: fontBold, color: brandColor })
    y -= 6
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: lineColor })
    y -= 18
  }

  const drawField = (label: string, value: string, fullWidth = false) => {
    page.drawText(label, { x: margin, y, size: 9, font, color: mutedColor })
    page.drawText(value || '—', {
      x: fullWidth ? margin : margin + 160, y, size: 10, font: fontBold, color: textColor,
    })
    y -= 22
  }

  const drawFieldRight = (label: string, value: string) => {
    const cx = margin + 260
    page.drawText(label, { x: cx, y, size: 9, font, color: mutedColor })
    page.drawText(value || '—', { x: cx + 130, y, size: 10, font: fontBold, color: textColor })
  }

  drawSection('A. Data Pegawai')
  drawField('Nama Lengkap', data.full_name)
  drawFieldRight('NPP', data.npp)
  y -= 22

  drawSection('B. Detail Permohonan Cuti')
  drawField('Jenis Cuti', leaveTypeLabels[data.leave_type] ?? data.leave_type)
  drawFieldRight('Total Hari', `${data.total_days} Hari Kerja`)
  y -= 22
  drawField('Tanggal Mulai', fmtDate(data.start_date))
  drawFieldRight('Tanggal Selesai', fmtDate(data.end_date))
  y -= 22
  drawField('Alamat & No. Telp Cuti', data.address_phone_during_leave, true)
  y -= 8
  if (data.description) { drawField('Keterangan', data.description, true); y -= 8 }

  y -= 20
  drawSection('C. Tanda Tangan')

  const sigY = y - 80
  const cols = [margin, margin + 160, margin + 320]
  const sigLabels = ['Pemohon', 'Atasan Langsung', 'Mengetahui HR']
  const sigNames = [data.full_name, '___________________', '___________________']

  cols.forEach((x, i) => {
    page.drawText(sigLabels[i], { x, y, size: 9, font, color: mutedColor })
    page.drawRectangle({ x, y: sigY - 10, width: 130, height: 60, borderColor: lineColor, borderWidth: 1, color: rgb(0.97, 0.97, 0.99) })
    page.drawText('(tanda tangan)', { x: x + 25, y: sigY + 12, size: 7, font, color: rgb(0.7, 0.7, 0.7) })
    page.drawText(sigNames[i], { x, y: sigY - 20, size: 8, font: fontBold, color: textColor })
  })

  page.drawLine({ start: { x: margin, y: 40 }, end: { x: width - margin, y: 40 }, thickness: 0.5, color: lineColor })
  page.drawText(
    'Dokumen ini digenerate secara digital oleh sistem The Fluid Enterprise. Harap ditandatangani dan di-scan kembali.',
    { x: margin, y: 25, size: 7, font, color: mutedColor }
  )

  return pdfDoc.save()
}

// ─── Main exported function ────────────────────────────────

/**
 * Generates a leave request PDF.
 *
 * Priority order:
 * 1. If an active pdf_template exists with a file_path → overlay text on that template
 * 2. Otherwise → generate a clean PDF from scratch
 */
export async function generateLeavePdf(data: LeaveData): Promise<Uint8Array> {
  try {
    const db = createAdminClient() as any

    // Fetch the active template
    const { data: templateRow, error: tplError } = await db
      .from('pdf_templates')
      .select('file_path, field_mappings')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (!tplError && templateRow?.file_path) {
      // Strategy A: use uploaded template PDF + JSONB coordinates
      const fieldMappings = (templateRow.field_mappings ?? {}) as FieldMappings
      const fieldValues = buildFieldValues(data)
      return await generateFromTemplate(templateRow.file_path, fieldMappings, fieldValues)
    }

    // No active template with file → fall through to scratch
    console.info('[generateLeavePdf] No active template with file_path — using scratch generator.')
  } catch (err) {
    console.warn('[generateLeavePdf] Template lookup failed, falling back to scratch:', err)
  }

  // Strategy B: fallback — always works, no Storage dependency
  return generateFromScratch(data)
}

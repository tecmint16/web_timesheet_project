import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'

// GET /api/export/timesheet?userId=xxx&format=xlsx|pdf&userName=xxx
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('userId') ?? user.id
    const format = (searchParams.get('format') ?? 'xlsx') as 'xlsx' | 'pdf'
    const userName = searchParams.get('userName') ?? 'User'

    // Only admin can export other users' data
    const { data: callerProfile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    const isAdmin = ['admin', 'Admin'].includes((callerProfile as any)?.role ?? '')
    if (targetUserId !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const db = createAdminClient() as any
    const { data: timesheets, error } = await db
      .from('timesheets')
      .select(`
        log_date, shift_type, time_in, time_out, status,
        activity_desc, short_hours_reason,
        timesheet_applications(applications(app_code, app_name))
      `)
      .eq('profile_id', targetUserId)
      .order('log_date', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const rows = (timesheets ?? []) as any[]

    if (format === 'xlsx') {
      const wb = new ExcelJS.Workbook()
      wb.creator = 'The Fluid Enterprise'
      const ws = wb.addWorksheet('Timesheet')

      // Header style
      ws.columns = [
        { header: 'Tanggal',    key: 'date',      width: 14 },
        { header: 'Shift',      key: 'shift',     width: 12 },
        { header: 'Jam Masuk',  key: 'time_in',   width: 12 },
        { header: 'Jam Pulang', key: 'time_out',  width: 12 },
        { header: 'Jam Kerja',  key: 'hours',     width: 12 },
        { header: 'Status',     key: 'status',    width: 12 },
        { header: 'Aplikasi',   key: 'apps',      width: 30 },
        { header: 'Kegiatan',   key: 'activity',  width: 40 },
        { header: 'Ket. Jam',   key: 'reason',    width: 30 },
      ]

      // Style header row
      ws.getRow(1).eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
      })
      ws.getRow(1).height = 22

      rows.forEach((ts, idx) => {
        const [inH, inM]   = (ts.time_in  ?? '00:00').split(':').map(Number)
        const [outH, outM] = (ts.time_out ?? '00:00').split(':').map(Number)
        let diff = (outH * 60 + outM) - (inH * 60 + inM)
        if (diff < 0) diff += 1440
        const hours = (diff / 60).toFixed(1)
        const apps = (ts.timesheet_applications ?? [])
          .map((ta: any) => ta.applications?.app_code ?? '').filter(Boolean).join(', ')

        const row = ws.addRow({
          date:     ts.log_date,
          shift:    ts.shift_type,
          time_in:  ts.time_in?.substring(0, 5) ?? '',
          time_out: ts.time_out?.substring(0, 5) ?? '',
          hours:    `${hours} jam`,
          status:   ts.status,
          apps,
          activity: ts.activity_desc ?? '',
          reason:   ts.short_hours_reason ?? '',
        })

        // Zebra stripe
        if (idx % 2 === 0) {
          row.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } }
          })
        }
      })

      ws.autoFilter = { from: 'A1', to: 'I1' }

      const buf = await wb.xlsx.writeBuffer()
      const safeName = userName.replace(/[^a-zA-Z0-9]/g, '_')
      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="timesheet_${safeName}_${new Date().toISOString().split('T')[0]}.xlsx"`,
        },
      })
    }

    // PDF export via pdf-lib
    const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib')
    const pdfDoc = await PDFDocument.create()
    const font   = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontB  = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let page = pdfDoc.addPage([842, 595]) // A4 landscape
    const { width, height } = page.getSize()
    let y = height - 40

    // Title
    page.drawText(`Laporan Timesheet — ${userName}`, { x: 40, y, font: fontB, size: 16, color: rgb(0.23, 0.51, 0.96) })
    y -= 18
    page.drawText(`Diekspor: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}`, { x: 40, y, font, size: 9, color: rgb(0.5, 0.5, 0.5) })
    y -= 24

    // Table header
    const cols = [
      { label: 'Tanggal',   x: 40,  w: 80  },
      { label: 'Shift',     x: 120, w: 60  },
      { label: 'Masuk',     x: 180, w: 55  },
      { label: 'Pulang',    x: 235, w: 55  },
      { label: 'Jam Kerja', x: 290, w: 65  },
      { label: 'Status',    x: 355, w: 65  },
      { label: 'Aplikasi',  x: 420, w: 140 },
      { label: 'Kegiatan',  x: 560, w: 242 },
    ]

    // Header bg
    page.drawRectangle({ x: 38, y: y - 14, width: width - 76, height: 18, color: rgb(0.23, 0.51, 0.96) })
    cols.forEach(c => page.drawText(c.label, { x: c.x + 2, y: y - 11, font: fontB, size: 8, color: rgb(1, 1, 1) }))
    y -= 20

    rows.forEach((ts, idx) => {
      if (y < 50) {
        page = pdfDoc.addPage([842, 595])
        y = page.getSize().height - 40
      }
      const rowH = 16
      if (idx % 2 === 0) {
        page.drawRectangle({ x: 38, y: y - rowH + 4, width: width - 76, height: rowH, color: rgb(0.94, 0.97, 1) })
      }

      const [inH, inM]   = (ts.time_in  ?? '00:00').split(':').map(Number)
      const [outH, outM] = (ts.time_out ?? '00:00').split(':').map(Number)
      let diff = (outH * 60 + outM) - (inH * 60 + inM)
      if (diff < 0) diff += 1440
      const hours = `${(diff / 60).toFixed(1)}j`
      const apps = (ts.timesheet_applications ?? [])
        .map((ta: any) => ta.applications?.app_code ?? '').filter(Boolean).join(', ')
      const values = [ts.log_date, ts.shift_type, ts.time_in?.substring(0,5), ts.time_out?.substring(0,5), hours, ts.status, apps, (ts.activity_desc ?? '').substring(0, 45)]
      cols.forEach((c, i) => {
        page.drawText(String(values[i] ?? ''), { x: c.x + 2, y: y - 11, font, size: 7.5, color: rgb(0.1, 0.1, 0.1) })
      })
      y -= rowH
    })

    const pdfBytes = await pdfDoc.save()
    const safeName = userName.replace(/[^a-zA-Z0-9]/g, '_')
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="timesheet_${safeName}_${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    })

  } catch (e: any) {
    console.error('[export/timesheet]', e)
    return NextResponse.json({ error: e?.message ?? 'Export gagal' }, { status: 500 })
  }
}

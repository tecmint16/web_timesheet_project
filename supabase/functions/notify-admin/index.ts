/**
 * Supabase Edge Function: notify-admin
 *
 * Trigger: Called when leave_requests row is inserted/updated with status 'Pending_Approval'
 *
 * Deploy with:
 *   supabase functions deploy notify-admin
 *
 * Set secrets:
 *   supabase secrets set RESEND_API_KEY=your_key_here
 *   supabase secrets set ADMIN_EMAIL=admin@perusahaan.com
 *
 * Create DB trigger in SQL Editor:
 *   CREATE OR REPLACE FUNCTION notify_admin_on_leave()
 *   RETURNS TRIGGER AS $$
 *   BEGIN
 *     IF NEW.status = 'Pending_Approval' THEN
 *       PERFORM net.http_post(
 *         url := 'https://<project-ref>.supabase.co/functions/v1/notify-admin',
 *         body := json_build_object('leaveId', NEW.id, 'profileId', NEW.profile_id)::text,
 *         headers := '{"Content-Type": "application/json", "Authorization": "Bearer <anon-key>"}'::jsonb
 *       );
 *     END IF;
 *     RETURN NEW;
 *   END;
 *   $$ LANGUAGE plpgsql;
 *
 *   CREATE TRIGGER on_leave_pending
 *     AFTER INSERT OR UPDATE ON public.leave_requests
 *     FOR EACH ROW EXECUTE FUNCTION notify_admin_on_leave();
 */

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') ?? 'admin@perusahaan.com'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

serve(async (req) => {
  try {
    const { leaveId, profileId } = await req.json()

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Get leave request details
    const { data: leave } = await supabase
      .from('leave_requests')
      .select('*, profiles(full_name, npp)')
      .eq('id', leaveId)
      .single()

    if (!leave) {
      return new Response(JSON.stringify({ error: 'Leave not found' }), { status: 404 })
    }

    const profile = (leave as any).profiles
    const employeeName = profile?.full_name ?? 'Karyawan'
    const npp = profile?.npp ?? '-'

    // Format dates
    const fmt = (d: string) => new Date(d).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric'
    })

    // Send email via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Fluid Enterprise <noreply@perusahaan.com>',
        to: [ADMIN_EMAIL],
        subject: `[ACTION REQUIRED] Pengajuan Cuti Baru — ${employeeName}`,
        html: `
          <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #3b82f6, #7c3aed); padding: 24px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px;">🗓️ Pengajuan Cuti Baru</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0;">Dokumen scan TTD sudah diupload — menunggu persetujuan Anda</p>
            </div>
            <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Nama Karyawan</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${employeeName}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">NPP</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${npp}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Jenis Cuti</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${leave.leave_type}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Periode</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${fmt(leave.start_date)} — ${fmt(leave.end_date)} (${leave.total_days} hari)</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Keterangan</td><td style="padding: 8px 0; color: #0f172a;">${leave.description ?? '-'}</td></tr>
              </table>
              <div style="margin-top: 24px; padding: 16px; background: #fff3cd; border-radius: 8px; border: 1px solid #ffc107;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  ⚠️ <strong>Aksi diperlukan:</strong> Login ke portal Admin untuk melihat dokumen scan dan memberikan persetujuan atau penolakan.
                </p>
              </div>
              ${leave.signed_scan_url ? `<p style="margin-top: 16px;"><a href="${leave.signed_scan_url}" style="background: #3b82f6; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Lihat Dokumen Scan ↗</a></p>` : ''}
            </div>
          </div>
        `,
      }),
    })

    const emailData = await emailRes.json()

    if (!emailRes.ok) {
      console.error('Resend error:', emailData)
      return new Response(JSON.stringify({ error: 'Email send failed', details: emailData }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true, emailId: emailData.id }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})

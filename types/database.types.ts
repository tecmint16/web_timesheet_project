export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          npp: string | null
          full_name: string | null
          role: 'user' | 'admin'
          leave_balance: number
          created_at: string
        }
        Insert: {
          id: string
          npp?: string | null
          full_name?: string | null
          role?: 'user' | 'admin'
          leave_balance?: number
          created_at?: string
        }
        Update: {
          id?: string
          npp?: string | null
          full_name?: string | null
          role?: 'user' | 'admin'
          leave_balance?: number
          created_at?: string
        }
      }
      master_projects: {
        Row: {
          id: string
          project_name: string
          project_code: string
          cluster_name: string
          app_name: string
          is_active: boolean
        }
        Insert: {
          id?: string
          project_name: string
          project_code: string
          cluster_name: string
          app_name: string
          is_active?: boolean
        }
        Update: {
          id?: string
          project_name?: string
          project_code?: string
          cluster_name?: string
          app_name?: string
          is_active?: boolean
        }
      }
      timesheets: {
        Row: {
          id: string
          profile_id: string
          log_date: string
          shift_type: 'Morning' | 'Evening' | 'Night' | 'WFH'
          time_in: string
          time_out: string
          status: 'Hadir' | 'Izin' | 'Sakit' | 'Lembur'
          project_id: string | null
          activity_desc: string | null
          short_hours_reason: string | null
          is_locked: boolean
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          log_date: string
          shift_type: 'Morning' | 'Evening' | 'Night' | 'WFH'
          time_in: string
          time_out: string
          status?: 'Hadir' | 'Izin' | 'Sakit' | 'Lembur'
          project_id?: string | null
          activity_desc?: string | null
          short_hours_reason?: string | null
          is_locked?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          log_date?: string
          shift_type?: 'Morning' | 'Evening' | 'Night' | 'WFH'
          time_in?: string
          time_out?: string
          status?: 'Hadir' | 'Izin' | 'Sakit' | 'Lembur'
          project_id?: string | null
          activity_desc?: string | null
          short_hours_reason?: string | null
          is_locked?: boolean
          created_at?: string
        }
      }
      leave_requests: {
        Row: {
          id: string
          profile_id: string
          leave_type: 'Tahunan' | 'Melahirkan' | 'Khusus'
          start_date: string
          end_date: string
          total_days: number
          address_phone_during_leave: string
          description: string | null
          pdf_generated_url: string | null
          signed_scan_url: string | null
          status: 'Draft' | 'Pending_Approval' | 'Approved' | 'Rejected'
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          leave_type: 'Tahunan' | 'Melahirkan' | 'Khusus'
          start_date: string
          end_date: string
          total_days: number
          address_phone_during_leave: string
          description?: string | null
          pdf_generated_url?: string | null
          signed_scan_url?: string | null
          status?: 'Draft' | 'Pending_Approval' | 'Approved' | 'Rejected'
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          leave_type?: 'Tahunan' | 'Melahirkan' | 'Khusus'
          start_date?: string
          end_date?: string
          total_days?: number
          address_phone_during_leave?: string
          description?: string | null
          pdf_generated_url?: string | null
          signed_scan_url?: string | null
          status?: 'Draft' | 'Pending_Approval' | 'Approved' | 'Rejected'
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'user' | 'admin'
      shift_type: 'Morning' | 'Evening' | 'Night' | 'WFH'
      attendance_status: 'Hadir' | 'Izin' | 'Sakit' | 'Lembur'
      leave_type: 'Tahunan' | 'Melahirkan' | 'Khusus'
      leave_status: 'Draft' | 'Pending_Approval' | 'Approved' | 'Rejected'
    }
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type MasterProject = Database['public']['Tables']['master_projects']['Row']
export type Timesheet = Database['public']['Tables']['timesheets']['Row']
export type LeaveRequest = Database['public']['Tables']['leave_requests']['Row']

export type TimesheetWithProject = Timesheet & {
  master_projects: Pick<MasterProject, 'project_name' | 'project_code' | 'cluster_name' | 'app_name'> | null
}

export type LeaveRequestWithProfile = LeaveRequest & {
  profiles: Pick<Profile, 'full_name' | 'npp'> | null
}

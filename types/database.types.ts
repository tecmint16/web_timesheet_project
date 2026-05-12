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
          phone_number: string | null
          address: string | null
          role: 'admin' | 'user' | 'Admin' | 'PM' | 'Staff'
          project_id: string | null
          cluster_id: string | null
          must_change_password: boolean
          leave_balance: number
          created_at: string
        }
        Insert: {
          id: string
          npp?: string | null
          full_name?: string | null
          phone_number?: string | null
          address?: string | null
          role?: 'admin' | 'user' | 'Admin' | 'PM' | 'Staff'
          project_id?: string | null
          cluster_id?: string | null
          must_change_password?: boolean
          leave_balance?: number
          created_at?: string
        }
        Update: {
          id?: string
          npp?: string | null
          full_name?: string | null
          phone_number?: string | null
          address?: string | null
          role?: 'admin' | 'user' | 'Admin' | 'PM' | 'Staff'
          project_id?: string | null
          cluster_id?: string | null
          must_change_password?: boolean
          leave_balance?: number
          created_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          project_code: string
          project_name: string
          created_at: string
        }
        Insert: {
          id?: string
          project_code: string
          project_name: string
          created_at?: string
        }
        Update: {
          id?: string
          project_code?: string
          project_name?: string
          created_at?: string
        }
      }
      clusters: {
        Row: {
          id: string
          project_id: string
          cluster_name: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          cluster_name: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          cluster_name?: string
          created_at?: string
        }
      }
      applications: {
        Row: {
          id: string
          cluster_id: string
          app_code: string
          app_name: string
          created_at: string
        }
        Insert: {
          id?: string
          cluster_id: string
          app_code: string
          app_name: string
          created_at?: string
        }
        Update: {
          id?: string
          cluster_id?: string
          app_code?: string
          app_name?: string
          created_at?: string
        }
      }
      profile_applications: {
        Row: {
          profile_id: string
          application_id: string
        }
        Insert: {
          profile_id: string
          application_id: string
        }
        Update: {
          profile_id?: string
          application_id?: string
        }
      }
      timesheets: {
        Row: {
          id: string
          profile_id: string
          log_date: string
          shift_type: string
          time_in: string
          time_out: string
          status: 'Hadir' | 'Izin' | 'Sakit' | 'Lembur'
          activity_desc: string | null
          short_hours_reason: string | null
          is_locked: boolean
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          log_date: string
          shift_type: string
          time_in: string
          time_out: string
          status?: 'Hadir' | 'Izin' | 'Sakit' | 'Lembur'
          activity_desc?: string | null
          short_hours_reason?: string | null
          is_locked?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          log_date?: string
          shift_type?: string
          time_in?: string
          time_out?: string
          status?: 'Hadir' | 'Izin' | 'Sakit' | 'Lembur'
          activity_desc?: string | null
          short_hours_reason?: string | null
          is_locked?: boolean
          created_at?: string
        }
      }
      timesheet_applications: {
        Row: {
          timesheet_id: string
          application_id: string
        }
        Insert: {
          timesheet_id: string
          application_id: string
        }
        Update: {
          timesheet_id?: string
          application_id?: string
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
      attendance_status: 'Hadir' | 'Izin' | 'Sakit' | 'Lembur'
      leave_type: 'Tahunan' | 'Melahirkan' | 'Khusus'
      leave_status: 'Draft' | 'Pending_Approval' | 'Approved' | 'Rejected'
    }
  }
}

// ─── Convenience Row Types ────────────────────────────────
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type Cluster = Database['public']['Tables']['clusters']['Row']
export type Application = Database['public']['Tables']['applications']['Row']
export type ProfileApplication = Database['public']['Tables']['profile_applications']['Row']
export type Timesheet = Database['public']['Tables']['timesheets']['Row']
export type TimesheetApplication = Database['public']['Tables']['timesheet_applications']['Row']
export type LeaveRequest = Database['public']['Tables']['leave_requests']['Row']

// ─── Joined / Composed Types ──────────────────────────────

/** Cluster enriched with its parent project info */
export type ClusterWithProject = Cluster & {
  projects: Pick<Project, 'project_code' | 'project_name'> | null
}

/** Application enriched with its parent cluster info */
export type ApplicationWithCluster = Application & {
  clusters: Pick<Cluster, 'cluster_name'> & {
    projects: Pick<Project, 'project_code' | 'project_name'> | null
  } | null
}

/** Timesheet enriched with its applications */
export type TimesheetWithApps = Timesheet & {
  timesheet_applications: {
    applications: Pick<Application, 'id' | 'app_code' | 'app_name'> | null
  }[]
}

/** Profile enriched with its project, cluster, and assigned apps */
export type ProfileWithAssignments = Profile & {
  projects: Pick<Project, 'project_code' | 'project_name'> | null
  clusters: Pick<Cluster, 'cluster_name'> | null
  profile_applications: {
    applications: Pick<Application, 'id' | 'app_code' | 'app_name'> | null
  }[]
}

/** Leave request with submitter profile */
export type LeaveRequestWithProfile = LeaveRequest & {
  profiles: Pick<Profile, 'full_name' | 'npp'> | null
}

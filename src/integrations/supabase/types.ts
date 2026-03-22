export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          id: string
          employee_id: string
          date: string
          day_of_week: string | null
          shift: string | null
          in_time: string | null
          out_time: string | null
          total_hours: number | null
          overtime_hours: number | null
          marked_by: string | null
          employee_approved: boolean | null
          approved_at: string | null
          is_locked: boolean | null
          status: string | null
          remarks: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          date?: string
          day_of_week?: string | null
          shift?: string | null
          in_time?: string | null
          out_time?: string | null
          total_hours?: number | null
          overtime_hours?: number | null
          marked_by?: string | null
          employee_approved?: boolean | null
          approved_at?: string | null
          is_locked?: boolean | null
          status?: string | null
          remarks?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          date?: string
          day_of_week?: string | null
          shift?: string | null
          in_time?: string | null
          out_time?: string | null
          total_hours?: number | null
          overtime_hours?: number | null
          marked_by?: string | null
          employee_approved?: boolean | null
          approved_at?: string | null
          is_locked?: boolean | null
          status?: string | null
          remarks?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      canteen_logs: {
        Row: {
          id: string
          employee_id: string
          date: string
          marked_by: string | null
          employee_approved: boolean | null
          approved_at: string | null
          meal_type: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          date?: string
          marked_by?: string | null
          employee_approved?: boolean | null
          approved_at?: string | null
          meal_type?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          date?: string
          marked_by?: string | null
          employee_approved?: boolean | null
          approved_at?: string | null
          meal_type?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      canteen_settings: {
        Row: {
          id: string
          lunch_rate_per_day: number
          effective_from: string
          set_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          lunch_rate_per_day?: number
          effective_from?: string
          set_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          lunch_rate_per_day?: number
          effective_from?: string
          set_by?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      complaints: {
        Row: {
          id: string
          type: string | null
          category: string | null
          subject: string
          description: string | null
          attachment_url: string | null
          is_anonymous: boolean | null
          submitted_by: string | null
          submitted_dept_id: string | null
          status: string | null
          resolution_remarks: string | null
          resolved_by: string | null
          resolved_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          type?: string | null
          category?: string | null
          subject: string
          description?: string | null
          attachment_url?: string | null
          is_anonymous?: boolean | null
          submitted_by?: string | null
          submitted_dept_id?: string | null
          status?: string | null
          resolution_remarks?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          type?: string | null
          category?: string | null
          subject?: string
          description?: string | null
          attachment_url?: string | null
          is_anonymous?: boolean | null
          submitted_by?: string | null
          submitted_dept_id?: string | null
          status?: string | null
          resolution_remarks?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "complaints_submitted_dept_id_fkey"
            columns: ["submitted_dept_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          }
        ]
      }
      departments: {
        Row: {
          id: string
          name: string
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          created_at?: string | null
        }
        Relationships: []
      }
      employee_documents: {
        Row: {
          id: string
          employee_id: string
          doc_type: string
          doc_name: string
          doc_url: string
          remarks: string | null
          uploaded_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          doc_type: string
          doc_name: string
          doc_url: string
          remarks?: string | null
          uploaded_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          doc_type?: string
          doc_name?: string
          doc_url?: string
          remarks?: string | null
          uploaded_by?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      gate_passes: {
        Row: {
          id: string
          employee_id: string
          pass_type: string
          reason: string | null
          created_by: string | null
          approved_by: string | null
          approved_at: string | null
          approval_status: string | null
          out_time: string | null
          expected_return_time: string | null
          return_time: string | null
          security_return_marked_by: string | null
          employee_return_approved: boolean | null
          employee_return_approved_at: string | null
          status: string | null
          remarks: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          pass_type?: string
          reason?: string | null
          created_by?: string | null
          approved_by?: string | null
          approved_at?: string | null
          approval_status?: string | null
          out_time?: string | null
          expected_return_time?: string | null
          return_time?: string | null
          security_return_marked_by?: string | null
          employee_return_approved?: boolean | null
          employee_return_approved_at?: string | null
          status?: string | null
          remarks?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          pass_type?: string
          reason?: string | null
          created_by?: string | null
          approved_by?: string | null
          approved_at?: string | null
          approval_status?: string | null
          out_time?: string | null
          expected_return_time?: string | null
          return_time?: string | null
          security_return_marked_by?: string | null
          employee_return_approved?: boolean | null
          employee_return_approved_at?: string | null
          status?: string | null
          remarks?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      job_work: {
        Row: {
          id: string
          doc_no: string | null
          division: string
          process_type: string | null
          department_id: string | null
          supplier_id: string | null
          material_name: string
          material_grade: string | null
          quantity: number
          unit: string | null
          dispatch_purpose: string | null
          responsible_person: string | null
          requirement_doc_url: string | null
          expected_return_date: string | null
          dispatch_mode: string | null
          delivery_person_name: string | null
          vehicle_number: string | null
          challan_url: string | null
          security_handover_at: string | null
          security_handover_by: string | null
          dispatch_date: string | null
          outward_challan_url: string | null
          tat_days: number | null
          is_overdue: boolean | null
          overdue_notified_at: string | null
          return_date: string | null
          received_qty: number | null
          balance_qty: number | null
          ref_person_id: string | null
          ref_person_approved: boolean | null
          ref_person_approved_at: string | null
          ref_person_remarks: string | null
          high_authority_id: string | null
          high_authority_approved: boolean | null
          high_authority_approved_at: string | null
          high_authority_remarks: string | null
          invoice_number: string | null
          invoice_amount: number | null
          invoice_url: string | null
          current_step: number | null
          status: string | null
          remarks: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          doc_no?: string | null
          division?: string
          process_type?: string | null
          department_id?: string | null
          supplier_id?: string | null
          material_name: string
          material_grade?: string | null
          quantity?: number
          unit?: string | null
          dispatch_purpose?: string | null
          responsible_person?: string | null
          requirement_doc_url?: string | null
          expected_return_date?: string | null
          dispatch_mode?: string | null
          delivery_person_name?: string | null
          vehicle_number?: string | null
          challan_url?: string | null
          security_handover_at?: string | null
          security_handover_by?: string | null
          dispatch_date?: string | null
          outward_challan_url?: string | null
          tat_days?: number | null
          is_overdue?: boolean | null
          overdue_notified_at?: string | null
          return_date?: string | null
          received_qty?: number | null
          ref_person_id?: string | null
          ref_person_approved?: boolean | null
          ref_person_approved_at?: string | null
          ref_person_remarks?: string | null
          high_authority_id?: string | null
          high_authority_approved?: boolean | null
          high_authority_approved_at?: string | null
          high_authority_remarks?: string | null
          invoice_number?: string | null
          invoice_amount?: number | null
          invoice_url?: string | null
          current_step?: number | null
          status?: string | null
          remarks?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          doc_no?: string | null
          division?: string
          process_type?: string | null
          department_id?: string | null
          supplier_id?: string | null
          material_name?: string
          material_grade?: string | null
          quantity?: number
          unit?: string | null
          dispatch_purpose?: string | null
          responsible_person?: string | null
          requirement_doc_url?: string | null
          expected_return_date?: string | null
          dispatch_mode?: string | null
          delivery_person_name?: string | null
          vehicle_number?: string | null
          challan_url?: string | null
          security_handover_at?: string | null
          security_handover_by?: string | null
          dispatch_date?: string | null
          outward_challan_url?: string | null
          tat_days?: number | null
          is_overdue?: boolean | null
          overdue_notified_at?: string | null
          return_date?: string | null
          received_qty?: number | null
          ref_person_id?: string | null
          ref_person_approved?: boolean | null
          ref_person_approved_at?: string | null
          ref_person_remarks?: string | null
          high_authority_id?: string | null
          high_authority_approved?: boolean | null
          high_authority_approved_at?: string | null
          high_authority_remarks?: string | null
          invoice_number?: string | null
          invoice_amount?: number | null
          invoice_url?: string | null
          current_step?: number | null
          status?: string | null
          remarks?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_work_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_work_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          }
        ]
      }
      job_work_step_docs: {
        Row: {
          id: string
          job_work_id: string
          step_number: number
          step_name: string
          doc_url: string | null
          remarks: string | null
          uploaded_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          job_work_id: string
          step_number: number
          step_name: string
          doc_url?: string | null
          remarks?: string | null
          uploaded_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          job_work_id?: string
          step_number?: number
          step_name?: string
          doc_url?: string | null
          remarks?: string | null
          uploaded_by?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_work_step_docs_job_work_id_fkey"
            columns: ["job_work_id"]
            isOneToOne: false
            referencedRelation: "job_work"
            referencedColumns: ["id"]
          }
        ]
      }
      job_work_communications: {
        Row: {
          id: string
          job_work_id: string
          communication_type: string
          contact_person: string | null
          notes: string | null
          follow_up_needed: boolean | null
          follow_up_date: string | null
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          job_work_id: string
          communication_type: string
          contact_person?: string | null
          notes?: string | null
          follow_up_needed?: boolean | null
          follow_up_date?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          job_work_id?: string
          communication_type?: string
          contact_person?: string | null
          notes?: string | null
          follow_up_needed?: boolean | null
          follow_up_date?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_work_communications_job_work_id_fkey"
            columns: ["job_work_id"]
            isOneToOne: false
            referencedRelation: "job_work"
            referencedColumns: ["id"]
          }
        ]
      }
      leave_balance: {
        Row: {
          id: string
          employee_id: string
          year: number
          leave_type: string
          entitled: number | null
          taken: number | null
          balance: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          year?: number
          leave_type: string
          entitled?: number | null
          taken?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          year?: number
          leave_type?: string
          entitled?: number | null
          taken?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          id: string
          employee_id: string
          leave_type: string
          leave_day_type: string | null
          from_date: string
          to_date: string
          total_days: number | null
          reason: string | null
          status: string | null
          approved_by: string | null
          approved_at: string | null
          remarks: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          leave_type: string
          leave_day_type?: string | null
          from_date: string
          to_date: string
          total_days?: number | null
          reason?: string | null
          status?: string | null
          approved_by?: string | null
          approved_at?: string | null
          remarks?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          leave_type?: string
          leave_day_type?: string | null
          from_date?: string
          to_date?: string
          total_days?: number | null
          reason?: string | null
          status?: string | null
          approved_by?: string | null
          approved_at?: string | null
          remarks?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      message_reads: {
        Row: {
          id: string
          message_id: string
          user_id: string
          read_at: string | null
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          read_at?: string | null
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          }
        ]
      }
      messages: {
        Row: {
          id: string
          from_user_id: string
          to_user_id: string | null
          to_department_id: string | null
          subject: string
          body: string | null
          attachment_url: string | null
          is_read: boolean | null
          read_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          from_user_id: string
          to_user_id?: string | null
          to_department_id?: string | null
          subject: string
          body?: string | null
          attachment_url?: string | null
          is_read?: boolean | null
          read_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          from_user_id?: string
          to_user_id?: string | null
          to_department_id?: string | null
          subject?: string
          body?: string | null
          attachment_url?: string | null
          is_read?: boolean | null
          read_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_to_department_id_fkey"
            columns: ["to_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          }
        ]
      }
      notification_reads: {
        Row: {
          id: string
          notification_id: string
          user_id: string
          read_at: string | null
        }
        Insert: {
          id?: string
          notification_id: string
          user_id: string
          read_at?: string | null
        }
        Update: {
          id?: string
          notification_id?: string
          user_id?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          title: string
          body: string | null
          type: string | null
          target_type: string | null
          target_department_id: string | null
          target_user_id: string | null
          is_active: boolean | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          body?: string | null
          type?: string | null
          target_type?: string | null
          target_department_id?: string | null
          target_user_id?: string | null
          is_active?: boolean | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          body?: string | null
          type?: string | null
          target_type?: string | null
          target_department_id?: string | null
          target_user_id?: string | null
          is_active?: boolean | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_target_department_id_fkey"
            columns: ["target_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          }
        ]
      }
      overtime: {
        Row: {
          id: string
          employee_id: string
          attendance_id: string | null
          date: string
          ot_hours: number
          ot_rate: number | null
          ot_amount: number | null
          approved_by: string | null
          status: string | null
          remarks: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          attendance_id?: string | null
          date: string
          ot_hours?: number
          ot_rate?: number | null
          ot_amount?: number | null
          approved_by?: string | null
          status?: string | null
          remarks?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          attendance_id?: string | null
          date?: string
          ot_hours?: number
          ot_rate?: number | null
          ot_amount?: number | null
          approved_by?: string | null
          status?: string | null
          remarks?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "overtime_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: false
            referencedRelation: "attendance"
            referencedColumns: ["id"]
          }
        ]
      }
      payroll: {
        Row: {
          id: string
          employee_id: string
          month: number
          year: number
          present_days: number | null
          absent_days: number | null
          working_days: number | null
          leave_days: number | null
          basic: number | null
          hra: number | null
          da: number | null
          conveyance: number | null
          medical: number | null
          special_allowance: number | null
          night_shift_allowance: number | null
          overtime_amount: number | null
          gross_salary: number | null
          pf_employee: number | null
          pf_employer: number | null
          esi_employee: number | null
          esi_employer: number | null
          tds: number | null
          professional_tax: number | null
          lwf: number | null
          canteen_deduction: number | null
          advance_deduction: number | null
          total_deductions: number | null
          net_salary: number | null
          status: string | null
          processed_by: string | null
          processed_at: string | null
          remarks: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          month: number
          year: number
          present_days?: number | null
          absent_days?: number | null
          working_days?: number | null
          leave_days?: number | null
          basic?: number | null
          hra?: number | null
          da?: number | null
          conveyance?: number | null
          medical?: number | null
          special_allowance?: number | null
          night_shift_allowance?: number | null
          overtime_amount?: number | null
          gross_salary?: number | null
          pf_employee?: number | null
          pf_employer?: number | null
          esi_employee?: number | null
          esi_employer?: number | null
          tds?: number | null
          professional_tax?: number | null
          lwf?: number | null
          canteen_deduction?: number | null
          advance_deduction?: number | null
          total_deductions?: number | null
          net_salary?: number | null
          status?: string | null
          processed_by?: string | null
          processed_at?: string | null
          remarks?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          month?: number
          year?: number
          present_days?: number | null
          absent_days?: number | null
          working_days?: number | null
          leave_days?: number | null
          basic?: number | null
          hra?: number | null
          da?: number | null
          conveyance?: number | null
          medical?: number | null
          special_allowance?: number | null
          night_shift_allowance?: number | null
          overtime_amount?: number | null
          gross_salary?: number | null
          pf_employee?: number | null
          pf_employer?: number | null
          esi_employee?: number | null
          esi_employer?: number | null
          tds?: number | null
          professional_tax?: number | null
          lwf?: number | null
          canteen_deduction?: number | null
          advance_deduction?: number | null
          total_deductions?: number | null
          net_salary?: number | null
          status?: string | null
          processed_by?: string | null
          processed_at?: string | null
          remarks?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      procurement_tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          assigned_to: string | null
          related_type: string | null
          related_id: string | null
          priority: string | null
          due_date: string | null
          attachment_url: string | null
          status: string | null
          is_overdue: boolean | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          assigned_to?: string | null
          related_type?: string | null
          related_id?: string | null
          priority?: string | null
          due_date?: string | null
          attachment_url?: string | null
          status?: string | null
          is_overdue?: boolean | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          assigned_to?: string | null
          related_type?: string | null
          related_id?: string | null
          priority?: string | null
          due_date?: string | null
          attachment_url?: string | null
          status?: string | null
          is_overdue?: boolean | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          user_id_custom: string
          name: string
          email: string | null
          department_id: string | null
          designation: string | null
          shift: string | null
          joining_date: string | null
          date_of_birth: string | null
          gender: string | null
          blood_group: string | null
          basic_salary: number | null
          profile_pic_url: string | null
          phone: string | null
          aadhaar: string | null
          pan: string | null
          uan: string | null
          bank_account: string | null
          bank_ifsc: string | null
          bank_name: string | null
          esi_number: string | null
          address: string | null
          emergency_contact: string | null
          emergency_relation: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          user_id_custom: string
          name: string
          email?: string | null
          department_id?: string | null
          designation?: string | null
          shift?: string | null
          joining_date?: string | null
          date_of_birth?: string | null
          gender?: string | null
          blood_group?: string | null
          basic_salary?: number | null
          profile_pic_url?: string | null
          phone?: string | null
          aadhaar?: string | null
          pan?: string | null
          uan?: string | null
          bank_account?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          esi_number?: string | null
          address?: string | null
          emergency_contact?: string | null
          emergency_relation?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id_custom?: string
          name?: string
          email?: string | null
          department_id?: string | null
          designation?: string | null
          shift?: string | null
          joining_date?: string | null
          date_of_birth?: string | null
          gender?: string | null
          blood_group?: string | null
          basic_salary?: number | null
          profile_pic_url?: string | null
          phone?: string | null
          aadhaar?: string | null
          pan?: string | null
          uan?: string | null
          bank_account?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          esi_number?: string | null
          address?: string | null
          emergency_contact?: string | null
          emergency_relation?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          }
        ]
      }
      rm_buying: {
        Row: {
          id: string
          requirement_no: string | null
          material_name: string
          material_grade: string | null
          material_size: string | null
          quantity: number
          unit: string | null
          category: string | null
          department_id: string | null
          required_by_date: string | null
          last_purchase_rate: number | null
          high_authority_id: string | null
          high_authority_approved: boolean | null
          high_authority_approved_at: string | null
          high_authority_remarks: string | null
          selected_supplier_id: string | null
          po_number: string | null
          po_date: string | null
          po_url: string | null
          expected_delivery_date: string | null
          is_overdue: boolean | null
          overdue_notified_at: string | null
          received_qty: number | null
          balance_qty: number | null
          received_date: string | null
          invoice_number: string | null
          invoice_amount: number | null
          invoice_url: string | null
          current_step: number | null
          status: string | null
          remarks: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          requirement_no?: string | null
          material_name: string
          material_grade?: string | null
          material_size?: string | null
          quantity: number
          unit?: string | null
          category?: string | null
          department_id?: string | null
          required_by_date?: string | null
          last_purchase_rate?: number | null
          high_authority_id?: string | null
          high_authority_approved?: boolean | null
          high_authority_approved_at?: string | null
          high_authority_remarks?: string | null
          selected_supplier_id?: string | null
          po_number?: string | null
          po_date?: string | null
          po_url?: string | null
          expected_delivery_date?: string | null
          is_overdue?: boolean | null
          overdue_notified_at?: string | null
          received_qty?: number | null
          received_date?: string | null
          invoice_number?: string | null
          invoice_amount?: number | null
          invoice_url?: string | null
          current_step?: number | null
          status?: string | null
          remarks?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          requirement_no?: string | null
          material_name?: string
          material_grade?: string | null
          material_size?: string | null
          quantity?: number
          unit?: string | null
          category?: string | null
          department_id?: string | null
          required_by_date?: string | null
          last_purchase_rate?: number | null
          high_authority_id?: string | null
          high_authority_approved?: boolean | null
          high_authority_approved_at?: string | null
          high_authority_remarks?: string | null
          selected_supplier_id?: string | null
          po_number?: string | null
          po_date?: string | null
          po_url?: string | null
          expected_delivery_date?: string | null
          is_overdue?: boolean | null
          overdue_notified_at?: string | null
          received_qty?: number | null
          received_date?: string | null
          invoice_number?: string | null
          invoice_amount?: number | null
          invoice_url?: string | null
          current_step?: number | null
          status?: string | null
          remarks?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rm_buying_selected_supplier_id_fkey"
            columns: ["selected_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rm_buying_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          }
        ]
      }
      rm_buying_rates: {
        Row: {
          id: string
          rm_buying_id: string
          supplier_id: string
          rate_per_unit: number | null
          total_amount: number | null
          availability: string | null
          lead_time_days: number | null
          gst_percent: number | null
          is_recommended: boolean | null

          slip_sent: boolean | null
          slip_sent_via: string | null
          slip_sent_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          rm_buying_id: string
          supplier_id: string
          rate_per_unit?: number | null
          total_amount?: number | null
          availability?: string | null
          lead_time_days?: number | null
          gst_percent?: number | null
          is_recommended?: boolean | null
          slip_sent?: boolean | null
          slip_sent_via?: string | null
          slip_sent_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          rm_buying_id?: string
          supplier_id?: string
          rate_per_unit?: number | null
          total_amount?: number | null
          availability?: string | null
          lead_time_days?: number | null
          gst_percent?: number | null
          is_recommended?: boolean | null
          slip_sent?: boolean | null
          slip_sent_via?: string | null
          slip_sent_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rm_buying_rates_rm_buying_id_fkey"
            columns: ["rm_buying_id"]
            isOneToOne: false
            referencedRelation: "rm_buying"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rm_buying_rates_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          }
        ]
      }
      rm_buying_step_docs: {
        Row: {
          id: string
          rm_buying_id: string
          step_number: number
          step_name: string
          doc_url: string | null
          remarks: string | null
          uploaded_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          rm_buying_id: string
          step_number: number
          step_name: string
          doc_url?: string | null
          remarks?: string | null
          uploaded_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          rm_buying_id?: string
          step_number?: number
          step_name?: string
          doc_url?: string | null
          remarks?: string | null
          uploaded_by?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rm_buying_step_docs_rm_buying_id_fkey"
            columns: ["rm_buying_id"]
            isOneToOne: false
            referencedRelation: "rm_buying"
            referencedColumns: ["id"]
          }
        ]
      }
      rm_buying_communications: {
        Row: {
          id: string
          rm_buying_id: string
          communication_type: string
          supplier_id: string | null
          contact_person: string | null
          notes: string | null
          follow_up_needed: boolean | null
          follow_up_date: string | null
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          rm_buying_id: string
          communication_type: string
          supplier_id?: string | null
          contact_person?: string | null
          notes?: string | null
          follow_up_needed?: boolean | null
          follow_up_date?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          rm_buying_id?: string
          communication_type?: string
          supplier_id?: string | null
          contact_person?: string | null
          notes?: string | null
          follow_up_needed?: boolean | null
          follow_up_date?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rm_buying_communications_rm_buying_id_fkey"
            columns: ["rm_buying_id"]
            isOneToOne: false
            referencedRelation: "rm_buying"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rm_buying_communications_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          }
        ]
      }
      salary_components: {
        Row: {
          id: string
          employee_id: string
          basic: number | null
          hra: number | null
          da: number | null
          conveyance: number | null
          medical: number | null
          special_allowance: number | null
          night_shift_allowance: number | null
          pf_employee_pct: number | null
          pf_employer_pct: number | null
          esi_employee_pct: number | null
          esi_employer_pct: number | null
          professional_tax: number | null
          lwf: number | null
          tds: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          basic?: number | null
          hra?: number | null
          da?: number | null
          conveyance?: number | null
          medical?: number | null
          special_allowance?: number | null
          night_shift_allowance?: number | null
          pf_employee_pct?: number | null
          pf_employer_pct?: number | null
          esi_employee_pct?: number | null
          esi_employer_pct?: number | null
          professional_tax?: number | null
          lwf?: number | null
          tds?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          basic?: number | null
          hra?: number | null
          da?: number | null
          conveyance?: number | null
          medical?: number | null
          special_allowance?: number | null
          night_shift_allowance?: number | null
          pf_employee_pct?: number | null
          pf_employer_pct?: number | null
          esi_employee_pct?: number | null
          esi_employer_pct?: number | null
          professional_tax?: number | null
          lwf?: number | null
          tds?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          id: string
          item_id: string
          movement_type: string
          quantity: number
          person_name: string | null
          department: string | null
          purpose: string | null
          reference_type: string | null
          reference_id: string | null
          remarks: string | null
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          item_id: string
          movement_type: string
          quantity: number
          person_name?: string | null
          department?: string | null
          purpose?: string | null
          reference_type?: string | null
          reference_id?: string | null
          remarks?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          item_id?: string
          movement_type?: string
          quantity?: number
          person_name?: string | null
          department?: string | null
          purpose?: string | null
          reference_type?: string | null
          reference_id?: string | null
          remarks?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "store_items"
            referencedColumns: ["id"]
          }
        ]
      }
      store_items: {
        Row: {
          id: string
          item_code: string | null
          name: string
          description: string | null
          category: string | null
          unit: string | null
          current_qty: number | null
          min_stock_level: number | null
          rate: number | null
          rack_location: string | null
          supplier_id: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          item_code?: string | null
          name: string
          description?: string | null
          category?: string | null
          unit?: string | null
          current_qty?: number | null
          min_stock_level?: number | null
          rate?: number | null
          rack_location?: string | null
          supplier_id?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          item_code?: string | null
          name?: string
          description?: string | null
          category?: string | null
          unit?: string | null
          current_qty?: number | null
          min_stock_level?: number | null
          rate?: number | null
          rack_location?: string | null
          supplier_id?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          }
        ]
      }
      suppliers: {
        Row: {
          id: string
          name: string
          address: string | null
          gst_number: string | null
          contact_person: string | null
          phone: string | null
          whatsapp: string | null
          email: string | null
          category: string | null
          supplier_type: string | null
          nature_of_supply: string | null
          tat_days: number | null
          payment_terms: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          gst_number?: string | null
          contact_person?: string | null
          phone?: string | null
          whatsapp?: string | null
          email?: string | null
          category?: string | null
          supplier_type?: string | null
          nature_of_supply?: string | null
          tat_days?: number | null
          payment_terms?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          gst_number?: string | null
          contact_person?: string | null
          phone?: string | null
          whatsapp?: string | null
          email?: string | null
          category?: string | null
          supplier_type?: string | null
          nature_of_supply?: string | null
          tat_days?: number | null
          payment_terms?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      task_notes: {
        Row: {
          id: string
          task_id: string
          note: string
          author_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          task_id: string
          note: string
          author_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          task_id?: string
          note?: string
          author_id?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "procurement_tasks"
            referencedColumns: ["id"]
          }
        ]
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          id?: string
          user_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          id?: string
          user_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_department: {
        Args: { _user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      mark_all_overdue: {
        Args: Record<PropertyKey, never>
        Returns: void
      }
    }



    Enums: {
      app_role:
      | "admin"
      | "hr"
      | "security"
      | "procurement"
      | "employee"
      | "toolroom_high"
      | "moulding_high"
      | "ref_person"
      | "store"
      | "accountant"
      | "cad_cam"
      | "tool_room_head"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends { Row: infer R }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "hr",
        "security",
        "procurement",
        "employee",
        "toolroom_high",
        "moulding_high",
        "ref_person",
        "store",
        "accountant",
        "cad_cam",
        "tool_room_head",
      ],
    },
  },
} as const
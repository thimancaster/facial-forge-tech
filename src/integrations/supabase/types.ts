export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      analyses: {
        Row: {
          ai_clinical_notes: string | null
          ai_confidence: number | null
          ai_injection_points: Json | null
          conversion_factor: number | null
          corrugator_dosage: number | null
          created_at: string
          face_boxes: Json | null
          frontal_photo_url: string | null
          glabellar_photo_url: string | null
          id: string
          muscle_strength_score: string | null
          nasal_photo_url: string | null
          next_appointment_date: string | null
          notes: string | null
          patient_gender: string | null
          patient_id: string
          perioral_photo_url: string | null
          procerus_dosage: number | null
          product_type: string | null
          profile_left_photo_url: string | null
          profile_right_photo_url: string | null
          resting_photo_url: string | null
          safety_zones: Json | null
          skin_type_glogau: string | null
          smile_photo_url: string | null
          status: string | null
          treatment_zones: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_clinical_notes?: string | null
          ai_confidence?: number | null
          ai_injection_points?: Json | null
          conversion_factor?: number | null
          corrugator_dosage?: number | null
          created_at?: string
          face_boxes?: Json | null
          frontal_photo_url?: string | null
          glabellar_photo_url?: string | null
          id?: string
          muscle_strength_score?: string | null
          nasal_photo_url?: string | null
          next_appointment_date?: string | null
          notes?: string | null
          patient_gender?: string | null
          patient_id: string
          perioral_photo_url?: string | null
          procerus_dosage?: number | null
          product_type?: string | null
          profile_left_photo_url?: string | null
          profile_right_photo_url?: string | null
          resting_photo_url?: string | null
          safety_zones?: Json | null
          skin_type_glogau?: string | null
          smile_photo_url?: string | null
          status?: string | null
          treatment_zones?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_clinical_notes?: string | null
          ai_confidence?: number | null
          ai_injection_points?: Json | null
          conversion_factor?: number | null
          corrugator_dosage?: number | null
          created_at?: string
          face_boxes?: Json | null
          frontal_photo_url?: string | null
          glabellar_photo_url?: string | null
          id?: string
          muscle_strength_score?: string | null
          nasal_photo_url?: string | null
          next_appointment_date?: string | null
          notes?: string | null
          patient_gender?: string | null
          patient_id?: string
          perioral_photo_url?: string | null
          procerus_dosage?: number | null
          product_type?: string | null
          profile_left_photo_url?: string | null
          profile_right_photo_url?: string | null
          resting_photo_url?: string | null
          safety_zones?: Json | null
          skin_type_glogau?: string | null
          smile_photo_url?: string | null
          status?: string | null
          treatment_zones?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analyses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_reminders: {
        Row: {
          appointment_id: string
          created_at: string
          error_message: string | null
          id: string
          reminder_type: string
          scheduled_for: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          appointment_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          reminder_type?: string
          scheduled_for: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          appointment_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          reminder_type?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_reminders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          analysis_id: string | null
          appointment_type: string
          created_at: string
          id: string
          notes: string | null
          patient_email: string | null
          patient_id: string
          patient_phone: string | null
          reminder_days_before: number[] | null
          reminder_email: boolean | null
          scheduled_date: string
          scheduled_time: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          appointment_type?: string
          created_at?: string
          id?: string
          notes?: string | null
          patient_email?: string | null
          patient_id: string
          patient_phone?: string | null
          reminder_days_before?: number[] | null
          reminder_email?: boolean | null
          scheduled_date: string
          scheduled_time?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          appointment_type?: string
          created_at?: string
          id?: string
          notes?: string | null
          patient_email?: string | null
          patient_id?: string
          patient_phone?: string | null
          reminder_days_before?: number[] | null
          reminder_email?: boolean | null
          scheduled_date?: string
          scheduled_time?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          age: number | null
          allergies: string | null
          birth_date: string | null
          created_at: string
          email: string | null
          gender: string | null
          id: string
          medical_history: string | null
          name: string
          observations: string | null
          phone: string | null
          photo_url: string | null
          preferred_product: string | null
          skin_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          allergies?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          gender?: string | null
          id?: string
          medical_history?: string | null
          name: string
          observations?: string | null
          phone?: string | null
          photo_url?: string | null
          preferred_product?: string | null
          skin_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          allergies?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          gender?: string | null
          id?: string
          medical_history?: string | null
          name?: string
          observations?: string | null
          phone?: string | null
          photo_url?: string | null
          preferred_product?: string | null
          skin_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          clinic_name: string | null
          created_at: string
          full_name: string | null
          id: string
          specialty: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          clinic_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          specialty?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          clinic_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          specialty?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string
          function_key: string
          id: string
          request_count: number
          user_id: string
          window_end: string
          window_start: string
        }
        Insert: {
          created_at?: string
          function_key: string
          id?: string
          request_count?: number
          user_id: string
          window_end: string
          window_start?: string
        }
        Update: {
          created_at?: string
          function_key?: string
          id?: string
          request_count?: number
          user_id?: string
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      treatment_templates: {
        Row: {
          created_at: string
          default_units: number
          description: string | null
          gender_modifier_female: number | null
          gender_modifier_male: number | null
          id: string
          injection_pattern: string | null
          injection_points: Json
          is_active: boolean | null
          muscle_modifier_high: number | null
          muscle_modifier_low: number | null
          muscle_modifier_medium: number | null
          name: string
          updated_at: string
          zone_type: string
        }
        Insert: {
          created_at?: string
          default_units: number
          description?: string | null
          gender_modifier_female?: number | null
          gender_modifier_male?: number | null
          id?: string
          injection_pattern?: string | null
          injection_points: Json
          is_active?: boolean | null
          muscle_modifier_high?: number | null
          muscle_modifier_low?: number | null
          muscle_modifier_medium?: number | null
          name: string
          updated_at?: string
          zone_type: string
        }
        Update: {
          created_at?: string
          default_units?: number
          description?: string | null
          gender_modifier_female?: number | null
          gender_modifier_male?: number | null
          id?: string
          injection_pattern?: string | null
          injection_points?: Json
          is_active?: boolean | null
          muscle_modifier_high?: number | null
          muscle_modifier_low?: number | null
          muscle_modifier_medium?: number | null
          name?: string
          updated_at?: string
          zone_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_rate_limits: { Args: never; Returns: number }
    }
    Enums: {
      [_ in never]: never
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
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
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
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
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
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
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
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

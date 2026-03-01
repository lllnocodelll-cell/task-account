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
      chat_channel_members: {
        Row: {
          channel_id: string | null
          id: string
          joined_at: string
          role: string | null
          user_id: string | null
        }
        Insert: {
          channel_id?: string | null
          id?: string
          joined_at?: string
          role?: string | null
          user_id?: string | null
        }
        Update: {
          channel_id?: string | null
          id?: string
          joined_at?: string
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      chat_contacts: {
        Row: {
          avatar: string | null
          created_at: string | null
          id: string
          name: string
          role: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string | null
          id?: string
          name: string
          role?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          avatar?: string | null
          created_at?: string | null
          id?: string
          name?: string
          role?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          channel_id: string | null
          contact_id: string
          created_at: string | null
          id: string
          is_me: boolean | null
          sender_id: string
          status: string | null
          text: string
        }
        Insert: {
          channel_id?: string | null
          contact_id: string
          created_at?: string | null
          id?: string
          is_me?: boolean | null
          sender_id: string
          status?: string | null
          text: string
        }
        Update: {
          channel_id?: string | null
          contact_id?: string
          created_at?: string | null
          id?: string
          is_me?: boolean | null
          sender_id?: string
          status?: string | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "chat_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_accesses: {
        Row: {
          access_name: string
          access_url: string | null
          client_id: string
          created_at: string | null
          id: string
          password: string | null
          username: string | null
        }
        Insert: {
          access_name: string
          access_url?: string | null
          client_id: string
          created_at?: string | null
          id?: string
          password?: string | null
          username?: string | null
        }
        Update: {
          access_name?: string
          access_url?: string | null
          client_id?: string
          created_at?: string | null
          id?: string
          password?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_accesses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_activities: {
        Row: {
          client_id: string
          cnae_code: string
          cnae_description: string | null
          created_at: string | null
          id: string
          order_type: string
        }
        Insert: {
          client_id: string
          cnae_code: string
          cnae_description?: string | null
          created_at?: string | null
          id?: string
          order_type: string
        }
        Update: {
          client_id?: string
          cnae_code?: string
          cnae_description?: string | null
          created_at?: string | null
          id?: string
          order_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_certificates: {
        Row: {
          client_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          model: string | null
          password: string | null
          signatory: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          model?: string | null
          password?: string | null
          signatory?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          model?: string | null
          password?: string | null
          signatory?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_certificates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          client_id: string
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone_fixed: string | null
          phone_mobile: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone_fixed?: string | null
          phone_mobile?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone_fixed?: string | null
          phone_mobile?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_inscriptions: {
        Row: {
          client_id: string
          created_at: string | null
          custom_name: string | null
          id: string
          number: string
          observation: string | null
          type: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          custom_name?: string | null
          id?: string
          number: string
          observation?: string | null
          type: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          custom_name?: string | null
          id?: string
          number?: string
          observation?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_inscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_legislations: {
        Row: {
          access_url: string | null
          client_id: string
          created_at: string | null
          description: string
          id: string
          status: string | null
        }
        Insert: {
          access_url?: string | null
          client_id: string
          created_at?: string | null
          description: string
          id?: string
          status?: string | null
        }
        Update: {
          access_url?: string | null
          client_id?: string
          created_at?: string | null
          description?: string
          id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_legislations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_licenses: {
        Row: {
          access_url: string | null
          client_id: string
          created_at: string | null
          expiry_date: string | null
          id: string
          license_name: string
          license_number: string | null
        }
        Insert: {
          access_url?: string | null
          client_id: string
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          license_name: string
          license_number?: string | null
        }
        Update: {
          access_url?: string | null
          client_id?: string
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          license_name?: string
          license_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_licenses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tax_regime_history: {
        Row: {
          client_id: string
          created_at: string | null
          end_date: string | null
          id: string
          observation: string | null
          regime: string
          start_date: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          observation?: string | null
          regime: string
          start_date?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          observation?: string | null
          regime?: string
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_tax_regime_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          admin_partner_birthdate: string | null
          admin_partner_cpf: string | null
          admin_partner_name: string | null
          city: string | null
          code: string | null
          company_name: string
          complement: string | null
          constitution_date: string | null
          created_at: string | null
          document: string | null
          entry_date: string | null
          exit_date: string | null
          has_branches: boolean | null
          id: string
          neighborhood: string | null
          org_id: string
          person_type: string | null
          segment: string | null
          state: string | null
          status: string
          street: string | null
          street_number: string | null
          trade_name: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          admin_partner_birthdate?: string | null
          admin_partner_cpf?: string | null
          admin_partner_name?: string | null
          city?: string | null
          code?: string | null
          company_name: string
          complement?: string | null
          constitution_date?: string | null
          created_at?: string | null
          document?: string | null
          entry_date?: string | null
          exit_date?: string | null
          has_branches?: boolean | null
          id?: string
          neighborhood?: string | null
          org_id: string
          person_type?: string | null
          segment?: string | null
          state?: string | null
          status?: string
          street?: string | null
          street_number?: string | null
          trade_name?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          admin_partner_birthdate?: string | null
          admin_partner_cpf?: string | null
          admin_partner_name?: string | null
          city?: string | null
          code?: string | null
          company_name?: string
          complement?: string | null
          constitution_date?: string | null
          created_at?: string | null
          document?: string | null
          entry_date?: string | null
          exit_date?: string | null
          has_branches?: boolean | null
          id?: string
          neighborhood?: string | null
          org_id?: string
          person_type?: string | null
          segment?: string | null
          state?: string | null
          status?: string
          street?: string | null
          street_number?: string | null
          trade_name?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          created_at: string | null
          date: string
          id: string
          name: string
          org_id: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          name: string
          org_id: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          name?: string
          org_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "holidays_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          org_id: string
          sector_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          org_id: string
          sector_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          org_id?: string
          sector_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          color: string | null
          content: string | null
          created_at: string | null
          id: string
          is_archived: boolean | null
          is_pinned: boolean | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_pinned?: boolean | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_pinned?: boolean | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          job_title: string | null
          location: string | null
          org_id: string | null
          org_name: string | null
          phone: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          job_title?: string | null
          location?: string | null
          org_id?: string | null
          org_name?: string | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          location?: string | null
          org_id?: string | null
          org_name?: string | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sectors: {
        Row: {
          cost_center: string | null
          created_at: string | null
          id: string
          leader: string | null
          name: string
          org_id: string
          status: string | null
        }
        Insert: {
          cost_center?: string | null
          created_at?: string | null
          id?: string
          leader?: string | null
          name: string
          org_id: string
          status?: string | null
        }
        Update: {
          cost_center?: string | null
          created_at?: string | null
          id?: string
          leader?: string | null
          name?: string
          org_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sectors_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attachments: {
        Row: {
          created_at: string
          download_url: string | null
          file_name: string
          file_size: number
          id: string
          is_conclude_attachment: boolean | null
          storage_path: string | null
          task_id: string | null
        }
        Insert: {
          created_at?: string
          download_url?: string | null
          file_name: string
          file_size: number
          id?: string
          is_conclude_attachment?: boolean | null
          storage_path?: string | null
          task_id?: string | null
        }
        Update: {
          created_at?: string
          download_url?: string | null
          file_name?: string
          file_size?: number
          id?: string
          is_conclude_attachment?: boolean | null
          storage_path?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_types: {
        Row: {
          created_at: string | null
          federative_entity: string | null
          id: string
          name: string
          org_id: string
          sector_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          federative_entity?: string | null
          id?: string
          name: string
          org_id: string
          sector_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          federative_entity?: string | null
          id?: string
          name?: string
          org_id?: string
          sector_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_types_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_types_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          client_id: string | null
          client_name: string
          competence: string
          created_at: string
          due_date: string | null
          exceeded_sublimit: boolean | null
          factor_r: boolean | null
          id: string
          no_movement: boolean | null
          observation: string | null
          org_id: string | null
          priority: string
          recurrence: string | null
          recurrence_months: number[] | null
          registration_regime: string | null
          responsible: string | null
          sector: string | null
          selected_annexes: string[] | null
          selected_dfes: string[] | null
          status: string
          task_name: string
          tax_regime: string | null
          variable_adjustment: string | null
        }
        Insert: {
          client_id?: string | null
          client_name: string
          competence: string
          created_at?: string
          due_date?: string | null
          exceeded_sublimit?: boolean | null
          factor_r?: boolean | null
          id?: string
          no_movement?: boolean | null
          observation?: string | null
          org_id?: string | null
          priority: string
          recurrence?: string | null
          recurrence_months?: number[] | null
          registration_regime?: string | null
          responsible?: string | null
          sector?: string | null
          selected_annexes?: string[] | null
          selected_dfes?: string[] | null
          status: string
          task_name: string
          tax_regime?: string | null
          variable_adjustment?: string | null
        }
        Update: {
          client_id?: string | null
          client_name?: string
          competence?: string
          created_at?: string
          due_date?: string | null
          exceeded_sublimit?: boolean | null
          factor_r?: boolean | null
          id?: string
          no_movement?: boolean | null
          observation?: string | null
          org_id?: string | null
          priority?: string
          recurrence?: string | null
          recurrence_months?: number[] | null
          registration_regime?: string | null
          responsible?: string | null
          sector?: string | null
          selected_annexes?: string[] | null
          selected_dfes?: string[] | null
          status?: string
          task_name?: string
          tax_regime?: string | null
          variable_adjustment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_client_access: { Args: { client_uuid: string }; Returns: boolean }
      get_adjusted_due_date: {
        Args: { p_adjustment_type: string; p_date: string; p_org_id: string }
        Returns: string
      }
      get_auth_org_id: { Args: never; Returns: string }
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

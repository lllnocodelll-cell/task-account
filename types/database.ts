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
      chat_calls: {
        Row: {
          caller_id: string | null
          channel_id: string | null
          created_at: string | null
          id: string
          is_video: boolean | null
          status: string | null
          target_id: string | null
        }
        Insert: {
          caller_id?: string | null
          channel_id?: string | null
          created_at?: string | null
          id?: string
          is_video?: boolean | null
          status?: string | null
          target_id?: string | null
        }
        Update: {
          caller_id?: string | null
          channel_id?: string | null
          created_at?: string | null
          id?: string
          is_video?: boolean | null
          status?: string | null
          target_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_calls_caller_id_fkey"
            columns: ["caller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_calls_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_calls_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channel_members: {
        Row: {
          channel_id: string | null
          id: string
          joined_at: string
          last_read_at: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          channel_id?: string | null
          id?: string
          joined_at?: string
          last_read_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          channel_id?: string | null
          id?: string
          joined_at?: string
          last_read_at?: string | null
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
          assigned_to: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          sector_id: string | null
          status: string | null
          support_status: string | null
          type: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          sector_id?: string | null
          status?: string | null
          support_status?: string | null
          type: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          sector_id?: string | null
          status?: string | null
          support_status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channels_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
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
      chat_favorites: {
        Row: {
          channel_id: string
          created_at: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_favorites_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_favorites_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_template_dispatches: {
        Row: {
          client_id: string
          competence: string
          id: string
          sent_at: string
          template_id: string
        }
        Insert: {
          client_id: string
          competence: string
          id?: string
          sent_at?: string
          template_id: string
        }
        Update: {
          client_id?: string
          competence?: string
          id?: string
          sent_at?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_template_dispatches_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_template_dispatches_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "chat_message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_templates: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          email_subject: string | null
          id: string
          is_automated: boolean
          org_id: string | null
          reference_task_type_id: string | null
          send_email_copy: boolean
          target_client_ids: string[] | null
          target_sectors: string[] | null
          target_segments: string[] | null
          target_tax_regimes: string[] | null
          title: string
          trigger_time: string
          trigger_type: string | null
          trigger_value: number | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          email_subject?: string | null
          id?: string
          is_automated?: boolean
          org_id?: string | null
          reference_task_type_id?: string | null
          send_email_copy?: boolean
          target_client_ids?: string[] | null
          target_sectors?: string[] | null
          target_segments?: string[] | null
          target_tax_regimes?: string[] | null
          title: string
          trigger_time?: string
          trigger_type?: string | null
          trigger_value?: number | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          email_subject?: string | null
          id?: string
          is_automated?: boolean
          org_id?: string | null
          reference_task_type_id?: string | null
          send_email_copy?: boolean
          target_client_ids?: string[] | null
          target_sectors?: string[] | null
          target_segments?: string[] | null
          target_tax_regimes?: string[] | null
          title?: string
          trigger_time?: string
          trigger_type?: string | null
          trigger_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_templates_reference_task_type_id_fkey"
            columns: ["reference_task_type_id"]
            isOneToOne: false
            referencedRelation: "task_types"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachment_url: string | null
          channel_id: string | null
          contact_id: string | null
          created_at: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          id: string
          is_me: boolean | null
          is_system: boolean | null
          reply_to_id: string | null
          sender_id: string
          status: string | null
          text: string
        }
        Insert: {
          attachment_url?: string | null
          channel_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_me?: boolean | null
          is_system?: boolean | null
          reply_to_id?: string | null
          sender_id: string
          status?: string | null
          text: string
        }
        Update: {
          attachment_url?: string | null
          channel_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_me?: boolean | null
          is_system?: boolean | null
          reply_to_id?: string | null
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
            foreignKeyName: "chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
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
      chat_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_reactions_user_id_fkey"
            columns: ["user_id"]
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
          sector: string | null
          username: string | null
        }
        Insert: {
          access_name: string
          access_url?: string | null
          client_id: string
          created_at?: string | null
          id?: string
          password?: string | null
          sector?: string | null
          username?: string | null
        }
        Update: {
          access_name?: string
          access_url?: string | null
          client_id?: string
          created_at?: string | null
          id?: string
          password?: string | null
          sector?: string | null
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
          is_main: boolean | null
          name: string
          phone_fixed: string | null
          phone_mobile: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_main?: boolean | null
          name: string
          phone_fixed?: string | null
          phone_mobile?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_main?: boolean | null
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
      client_dfe_series: {
        Row: {
          client_id: string
          created_at: string | null
          dfe_type: string
          id: string
          issuer: string | null
          login_url: string | null
          password: string | null
          series: string
          username: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          dfe_type: string
          id?: string
          issuer?: string | null
          login_url?: string | null
          password?: string | null
          series: string
          username?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          dfe_type?: string
          id?: string
          issuer?: string | null
          login_url?: string | null
          password?: string | null
          series?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_dfe_series_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_document_logs: {
        Row: {
          document_id: string | null
          id: string
          ip_address: string | null
          read_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          document_id?: string | null
          id?: string
          ip_address?: string | null
          read_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          document_id?: string | null
          id?: string
          ip_address?: string | null
          read_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_document_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "client_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_document_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          client_id: string | null
          competence_month: string | null
          created_at: string | null
          due_date: string | null
          id: string
          is_paid: boolean | null
          name: string
          org_id: string | null
          sector_id: string | null
          status: string | null
          storage_path: string
          task_id: string | null
          type: string | null
          uploaded_by_role: string | null
        }
        Insert: {
          client_id?: string | null
          competence_month?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_paid?: boolean | null
          name: string
          org_id?: string | null
          sector_id?: string | null
          status?: string | null
          storage_path: string
          task_id?: string | null
          type?: string | null
          uploaded_by_role?: string | null
        }
        Update: {
          client_id?: string | null
          competence_month?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_paid?: boolean | null
          name?: string
          org_id?: string | null
          sector_id?: string | null
          status?: string | null
          storage_path?: string
          task_id?: string | null
          type?: string | null
          uploaded_by_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
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
      client_segments: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
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
          establishment_type: string
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
          establishment_type?: string
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
          establishment_type?: string
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
      economic_indices: {
        Row: {
          code: string
          created_at: string | null
          id: string
          last_sync: string | null
          name: string
          unit: string | null
          updated_at: string | null
          value: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          last_sync?: string | null
          name: string
          unit?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          last_sync?: string | null
          name?: string
          unit?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Relationships: []
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
          client_id: string | null
          client_ids: string[] | null
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          org_id: string
          role: string | null
          sector_id: string | null
          status: string | null
        }
        Insert: {
          client_id?: string | null
          client_ids?: string[] | null
          created_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          org_id: string
          role?: string | null
          sector_id?: string | null
          status?: string | null
        }
        Update: {
          client_id?: string | null
          client_ids?: string[] | null
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          org_id?: string
          role?: string | null
          sector_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
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
          link: string | null
          message: string | null
          read: boolean | null
          related_entity_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          related_entity_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          related_entity_id?: string | null
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
          chat_status: string | null
          client_id: string | null
          client_ids: string[] | null
          created_at: string | null
          current_session_start: string | null
          full_name: string | null
          id: string
          job_title: string | null
          last_active_at: string | null
          location: string | null
          org_id: string | null
          org_name: string | null
          phone: string | null
          role: string
          session_start_at: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          chat_status?: string | null
          client_id?: string | null
          client_ids?: string[] | null
          created_at?: string | null
          current_session_start?: string | null
          full_name?: string | null
          id: string
          job_title?: string | null
          last_active_at?: string | null
          location?: string | null
          org_id?: string | null
          org_name?: string | null
          phone?: string | null
          role?: string
          session_start_at?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          chat_status?: string | null
          client_id?: string | null
          client_ids?: string[] | null
          created_at?: string | null
          current_session_start?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          last_active_at?: string | null
          location?: string | null
          org_id?: string | null
          org_name?: string | null
          phone?: string | null
          role?: string
          session_start_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      sectors: {
        Row: {
          chat_available: boolean
          cost_center: string | null
          created_at: string | null
          id: string
          leader: string | null
          name: string
          org_id: string
          status: string | null
        }
        Insert: {
          chat_available?: boolean
          cost_center?: string | null
          created_at?: string | null
          id?: string
          leader?: string | null
          name: string
          org_id: string
          status?: string | null
        }
        Update: {
          chat_available?: boolean
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
          due_day: number | null
          federative_entity: string | null
          id: string
          name: string
          non_working_day_action: string | null
          org_id: string
          sector_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          due_day?: number | null
          federative_entity?: string | null
          id?: string
          name: string
          non_working_day_action?: string | null
          org_id: string
          sector_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          due_day?: number | null
          federative_entity?: string | null
          id?: string
          name?: string
          non_working_day_action?: string | null
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
      task_workflows: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          description: string
          id: string
          is_completed: boolean | null
          is_mandatory: boolean
          order_index: number | null
          task_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          description: string
          id?: string
          is_completed?: boolean | null
          is_mandatory?: boolean
          order_index?: number | null
          task_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          description?: string
          id?: string
          is_completed?: boolean | null
          is_mandatory?: boolean
          order_index?: number | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_workflows_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
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
          notified_exclusion: boolean | null
          observation: string | null
          org_id: string | null
          priority: string
          recurrence: string | null
          recurrence_months: number[] | null
          registration_regime: string | null
          responsible: string | null
          sector: string | null
          selected_annexes: string[] | null
          status: string
          task_name: string
          tax_regime: string | null
          temporary_tag: string | null
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
          notified_exclusion?: boolean | null
          observation?: string | null
          org_id?: string | null
          priority: string
          recurrence?: string | null
          recurrence_months?: number[] | null
          registration_regime?: string | null
          responsible?: string | null
          sector?: string | null
          selected_annexes?: string[] | null
          status: string
          task_name: string
          tax_regime?: string | null
          temporary_tag?: string | null
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
          notified_exclusion?: boolean | null
          observation?: string | null
          org_id?: string | null
          priority?: string
          recurrence?: string | null
          recurrence_months?: number[] | null
          registration_regime?: string | null
          responsible?: string | null
          sector?: string | null
          selected_annexes?: string[] | null
          status?: string
          task_name?: string
          tax_regime?: string | null
          temporary_tag?: string | null
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
      tutorial_favorites: {
        Row: {
          created_at: string | null
          id: string
          tutorial_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          tutorial_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          tutorial_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutorial_favorites_tutorial_id_fkey"
            columns: ["tutorial_id"]
            isOneToOne: false
            referencedRelation: "tutorials"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorials: {
        Row: {
          client_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          file_name: string | null
          file_path: string | null
          id: string
          org_id: string
          subject: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          org_id: string
          subject: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          org_id?: string
          subject?: string
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tutorials_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutorials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      useful_links: {
        Row: {
          created_at: string
          description: string | null
          icon_name: string | null
          id: string
          org_id: string
          sector_id: string | null
          title: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          org_id: string
          sector_id?: string | null
          title: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          org_id?: string
          sector_id?: string | null
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "useful_links_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      user_dashboard_configs: {
        Row: {
          created_at: string | null
          id: string
          layout: Json | null
          updated_at: string | null
          user_id: string
          widgets: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          layout?: Json | null
          updated_at?: string | null
          user_id: string
          widgets?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          layout?: Json | null
          updated_at?: string | null
          user_id?: string
          widgets?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "user_dashboard_configs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_daily_productivity: {
        Row: {
          completed_count: number | null
          date: string | null
          org_id: string | null
        }
        Relationships: []
      }
      vw_monthly_evolution: {
        Row: {
          concluded: number | null
          month: string | null
          org_id: string | null
          pending: number | null
        }
        Relationships: []
      }
      vw_segment_distribution: {
        Row: {
          name: string | null
          org_id: string | null
          value: number | null
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
      vw_status_by_user: {
        Row: {
          count: number | null
          org_id: string | null
          responsible: string | null
          status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_client_access: { Args: { client_uuid: string }; Returns: boolean }
      check_daily_expirations: { Args: never; Returns: undefined }
      get_adjusted_due_date: {
        Args: { p_adjustment_type: string; p_date: string; p_org_id: string }
        Returns: string
      }
      get_auth_org_id: { Args: never; Returns: string }
      is_channel_member: { Args: { channel_uuid: string }; Returns: boolean }
      is_chat_member: { Args: { cid: string }; Returns: boolean }
      process_automated_chat_templates: { Args: never; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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

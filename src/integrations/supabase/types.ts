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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          brand_id: string | null
          created_at: string
          details: Json | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          brand_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          brand_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_numbers: {
        Row: {
          brand_id: string
          created_at: string
          created_by: string | null
          id: string
          phone: string
          reason: string | null
        }
        Insert: {
          brand_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          phone: string
          reason?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          phone?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_numbers_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_members: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["brand_role"]
          user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["brand_role"]
          user_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["brand_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_members_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          cancel_requested_at: string | null
          created_at: string
          created_by: string | null
          current_package_id: string | null
          device_limit: number
          expires_at: string | null
          id: string
          license_limit: number
          message_limit: number | null
          name: string
          status: Database["public"]["Enums"]["brand_status"]
          updated_at: string
          whmcs_product_id: string | null
          whmcs_service_id: string | null
        }
        Insert: {
          cancel_requested_at?: string | null
          created_at?: string
          created_by?: string | null
          current_package_id?: string | null
          device_limit?: number
          expires_at?: string | null
          id?: string
          license_limit?: number
          message_limit?: number | null
          name: string
          status?: Database["public"]["Enums"]["brand_status"]
          updated_at?: string
          whmcs_product_id?: string | null
          whmcs_service_id?: string | null
        }
        Update: {
          cancel_requested_at?: string | null
          created_at?: string
          created_by?: string | null
          current_package_id?: string | null
          device_limit?: number
          expires_at?: string | null
          id?: string
          license_limit?: number
          message_limit?: number | null
          name?: string
          status?: Database["public"]["Enums"]["brand_status"]
          updated_at?: string
          whmcs_product_id?: string | null
          whmcs_service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_current_package_id_fkey"
            columns: ["current_package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_messages: {
        Row: {
          campaign_id: string
          contact_id: string | null
          created_at: string
          error_message: string | null
          gateway_response: Json | null
          id: string
          phone: string
          rendered_message: string
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          contact_id?: string | null
          created_at?: string
          error_message?: string | null
          gateway_response?: Json | null
          id?: string
          phone: string
          rendered_message: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          contact_id?: string | null
          created_at?: string
          error_message?: string | null
          gateway_response?: Json | null
          id?: string
          phone?: string
          rendered_message?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          brand_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          daily_limit: number
          device_id: string
          failed_count: number
          id: string
          max_delay_seconds: number
          media_url: string | null
          message: string
          min_delay_seconds: number
          name: string
          scheduled_at: string | null
          send_mode: string
          send_window_end: string | null
          send_window_start: string | null
          sent_count: number
          started_at: string | null
          status: string
          total_recipients: number
          updated_at: string
        }
        Insert: {
          brand_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          daily_limit?: number
          device_id: string
          failed_count?: number
          id?: string
          max_delay_seconds?: number
          media_url?: string | null
          message: string
          min_delay_seconds?: number
          name: string
          scheduled_at?: string | null
          send_mode?: string
          send_window_end?: string | null
          send_window_start?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          brand_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          daily_limit?: number
          device_id?: string
          failed_count?: number
          id?: string
          max_delay_seconds?: number
          media_url?: string | null
          message?: string
          min_delay_seconds?: number
          name?: string
          scheduled_at?: string | null
          send_mode?: string
          send_window_end?: string | null
          send_window_start?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          total_recipients?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_group_members: {
        Row: {
          added_at: string
          contact_id: string
          group_id: string
        }
        Insert: {
          added_at?: string
          contact_id: string
          group_id: string
        }
        Update: {
          added_at?: string
          contact_id?: string
          group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_group_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "contact_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_groups: {
        Row: {
          brand_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_groups_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          brand_id: string
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string | null
          notes: string | null
          phone: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          phone: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          phone?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          updated_at: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          updated_at?: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      device_requests: {
        Row: {
          admin_reply: string | null
          assigned_to: string | null
          brand_id: string
          created_at: string
          device_name: string
          id: string
          notes: string | null
          requested_by: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_reply?: string | null
          assigned_to?: string | null
          brand_id: string
          created_at?: string
          device_name: string
          id?: string
          notes?: string | null
          requested_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_reply?: string | null
          assigned_to?: string | null
          brand_id?: string
          created_at?: string
          device_name?: string
          id?: string
          notes?: string | null
          requested_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_requests_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          api_secret: string
          brand_id: string | null
          created_at: string
          created_by: string | null
          device_unique_id: string
          id: string
          last_checked_at: string | null
          name: string
          sim_info: string | null
          status: Database["public"]["Enums"]["device_status"]
          updated_at: string
        }
        Insert: {
          api_secret: string
          brand_id?: string | null
          created_at?: string
          created_by?: string | null
          device_unique_id: string
          id?: string
          last_checked_at?: string | null
          name: string
          sim_info?: string | null
          status?: Database["public"]["Enums"]["device_status"]
          updated_at?: string
        }
        Update: {
          api_secret?: string
          brand_id?: string | null
          created_at?: string
          created_by?: string | null
          device_unique_id?: string
          id?: string
          last_checked_at?: string | null
          name?: string
          sim_info?: string | null
          status?: Database["public"]["Enums"]["device_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          bkash_number: string
          brand_id: string | null
          coupon_id: string | null
          created_at: string
          discount_amount: number
          email: string
          final_amount: number
          full_name: string
          id: string
          original_amount: number
          package_id: string
          phone: string | null
          status: string
          txid: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bkash_number: string
          brand_id?: string | null
          coupon_id?: string | null
          created_at?: string
          discount_amount?: number
          email: string
          final_amount: number
          full_name: string
          id?: string
          original_amount: number
          package_id: string
          phone?: string | null
          status?: string
          txid: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bkash_number?: string
          brand_id?: string | null
          coupon_id?: string | null
          created_at?: string
          discount_amount?: number
          email?: string
          final_amount?: number
          full_name?: string
          id?: string
          original_amount?: number
          package_id?: string
          phone?: string | null
          status?: string
          txid?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          created_at: string
          description: string | null
          device_limit: number
          duration_days: number
          id: string
          is_active: boolean
          is_trial: boolean
          license_count: number
          message_limit: number | null
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          device_limit?: number
          duration_days?: number
          id?: string
          is_active?: boolean
          is_trial?: boolean
          license_count?: number
          message_limit?: number | null
          name: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          device_limit?: number
          duration_days?: number
          id?: string
          is_active?: boolean
          is_trial?: boolean
          license_count?: number
          message_limit?: number | null
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      plugin_licenses: {
        Row: {
          activated_at: string | null
          brand_id: string
          created_at: string
          created_by: string | null
          device_id: string | null
          id: string
          last_seen_at: string | null
          license_key: string
          site_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          brand_id: string
          created_at?: string
          created_by?: string | null
          device_id?: string | null
          id?: string
          last_seen_at?: string | null
          license_key: string
          site_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          brand_id?: string
          created_at?: string
          created_by?: string | null
          device_id?: string | null
          id?: string
          last_seen_at?: string | null
          license_key?: string
          site_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plugin_licenses_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plugin_licenses_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          admin_notify_numbers: string | null
          id: boolean
          licenses_per_brand: number
          notify_device_id: string | null
          notify_phone: string | null
          plugin_changelog: string | null
          plugin_download_url: string | null
          plugin_requires_php: string | null
          plugin_requires_wp: string | null
          plugin_tested_wp: string | null
          plugin_version: string
          tpl_order_admin: string | null
          tpl_order_approved: string | null
          tpl_order_placed: string | null
          updated_at: string
          whmcs_api_token: string | null
        }
        Insert: {
          admin_notify_numbers?: string | null
          id?: boolean
          licenses_per_brand?: number
          notify_device_id?: string | null
          notify_phone?: string | null
          plugin_changelog?: string | null
          plugin_download_url?: string | null
          plugin_requires_php?: string | null
          plugin_requires_wp?: string | null
          plugin_tested_wp?: string | null
          plugin_version?: string
          tpl_order_admin?: string | null
          tpl_order_approved?: string | null
          tpl_order_placed?: string | null
          updated_at?: string
          whmcs_api_token?: string | null
        }
        Update: {
          admin_notify_numbers?: string | null
          id?: boolean
          licenses_per_brand?: number
          notify_device_id?: string | null
          notify_phone?: string | null
          plugin_changelog?: string | null
          plugin_download_url?: string | null
          plugin_requires_php?: string | null
          plugin_requires_wp?: string | null
          plugin_tested_wp?: string | null
          plugin_version?: string
          tpl_order_admin?: string | null
          tpl_order_approved?: string | null
          tpl_order_placed?: string | null
          updated_at?: string
          whmcs_api_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_notify_device_id_fkey"
            columns: ["notify_device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_dashboard_stats: { Args: never; Returns: Json }
      get_dashboard_stats_for_user: {
        Args: { _end?: string; _start?: string; _user_id: string }
        Returns: Json
      }
      get_report_stats_for_user: {
        Args: {
          _brand_id?: string
          _end: string
          _start: string
          _user_id: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_brand_admin: {
        Args: { _brand_id: string; _user_id: string }
        Returns: boolean
      }
      is_brand_member: {
        Args: { _brand_id: string; _user_id: string }
        Returns: boolean
      }
      is_brand_owner_of: {
        Args: { _brand_id: string; _user_id: string }
        Returns: boolean
      }
      validate_coupon: {
        Args: { _amount: number; _code: string }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "owner"
        | "member"
        | "admin"
        | "support_agent"
        | "manager"
        | "brand_owner"
        | "sales_agent"
      brand_role: "brand_admin" | "sender" | "brand_member"
      brand_status: "active" | "suspended" | "expired" | "pending"
      device_status: "active" | "inactive" | "disconnected"
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
    Enums: {
      app_role: [
        "owner",
        "member",
        "admin",
        "support_agent",
        "manager",
        "brand_owner",
        "sales_agent",
      ],
      brand_role: ["brand_admin", "sender", "brand_member"],
      brand_status: ["active", "suspended", "expired", "pending"],
      device_status: ["active", "inactive", "disconnected"],
    },
  },
} as const

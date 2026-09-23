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
      mail_attachments: {
        Row: {
          checksum_sha256: string | null
          content_disposition: string | null
          content_id: string | null
          content_type: string | null
          created_at: string
          filename: string
          id: string
          message_id: string
          provider: string
          provider_attachment_id: string | null
          size_bytes: number | null
          storage_bucket: string | null
          storage_path: string | null
          storage_provider: string | null
        }
        Insert: {
          checksum_sha256?: string | null
          content_disposition?: string | null
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          filename: string
          id?: string
          message_id: string
          provider: string
          provider_attachment_id?: string | null
          size_bytes?: number | null
          storage_bucket?: string | null
          storage_path?: string | null
          storage_provider?: string | null
        }
        Update: {
          checksum_sha256?: string | null
          content_disposition?: string | null
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          filename?: string
          id?: string
          message_id?: string
          provider?: string
          provider_attachment_id?: string | null
          size_bytes?: number | null
          storage_bucket?: string | null
          storage_path?: string | null
          storage_provider?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mail_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "mail_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_messages: {
        Row: {
          bcc_addresses: string[]
          cc_addresses: string[]
          created_at: string
          direction: Database["public"]["Enums"]["mail_direction"]
          from_address: string
          from_name: string | null
          html_body: string | null
          id: string
          in_reply_to: string | null
          internet_message_id: string | null
          is_read: boolean
          mailbox: Database["public"]["Enums"]["mailbox_address"]
          provider: string
          provider_event_id: string | null
          provider_message_id: string | null
          read_at: string | null
          received_at: string | null
          reference_message_ids: string[]
          reply_to_addresses: string[]
          sent_at: string | null
          subject: string
          text_body: string | null
          thread_id: string
          to_addresses: string[]
          updated_at: string
        }
        Insert: {
          bcc_addresses?: string[]
          cc_addresses?: string[]
          created_at?: string
          direction: Database["public"]["Enums"]["mail_direction"]
          from_address: string
          from_name?: string | null
          html_body?: string | null
          id?: string
          in_reply_to?: string | null
          internet_message_id?: string | null
          is_read?: boolean
          mailbox: Database["public"]["Enums"]["mailbox_address"]
          provider: string
          provider_event_id?: string | null
          provider_message_id?: string | null
          read_at?: string | null
          received_at?: string | null
          reference_message_ids?: string[]
          reply_to_addresses?: string[]
          sent_at?: string | null
          subject?: string
          text_body?: string | null
          thread_id: string
          to_addresses?: string[]
          updated_at?: string
        }
        Update: {
          bcc_addresses?: string[]
          cc_addresses?: string[]
          created_at?: string
          direction?: Database["public"]["Enums"]["mail_direction"]
          from_address?: string
          from_name?: string | null
          html_body?: string | null
          id?: string
          in_reply_to?: string | null
          internet_message_id?: string | null
          is_read?: boolean
          mailbox?: Database["public"]["Enums"]["mailbox_address"]
          provider?: string
          provider_event_id?: string | null
          provider_message_id?: string | null
          read_at?: string | null
          received_at?: string | null
          reference_message_ids?: string[]
          reply_to_addresses?: string[]
          sent_at?: string | null
          subject?: string
          text_body?: string | null
          thread_id?: string
          to_addresses?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_messages_thread_mailbox_fkey"
            columns: ["thread_id", "mailbox"]
            isOneToOne: false
            referencedRelation: "mail_threads"
            referencedColumns: ["id", "mailbox"]
          },
        ]
      }
      mail_threads: {
        Row: {
          created_at: string
          id: string
          latest_message_at: string
          mailbox: Database["public"]["Enums"]["mailbox_address"]
          normalized_subject: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          latest_message_at?: string
          mailbox: Database["public"]["Enums"]["mailbox_address"]
          normalized_subject?: string | null
          subject?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          latest_message_at?: string
          mailbox?: Database["public"]["Enums"]["mailbox_address"]
          normalized_subject?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      mail_direction: "inbound" | "outbound"
      mailbox_address:
        | "contact@anyhvac.net"
        | "support@anyhvac.net"
        | "social@anyhvac.net"
        | "mailtest@anyhvac.net"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      mail_direction: ["inbound", "outbound"],
      mailbox_address: [
        "contact@anyhvac.net",
        "support@anyhvac.net",
        "social@anyhvac.net",
        "mailtest@anyhvac.net",
      ],
    },
  },
} as const

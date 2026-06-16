// Tipos do banco (escritos a mao para o walking skeleton).
// SUBSTITUIR por: supabase gen types typescript --local > src/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: { id: string; name: string; slug: string; created_at: string; updated_at: string };
        Insert: { id?: string; name: string; slug: string; created_at?: string; updated_at?: string };
        Update: { id?: string; name?: string; slug?: string; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      profiles: {
        Row: { id: string; full_name: string | null; avatar_url: string | null; backup_email: string | null; phone: string | null; locale: string; created_at: string; updated_at: string };
        Insert: { id: string; full_name?: string | null; avatar_url?: string | null; backup_email?: string | null; phone?: string | null; locale?: string; created_at?: string; updated_at?: string };
        Update: { id?: string; full_name?: string | null; avatar_url?: string | null; backup_email?: string | null; phone?: string | null; locale?: string; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      memberships: {
        Row: { id: string; org_id: string; user_id: string; role: Database["public"]["Enums"]["membership_role"]; created_at: string };
        Insert: { id?: string; org_id: string; user_id: string; role?: Database["public"]["Enums"]["membership_role"]; created_at?: string };
        Update: { id?: string; org_id?: string; user_id?: string; role?: Database["public"]["Enums"]["membership_role"]; created_at?: string };
        Relationships: [];
      };
      boards: {
        Row: { id: string; org_id: string; name: string; description: string | null; icon: string | null; color: string | null; created_by: string | null; archived: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; org_id: string; name: string; description?: string | null; icon?: string | null; color?: string | null; created_by?: string | null; archived?: boolean; created_at?: string; updated_at?: string };
        Update: { id?: string; org_id?: string; name?: string; description?: string | null; icon?: string | null; color?: string | null; created_by?: string | null; archived?: boolean; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      board_members: {
        Row: { id: string; board_id: string; user_id: string; role: Database["public"]["Enums"]["membership_role"]; created_at: string };
        Insert: { id?: string; board_id: string; user_id: string; role?: Database["public"]["Enums"]["membership_role"]; created_at?: string };
        Update: { id?: string; board_id?: string; user_id?: string; role?: Database["public"]["Enums"]["membership_role"]; created_at?: string };
        Relationships: [];
      };
      columns: {
        Row: { id: string; board_id: string; org_id: string; name: string; position: string; wip_limit: number | null; created_at: string; updated_at: string };
        Insert: { id?: string; board_id: string; org_id: string; name: string; position: string; wip_limit?: number | null; created_at?: string; updated_at?: string };
        Update: { id?: string; board_id?: string; org_id?: string; name?: string; position?: string; wip_limit?: number | null; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      cards: {
        Row: {
          id: string; board_id: string; column_id: string; org_id: string; parent_id: string | null;
          title: string; description: string | null; priority: Database["public"]["Enums"]["card_priority"];
          due_date: string | null; position: string; assignee_id: string | null; completed_at: string | null;
          created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; board_id: string; column_id: string; org_id: string; parent_id?: string | null;
          title: string; description?: string | null; priority?: Database["public"]["Enums"]["card_priority"];
          due_date?: string | null; position: string; assignee_id?: string | null; completed_at?: string | null;
          created_by?: string | null; created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; board_id?: string; column_id?: string; org_id?: string; parent_id?: string | null;
          title?: string; description?: string | null; priority?: Database["public"]["Enums"]["card_priority"];
          due_date?: string | null; position?: string; assignee_id?: string | null; completed_at?: string | null;
          created_by?: string | null; created_at?: string; updated_at?: string;
        };
        Relationships: [];
      };
      card_dependencies: {
        Row: { id: string; org_id: string; blocker_card_id: string; blocked_card_id: string; type: string; created_at: string };
        Insert: { id?: string; org_id: string; blocker_card_id: string; blocked_card_id: string; type?: string; created_at?: string };
        Update: { id?: string; org_id?: string; blocker_card_id?: string; blocked_card_id?: string; type?: string; created_at?: string };
        Relationships: [];
      };
      card_events: {
        Row: {
          id: number; org_id: string; board_id: string; card_id: string; actor_id: string | null;
          type: Database["public"]["Enums"]["card_event_type"]; from_column_id: string | null; to_column_id: string | null;
          metadata: Json; created_at: string;
        };
        Insert: {
          id?: number; org_id: string; board_id: string; card_id: string; actor_id?: string | null;
          type: Database["public"]["Enums"]["card_event_type"]; from_column_id?: string | null; to_column_id?: string | null;
          metadata?: Json; created_at?: string;
        };
        Update: {
          id?: number; org_id?: string; board_id?: string; card_id?: string; actor_id?: string | null;
          type?: Database["public"]["Enums"]["card_event_type"]; from_column_id?: string | null; to_column_id?: string | null;
          metadata?: Json; created_at?: string;
        };
        Relationships: [];
      };
      tags: {
        Row: { id: string; org_id: string; name: string; color: string; created_at: string };
        Insert: { id?: string; org_id: string; name: string; color: string; created_at?: string };
        Update: { id?: string; org_id?: string; name?: string; color?: string; created_at?: string };
        Relationships: [];
      };
      card_tags: {
        Row: { card_id: string; tag_id: string; org_id: string };
        Insert: { card_id: string; tag_id: string; org_id: string };
        Update: { card_id?: string; tag_id?: string; org_id?: string };
        Relationships: [];
      };
      invitations: {
        Row: {
          id: string; org_id: string; board_id: string; email: string;
          role: Database["public"]["Enums"]["membership_role"];
          token_hash: string; expires_at: string; accepted_at: string | null;
          created_by: string | null; created_at: string;
        };
        Insert: {
          id?: string; org_id: string; board_id: string; email: string;
          role?: Database["public"]["Enums"]["membership_role"];
          token_hash: string; expires_at: string; accepted_at?: string | null;
          created_by?: string | null; created_at?: string;
        };
        Update: {
          id?: string; org_id?: string; board_id?: string; email?: string;
          role?: Database["public"]["Enums"]["membership_role"];
          token_hash?: string; expires_at?: string; accepted_at?: string | null;
          created_by?: string | null; created_at?: string;
        };
        Relationships: [];
      };
      ical_feed_tokens: {
        Row: {
          id: string; org_id: string; user_id: string; board_id: string | null;
          token_hash: string; created_at: string;
        };
        Insert: {
          id?: string; org_id: string; user_id: string; board_id?: string | null;
          token_hash: string; created_at?: string;
        };
        Update: {
          id?: string; org_id?: string; user_id?: string; board_id?: string | null;
          token_hash?: string; created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string; org_id: string; user_id: string; type: string; title: string;
          body: string | null; entity_type: string | null; entity_id: string | null;
          read_at: string | null; created_at: string;
        };
        Insert: {
          id?: string; org_id: string; user_id: string; type: string; title: string;
          body?: string | null; entity_type?: string | null; entity_id?: string | null;
          read_at?: string | null; created_at?: string;
        };
        Update: {
          id?: string; org_id?: string; user_id?: string; type?: string; title?: string;
          body?: string | null; entity_type?: string | null; entity_id?: string | null;
          read_at?: string | null; created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_organization: {
        Args: { p_name: string; p_slug: string };
        Returns: Database["public"]["Tables"]["organizations"]["Row"];
      };
      accept_board_invitation: {
        Args: { p_token: string };
        Returns: string;
      };
      get_ical_feed_cards: {
        Args: { p_token: string };
        Returns: { id: string; title: string; due_date: string; board_name: string }[];
      };
      notify_board: {
        Args: {
          p_board: string; p_type: string; p_title: string;
          p_body?: string | null; p_entity_type?: string | null; p_entity_id?: string | null;
        };
        Returns: undefined;
      };
      sync_deadline_notifications: {
        Args: Record<string, never>;
        Returns: number;
      };
    };
    Enums: {
      membership_role: "admin" | "viewer";
      card_priority: "low" | "medium" | "high" | "urgent";
      card_event_type:
        | "created"
        | "moved"
        | "updated"
        | "completed"
        | "reopened"
        | "assigned"
        | "due_changed"
        | "priority_changed"
        | "archived";
    };
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];

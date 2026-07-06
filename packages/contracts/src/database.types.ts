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
        Row: { id: string; name: string; slug: string; legal_name: string | null; cnpj: string | null; logo_url: string | null; multi_owner_enabled: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; name: string; slug: string; legal_name?: string | null; cnpj?: string | null; logo_url?: string | null; multi_owner_enabled?: boolean; created_at?: string; updated_at?: string };
        Update: { id?: string; name?: string; slug?: string; legal_name?: string | null; cnpj?: string | null; logo_url?: string | null; multi_owner_enabled?: boolean; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      profiles: {
        Row: { id: string; full_name: string | null; avatar_url: string | null; backup_email: string | null; phone: string | null; locale: string; weekly_capacity_hours: number; created_at: string; updated_at: string };
        Insert: { id: string; full_name?: string | null; avatar_url?: string | null; backup_email?: string | null; phone?: string | null; locale?: string; weekly_capacity_hours?: number; created_at?: string; updated_at?: string };
        Update: { id?: string; full_name?: string | null; avatar_url?: string | null; backup_email?: string | null; phone?: string | null; locale?: string; weekly_capacity_hours?: number; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      memberships: {
        Row: { id: string; org_id: string; user_id: string; role: Database["public"]["Enums"]["membership_role"]; created_at: string };
        Insert: { id?: string; org_id: string; user_id: string; role?: Database["public"]["Enums"]["membership_role"]; created_at?: string };
        Update: { id?: string; org_id?: string; user_id?: string; role?: Database["public"]["Enums"]["membership_role"]; created_at?: string };
        Relationships: [];
      };
      boards: {
        Row: { id: string; org_id: string; name: string; description: string | null; icon: string | null; color: string | null; department_id: string | null; created_by: string | null; archived: boolean; tiflux_enabled: boolean; integrations: Json; created_at: string; updated_at: string };
        Insert: { id?: string; org_id: string; name: string; description?: string | null; icon?: string | null; color?: string | null; department_id?: string | null; created_by?: string | null; archived?: boolean; tiflux_enabled?: boolean; integrations?: Json; created_at?: string; updated_at?: string };
        Update: { id?: string; org_id?: string; name?: string; description?: string | null; icon?: string | null; color?: string | null; department_id?: string | null; created_by?: string | null; archived?: boolean; tiflux_enabled?: boolean; integrations?: Json; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      departments: {
        Row: { id: string; org_id: string; name: string; icon: string | null; color: string | null; created_by: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; org_id: string; name: string; icon?: string | null; color?: string | null; created_by?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; org_id?: string; name?: string; icon?: string | null; color?: string | null; created_by?: string | null; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      department_members: {
        Row: { id: string; department_id: string; org_id: string; user_id: string; role: Database["public"]["Enums"]["membership_role"]; created_at: string };
        Insert: { id?: string; department_id: string; org_id: string; user_id: string; role?: Database["public"]["Enums"]["membership_role"]; created_at?: string };
        Update: { id?: string; department_id?: string; org_id?: string; user_id?: string; role?: Database["public"]["Enums"]["membership_role"]; created_at?: string };
        Relationships: [];
      };
      board_members: {
        Row: { id: string; board_id: string; user_id: string; role: Database["public"]["Enums"]["membership_role"]; created_at: string };
        Insert: { id?: string; board_id: string; user_id: string; role?: Database["public"]["Enums"]["membership_role"]; created_at?: string };
        Update: { id?: string; board_id?: string; user_id?: string; role?: Database["public"]["Enums"]["membership_role"]; created_at?: string };
        Relationships: [];
      };
      columns: {
        Row: { id: string; board_id: string; org_id: string; name: string; position: string; wip_limit: number | null; default_stage_id: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; board_id: string; org_id: string; name: string; position: string; wip_limit?: number | null; default_stage_id?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; board_id?: string; org_id?: string; name?: string; position?: string; wip_limit?: number | null; default_stage_id?: string | null; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      stages: {
        Row: { id: string; org_id: string; board_id: string; name: string; color: string; position: number; is_system: boolean; system_key: string | null; created_at: string };
        Insert: { id?: string; org_id: string; board_id: string; name: string; color: string; position?: number; is_system?: boolean; system_key?: string | null; created_at?: string };
        Update: { id?: string; org_id?: string; board_id?: string; name?: string; color?: string; position?: number; is_system?: boolean; system_key?: string | null; created_at?: string };
        Relationships: [];
      };
      cards: {
        Row: {
          id: string; board_id: string; column_id: string; org_id: string; parent_id: string | null;
          title: string; description: string | null; priority: Database["public"]["Enums"]["card_priority"];
          due_date: string | null; start_date: string | null; position: string; assignee_id: string | null; completed_at: string | null;
          stage_id: string | null;
          tiflux_ticket_number: string | null; tiflux_ticket_id: string | null; tiflux_payload: Json | null; tiflux_created_at: string | null;
          tiflux_canceled_tickets: Json;
          estimated_hours: number | null; story_points: number | null;
          created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; board_id: string; column_id: string; org_id: string; parent_id?: string | null;
          title: string; description?: string | null; priority?: Database["public"]["Enums"]["card_priority"];
          due_date?: string | null; start_date?: string | null; position: string; assignee_id?: string | null; completed_at?: string | null;
          stage_id?: string | null;
          tiflux_ticket_number?: string | null; tiflux_ticket_id?: string | null; tiflux_payload?: Json | null; tiflux_created_at?: string | null;
          tiflux_canceled_tickets?: Json;
          estimated_hours?: number | null; story_points?: number | null;
          created_by?: string | null; created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; board_id?: string; column_id?: string; org_id?: string; parent_id?: string | null;
          title?: string; description?: string | null; priority?: Database["public"]["Enums"]["card_priority"];
          due_date?: string | null; start_date?: string | null; position?: string; assignee_id?: string | null; completed_at?: string | null;
          stage_id?: string | null;
          tiflux_ticket_number?: string | null; tiflux_ticket_id?: string | null; tiflux_payload?: Json | null; tiflux_created_at?: string | null;
          tiflux_canceled_tickets?: Json;
          estimated_hours?: number | null; story_points?: number | null;
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
          id: number; org_id: string; board_id: string | null; card_id: string | null; actor_id: string | null;
          type: Database["public"]["Enums"]["card_event_type"] | null; from_column_id: string | null; to_column_id: string | null;
          metadata: Json; created_at: string;
          event_scope: string; event_type: string; payload: Json; occurred_at: string;
          automation_depth: number; root_event_id: number | null;
        };
        Insert: {
          id?: number; org_id: string; board_id?: string | null; card_id?: string | null; actor_id?: string | null;
          type?: Database["public"]["Enums"]["card_event_type"] | null; from_column_id?: string | null; to_column_id?: string | null;
          metadata?: Json; created_at?: string;
          event_scope?: string; event_type?: string; payload?: Json; occurred_at?: string;
        };
        Update: {
          id?: number; org_id?: string; board_id?: string | null; card_id?: string | null; actor_id?: string | null;
          type?: Database["public"]["Enums"]["card_event_type"] | null; from_column_id?: string | null; to_column_id?: string | null;
          metadata?: Json; created_at?: string;
          event_scope?: string; event_type?: string; payload?: Json; occurred_at?: string;
        };
        Relationships: [];
      };
      field_permission_rules: {
        Row: { id: string; org_id: string; role: Database["public"]["Enums"]["membership_role"]; resource: string; field_name: string; access: string };
        Insert: { id?: string; org_id: string; role: Database["public"]["Enums"]["membership_role"]; resource?: string; field_name: string; access: string };
        Update: { id?: string; org_id?: string; role?: Database["public"]["Enums"]["membership_role"]; resource?: string; field_name?: string; access?: string };
        Relationships: [];
      };
      board_whiteboards: {
        Row: { board_id: string; org_id: string; snapshot: Json; updated_at: string; updated_by: string | null };
        Insert: { board_id: string; org_id: string; snapshot?: Json; updated_at?: string; updated_by?: string | null };
        Update: { board_id?: string; org_id?: string; snapshot?: Json; updated_at?: string; updated_by?: string | null };
        Relationships: [];
      };
      automation_rules: {
        Row: {
          id: string; org_id: string; board_id: string; name: string;
          trigger_event: string; conditions: Json; actions: Json;
          active: boolean; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; org_id: string; board_id: string; name: string;
          trigger_event: string; conditions?: Json; actions?: Json;
          active?: boolean; created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; org_id?: string; board_id?: string; name?: string;
          trigger_event?: string; conditions?: Json; actions?: Json;
          active?: boolean; created_at?: string; updated_at?: string;
        };
        Relationships: [];
      };
      org_sso_domains: {
        Row: { id: string; org_id: string; domain: string };
        Insert: { id?: string; org_id: string; domain: string };
        Update: { id?: string; org_id?: string; domain?: string };
        Relationships: [];
      };
      tags: {
        Row: { id: string; org_id: string; board_id: string; name: string; color: string; created_at: string };
        Insert: { id?: string; org_id: string; board_id: string; name: string; color: string; created_at?: string };
        Update: { id?: string; org_id?: string; board_id?: string; name?: string; color?: string; created_at?: string };
        Relationships: [];
      };
      card_tags: {
        Row: { card_id: string; tag_id: string; org_id: string };
        Insert: { card_id: string; tag_id: string; org_id: string };
        Update: { card_id?: string; tag_id?: string; org_id?: string };
        Relationships: [];
      };
      organization_invitations: {
        Row: {
          id: string;
          org_id: string;
          email: string;
          role: Database["public"]["Enums"]["membership_role"];
          token_hash: string;
          expires_at: string;
          accepted_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          email: string;
          role?: Database["public"]["Enums"]["membership_role"];
          token_hash: string;
          expires_at: string;
          accepted_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          email?: string;
          role?: Database["public"]["Enums"]["membership_role"];
          token_hash?: string;
          expires_at?: string;
          accepted_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
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
          board_id: string | null;
          read_at: string | null; created_at: string;
        };
        Insert: {
          id?: string; org_id: string; user_id: string; type: string; title: string;
          body?: string | null; entity_type?: string | null; entity_id?: string | null;
          board_id?: string | null;
          read_at?: string | null; created_at?: string;
        };
        Update: {
          id?: string; org_id?: string; user_id?: string; type?: string; title?: string;
          body?: string | null; entity_type?: string | null; entity_id?: string | null;
          board_id?: string | null;
          read_at?: string | null; created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      workload_by_member_week: {
        Row: { org_id: string; user_id: string; week_start: string; total_hours: number; total_points: number; card_count: number };
        Relationships: [];
      };
    };
    Functions: {
      create_organization: {
        Args: { p_name: string; p_slug: string; p_legal_name?: string | null; p_cnpj?: string | null };
        Returns: Database["public"]["Tables"]["organizations"]["Row"];
      };
      accept_board_invitation: {
        Args: { p_token: string };
        Returns: string;
      };
      peek_board_invitation: {
        Args: { p_token: string };
        Returns: { email: string; board_name: string }[];
      };
      resolve_board_invitation: {
        Args: { p_token: string };
        Returns: { status: string; board_id: string | null; email: string | null }[];
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
      list_org_members: {
        Args: { p_org: string };
        Returns: {
          user_id: string;
          full_name: string | null;
          avatar_url: string | null;
          role: Database["public"]["Enums"]["membership_role"];
          created_at: string;
        }[];
      };
      update_membership_role: {
        Args: {
          p_org: string;
          p_user: string;
          p_role: Database["public"]["Enums"]["membership_role"];
        };
        Returns: undefined;
      };
      remove_org_member: {
        Args: { p_org: string; p_user: string };
        Returns: undefined;
      };
      leave_organization: {
        Args: { p_org: string };
        Returns: undefined;
      };
      transfer_org_ownership: {
        Args: { p_org: string; p_new_owner: string };
        Returns: undefined;
      };
      delete_organization: {
        Args: { p_org: string };
        Returns: undefined;
      };
      set_org_multi_owner: {
        Args: { p_org: string; p_enabled: boolean };
        Returns: Database["public"]["Tables"]["organizations"]["Row"];
      };
      update_organization: {
        Args: { p_org: string; p_name: string; p_slug: string; p_legal_name?: string | null; p_cnpj?: string | null };
        Returns: Database["public"]["Tables"]["organizations"]["Row"];
      };
      update_org_logo: {
        Args: { p_org: string; p_logo_url: string };
        Returns: Database["public"]["Tables"]["organizations"]["Row"];
      };
      resolve_org_invitation: {
        Args: { p_token: string };
        Returns: {
          status: string;
          org_id: string | null;
          email: string | null;
          role: Database["public"]["Enums"]["membership_role"] | null;
        }[];
      };
      peek_org_invitation: {
        Args: { p_token: string };
        Returns: { email: string }[];
      };
      accept_org_invitation: {
        Args: { p_token: string };
        Returns: string;
      };
      move_board_to_org: {
        Args: { p_board: string; p_target_org: string };
        Returns: undefined;
      };
      create_department: {
        Args: { p_org: string; p_name: string; p_icon?: string | null; p_color?: string | null };
        Returns: Database["public"]["Tables"]["departments"]["Row"];
      };
      update_department: {
        Args: { p_dept: string; p_name: string; p_icon?: string | null; p_color?: string | null };
        Returns: Database["public"]["Tables"]["departments"]["Row"];
      };
      delete_department: {
        Args: { p_dept: string };
        Returns: undefined;
      };
      set_board_department: {
        Args: { p_board: string; p_dept: string | null };
        Returns: undefined;
      };
      add_department_member: {
        Args: {
          p_dept: string;
          p_user: string;
          p_role?: Database["public"]["Enums"]["membership_role"];
        };
        Returns: undefined;
      };
      set_department_member_role: {
        Args: {
          p_dept: string;
          p_user: string;
          p_role: Database["public"]["Enums"]["membership_role"];
        };
        Returns: undefined;
      };
      remove_department_member: {
        Args: { p_dept: string; p_user: string };
        Returns: undefined;
      };
      set_board_tiflux_token: {
        Args: { p_board: string; p_token: string; p_api_url?: string | null };
        Returns: undefined;
      };
      clear_board_tiflux_token: {
        Args: { p_board: string };
        Returns: undefined;
      };
      board_tiflux_status: {
        Args: { p_board: string };
        Returns: boolean;
      };
      get_board_tiflux_token: {
        Args: { p_board: string };
        Returns: { token: string; api_url: string }[];
      };
      emit_audit_event: {
        Args: {
          p_org_id: string; p_event_scope: string; p_event_type: string; p_payload?: Json;
          p_board_id?: string | null; p_card_id?: string | null;
        };
        Returns: number;
      };
      update_card_fields: {
        Args: { p_card_id: string; p_patch: Json };
        Returns: undefined;
      };
      upsert_whiteboard_snapshot: {
        Args: { p_board_id: string; p_snapshot: Json };
        Returns: undefined;
      };
    };
    Enums: {
      membership_role: "admin" | "viewer" | "manager" | "owner";
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

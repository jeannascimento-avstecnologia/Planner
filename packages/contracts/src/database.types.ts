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
        Row: { id: string; org_id: string; user_id: string; role: Database["public"]["Enums"]["membership_role"]; weekly_capacity_hours: number; created_at: string };
        Insert: { id?: string; org_id: string; user_id: string; role?: Database["public"]["Enums"]["membership_role"]; weekly_capacity_hours?: number; created_at?: string };
        Update: { id?: string; org_id?: string; user_id?: string; role?: Database["public"]["Enums"]["membership_role"]; weekly_capacity_hours?: number; created_at?: string };
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
        Row: { id: string; board_id: string; user_id: string; role: Database["public"]["Enums"]["membership_role"]; preset_id: string | null; created_at: string };
        Insert: { id?: string; board_id: string; user_id: string; role?: Database["public"]["Enums"]["membership_role"]; preset_id?: string | null; created_at?: string };
        Update: { id?: string; board_id?: string; user_id?: string; role?: Database["public"]["Enums"]["membership_role"]; preset_id?: string | null; created_at?: string };
        Relationships: [];
      };
      access_presets: {
        Row: {
          id: string;
          org_id: string | null;
          name: string;
          description: string | null;
          is_system: boolean;
          system_key: string | null;
          base_role: Database["public"]["Enums"]["membership_role"];
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id?: string | null;
          name: string;
          description?: string | null;
          is_system?: boolean;
          system_key?: string | null;
          base_role?: Database["public"]["Enums"]["membership_role"];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          name?: string;
          description?: string | null;
          is_system?: boolean;
          system_key?: string | null;
          base_role?: Database["public"]["Enums"]["membership_role"];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      access_preset_permissions: {
        Row: { preset_id: string; permission_code: string };
        Insert: { preset_id: string; permission_code: string };
        Update: { preset_id?: string; permission_code?: string };
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
          tree_x: number | null; tree_y: number | null;
          title: string; description: string | null; priority: Database["public"]["Enums"]["card_priority"];
          due_date: string | null; start_date: string | null; target_date: string | null; position: string; assignee_id: string | null; completed_at: string | null;
          stage_id: string | null;
          tiflux_ticket_number: string | null; tiflux_ticket_id: string | null; tiflux_payload: Json | null; tiflux_created_at: string | null;
          tiflux_canceled_tickets: Json;
          estimated_hours: number | null; story_points: number | null;
          personal_plan_at: string | null;
          created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; board_id: string; column_id: string; org_id: string; parent_id?: string | null;
          tree_x?: number | null; tree_y?: number | null;
          title: string; description?: string | null; priority?: Database["public"]["Enums"]["card_priority"];
          due_date?: string | null; start_date?: string | null; target_date?: string | null; position: string; assignee_id?: string | null; completed_at?: string | null;
          stage_id?: string | null;
          tiflux_ticket_number?: string | null; tiflux_ticket_id?: string | null; tiflux_payload?: Json | null; tiflux_created_at?: string | null;
          tiflux_canceled_tickets?: Json;
          estimated_hours?: number | null; story_points?: number | null;
          personal_plan_at?: string | null;
          created_by?: string | null; created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; board_id?: string; column_id?: string; org_id?: string; parent_id?: string | null;
          tree_x?: number | null; tree_y?: number | null;
          title?: string; description?: string | null; priority?: Database["public"]["Enums"]["card_priority"];
          due_date?: string | null; start_date?: string | null; position?: string; assignee_id?: string | null; completed_at?: string | null;
          stage_id?: string | null;
          tiflux_ticket_number?: string | null; tiflux_ticket_id?: string | null; tiflux_payload?: Json | null; tiflux_created_at?: string | null;
          tiflux_canceled_tickets?: Json;
          estimated_hours?: number | null; story_points?: number | null;
          personal_plan_at?: string | null;
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
      card_checklist_items: {
        Row: {
          id: string;
          org_id: string;
          board_id: string;
          card_id: string;
          title: string;
          done: boolean;
          position: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          board_id: string;
          card_id: string;
          title: string;
          done?: boolean;
          position: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          board_id?: string;
          card_id?: string;
          title?: string;
          done?: boolean;
          position?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      card_tree_edges: {
        Row: {
          id: string;
          org_id: string;
          board_id: string;
          parent_card_id: string;
          child_card_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          board_id: string;
          parent_card_id: string;
          child_card_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          board_id?: string;
          parent_card_id?: string;
          child_card_id?: string;
          created_at?: string;
        };
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
      user_field_permission_overrides: {
        Row: {
          id: string;
          org_id: string;
          user_id: string;
          resource: string;
          field_name: string;
          access: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          user_id: string;
          resource?: string;
          field_name: string;
          access: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          user_id?: string;
          resource?: string;
          field_name?: string;
          access?: string;
          created_at?: string;
          updated_at?: string;
        };
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
      automation_runs: {
        Row: {
          id: string; rule_id: string; card_event_id: number | null;
          status: string; depth: number; result: Json; ran_at: string;
        };
        Insert: {
          id?: string; rule_id: string; card_event_id?: number | null;
          status: string; depth?: number; result?: Json; ran_at?: string;
        };
        Update: {
          id?: string; rule_id?: string; card_event_id?: number | null;
          status?: string; depth?: number; result?: Json; ran_at?: string;
        };
        Relationships: [];
      };
      automation_outbox: {
        Row: {
          id: string; org_id: string; board_id: string; rule_id: string | null;
          card_id: string | null; card_event_id: number | null; action_type: string;
          action_payload: Json; status: string; attempts: number; next_attempt_at: string;
          dedup_key: string; result: Json; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; org_id: string; board_id: string; rule_id?: string | null;
          card_id?: string | null; card_event_id?: number | null; action_type: string;
          action_payload?: Json; status?: string; attempts?: number; next_attempt_at?: string;
          dedup_key: string; result?: Json; created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; org_id?: string; board_id?: string; rule_id?: string | null;
          card_id?: string | null; card_event_id?: number | null; action_type?: string;
          action_payload?: Json; status?: string; attempts?: number; next_attempt_at?: string;
          dedup_key?: string; result?: Json; created_at?: string; updated_at?: string;
        };
        Relationships: [];
      };
      org_slack_integrations: {
        Row: {
          org_id: string; webhook_url_encrypted: string; channel_label: string | null;
          updated_at: string; updated_by: string | null;
        };
        Insert: {
          org_id: string; webhook_url_encrypted: string; channel_label?: string | null;
          updated_at?: string; updated_by?: string | null;
        };
        Update: {
          org_id?: string; webhook_url_encrypted?: string; channel_label?: string | null;
          updated_at?: string; updated_by?: string | null;
        };
        Relationships: [];
      };
      user_google_tokens: {
        Row: {
          user_id: string; access_token_encrypted: string; refresh_token_encrypted: string;
          expires_at: string; scope: string | null; updated_at: string;
        };
        Insert: {
          user_id: string; access_token_encrypted: string; refresh_token_encrypted: string;
          expires_at: string; scope?: string | null; updated_at?: string;
        };
        Update: {
          user_id?: string; access_token_encrypted?: string; refresh_token_encrypted?: string;
          expires_at?: string; scope?: string | null; updated_at?: string;
        };
        Relationships: [];
      };
      org_google_integrations: {
        Row: {
          org_id: string; calendar_id: string; updated_at: string; updated_by: string | null;
        };
        Insert: {
          org_id: string; calendar_id: string; updated_at?: string; updated_by?: string | null;
        };
        Update: {
          org_id?: string; calendar_id?: string; updated_at?: string; updated_by?: string | null;
        };
        Relationships: [];
      };
      google_export_mappings: {
        Row: {
          card_id: string; org_id: string; google_event_id: string; updated_at: string;
        };
        Insert: {
          card_id: string; org_id: string; google_event_id: string; updated_at?: string;
        };
        Update: {
          card_id?: string; org_id?: string; google_event_id?: string; updated_at?: string;
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
          preset_id: string | null;
          token_hash: string; expires_at: string; accepted_at: string | null;
          created_by: string | null; created_at: string;
        };
        Insert: {
          id?: string; org_id: string; board_id: string; email: string;
          role?: Database["public"]["Enums"]["membership_role"];
          preset_id?: string | null;
          token_hash: string; expires_at: string; accepted_at?: string | null;
          created_by?: string | null; created_at?: string;
        };
        Update: {
          id?: string; org_id?: string; board_id?: string; email?: string;
          role?: Database["public"]["Enums"]["membership_role"];
          preset_id?: string | null;
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
      card_workload_allocations: {
        Row: {
          id: string; org_id: string; card_id: string; user_id: string;
          work_date: string; hours: number; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; org_id: string; card_id: string; user_id: string;
          work_date: string; hours: number; created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; org_id?: string; card_id?: string; user_id?: string;
          work_date?: string; hours?: number; created_at?: string; updated_at?: string;
        };
        Relationships: [];
      };
      org_teams_integrations: {
        Row: {
          org_id: string; azure_tenant_id: string | null; team_id: string; channel_id: string;
          planner_plan_id: string; planner_bucket_id: string; configured_by: string | null;
          created_at: string; updated_at: string;
        };
        Insert: {
          org_id: string; azure_tenant_id?: string | null; team_id: string; channel_id: string;
          planner_plan_id: string; planner_bucket_id: string; configured_by?: string | null;
          created_at?: string; updated_at?: string;
        };
        Update: {
          org_id?: string; azure_tenant_id?: string | null; team_id?: string; channel_id?: string;
          planner_plan_id?: string; planner_bucket_id?: string; configured_by?: string | null;
          created_at?: string; updated_at?: string;
        };
        Relationships: [];
      };
      teams_export_mappings: {
        Row: {
          id: string; org_id: string; card_id: string; planner_task_id: string; last_exported_at: string;
        };
        Insert: {
          id?: string; org_id: string; card_id: string; planner_task_id: string; last_exported_at?: string;
        };
        Update: {
          id?: string; org_id?: string; card_id?: string; planner_task_id?: string; last_exported_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      workload_by_member_week: {
        Row: { org_id: string; user_id: string; week_start: string; total_hours: number; total_points: number; card_count: number };
        Relationships: [];
      };
      throughput_by_board_week: {
        Row: { org_id: string; board_id: string; week_start: string; completed_count: number };
        Relationships: [];
      };
      cycle_time_by_card: {
        Row: { board_id: string; card_id: string; column_id: string; dwell_hours: number };
        Relationships: [];
      };
      cfd_by_board_day: {
        Row: {
          board_id: string; org_id: string; day: string;
          column_id: string; column_name: string; card_count: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      has_board_permission: {
        Args: { p_board: string; p_code: string };
        Returns: boolean;
      };
      can_manage_access_presets: {
        Args: { p_org: string };
        Returns: boolean;
      };
      create_organization: {
        Args: { p_name: string; p_slug: string; p_legal_name?: string | null; p_cnpj?: string | null };
        Returns: Database["public"]["Tables"]["organizations"]["Row"];
      };
      create_board: {
        Args: {
          p_org: string;
          p_name: string;
          p_description?: string | null;
          p_icon?: string | null;
          p_color?: string | null;
          p_department_id?: string | null;
        };
        Returns: Database["public"]["Tables"]["boards"]["Row"];
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
          weekly_capacity_hours: number;
        }[];
      };
      update_member_capacity: {
        Args: { p_org: string; p_user: string; p_hours: number };
        Returns: undefined;
      };
      upsert_card_allocation: {
        Args: { p_card_id: string; p_work_date: string; p_hours: number };
        Returns: undefined;
      };
      move_card_allocation: {
        Args: { p_card_id: string; p_from_date: string; p_to_date: string; p_hours?: number | null };
        Returns: undefined;
      };
      bulk_spread_card_hours: {
        Args: { p_card_id: string; p_total_hours: number; p_start: string; p_end: string };
        Returns: undefined;
      };
      schedule_card_to_day: {
        Args: { p_card_id: string; p_work_date: string; p_default_hours?: number };
        Returns: undefined;
      };
      add_card_to_personal_plan: {
        Args: { p_card_id: string };
        Returns: undefined;
      };
      remove_card_from_personal_plan: {
        Args: { p_card_id: string };
        Returns: undefined;
      };
      upsert_org_teams_integration: {
        Args: {
          p_org: string; p_team_id: string; p_channel_id: string; p_plan_id: string;
          p_bucket_id: string; p_tenant_id?: string | null;
        };
        Returns: undefined;
      };
      upsert_teams_export_mapping: {
        Args: { p_org: string; p_card_id: string; p_planner_task_id: string };
        Returns: undefined;
      };
      set_user_microsoft_tokens: {
        Args: { p_access: string; p_refresh: string; p_expires_at: string; p_scope?: string | null };
        Returns: undefined;
      };
      get_user_microsoft_tokens: {
        Args: Record<string, never>;
        Returns: { access_token: string; refresh_token: string; expires_at: string }[];
      };
      user_has_microsoft_connection: {
        Args: Record<string, never>;
        Returns: boolean;
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
      claim_automation_outbox: {
        Args: { p_limit?: number };
        Returns: Database["public"]["Tables"]["automation_outbox"]["Row"][];
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
      set_org_slack_webhook: {
        Args: { p_org: string; p_webhook_url: string; p_channel_label?: string | null };
        Returns: undefined;
      };
      clear_org_slack_webhook: {
        Args: { p_org: string };
        Returns: undefined;
      };
      get_org_slack_webhook: {
        Args: { p_org: string };
        Returns: { webhook_url: string; channel_label: string | null }[];
      };
      set_user_google_tokens: {
        Args: { p_access: string; p_refresh: string; p_expires_at: string; p_scope?: string | null };
        Returns: undefined;
      };
      get_user_google_tokens: {
        Args: Record<string, never>;
        Returns: { access_token: string; refresh_token: string; expires_at: string; scope: string | null }[];
      };
      user_has_google_connection: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      get_board_dashboard_bundle: {
        Args: { p_board: string };
        Returns: Json;
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

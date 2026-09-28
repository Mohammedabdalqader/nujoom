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
      app_admins: {
        Row: {
          created_at: string
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: number
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: never
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: never
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      cities: {
        Row: {
          country_code: string
          created_at: string
          governorate_code: string
          id: number
          is_active: boolean
          name_ar: string
          name_en: string
          slug: string
          sort_order: number
        }
        Insert: {
          country_code?: string
          created_at?: string
          governorate_code: string
          id?: never
          is_active?: boolean
          name_ar: string
          name_en: string
          slug: string
          sort_order?: number
        }
        Update: {
          country_code?: string
          created_at?: string
          governorate_code?: string
          id?: never
          is_active?: boolean
          name_ar?: string
          name_en?: string
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "cities_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "cities_governorate_code_fkey"
            columns: ["governorate_code"]
            isOneToOne: false
            referencedRelation: "governorates"
            referencedColumns: ["code"]
          },
        ]
      }
      config: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      consents: {
        Row: {
          created_at: string
          given_by: string | null
          granted: boolean
          id: number
          type: Database["public"]["Enums"]["consent_type"]
          user_id: string
          version: string
        }
        Insert: {
          created_at?: string
          given_by?: string | null
          granted: boolean
          id?: never
          type: Database["public"]["Enums"]["consent_type"]
          user_id: string
          version: string
        }
        Update: {
          created_at?: string
          given_by?: string | null
          granted?: boolean
          id?: never
          type?: Database["public"]["Enums"]["consent_type"]
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      countries: {
        Row: {
          calling_code: string
          code: string
          currency: string
          is_active: boolean
          name_ar: string
          name_en: string
          timezone: string
        }
        Insert: {
          calling_code: string
          code: string
          currency: string
          is_active?: boolean
          name_ar: string
          name_en: string
          timezone: string
        }
        Update: {
          calling_code?: string
          code?: string
          currency?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          timezone?: string
        }
        Relationships: []
      }
      data_requests: {
        Row: {
          error: string | null
          expires_at: string | null
          export_path: string | null
          id: string
          kind: Database["public"]["Enums"]["data_request_kind"]
          processed_at: string | null
          requested_at: string
          scheduled_for: string
          status: Database["public"]["Enums"]["data_request_status"]
          user_id: string | null
        }
        Insert: {
          error?: string | null
          expires_at?: string | null
          export_path?: string | null
          id?: string
          kind: Database["public"]["Enums"]["data_request_kind"]
          processed_at?: string | null
          requested_at?: string
          scheduled_for?: string
          status?: Database["public"]["Enums"]["data_request_status"]
          user_id?: string | null
        }
        Update: {
          error?: string | null
          expires_at?: string | null
          export_path?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["data_request_kind"]
          processed_at?: string | null
          requested_at?: string
          scheduled_for?: string
          status?: Database["public"]["Enums"]["data_request_status"]
          user_id?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          id: number
          name: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: never
          name: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          name?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      facilities: {
        Row: {
          access: Database["public"]["Enums"]["facility_access"]
          address_ar: string | null
          address_en: string | null
          city_id: number
          created_at: string
          duplicate_of: string | null
          id: string
          last_reviewed_at: string | null
          lat: number | null
          listing_state: Database["public"]["Enums"]["listing_state"]
          lng: number | null
          location_confidence: Database["public"]["Enums"]["location_confidence"]
          name_ar: string | null
          name_en: string | null
          neighborhood_id: number | null
          operator_state: Database["public"]["Enums"]["operator_state"]
          search_text: string | null
          updated_at: string
        }
        Insert: {
          access?: Database["public"]["Enums"]["facility_access"]
          address_ar?: string | null
          address_en?: string | null
          city_id: number
          created_at?: string
          duplicate_of?: string | null
          id?: string
          last_reviewed_at?: string | null
          lat?: number | null
          listing_state?: Database["public"]["Enums"]["listing_state"]
          lng?: number | null
          location_confidence?: Database["public"]["Enums"]["location_confidence"]
          name_ar?: string | null
          name_en?: string | null
          neighborhood_id?: number | null
          operator_state?: Database["public"]["Enums"]["operator_state"]
          search_text?: string | null
          updated_at?: string
        }
        Update: {
          access?: Database["public"]["Enums"]["facility_access"]
          address_ar?: string | null
          address_en?: string | null
          city_id?: number
          created_at?: string
          duplicate_of?: string | null
          id?: string
          last_reviewed_at?: string | null
          lat?: number | null
          listing_state?: Database["public"]["Enums"]["listing_state"]
          lng?: number | null
          location_confidence?: Database["public"]["Enums"]["location_confidence"]
          name_ar?: string | null
          name_en?: string | null
          neighborhood_id?: number | null
          operator_state?: Database["public"]["Enums"]["operator_state"]
          search_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facilities_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facilities_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facilities_neighborhood_id_city_id_fkey"
            columns: ["neighborhood_id", "city_id"]
            isOneToOne: false
            referencedRelation: "neighborhoods"
            referencedColumns: ["id", "city_id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          description: string | null
          enabled: boolean
          key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          enabled?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      governorates: {
        Row: {
          code: string
          name_ar: string
          name_en: string
          sort_order: number
        }
        Insert: {
          code: string
          name_ar: string
          name_en: string
          sort_order?: number
        }
        Update: {
          code?: string
          name_ar?: string
          name_en?: string
          sort_order?: number
        }
        Relationships: []
      }
      guardians: {
        Row: {
          confirmed_at: string | null
          contact_email: string
          created_at: string
          guardian_user_id: string | null
          id: string
          invite_expires_at: string | null
          invite_last_sent_at: string | null
          invite_send_count: number
          invite_sent_at: string | null
          invite_token_hash: string | null
          revoked_at: string | null
          status: Database["public"]["Enums"]["guardian_status"]
          updated_at: string
          visibility_choice: Database["public"]["Enums"]["profile_visibility"]
          youth_user_id: string
        }
        Insert: {
          confirmed_at?: string | null
          contact_email: string
          created_at?: string
          guardian_user_id?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_last_sent_at?: string | null
          invite_send_count?: number
          invite_sent_at?: string | null
          invite_token_hash?: string | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["guardian_status"]
          updated_at?: string
          visibility_choice?: Database["public"]["Enums"]["profile_visibility"]
          youth_user_id: string
        }
        Update: {
          confirmed_at?: string | null
          contact_email?: string
          created_at?: string
          guardian_user_id?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_last_sent_at?: string | null
          invite_send_count?: number
          invite_sent_at?: string | null
          invite_token_hash?: string | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["guardian_status"]
          updated_at?: string
          visibility_choice?: Database["public"]["Enums"]["profile_visibility"]
          youth_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardians_guardian_user_id_fkey"
            columns: ["guardian_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardians_youth_user_id_fkey"
            columns: ["youth_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          attempts: number
          created_at: string
          finished_at: string | null
          id: string
          idempotency_key: string | null
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          payload: Json
          priority: number
          run_after: string
          status: Database["public"]["Enums"]["job_status"]
          type: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          finished_at?: string | null
          id?: string
          idempotency_key?: string | null
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          payload?: Json
          priority?: number
          run_after?: string
          status?: Database["public"]["Enums"]["job_status"]
          type: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          finished_at?: string | null
          id?: string
          idempotency_key?: string | null
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          payload?: Json
          priority?: number
          run_after?: string
          status?: Database["public"]["Enums"]["job_status"]
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      neighborhoods: {
        Row: {
          city_id: number
          created_at: string
          id: number
          is_active: boolean
          name_ar: string
          name_en: string
          slug: string
        }
        Insert: {
          city_id: number
          created_at?: string
          id?: never
          is_active?: boolean
          name_ar: string
          name_en: string
          slug: string
        }
        Update: {
          city_id?: number
          created_at?: string
          id?: never
          is_active?: boolean
          name_ar?: string
          name_en?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "neighborhoods_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      pitch_evidence: {
        Row: {
          attribute: string
          facility_id: string | null
          id: number
          observed_at: string | null
          pitch_id: string | null
          recorded_at: string
          recorded_by: string | null
          source_kind: Database["public"]["Enums"]["evidence_source"]
          source_record_id: string | null
          submission_id: string | null
          value: Json
        }
        Insert: {
          attribute: string
          facility_id?: string | null
          id?: never
          observed_at?: string | null
          pitch_id?: string | null
          recorded_at?: string
          recorded_by?: string | null
          source_kind: Database["public"]["Enums"]["evidence_source"]
          source_record_id?: string | null
          submission_id?: string | null
          value: Json
        }
        Update: {
          attribute?: string
          facility_id?: string | null
          id?: never
          observed_at?: string | null
          pitch_id?: string | null
          recorded_at?: string
          recorded_by?: string | null
          source_kind?: Database["public"]["Enums"]["evidence_source"]
          source_record_id?: string | null
          submission_id?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "pitch_evidence_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pitch_evidence_pitch_id_fkey"
            columns: ["pitch_id"]
            isOneToOne: false
            referencedRelation: "pitches"
            referencedColumns: ["id"]
          },
        ]
      }
      pitch_operations: {
        Row: {
          confirmed_at: string
          confirmed_by: string | null
          opening_hours: Json
          pitch_id: string
          price_note_ar: string | null
          price_note_en: string | null
          price_per_hour: number
          schedule_active: boolean
          slot_minutes: number
          updated_at: string
        }
        Insert: {
          confirmed_at?: string
          confirmed_by?: string | null
          opening_hours?: Json
          pitch_id: string
          price_note_ar?: string | null
          price_note_en?: string | null
          price_per_hour: number
          schedule_active?: boolean
          slot_minutes: number
          updated_at?: string
        }
        Update: {
          confirmed_at?: string
          confirmed_by?: string | null
          opening_hours?: Json
          pitch_id?: string
          price_note_ar?: string | null
          price_note_en?: string | null
          price_per_hour?: number
          schedule_active?: boolean
          slot_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pitch_operations_pitch_id_fkey"
            columns: ["pitch_id"]
            isOneToOne: true
            referencedRelation: "pitches"
            referencedColumns: ["id"]
          },
        ]
      }
      pitches: {
        Row: {
          amenities: string[] | null
          created_at: string
          facility_id: string
          futsal: boolean | null
          id: string
          indoor: boolean | null
          label_ar: string | null
          label_en: string | null
          length_m: number | null
          lights: boolean | null
          listing_state: Database["public"]["Enums"]["listing_state"]
          participation: Database["public"]["Enums"]["pitch_participation"]
          pitch_level: Database["public"]["Enums"]["pitch_level"]
          players_per_side: number | null
          surface: Database["public"]["Enums"]["pitch_surface"] | null
          updated_at: string
          verified_at: string | null
          width_m: number | null
        }
        Insert: {
          amenities?: string[] | null
          created_at?: string
          facility_id: string
          futsal?: boolean | null
          id?: string
          indoor?: boolean | null
          label_ar?: string | null
          label_en?: string | null
          length_m?: number | null
          lights?: boolean | null
          listing_state?: Database["public"]["Enums"]["listing_state"]
          participation?: Database["public"]["Enums"]["pitch_participation"]
          pitch_level?: Database["public"]["Enums"]["pitch_level"]
          players_per_side?: number | null
          surface?: Database["public"]["Enums"]["pitch_surface"] | null
          updated_at?: string
          verified_at?: string | null
          width_m?: number | null
        }
        Update: {
          amenities?: string[] | null
          created_at?: string
          facility_id?: string
          futsal?: boolean | null
          id?: string
          indoor?: boolean | null
          label_ar?: string | null
          label_en?: string | null
          length_m?: number | null
          lights?: boolean | null
          listing_state?: Database["public"]["Enums"]["listing_state"]
          participation?: Database["public"]["Enums"]["pitch_participation"]
          pitch_level?: Database["public"]["Enums"]["pitch_level"]
          players_per_side?: number | null
          surface?: Database["public"]["Enums"]["pitch_surface"] | null
          updated_at?: string
          verified_at?: string | null
          width_m?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pitches_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_private: {
        Row: {
          created_at: string
          dob: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dob: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dob?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_private_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age_group: Database["public"]["Enums"]["age_group"] | null
          avatar_path: string | null
          card_code: string
          city_id: number | null
          created_at: string
          display_name: string
          dominant_foot: Database["public"]["Enums"]["dominant_foot"] | null
          handle: string | null
          id: string
          is_youth: boolean
          neighborhood_id: number | null
          onboarded_at: string | null
          position: Database["public"]["Enums"]["player_position"] | null
          shirt_number: number | null
          updated_at: string
          visibility: Database["public"]["Enums"]["profile_visibility"]
        }
        Insert: {
          age_group?: Database["public"]["Enums"]["age_group"] | null
          avatar_path?: string | null
          card_code: string
          city_id?: number | null
          created_at?: string
          display_name: string
          dominant_foot?: Database["public"]["Enums"]["dominant_foot"] | null
          handle?: string | null
          id: string
          is_youth?: boolean
          neighborhood_id?: number | null
          onboarded_at?: string | null
          position?: Database["public"]["Enums"]["player_position"] | null
          shirt_number?: number | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["profile_visibility"]
        }
        Update: {
          age_group?: Database["public"]["Enums"]["age_group"] | null
          avatar_path?: string | null
          card_code?: string
          city_id?: number | null
          created_at?: string
          display_name?: string
          dominant_foot?: Database["public"]["Enums"]["dominant_foot"] | null
          handle?: string | null
          id?: string
          is_youth?: boolean
          neighborhood_id?: number | null
          onboarded_at?: string | null
          position?: Database["public"]["Enums"]["player_position"] | null
          shirt_number?: number | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["profile_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_neighborhood_id_city_id_fkey"
            columns: ["neighborhood_id", "city_id"]
            isOneToOne: false
            referencedRelation: "neighborhoods"
            referencedColumns: ["id", "city_id"]
          },
        ]
      }
      user_settings: {
        Row: {
          locale: string
          share_in_match: boolean
          share_presence: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          locale?: string
          share_in_match?: boolean
          share_presence?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          locale?: string
          share_in_match?: boolean
          share_presence?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_guardian_invite: {
        Args: {
          p_guardian_dob?: string
          p_guardian_name?: string
          p_recording?: boolean
          p_token: string
          p_visibility?: Database["public"]["Enums"]["profile_visibility"]
        }
        Returns: Json
      }
      cancel_account_deletion: { Args: never; Returns: Json }
      catalog_pitch: { Args: { p_pitch_id: string }; Returns: Json }
      check_data_rights_secret: { Args: { p_secret: string }; Returns: boolean }
      complete_onboarding: {
        Args: {
          p_city_id: number
          p_consents: Json
          p_display_name: string
          p_dob: string
          p_dominant_foot?: Database["public"]["Enums"]["dominant_foot"]
          p_handle?: string
          p_neighborhood_id: number
          p_position: Database["public"]["Enums"]["player_position"]
          p_shirt_number?: number
          p_visibility?: Database["public"]["Enums"]["profile_visibility"]
        }
        Returns: Json
      }
      decline_guardian_invite: { Args: { p_token: string }; Returns: undefined }
      due_account_deletions: {
        Args: { p_limit?: number }
        Returns: {
          request_id: string
          user_id: string
        }[]
      }
      expire_data_exports: { Args: { p_limit?: number }; Returns: string[] }
      export_user_data: { Args: { p_user: string }; Returns: Json }
      finish_account_deletion: {
        Args: { p_request: string }
        Returns: undefined
      }
      guardian_invite_preview: { Args: { p_token: string }; Returns: Json }
      issue_guardian_invite: {
        Args: { p_link_id: string; p_youth: string }
        Returns: {
          contact_email: string
          expires_at: string
          token: string
          youth_name: string
        }[]
      }
      mark_data_export_ready: {
        Args: { p_path: string; p_request: string }
        Returns: Json
      }
      mark_data_request_failed: {
        Args: { p_error: string; p_request: string }
        Returns: undefined
      }
      mark_guardian_invite_sent: {
        Args: { p_link_id: string }
        Returns: undefined
      }
      me: { Args: never; Returns: Json }
      my_data_requests: { Args: never; Returns: Json }
      my_guardians: { Args: never; Returns: Json }
      name_guardian: { Args: { p_email: string }; Returns: Json }
      player_profile: { Args: { p_user: string }; Returns: Json }
      prepare_account_deletion: { Args: { p_request: string }; Returns: string }
      record_consent: {
        Args: {
          p_granted: boolean
          p_type: Database["public"]["Enums"]["consent_type"]
          p_version: string
        }
        Returns: Json
      }
      request_account_deletion: { Args: never; Returns: Json }
      request_data_export: { Args: never; Returns: Json }
      search_pitches: { Args: { p?: Json }; Returns: Json }
      set_settings: { Args: { p_patch: Json }; Returns: Json }
      set_visibility: {
        Args: {
          p_visibility: Database["public"]["Enums"]["profile_visibility"]
        }
        Returns: Json
      }
      update_profile: { Args: { p_patch: Json }; Returns: Json }
    }
    Enums: {
      age_group: "U12" | "U14" | "U16" | "U18" | "ADULT"
      consent_type: "terms" | "privacy" | "recording" | "streaming"
      data_request_kind: "export" | "deletion"
      data_request_status:
        | "pending"
        | "ready"
        | "completed"
        | "cancelled"
        | "failed"
      dominant_foot: "left" | "right" | "both"
      evidence_source:
        | "osm"
        | "operator"
        | "field_team"
        | "community"
        | "reviewer"
      facility_access:
        | "public_rental"
        | "public_free"
        | "members_only"
        | "school_only"
        | "closed"
        | "unknown"
      guardian_status: "pending" | "confirmed" | "revoked"
      job_status: "queued" | "running" | "succeeded" | "dead"
      listing_state:
        | "candidate"
        | "published"
        | "hidden"
        | "duplicate"
        | "closed"
        | "rejected"
      location_confidence:
        | "unchecked"
        | "approximate"
        | "map_checked"
        | "site_checked"
      operator_state:
        | "none"
        | "contacted"
        | "responded"
        | "claimed"
        | "authority_verified"
        | "declined"
        | "opted_out"
      pitch_level: "listed" | "dock" | "verified"
      pitch_participation: "not_verified" | "verified"
      pitch_surface:
        | "artificial_turf"
        | "natural_grass"
        | "hard_court"
        | "sand"
        | "other"
      player_position: "GK" | "DEF" | "MID" | "FWD"
      profile_visibility: "public" | "city" | "private"
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
      age_group: ["U12", "U14", "U16", "U18", "ADULT"],
      consent_type: ["terms", "privacy", "recording", "streaming"],
      data_request_kind: ["export", "deletion"],
      data_request_status: [
        "pending",
        "ready",
        "completed",
        "cancelled",
        "failed",
      ],
      dominant_foot: ["left", "right", "both"],
      evidence_source: [
        "osm",
        "operator",
        "field_team",
        "community",
        "reviewer",
      ],
      facility_access: [
        "public_rental",
        "public_free",
        "members_only",
        "school_only",
        "closed",
        "unknown",
      ],
      guardian_status: ["pending", "confirmed", "revoked"],
      job_status: ["queued", "running", "succeeded", "dead"],
      listing_state: [
        "candidate",
        "published",
        "hidden",
        "duplicate",
        "closed",
        "rejected",
      ],
      location_confidence: [
        "unchecked",
        "approximate",
        "map_checked",
        "site_checked",
      ],
      operator_state: [
        "none",
        "contacted",
        "responded",
        "claimed",
        "authority_verified",
        "declined",
        "opted_out",
      ],
      pitch_level: ["listed", "dock", "verified"],
      pitch_participation: ["not_verified", "verified"],
      pitch_surface: [
        "artificial_turf",
        "natural_grass",
        "hard_court",
        "sand",
        "other",
      ],
      player_position: ["GK", "DEF", "MID", "FWD"],
      profile_visibility: ["public", "city", "private"],
    },
  },
} as const

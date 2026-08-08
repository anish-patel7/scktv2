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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          details: string | null
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          details?: string | null
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          details?: string | null
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      cost_sheet_charges: {
        Row: {
          amount: number
          charge_name: string
          created_at: string
          id: string
          quantity: number
          rate: number
          remarks: string | null
          sequence: number
          sheet_id: string
        }
        Insert: {
          amount?: number
          charge_name: string
          created_at?: string
          id?: string
          quantity?: number
          rate?: number
          remarks?: string | null
          sequence?: number
          sheet_id: string
        }
        Update: {
          amount?: number
          charge_name?: string
          created_at?: string
          id?: string
          quantity?: number
          rate?: number
          remarks?: string | null
          sequence?: number
          sheet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_sheet_charges_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "cost_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_sheet_lines: {
        Row: {
          calculated_kg: number
          cost: number
          created_at: string
          denier: number
          id: string
          label: string | null
          length_metre: number
          material_id: string | null
          panna_inch: number
          quantity: number
          rate_per_kg: number
          remarks: string | null
          section: string
          sequence: number
          sheet_id: string
          yarn_name: string | null
        }
        Insert: {
          calculated_kg?: number
          cost?: number
          created_at?: string
          denier?: number
          id?: string
          label?: string | null
          length_metre?: number
          material_id?: string | null
          panna_inch?: number
          quantity?: number
          rate_per_kg?: number
          remarks?: string | null
          section: string
          sequence?: number
          sheet_id: string
          yarn_name?: string | null
        }
        Update: {
          calculated_kg?: number
          cost?: number
          created_at?: string
          denier?: number
          id?: string
          label?: string | null
          length_metre?: number
          material_id?: string | null
          panna_inch?: number
          quantity?: number
          rate_per_kg?: number
          remarks?: string | null
          section?: string
          sequence?: number
          sheet_id?: string
          yarn_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_sheet_lines_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_sheet_lines_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "cost_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_sheets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          card_cost: number
          card_divisor: number
          card_rate: number
          created_at: string
          created_by: string | null
          design_no: string | null
          final_cost: number
          id: string
          kg_divisor: number
          length_metre: number | null
          number_of_cards: number
          panna_inch: number | null
          party_id: string | null
          party_name: string | null
          pick: number | null
          process_cost: number
          quality: string | null
          reed: number | null
          remarks: string | null
          sale_rate: number
          sheet_no: string
          status: string
          total_kg: number
          updated_at: string
          version: number
          warp_cost: number
          wastage_cost: number
          wastage_pct: number
          weft_cost: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          card_cost?: number
          card_divisor?: number
          card_rate?: number
          created_at?: string
          created_by?: string | null
          design_no?: string | null
          final_cost?: number
          id?: string
          kg_divisor?: number
          length_metre?: number | null
          number_of_cards?: number
          panna_inch?: number | null
          party_id?: string | null
          party_name?: string | null
          pick?: number | null
          process_cost?: number
          quality?: string | null
          reed?: number | null
          remarks?: string | null
          sale_rate?: number
          sheet_no: string
          status?: string
          total_kg?: number
          updated_at?: string
          version?: number
          warp_cost?: number
          wastage_cost?: number
          wastage_pct?: number
          weft_cost?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          card_cost?: number
          card_divisor?: number
          card_rate?: number
          created_at?: string
          created_by?: string | null
          design_no?: string | null
          final_cost?: number
          id?: string
          kg_divisor?: number
          length_metre?: number | null
          number_of_cards?: number
          panna_inch?: number | null
          party_id?: string | null
          party_name?: string | null
          pick?: number | null
          process_cost?: number
          quality?: string | null
          reed?: number | null
          remarks?: string | null
          sale_rate?: number
          sheet_no?: string
          status?: string
          total_kg?: number
          updated_at?: string
          version?: number
          warp_cost?: number
          wastage_cost?: number
          wastage_pct?: number
          weft_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "cost_sheets_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "masters"
            referencedColumns: ["id"]
          },
        ]
      }
      masters: {
        Row: {
          active: boolean
          attributes: Json
          code: string
          created_at: string
          description: string | null
          id: string
          master_type: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          attributes?: Json
          code: string
          created_at?: string
          description?: string | null
          id?: string
          master_type: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          attributes?: Json
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          master_type?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      material_rate_history: {
        Row: {
          created_at: string
          created_by: string | null
          effective_from: string
          id: string
          material_id: string
          note: string | null
          rate_per_kg: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_from?: string
          id?: string
          material_id: string
          note?: string | null
          rate_per_kg: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_from?: string
          id?: string
          material_id?: string
          note?: string | null
          rate_per_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "material_rate_history_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          active: boolean
          code: string
          composition: string | null
          created_at: string
          denier: number | null
          id: string
          name: string
          rate_per_kg: number
          remarks: string | null
          uom: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          composition?: string | null
          created_at?: string
          denier?: number | null
          id?: string
          name: string
          rate_per_kg?: number
          remarks?: string | null
          uom?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          composition?: string | null
          created_at?: string
          denier?: number | null
          id?: string
          name?: string
          rate_per_kg?: number
          remarks?: string | null
          uom?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "costing" | "viewer"
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
      app_role: ["admin", "manager", "costing", "viewer"],
    },
  },
} as const

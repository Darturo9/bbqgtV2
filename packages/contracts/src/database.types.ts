export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      brands: {
        Row: {
          created_at: string;
          currency_code: string;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          currency_code?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          currency_code?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          brand_id: string;
          created_at: string;
          description: string | null;
          display_order: number;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          brand_id: string;
          created_at?: string;
          description?: string | null;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          brand_id?: string;
          created_at?: string;
          description?: string | null;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
        ];
      };
      category_modifier_group_exclusions: {
        Row: {
          brand_id: string;
          category_id: string;
          created_at: string;
          modifier_group_id: string;
          product_id: string;
          updated_at: string;
        };
        Insert: {
          brand_id: string;
          category_id: string;
          created_at?: string;
          modifier_group_id: string;
          product_id: string;
          updated_at?: string;
        };
        Update: {
          brand_id?: string;
          category_id?: string;
          created_at?: string;
          modifier_group_id?: string;
          product_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "category_modifier_group_exclusions_assignment_fkey";
            columns: ["brand_id", "category_id", "modifier_group_id"];
            isOneToOne: false;
            referencedRelation: "category_modifier_groups";
            referencedColumns: ["brand_id", "category_id", "modifier_group_id"];
          },
          {
            foreignKeyName: "category_modifier_group_exclusions_product_fkey";
            columns: ["brand_id", "category_id", "product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["brand_id", "category_id", "id"];
          },
        ];
      };
      category_modifier_groups: {
        Row: {
          brand_id: string;
          category_id: string;
          created_at: string;
          modifier_group_id: string;
          updated_at: string;
        };
        Insert: {
          brand_id: string;
          category_id: string;
          created_at?: string;
          modifier_group_id: string;
          updated_at?: string;
        };
        Update: {
          brand_id?: string;
          category_id?: string;
          created_at?: string;
          modifier_group_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "category_modifier_groups_category_fkey";
            columns: ["brand_id", "category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["brand_id", "id"];
          },
          {
            foreignKeyName: "category_modifier_groups_group_fkey";
            columns: ["brand_id", "modifier_group_id"];
            isOneToOne: false;
            referencedRelation: "modifier_groups";
            referencedColumns: ["brand_id", "id"];
          },
        ];
      };
      location_modifier_options: {
        Row: {
          brand_id: string;
          created_at: string;
          is_available: boolean;
          location_id: string;
          modifier_option_id: string;
          updated_at: string;
        };
        Insert: {
          brand_id: string;
          created_at?: string;
          is_available?: boolean;
          location_id: string;
          modifier_option_id: string;
          updated_at?: string;
        };
        Update: {
          brand_id?: string;
          created_at?: string;
          is_available?: boolean;
          location_id?: string;
          modifier_option_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "location_modifier_options_location_fkey";
            columns: ["brand_id", "location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["brand_id", "id"];
          },
          {
            foreignKeyName: "location_modifier_options_option_fkey";
            columns: ["brand_id", "modifier_option_id"];
            isOneToOne: false;
            referencedRelation: "modifier_options";
            referencedColumns: ["brand_id", "id"];
          },
        ];
      };
      location_products: {
        Row: {
          brand_id: string;
          created_at: string;
          is_available: boolean;
          location_id: string;
          product_id: string;
          updated_at: string;
        };
        Insert: {
          brand_id: string;
          created_at?: string;
          is_available?: boolean;
          location_id: string;
          product_id: string;
          updated_at?: string;
        };
        Update: {
          brand_id?: string;
          created_at?: string;
          is_available?: boolean;
          location_id?: string;
          product_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "location_products_location_fkey";
            columns: ["brand_id", "location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["brand_id", "id"];
          },
          {
            foreignKeyName: "location_products_product_fkey";
            columns: ["brand_id", "product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["brand_id", "id"];
          },
        ];
      };
      locations: {
        Row: {
          brand_id: string;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          brand_id: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          brand_id?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "locations_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
        ];
      };
      modifier_conditions: {
        Row: {
          activating_modifier_option_id: string;
          brand_id: string;
          child_modifier_group_id: string;
          created_at: string;
          parent_modifier_group_id: string;
          updated_at: string;
        };
        Insert: {
          activating_modifier_option_id: string;
          brand_id: string;
          child_modifier_group_id: string;
          created_at?: string;
          parent_modifier_group_id: string;
          updated_at?: string;
        };
        Update: {
          activating_modifier_option_id?: string;
          brand_id?: string;
          child_modifier_group_id?: string;
          created_at?: string;
          parent_modifier_group_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "modifier_conditions_activating_option_fkey";
            columns: ["brand_id", "parent_modifier_group_id", "activating_modifier_option_id"];
            isOneToOne: false;
            referencedRelation: "modifier_options";
            referencedColumns: ["brand_id", "modifier_group_id", "id"];
          },
          {
            foreignKeyName: "modifier_conditions_child_group_fkey";
            columns: ["brand_id", "child_modifier_group_id"];
            isOneToOne: false;
            referencedRelation: "modifier_groups";
            referencedColumns: ["brand_id", "id"];
          },
        ];
      };
      modifier_groups: {
        Row: {
          brand_id: string;
          created_at: string;
          description: string | null;
          display_order: number;
          id: string;
          is_active: boolean;
          max_selections: number;
          min_selections: number;
          name: string;
          selection_type: string;
          updated_at: string;
        };
        Insert: {
          brand_id: string;
          created_at?: string;
          description?: string | null;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          max_selections: number;
          min_selections?: number;
          name: string;
          selection_type: string;
          updated_at?: string;
        };
        Update: {
          brand_id?: string;
          created_at?: string;
          description?: string | null;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          max_selections?: number;
          min_selections?: number;
          name?: string;
          selection_type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "modifier_groups_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
        ];
      };
      modifier_options: {
        Row: {
          brand_id: string;
          created_at: string;
          description: string | null;
          display_order: number;
          id: string;
          is_active: boolean;
          modifier_group_id: string;
          name: string;
          price_adjustment_cents: number;
          updated_at: string;
        };
        Insert: {
          brand_id: string;
          created_at?: string;
          description?: string | null;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          modifier_group_id: string;
          name: string;
          price_adjustment_cents?: number;
          updated_at?: string;
        };
        Update: {
          brand_id?: string;
          created_at?: string;
          description?: string | null;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          modifier_group_id?: string;
          name?: string;
          price_adjustment_cents?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "modifier_options_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "modifier_options_brand_id_group_id_fkey";
            columns: ["brand_id", "modifier_group_id"];
            isOneToOne: false;
            referencedRelation: "modifier_groups";
            referencedColumns: ["brand_id", "id"];
          },
        ];
      };
      product_modifier_groups: {
        Row: {
          brand_id: string;
          created_at: string;
          modifier_group_id: string;
          product_id: string;
          updated_at: string;
        };
        Insert: {
          brand_id: string;
          created_at?: string;
          modifier_group_id: string;
          product_id: string;
          updated_at?: string;
        };
        Update: {
          brand_id?: string;
          created_at?: string;
          modifier_group_id?: string;
          product_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_modifier_groups_group_fkey";
            columns: ["brand_id", "modifier_group_id"];
            isOneToOne: false;
            referencedRelation: "modifier_groups";
            referencedColumns: ["brand_id", "id"];
          },
          {
            foreignKeyName: "product_modifier_groups_product_fkey";
            columns: ["brand_id", "product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["brand_id", "id"];
          },
        ];
      };
      products: {
        Row: {
          brand_id: string;
          category_id: string;
          created_at: string;
          description: string | null;
          display_order: number;
          id: string;
          image_path: string | null;
          is_active: boolean;
          name: string;
          offer_price_cents: number | null;
          regular_price_cents: number;
          slug: string;
          updated_at: string;
        };
        Insert: {
          brand_id: string;
          category_id: string;
          created_at?: string;
          description?: string | null;
          display_order?: number;
          id?: string;
          image_path?: string | null;
          is_active?: boolean;
          name: string;
          offer_price_cents?: number | null;
          regular_price_cents: number;
          slug: string;
          updated_at?: string;
        };
        Update: {
          brand_id?: string;
          category_id?: string;
          created_at?: string;
          description?: string | null;
          display_order?: number;
          id?: string;
          image_path?: string | null;
          is_active?: boolean;
          name?: string;
          offer_price_cents?: number | null;
          regular_price_cents?: number;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_brand_id_category_id_fkey";
            columns: ["brand_id", "category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["brand_id", "id"];
          },
          {
            foreignKeyName: "products_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;

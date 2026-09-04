export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      item_tags: {
        Row: {
          created_at: string;
          item_id: string;
          tag_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          item_id: string;
          tag_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          item_id?: string;
          tag_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "item_tags_item_user_fkey";
            columns: ["item_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "library_items";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "item_tags_tag_user_fkey";
            columns: ["tag_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      library_items: {
        Row: {
          content: string | null;
          created_at: string;
          description: string | null;
          id: string;
          normalized_url: string | null;
          search_vector: unknown;
          title: string;
          type: Database["public"]["Enums"]["item_type"];
          updated_at: string;
          url: string | null;
          user_id: string;
        };
        Insert: {
          content?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          normalized_url?: string | null;
          search_vector?: unknown;
          title: string;
          type: Database["public"]["Enums"]["item_type"];
          updated_at?: string;
          url?: string | null;
          user_id: string;
        };
        Update: {
          content?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          normalized_url?: string | null;
          search_vector?: unknown;
          title?: string;
          type?: Database["public"]["Enums"]["item_type"];
          updated_at?: string;
          url?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      link_previews: {
        Row: {
          attempts: number;
          created_at: string;
          error_code: string | null;
          favicon_hash: string | null;
          fetched_at: string | null;
          item_id: string;
          next_attempt_at: string;
          remote_description: string | null;
          remote_title: string | null;
          site_name: string | null;
          status: Database["public"]["Enums"]["preview_status"];
          thumbnail_hash: string | null;
          thumbnail_height: number | null;
          thumbnail_source: Database["public"]["Enums"]["preview_source"];
          thumbnail_width: number | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          attempts?: number;
          created_at?: string;
          error_code?: string | null;
          favicon_hash?: string | null;
          fetched_at?: string | null;
          item_id: string;
          next_attempt_at?: string;
          remote_description?: string | null;
          remote_title?: string | null;
          site_name?: string | null;
          status?: Database["public"]["Enums"]["preview_status"];
          thumbnail_hash?: string | null;
          thumbnail_height?: number | null;
          thumbnail_source?: Database["public"]["Enums"]["preview_source"];
          thumbnail_width?: number | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          error_code?: string | null;
          favicon_hash?: string | null;
          fetched_at?: string | null;
          item_id?: string;
          next_attempt_at?: string;
          remote_description?: string | null;
          remote_title?: string | null;
          site_name?: string | null;
          status?: Database["public"]["Enums"]["preview_status"];
          thumbnail_hash?: string | null;
          thumbnail_height?: number | null;
          thumbnail_source?: Database["public"]["Enums"]["preview_source"];
          thumbnail_width?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "link_previews_item_user_fkey";
            columns: ["item_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "library_items";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      tags: {
        Row: {
          color_token: string;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          name_normalized: string | null;
          parent_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          color_token: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          name_normalized?: string | null;
          parent_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          color_token?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          name_normalized?: string | null;
          parent_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tags_parent_id_user_id_fkey";
            columns: ["parent_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      user_preferences: {
        Row: {
          created_at: string;
          theme: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          theme?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          theme?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      claim_preview_jobs: {
        Args: { p_item_ids?: string[]; p_limit?: number };
        Returns: {
          attempts: number;
          item_id: string;
          url: string;
        }[];
      };
      complete_preview_job: {
        Args: {
          p_error_code?: string;
          p_favicon_hash?: string;
          p_item_id: string;
          p_remote_description?: string;
          p_remote_title?: string;
          p_site_name?: string;
          p_status: Database["public"]["Enums"]["preview_status"];
          p_thumbnail_hash?: string;
          p_thumbnail_height?: number;
          p_thumbnail_source?: Database["public"]["Enums"]["preview_source"];
          p_thumbnail_width?: number;
        };
        Returns: {
          previous_favicon_hash: string;
          previous_thumbnail_hash: string;
        }[];
      };
      count_claimable_preview_jobs: {
        Args: { p_item_ids?: string[] };
        Returns: number;
      };
      count_library_items_for_tag: {
        Args: { p_tag_id: string };
        Returns: number;
      };
      create_library_item: {
        Args: {
          p_content: string;
          p_description: string;
          p_normalized_url: string;
          p_tag_ids: string[];
          p_title: string;
          p_type: Database["public"]["Enums"]["item_type"];
          p_url: string;
        };
        Returns: string;
      };
      delete_tag_reparent_children: {
        Args: { p_tag_id: string };
        Returns: undefined;
      };
      get_tag_rollup_items: {
        Args: { p_tag_id: string };
        Returns: {
          content: string;
          description: string;
          id: string;
          tag_ids: string[];
          title: string;
          type: Database["public"]["Enums"]["item_type"];
          url: string;
        }[];
      };
      import_browser_bookmarks: {
        Args: { p_items: Json; p_tags: Json };
        Returns: {
          associations_created: number;
          items_imported: number;
          tags_created: number;
        }[];
      };
      import_library_backup: {
        Args: { p_items: Json; p_tags: Json };
        Returns: {
          duplicates_ignored: number;
          items_imported: number;
          tags_created: number;
        }[];
      };
      is_preview_job_claimable: {
        Args: {
          p_error_code: string;
          p_next_attempt_at: string;
          p_status: Database["public"]["Enums"]["preview_status"];
        };
        Returns: boolean;
      };
      request_preview_refresh: {
        Args: { p_item_id: string };
        Returns: undefined;
      };
      request_preview_reschedule_for_items: {
        Args: { p_item_ids: string[] };
        Returns: number;
      };
      reset_account: { Args: never; Returns: undefined };
      search_library: {
        Args: {
          p_cursor?: Json;
          p_include_descendants?: boolean;
          p_limit?: number;
          p_query?: string;
          p_sort?: string;
          p_tag_id?: string;
          p_types?: Database["public"]["Enums"]["item_type"][];
        };
        Returns: {
          content_preview: string;
          created_at: string;
          description: string;
          id: string;
          tag_ids: string[];
          title: string;
          type: Database["public"]["Enums"]["item_type"];
          updated_at: string;
          url: string;
        }[];
      };
      set_item_tags: {
        Args: { p_item_id: string; p_tag_ids: string[] };
        Returns: undefined;
      };
      tag_ancestors: {
        Args: { p_tag_id: string };
        Returns: {
          depth: number;
          id: string;
          name: string;
        }[];
      };
      tag_descendants: { Args: { p_tag_id: string }; Returns: string[] };
      update_library_item: {
        Args: {
          p_content: string;
          p_description: string;
          p_item_id: string;
          p_normalized_url: string;
          p_tag_ids: string[];
          p_title: string;
          p_type: Database["public"]["Enums"]["item_type"];
          p_url: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      item_type: "link" | "prompt" | "code_component";
      preview_source: "og_image" | "twitter_image" | "none";
      preview_status: "pending" | "ready" | "failed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      item_type: ["link", "prompt", "code_component"],
      preview_source: ["og_image", "twitter_image", "none"],
      preview_status: ["pending", "ready", "failed"],
    },
  },
} as const;

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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      ai_creations: {
        Row: {
          created_at: string
          id: string
          kind: string
          media_path: string | null
          mime_type: string | null
          prompt: string
          text_result: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          media_path?: string | null
          mime_type?: string | null
          prompt: string
          text_result?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          media_path?: string | null
          mime_type?: string | null
          prompt?: string
          text_result?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_creations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_shares: {
        Row: {
          channel: string
          created_at: string
          id: string
          post_id: string
          user_id: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          post_id: string
          user_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_views: {
        Row: {
          created_at: string
          post_id: string
          viewer_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          viewer_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          allow_remix: boolean
          author_id: string
          caption: string | null
          category: string | null
          cover_path: string | null
          created_at: string
          id: string
          kind: string
          media_duration: number | null
          overlay_text: string | null
          remix_of: string | null
          source: string
          title: string
          trim_end: number | null
          trim_start: number
          video_path: string
          volume: number
        }
        Insert: {
          allow_remix?: boolean
          author_id: string
          caption?: string | null
          category?: string | null
          cover_path?: string | null
          created_at?: string
          id?: string
          kind?: string
          media_duration?: number | null
          overlay_text?: string | null
          remix_of?: string | null
          source?: string
          title: string
          trim_end?: number | null
          trim_start?: number
          video_path: string
          volume?: number
        }
        Update: {
          allow_remix?: boolean
          author_id?: string
          caption?: string | null
          category?: string | null
          cover_path?: string | null
          created_at?: string
          id?: string
          kind?: string
          media_duration?: number | null
          overlay_text?: string | null
          remix_of?: string | null
          source?: string
          title?: string
          trim_end?: number | null
          trim_start?: number
          video_path?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_remix_of_fkey"
            columns: ["remix_of"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          username?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          author_id: string
          created_at: string
          expires_at: string
          id: string
          media_path: string
          media_type: string
          overlay_text: string | null
        }
        Insert: {
          author_id: string
          created_at?: string
          expires_at?: string
          id?: string
          media_path: string
          media_type: string
          overlay_text?: string | null
        }
        Update: {
          author_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          media_path?: string
          media_type?: string
          overlay_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stories_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      story_views: {
        Row: {
          story_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          story_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          story_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_jobs: {
        Row: {
          created_at: string
          error: string | null
          gateway_job_id: string
          id: string
          prompt: string
          status: string
          user_id: string
          video_path: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          gateway_job_id: string
          id?: string
          prompt: string
          status?: string
          user_id: string
          video_path?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          gateway_job_id?: string
          id?: string
          prompt?: string
          status?: string
          user_id?: string
          video_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
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
      get_public_profile: {
        Args: { _username: string }
        Returns: {
          avatar_url: string
          bio: string
          created_at: string
          display_name: string
          followers_count: number
          following_count: number
          id: string
          username: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_post_owner: {
        Args: { _post_id: string; _user_id: string }
        Returns: boolean
      }
      is_published_video: { Args: { _path: string }; Returns: boolean }
      list_active_stories: {
        Args: never
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_id: string
          author_username: string
          created_at: string
          expires_at: string
          id: string
          media_path: string
          media_type: string
          overlay_text: string
          seen: boolean
          views_count: number
        }[]
      }
      list_comments: {
        Args: { _post_id: string }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_id: string
          author_username: string
          body: string
          can_delete: boolean
          created_at: string
          id: string
          parent_id: string
        }[]
      }
      list_posts: {
        Args: { _author_id?: string; _mode?: string; _post_id?: string }
        Returns: {
          allow_remix: boolean
          author_avatar_url: string
          author_display_name: string
          author_id: string
          author_username: string
          caption: string
          category: string
          comments_count: number
          cover_path: string
          created_at: string
          id: string
          kind: string
          liked_by_me: boolean
          likes_count: number
          media_duration: number
          media_path: string
          overlay_text: string
          remix_of: string
          remix_of_title: string
          remix_of_username: string
          score: number
          shares_count: number
          source: string
          title: string
          trim_end: number
          trim_start: number
          views_count: number
          volume: number
        }[]
      }
      list_story_viewers: {
        Args: { _story_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          username: string
          viewed_at: string
          viewer_id: string
        }[]
      }
      list_video_posts: {
        Args: { _author_id?: string }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_id: string
          author_username: string
          caption: string
          created_at: string
          id: string
          overlay_text: string
          source: string
          title: string
          trim_end: number
          trim_start: number
          video_path: string
          volume: number
        }[]
      }
      record_post_share: {
        Args: { _channel: string; _post_id: string }
        Returns: undefined
      }
      record_post_view: { Args: { _post_id: string }; Returns: undefined }
      record_story_view: { Args: { _story_id: string }; Returns: undefined }
      username_taken: { Args: { _username: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const

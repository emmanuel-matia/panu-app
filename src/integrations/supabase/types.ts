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
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_user_id_fkey"
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
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          post_id: string | null
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_lookup: {
        Row: {
          discoverable: boolean
          phone: string
          phone_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          discoverable?: boolean
          phone: string
          phone_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          discoverable?: boolean
          phone?: string
          phone_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phone_lookup_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_founder: {
        Row: {
          designated_at: string
          singleton: boolean
          user_id: string
        }
        Insert: {
          designated_at?: string
          singleton?: boolean
          user_id: string
        }
        Update: {
          designated_at?: string
          singleton?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_founder_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
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
      post_saves: {
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
            foreignKeyName: "post_saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_saves_user_id_fkey"
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
          allow_comments: boolean
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
          visibility: string
          volume: number
        }
        Insert: {
          allow_comments?: boolean
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
          visibility?: string
          volume?: number
        }
        Update: {
          allow_comments?: boolean
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
          visibility?: string
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
          birth_date: string | null
          city: string | null
          country: string | null
          cover_url: string | null
          created_at: string
          deactivated_at: string | null
          display_name: string
          follow_policy: string
          id: string
          is_locked: boolean
          is_professional: boolean
          last_seen_at: string | null
          location: string | null
          searchable: boolean
          show_online: boolean
          social_links: Json
          username: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          deactivated_at?: string | null
          display_name: string
          follow_policy?: string
          id: string
          is_locked?: boolean
          is_professional?: boolean
          last_seen_at?: string | null
          location?: string | null
          searchable?: boolean
          show_online?: boolean
          social_links?: Json
          username: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          deactivated_at?: string | null
          display_name?: string
          follow_policy?: string
          id?: string
          is_locked?: boolean
          is_professional?: boolean
          last_seen_at?: string | null
          location?: string | null
          searchable?: boolean
          show_online?: boolean
          social_links?: Json
          username?: string
          website?: string | null
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          shares_count: number
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          shares_count?: number
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          shares_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          code: string
          created_at: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          code: string
          created_at?: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          code?: string
          created_at?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      usage_daily: {
        Row: {
          day: string
          seconds: number
          user_id: string
        }
        Insert: {
          day: string
          seconds?: number
          user_id: string
        }
        Update: {
          day?: string
          seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_daily_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          balance: number
          plan: string
          updated_at: string
          user_id: string
          welcome_granted_at: string | null
        }
        Insert: {
          balance?: number
          plan?: string
          updated_at?: string
          user_id: string
          welcome_granted_at?: string | null
        }
        Update: {
          balance?: number
          plan?: string
          updated_at?: string
          user_id?: string
          welcome_granted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
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
      user_settings: {
        Row: {
          default_allow_remix: boolean
          language: string
          notify_comments: boolean
          notify_follows: boolean
          notify_likes: boolean
          notify_messages: boolean
          prefs: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          default_allow_remix?: boolean
          language?: string
          notify_comments?: boolean
          notify_follows?: boolean
          notify_likes?: boolean
          notify_messages?: boolean
          prefs?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          default_allow_remix?: boolean
          language?: string
          notify_comments?: boolean
          notify_follows?: boolean
          notify_likes?: boolean
          notify_messages?: boolean
          prefs?: Json
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
      add_usage_seconds: {
        Args: { _day: string; _seconds: number }
        Returns: number
      }
      can_view_post: {
        Args: {
          _author: string
          _deactivated: string
          _locked: boolean
          _visibility: string
        }
        Returns: boolean
      }
      claim_welcome_credits: { Args: never; Returns: number }
      clear_my_phone: { Args: never; Returns: undefined }
      creator_stats: { Args: { _from: string; _to: string }; Returns: Json }
      founder_id: { Args: never; Returns: string }
      get_public_profile: {
        Args: { _username: string }
        Returns: {
          avatar_url: string
          bio: string
          city: string
          country: string
          cover_url: string
          created_at: string
          display_name: string
          follow_policy: string
          followers_count: number
          following_count: number
          id: string
          is_founder: boolean
          is_locked: boolean
          is_professional: boolean
          online: boolean
          posts_count: number
          social_links: Json
          username: string
          website: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_blocked_between: { Args: { _a: string; _b: string }; Returns: boolean }
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
      list_blocked_users: {
        Args: never
        Returns: {
          avatar_url: string
          blocked_at: string
          display_name: string
          id: string
          username: string
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
      list_follow_users: {
        Args: { _kind: string }
        Returns: {
          avatar_url: string
          display_name: string
          followed_at: string
          i_follow: boolean
          id: string
          is_founder: boolean
          username: string
        }[]
      }
      list_my_referrals: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          id: string
          username: string
        }[]
      }
      list_notifications: {
        Args: never
        Returns: {
          actor_avatar_url: string
          actor_display_name: string
          actor_id: string
          actor_username: string
          created_at: string
          id: string
          post_id: string
          post_title: string
          read_at: string
          type: string
        }[]
      }
      list_posts: {
        Args: { _author_id?: string; _mode?: string; _post_id?: string }
        Returns: {
          allow_remix: boolean
          author_avatar_url: string
          author_display_name: string
          author_id: string
          author_location: string
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
          saved_by_me: boolean
          saves_count: number
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
      mark_notifications_read: { Args: never; Returns: undefined }
      match_contacts: {
        Args: { _numbers: string[] }
        Returns: {
          avatar_url: string
          display_name: string
          i_follow: boolean
          id: string
          username: string
        }[]
      }
      my_referral_code: { Args: never; Returns: string }
      phone_key: { Args: { _raw: string }; Returns: string }
      push_notification: {
        Args: { _actor: string; _post: string; _type: string; _user: string }
        Returns: undefined
      }
      record_invite_share: { Args: never; Returns: undefined }
      record_post_share: {
        Args: { _channel: string; _post_id: string }
        Returns: undefined
      }
      record_post_view: { Args: { _post_id: string }; Returns: undefined }
      record_story_view: { Args: { _story_id: string }; Returns: undefined }
      redeem_referral: { Args: { _code: string }; Returns: string }
      refund_credits: {
        Args: { _amount: number; _reason: string; _user_id: string }
        Returns: undefined
      }
      search_profiles: {
        Args: { _q: string }
        Returns: {
          avatar_url: string
          display_name: string
          i_follow: boolean
          id: string
          is_founder: boolean
          username: string
        }[]
      }
      set_my_phone: {
        Args: { _discoverable: boolean; _phone: string }
        Returns: undefined
      }
      set_phone_discoverable: {
        Args: { _discoverable: boolean }
        Returns: undefined
      }
      spend_credits: {
        Args: { _amount: number; _reason: string }
        Returns: number
      }
      suggested_profiles: {
        Args: never
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          mutual_count: number
          reason: string
          username: string
        }[]
      }
      unread_notifications_count: { Args: never; Returns: number }
      username_taken: { Args: { _username: string }; Returns: boolean }
      viewer_relation: {
        Args: { _profile_id: string }
        Returns: {
          blocked_by_me: boolean
          blocked_me: boolean
          follows_me: boolean
          i_follow: boolean
        }[]
      }
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

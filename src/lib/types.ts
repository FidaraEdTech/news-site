export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type StoryStatus = "draft" | "published";
export type SiteSettings = {
  id: number;
  author_bio: string | null;
  social_twitter: string | null;
  social_linkedin: string | null;
  social_instagram: string | null;
  newsletter_url: string | null;
  google_site_verification: string | null;
  updated_at?: string;
};
export type StoryType = "article" | "photo_desk";

export type PhotoDeskItem = {
  image_url: string;
  image_path: string;
  caption: string;
  order: number;
};

export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

export type Story = {
  tags?: string[];
  byline?: string | null;
  content_format?: "plain" | "html";
  id: string;
  author_id: string;
  title: string;
  category: string;
  location: string | null;
  excerpt: string;
  content: string;
  status: StoryStatus;
  story_type: StoryType;
  featured_image_url: string | null;
  featured_image_path: string | null;
  video_url: string | null;
  video_path: string | null;
  video_caption: string | null;
  photo_desk_items: PhotoDeskItem[] | null;
  is_breaking: boolean;
  breaking_label: string | null;
  breaking_expires_at: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  views: number;
};

export type StoryMedia = {
  id: string;
  story_id: string;
  url: string;
  storage_path: string | null;
  media_type: "image";
  caption: string | null;
  alt_text: string | null;
  sort_order: number;
  created_at: string;
};

export type StoryWithGallery = Story & {
  gallery_count?: number;
  gallery?: StoryMedia[];
};

export type Comment = {
  id: string;
  story_id: string;
  author_name: string;
  body: string;
  parent_id: string | null;
  created_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  moderation_reason?: string | null;
};

export type CommentWithReplies = Comment & {
  replies: Comment[];
};

export type StoryWithComments = Story & {
  comments?: Comment[];
};

export type StoryFormValues = {
  id?: string;
  title: string;
  category: string;
  location?: string;
  excerpt: string;
  content: string;
  featured_image_url?: string;
  video_caption?: string;
  status: StoryStatus;
};

export interface Database {
  public: {
    Tables: {
      site_settings: {
        Row: SiteSettings;
        Insert: Partial<SiteSettings>;
        Update: Partial<SiteSettings>;
        Relationships: [];
      };
      stories: {
        Row: Story;
        Insert: {
          tags?: string[];
          byline?: string | null;
          content_format?: "plain" | "html";
          id?: string;
          author_id: string;
          title: string;
          category: string;
          location?: string | null;
          excerpt: string;
          content: string;
          status?: StoryStatus;
          story_type?: StoryType;
          featured_image_url?: string | null;
          featured_image_path?: string | null;
          video_url?: string | null;
          video_path?: string | null;
          video_caption?: string | null;
          photo_desk_items?: PhotoDeskItem[] | null;
          is_breaking?: boolean;
          breaking_label?: string | null;
          breaking_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
          views?: number;
        };
        Update: {
          tags?: string[];
          byline?: string | null;
          content_format?: "plain" | "html";
          id?: string;
          author_id?: string;
          title?: string;
          category?: string;
          location?: string | null;
          excerpt?: string;
          content?: string;
          status?: StoryStatus;
          story_type?: StoryType;
          featured_image_url?: string | null;
          featured_image_path?: string | null;
          video_url?: string | null;
          video_path?: string | null;
          video_caption?: string | null;
          photo_desk_items?: PhotoDeskItem[] | null;
          is_breaking?: boolean;
          breaking_label?: string | null;
          breaking_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
          views?: number;
        };
        Relationships: [];
      };
      comments: {
        Row: Comment;
        Insert: {
          id?: string;
          story_id: string;
          author_name: string;
          body: string;
          parent_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          moderation_reason?: string | null;
        };
        Update: {
          id?: string;
          story_id?: string;
          author_name?: string;
          body?: string;
          parent_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          moderation_reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "comments_story_id_fkey";
            columns: ["story_id"];
            referencedRelation: "stories";
            referencedColumns: ["id"];
          }
        ];
      };
      story_media: {
        Row: StoryMedia;
        Insert: {
          id?: string;
          story_id: string;
          url: string;
          storage_path?: string | null;
          media_type?: "image";
          caption?: string | null;
          alt_text?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          story_id?: string;
          url?: string;
          storage_path?: string | null;
          media_type?: "image";
          caption?: string | null;
          alt_text?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "story_media_story_id_fkey";
            columns: ["story_id"];
            referencedRelation: "stories";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_views: {
        Args: {
          story_id_input: string;
        };
        Returns: void;
      };
    };
    Enums: {
      story_status: StoryStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

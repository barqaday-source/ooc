// ====================================================================
// Supabase Client - عميل الاتصال بقاعدة البيانات
// ====================================================================

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jmsmrojtlstppnpwmkkk.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imptc21yb2p0bHN0cHBucHdta2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTg2NDAsImV4cCI6MjA4ODM5NDY0MH0.j7gxr5CvrfvbJJzK_pMwVHiCE2AqpXUTThpeLEBmsos";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
  realtime: { params: { eventsPerSecond: 10 } },
});

// ====================================================================
// Types
// ====================================================================

export type AppRole = "admin" | "moderator" | "user";
export type RoomStatus = "pending" | "approved" | "rejected";
export type FriendshipStatus = "pending" | "accepted" | "blocked";
export type MessageType = "text" | "image" | "voice";
export type NotifType =
  | "message"
  | "friend_request"
  | "friend_accept"
  | "room_approved"
  | "room_rejected"
  | "system";

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_banned: boolean;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  link: string | null;
  owner_id: string;
  is_active: boolean;
  is_closed: boolean;
  status: RoomStatus;
  created_at: string;
  is_dm?: boolean;
  dm_key?: string | null;
}

export interface Message {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  message_type: MessageType;
  media_url: string | null;
  media_duration: number | null;
  created_at: string;
  edited_at?: string | null;
  profile?: Profile;
  authorIsAdmin?: boolean;
}

export interface RoomBan {
  id: string;
  room_id: string;
  user_id: string;
  banned_by: string;
  reason: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface RoomModerator {
  id: string;
  room_id: string;
  user_id: string;
  created_at: string;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotifType;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  primary_hue: string;
  primary_sat: string;
  primary_light: string;
  is_active: boolean;
  is_builtin: boolean;
  created_by: string | null;
  created_at: string;
}

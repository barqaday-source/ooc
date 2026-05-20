// ====================================================================
// useAuth - Hook موحّد لإدارة المصادقة في كل التطبيق
// ====================================================================
// يوفّر: المستخدم الحالي، الجلسة، الدور (admin/user)، الـ profile
// + دوال signUp/signIn/signOut جاهزة
// ====================================================================

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, type Profile, type AppRole } from "@/lib/supabase";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  isAdmin: boolean;
  loading: boolean;
  signUp: (email: string, password: string, username: string, useLocalEmail?: boolean) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  // جلب الـ profile + الأدوار للمستخدم
  const loadUserData = useCallback(async (userId: string) => {
    const [{ data: profileData }, { data: rolesData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    setProfile(profileData as Profile | null);
    setRoles(((rolesData ?? []) as { role: AppRole }[]).map((r) => r.role));
  }, []);

  useEffect(() => {
    // ⚠️ هام: الترتيب الصحيح - listener أولاً ثم getSession
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        // تأجيل أي استدعاء async داخل listener لمنع deadlock
        setTimeout(() => loadUserData(newSession.user.id), 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      if (existing?.user) loadUserData(existing.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadUserData]);

  const signUp = useCallback(async (email: string, password: string, username: string, useLocalEmail = false) => {
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_\-.]/g, "");
    const localPart = cleanUsername || `user-${Date.now()}`;
    const authEmail = useLocalEmail ? `${localPart}@dardashati.local` : email;
    const { error } = await supabase.auth.signUp({
      email: authEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { username: username.trim(), display_name: username.trim() },
      },
    });
    return { error };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadUserData(user.id);
  }, [user, loadUserData]);

  return (
    <AuthContext.Provider
      value={{
        user, session, profile, roles,
        isAdmin: roles.includes("admin"),
        loading,
        signUp, signIn, signOut, refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

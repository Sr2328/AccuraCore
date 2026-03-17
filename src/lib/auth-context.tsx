import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type UserRole =
  | "admin"
  | "hr"
  | "security"
  | "procurement"
  | "employee"
  | "toolroom_high"
  | "moulding_high"
  | "ref_person"
  | "store"
  | "accountant"
  | "cad_cam"
  | "tool_room_head";

export interface User {
  user_id_custom: string;
  id: string;
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  departmentId?: string;
  profilePic?: string;
}

interface AuthContextType {
  user: User | null;
  login: (userId: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

// ─────────────────────────────────────────────
// Fetch user profile + role from Supabase
// ─────────────────────────────────────────────

async function fetchUserProfile(supabaseUser: SupabaseUser): Promise<User | null> {
  try {
    // Ensure session is active before querying (fixes RLS timing issues post-login)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error("fetchUserProfile: No active session — cannot query protected tables.");
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*, departments(name)")
      .eq("id", supabaseUser.id)
      .maybeSingle();

    if (profileError) {
      // Now shows code + details, not just message
      console.error("Profile fetch error:", profileError.code, profileError.message, profileError.details);
      return null;
    }

    if (!profile) {
      console.error(
        `No profile row for auth user ${supabaseUser.id} (${supabaseUser.email}). ` +
        `Ensure a row exists in 'profiles' with id = '${supabaseUser.id}'.`
      );
      return null;
    }

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", supabaseUser.id)
      .maybeSingle();

    if (roleError) {
      console.error("Role fetch error:", roleError.code, roleError.message, roleError.details);
    }

    const deptName = (profile as any).departments?.name;

    return {
      id: supabaseUser.id,
      userId: profile.user_id_custom,
      name: profile.name,
      email: profile.email || supabaseUser.email || "",
      role: (roleData?.role as UserRole) || "employee",
      department: deptName || undefined,
      departmentId: profile.department_id || undefined,
      profilePic: profile.profile_pic_url || undefined,
    };
  } catch (err) {
    console.error("Unexpected error in fetchUserProfile:", (err as Error).message);
    return null;
  }
}

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

// ─────────────────────────────────────────────
// AuthProvider
// ─────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Prevent double-initialization from both getSession + onAuthStateChange
  const initialized = useRef(false);

  useEffect(() => {
    // Step 1: Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth event:", event);

        if (session?.user) {
          // Use setTimeout to prevent Supabase internal deadlock
          setTimeout(async () => {
            const profile = await fetchUserProfile(session.user);
            console.log("Fetched profile on auth change:", profile);
            setUser(profile);
            setLoading(false);
            initialized.current = true;
          }, 0);
        } else {
          setUser(null);
          setLoading(false);
          initialized.current = true;
        }
      }
    );

    // Step 2: Check for existing session on mount
    // Only set loading=false here if onAuthStateChange hasn't already done it
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && !initialized.current) {
        // No session and auth state change hasn't fired yet
        setLoading(false);
        initialized.current = true;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ─────────────────────────────────────────────
  // Login
  // ─────────────────────────────────────────────

  const login = useCallback(async (userId: string, password: string): Promise<boolean> => {
    try {
      let email = userId.trim();

      // If not an email, look up email by custom user ID
      if (!email.includes("@")) {
        const { data: profileData, error: lookupError } = await supabase
          .from("profiles")
          .select("email")
          .ilike("user_id_custom", email)
          .maybeSingle();

        if (lookupError) {
          console.error("User ID lookup error:", lookupError.message);
          return false;
        }

        if (!profileData?.email) {
          console.warn("No account found for User ID:", userId);
          return false;
        }

        email = profileData.email;
      }

      // Attempt Supabase login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Supabase login error:", error.message);
        return false;
      }

      if (!data.user) {
        console.error("Login succeeded but no user returned");
        return false;
      }

      // Immediately fetch and set profile so navigation happens without delay
      const profile = await fetchUserProfile(data.user);
      console.log("Profile after login:", profile);

      if (!profile) {
        console.error("Could not load user profile after login");
        return false;
      }

      setUser(profile);
      return true;
    } catch (err) {
      console.error("Unexpected login error:", (err as Error).message);
      return false;
    }
  }, []);

  // ─────────────────────────────────────────────
  // Logout
  // ─────────────────────────────────────────────

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Logout error:", (err as Error).message);
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─────────────────────────────────────────────
// Hooks & Helpers
// ─────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function getRoleDashboardPath(role: UserRole): string {
  const map: Record<UserRole, string> = {
    admin: "/admin",
    hr: "/hr",
    security: "/security",
    procurement: "/procurement",
    employee: "/employee",
    toolroom_high: "/admin",
    moulding_high: "/admin",
    ref_person: "/procurement",
    store: "/store",
    accountant: "/hr",
    cad_cam: "/employee",
    tool_room_head: "/admin",
  };
  return map[role] ?? "/employee";
}

export function getRoleLabel(role: UserRole): string {
  const map: Record<UserRole, string> = {
    admin: "Administrator",
    hr: "HR Manager",
    security: "Security",
    procurement: "Procurement",
    employee: "Employee",
    toolroom_high: "Tool Room Authority",
    moulding_high: "Moulding Authority",
    ref_person: "Ref Person",
    store: "Store Manager",
    accountant: "Accountant",
    cad_cam: "CAD/CAM",
    tool_room_head: "Tool Room Head",
  };
  return map[role] ?? role;
}
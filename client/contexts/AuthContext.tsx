import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  pendingVerification: boolean;
  pendingEmail: string | null;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  checkEmailVerification: () => Promise<boolean>;
  cancelVerification: () => void;
  resendVerificationEmail: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // If user verified their email, clear pending state
      if (event === "SIGNED_IN" && session?.user?.email_confirmed_at) {
        setPendingVerification(false);
        setPendingEmail(null);
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
      });

      if (!error && data.user && !data.user.email_confirmed_at) {
        // User created but needs email verification
        setPendingVerification(true);
        setPendingEmail(email);
      }

      return { error: error as Error | null };
    } catch (e) {
      console.error("Sign up network error:", e);
      return {
        error: new Error(
          "Network request failed. Please check your internet connection.",
        ),
      };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error as Error | null };
    } catch (e) {
      console.error("Sign in network error:", e);
      return {
        error: new Error(
          "Network request failed. Please check your internet connection.",
        ),
      };
    }
  }, []);

  const signOut = useCallback(async () => {
    setPendingVerification(false);
    setPendingEmail(null);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    await supabase.auth.signOut();
  }, []);

  const checkEmailVerification = useCallback(async () => {
    if (!pendingEmail) return false;

    try {
      // Try to sign in - if email is verified, this will work
      const { data, error } = await supabase.auth.getSession();

      if (!error && data.session?.user?.email_confirmed_at) {
        setPendingVerification(false);
        setPendingEmail(null);
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }, [pendingEmail]);

  const cancelVerification = useCallback(() => {
    setPendingVerification(false);
    setPendingEmail(null);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (!pendingEmail) {
      return { error: new Error("No pending email to resend to") };
    }

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: pendingEmail,
      });
      return { error: error as Error | null };
    } catch (e) {
      console.error("Resend verification error:", e);
      return { error: new Error("Failed to resend verification email") };
    }
  }, [pendingEmail]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        pendingVerification,
        pendingEmail,
        signUp,
        signIn,
        signOut,
        checkEmailVerification,
        cancelVerification,
        resendVerificationEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

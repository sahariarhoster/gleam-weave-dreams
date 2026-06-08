import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }
      supabase.auth.getSession().then(({ data: sessionData }) => {
        setSession(sessionData.session);
        setUser(data.user);
        setLoading(false);
      });
    }).catch(() => {
      setSession(null);
      setUser(null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user, loading };
}

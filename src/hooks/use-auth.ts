import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = { session: Session | null; user: User | null; loading: boolean };

let authState: AuthState = { session: null, user: null, loading: true };
let initialized = false;
const listeners = new Set<(state: AuthState) => void>();

function emit(next: AuthState) {
  authState = next;
  listeners.forEach((listener) => listener(authState));
}

function initializeAuth() {
  if (initialized) return;
  initialized = true;

  supabase.auth.onAuthStateChange((_event, session) => {
    emit({ session, user: session?.user ?? null, loading: false });
  });

  supabase.auth
    .getSession()
    .then(({ data }) => emit({ session: data.session, user: data.session?.user ?? null, loading: false }))
    .catch(() => emit({ session: null, user: null, loading: false }));
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(authState);

  useEffect(() => {
    initializeAuth();
    listeners.add(setState);
    setState(authState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return state;
}

import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase.js";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      
      // Broadcast to extension
      window.postMessage({ 
        type: 'JOBSA_AUTH_SYNC', 
        token: session?.access_token || null 
      }, '*');
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      
      // Broadcast to extension
      window.postMessage({ 
        type: 'JOBSA_AUTH_SYNC', 
        token: session?.access_token || null 
      }, '*');
    });

    // Listen for extension requesting token (in case it loaded after mount)
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'JOBSA_AUTH_REQUEST') {
        supabase.auth.getSession().then(({ data: { session } }) => {
          window.postMessage({ 
            type: 'JOBSA_AUTH_SYNC', 
            token: session?.access_token || null 
          }, '*');
        });
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

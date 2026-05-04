// Auth wrapper — accepts a Supabase client via DI.

export function makeAuth(supabase) {
  let currentSession = null;
  const listeners = new Set();

  // Subscribe to auth changes from Supabase
  supabase.auth.onAuthStateChange((event, session) => {
    currentSession = session;
    listeners.forEach(fn => { try { fn(event, session); } catch (e) { console.error(e); } });
  });

  return {
    async signInWithMagicLink(email, redirectTo) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo ?? window.location.origin },
      });
      if (error) throw error;
      return true;
    },

    async signOut() {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return true;
    },

    async getSession() {
      const { data } = await supabase.auth.getSession();
      currentSession = data.session;
      return data.session;
    },

    isLoggedIn() {
      return !!currentSession;
    },

    getUser() {
      return currentSession?.user ?? null;
    },

    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

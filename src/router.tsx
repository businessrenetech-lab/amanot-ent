// ============================================================================
// Tiny client-side router (no dependency). Three routes are used:
//   /         -> public storefront (landing)
//   /login    -> admin login
//   /admin    -> ERP back-office (protected)
// ============================================================================
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface RouterCtx {
  path: string;
  navigate: (to: string) => void;
}

const Ctx = createContext<RouterCtx>({ path: '/', navigate: () => {} });

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [path, setPath] = useState<string>(
    typeof window !== 'undefined' ? window.location.pathname || '/' : '/',
  );

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname || '/');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: string) => {
    if (to !== window.location.pathname) {
      window.history.pushState({}, '', to);
      setPath(to);
      window.scrollTo(0, 0);
    }
  }, []);

  return <Ctx.Provider value={{ path, navigate }}>{children}</Ctx.Provider>;
};

export const useRouter = () => useContext(Ctx);

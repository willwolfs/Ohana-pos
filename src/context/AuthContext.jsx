import React, { createContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import supabase from '../services/supabaseClient';
import { safeSetItem, purgeOversizedCache } from '../utils/storageUtils';

export const AuthContext = createContext(null);

// 1 hora de inactividad en milisegundos (60 min * 60 seg * 1000 ms)
const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;
const LAST_ACTIVITY_KEY = 'ohana_last_activity_timestamp';
const SESSION_EXPIRED_KEY = 'ohana_session_expired';

// Helper para comprobar si la sesión caducó por inactividad
const checkHasExpired = () => {
  const storedLastActivity = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || '0', 10);
  if (!storedLastActivity) return false;
  return Date.now() - storedLastActivity >= INACTIVITY_TIMEOUT_MS;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Purgar cualquier dato residual que exceda el tamaño razonable
    purgeOversizedCache();

    // Si ya pasaron más de 60 min de inactividad, no restaurar sesión y marcar expirado
    if (checkHasExpired()) {
      localStorage.setItem(SESSION_EXPIRED_KEY, 'true');
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      localStorage.removeItem('ohana_user');
      localStorage.removeItem('ohana_token');
      authService.logout().catch(() => {});
      return null;
    }

    const saved = localStorage.getItem('ohana_user');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      if (parsed.id === 'usr-1') {
        localStorage.removeItem('ohana_user');
        localStorage.removeItem('ohana_token');
        return null;
      }
      if (!parsed.avatar_url) {
        try {
          const map = JSON.parse(localStorage.getItem('ohana_user_avatars_cache') || '{}');
          parsed.avatar_url =
            map[parsed.id] ||
            map[parsed.email] ||
            (parsed.email && map[parsed.email.toLowerCase()]) ||
            null;
        } catch {
          // ignore
        }
      }
      return parsed;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async (isExpiredByInactivity = false) => {
    if (isExpiredByInactivity) {
      localStorage.setItem(SESSION_EXPIRED_KEY, 'true');
    }
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    setUser(null);
    await authService.logout();
  }, []);

  // 1. Sincronizar sesión con Supabase Auth
  useEffect(() => {
    let isMounted = true;

    // Si la sesión ya caducó por inactividad, forzar logout inmediato sin consultar Supabase
    if (checkHasExpired()) {
      logout(true);
      setLoading(false);
      return;
    }

    authService.getCurrentUser().then((currentUser) => {
      if (isMounted) {
        if (checkHasExpired()) {
          logout(true);
        } else {
          setUser(currentUser);
          if (currentUser && !localStorage.getItem(LAST_ACTIVITY_KEY)) {
            safeSetItem(LAST_ACTIVITY_KEY, Date.now().toString());
          }
        }
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      // Si caducó por inactividad, ignorar eventos automáticos de Supabase (ej. INITIAL_SESSION)
      if (checkHasExpired()) {
        logout(true);
        return;
      }

      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        let avatar = profile?.avatar_url || null;
        if (!avatar) {
          try {
            const map = JSON.parse(localStorage.getItem('ohana_user_avatars_cache') || '{}');
            avatar = map[session.user.id] || map[session.user.email] || null;
          } catch {
            // ignore
          }
        }

        const userObj = {
          id: session.user.id,
          email: session.user.email,
          name: profile?.name || session.user.user_metadata?.name || session.user.email?.split('@')[0],
          role: profile?.role || session.user.user_metadata?.role || 'ADMIN',
          avatar_url: avatar,
        };
        setUser(userObj);
        safeSetItem('ohana_user', JSON.stringify(userObj));

        // Solo actualizar el timestamp si fue un inicio de sesión explícito
        // o si no existía ningún timestamp previo registrado
        if (event === 'SIGNED_IN' || !localStorage.getItem(LAST_ACTIVITY_KEY)) {
          safeSetItem(LAST_ACTIVITY_KEY, Date.now().toString());
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('ohana_user');
        localStorage.removeItem('ohana_token');
        localStorage.removeItem(LAST_ACTIVITY_KEY);
      }
    });

    const handleAvatarUpdated = (e) => {
      const { idOrEmail, avatarUrl } = e.detail || {};
      setUser((prev) => {
        if (!prev) return null;
        if (
          prev.id === idOrEmail ||
          prev.email === idOrEmail ||
          (prev.email && typeof idOrEmail === 'string' && prev.email.toLowerCase() === idOrEmail.toLowerCase())
        ) {
          const updated = { ...prev, avatar_url: avatarUrl };
          safeSetItem('ohana_user', JSON.stringify(updated));
          return updated;
        }
        return prev;
      });
    };
    window.addEventListener('ohana_avatar_updated', handleAvatarUpdated);

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
      window.removeEventListener('ohana_avatar_updated', handleAvatarUpdated);
    };
  }, [logout]);

  // 2. Control de Inactividad de 1 hora
  useEffect(() => {
    if (!user) return;

    // Verificar inmediatamente al cargar si ya transcurrió más de 1 hora
    const checkExpiration = () => {
      if (checkHasExpired()) {
        logout(true);
        return true;
      }
      return false;
    };

    if (checkExpiration()) return;

    // Si no había timestamp previo, establecer ahora
    if (!localStorage.getItem(LAST_ACTIVITY_KEY)) {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    }

    // Registrar actividad del usuario (throttled a cada 10s para rendimiento)
    let lastWriteTime = Date.now();
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastWriteTime > 10000) {
        lastWriteTime = now;
        localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
      }
    };

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach((ev) => {
      window.addEventListener(ev, handleUserActivity, { passive: true });
    });

    // Revisar periódicamente cada 15 segundos si se alcanzó la hora de inactividad
    const timerInterval = setInterval(() => {
      checkExpiration();
    }, 15000);

    return () => {
      activityEvents.forEach((ev) => {
        window.removeEventListener(ev, handleUserActivity);
      });
      clearInterval(timerInterval);
    };
  }, [user, logout]);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const res = await authService.login(credentials);
      if (res.success) {
        setUser(res.user);
        localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
      }
      return res;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const res = await authService.register(userData);
      if (res.success && res.user) {
        setUser(res.user);
        localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
      }
      return res;
    } finally {
      setLoading(false);
    }
  };

  const updateCurrentUser = (fields) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...fields };
      safeSetItem('ohana_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateCurrentUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;

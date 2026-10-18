import supabase from './supabaseClient';
import { safeSetItem } from '../utils/storageUtils';

export const authService = {
  /**
   * Inicia sesión con correo y contraseña en Supabase Auth
   */
  login: async ({ email, password }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Obtener datos del perfil desde public.profiles
      let profile = null;
      try {
        const { data: p } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        profile = p;
      } catch {
        // ignore
      }

      // Obtener avatar de profiles o del caché local
      let avatar = profile?.avatar_url || null;
      if (!avatar) {
        try {
          const map = JSON.parse(localStorage.getItem('ohana_user_avatars_cache') || '{}');
          avatar =
            map[data.user.id] ||
            map[data.user.email] ||
            (data.user.email && map[data.user.email.toLowerCase()]) ||
            null;
        } catch {
          // ignore
        }
      }

      const userObject = {
        id: data.user.id,
        email: data.user.email,
        name: profile?.name || data.user.user_metadata?.name || email.split('@')[0],
        role: profile?.role || data.user.user_metadata?.role || 'ADMIN',
        avatar_url: avatar,
      };

      safeSetItem('ohana_user', JSON.stringify(userObject));
      safeSetItem('ohana_token', data.session?.access_token || '');

      return { success: true, user: userObject };
    } catch (err) {
      return { success: false, error: err.message || 'Error al conectar con Supabase' };
    }
  },

  /**
   * Registra una nueva cuenta (como el primer Administrador) en Supabase Auth
   */
  register: async ({ name, email, password, role = 'ADMIN' }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
            role,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Asegurar que el registro en profiles exista inmediatamente
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            name: name.trim(),
            email: email.trim(),
            role,
          });
        } catch (e) {
          console.warn('Profile upsert notice:', e);
        }

        const userObject = {
          id: data.user.id,
          email: data.user.email,
          name: name.trim(),
          role,
        };

        // Si Supabase no requiere confirmación de email, el usuario queda logueado de inmediato
        if (data.session) {
          safeSetItem('ohana_user', JSON.stringify(userObject));
          safeSetItem('ohana_token', data.session.access_token);
        }

        return {
          success: true,
          user: userObject,
          requiresEmailConfirmation: !data.session,
        };
      }

      return { success: false, error: 'No se pudo crear el usuario' };
    } catch (err) {
      return { success: false, error: err.message || 'Error en el registro' };
    }
  },

  /**
   * Obtiene la sesión y usuario actual de Supabase
   */
  getCurrentUser: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      let avatar = profile?.avatar_url || null;
      if (!avatar) {
        try {
          const map = JSON.parse(localStorage.getItem('ohana_user_avatars_cache') || '{}');
          avatar =
            map[session.user.id] ||
            map[session.user.email] ||
            (session.user.email && map[session.user.email.toLowerCase()]) ||
            null;
        } catch {
          // ignore
        }
      }

      return {
        id: session.user.id,
        email: session.user.email,
        name: profile?.name || session.user.user_metadata?.name || session.user.email?.split('@')[0],
        role: profile?.role || session.user.user_metadata?.role || 'ADMIN',
        avatar_url: avatar,
      };
    } catch {
      return null;
    }
  },

  /**
   * Cierra sesión
   */
  logout: async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    } finally {
      localStorage.removeItem('ohana_token');
      localStorage.removeItem('ohana_user');
    }
    return true;
  },
};

export default authService;

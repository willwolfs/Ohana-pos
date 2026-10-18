import { createClient } from '@supabase/supabase-js';
import supabase from './supabaseClient';
import { safeSetItem } from '../utils/storageUtils';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 'https://zcpcvdtzwvuotginbxsh.supabase.co';
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 'sb_publishable__OHeiUeSbun_kMBO4eejxw_g7VoNRmg';

// In-memory dummy storage to prevent GoTrueClient multiple instances warning
const memoryStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

// Cliente secundario aislado en memoria (Singleton para evitar múltiples GoTrueClient)
let secondaryClientInstance = null;

const getSecondaryAuthClient = () => {
  if (!secondaryClientInstance) {
    secondaryClientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storageKey: 'sb-ohana-isolated-worker-auth',
        storage: memoryStorage,
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return secondaryClientInstance;
};

const AVATAR_STORAGE_KEY = 'ohana_user_avatars_cache';

const getLocalAvatars = () => {
  try {
    const raw = localStorage.getItem(AVATAR_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveLocalAvatar = (idOrEmail, avatarUrl) => {
  if (!idOrEmail) return;
  try {
    const map = getLocalAvatars();
    map[idOrEmail] = avatarUrl;
    if (typeof idOrEmail === 'string') {
      map[idOrEmail.toLowerCase()] = avatarUrl;
    }
    safeSetItem(AVATAR_STORAGE_KEY, JSON.stringify(map));

    // Si coincide con el usuario actualmente logueado, sincronizar de inmediato su sesión
    try {
      const curUserRaw = localStorage.getItem('ohana_user');
      if (curUserRaw) {
        const curUser = JSON.parse(curUserRaw);
        if (
          curUser.id === idOrEmail ||
          curUser.email === idOrEmail ||
          (curUser.email && typeof idOrEmail === 'string' && curUser.email.toLowerCase() === idOrEmail.toLowerCase())
        ) {
          curUser.avatar_url = avatarUrl;
          safeSetItem('ohana_user', JSON.stringify(curUser));
        }
      }
    } catch {
      // ignore
    }

    // Emitir evento global para que Navbar y vistas se actualicen inmediatamente sin recargar
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('ohana_avatar_updated', {
          detail: { idOrEmail, avatarUrl },
        })
      );
    }
  } catch {
    // ignore
  }
};

const removeLocalAvatar = (idOrEmail) => {
  if (!idOrEmail) return;
  try {
    const map = getLocalAvatars();
    delete map[idOrEmail];
    if (typeof idOrEmail === 'string') {
      delete map[idOrEmail.toLowerCase()];
    }
    localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(map));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('ohana_avatar_updated', {
          detail: { idOrEmail, avatarUrl: null },
        })
      );
    }
  } catch {
    // ignore
  }
};

export const usersService = {
  /**
   * Obtiene la lista completa de colaboradores desde Supabase profiles
   */
  async getUsers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching profiles:', error.message);
        return [];
      }

      const avatarMap = getLocalAvatars();

      return (data || []).map((u) => ({
        ...u,
        avatar_url:
          u.avatar_url ||
          avatarMap[u.id] ||
          avatarMap[u.email] ||
          (u.email && avatarMap[u.email.toLowerCase()]) ||
          null,
        status: u.is_active !== false ? 'Activo' : 'Inactivo',
      }));
    } catch (err) {
      console.error('usersService.getUsers error:', err);
      return [];
    }
  },

  /**
   * Crea un nuevo colaborador usando el cliente secundario de Supabase
   */
  async createUser({ name, email, password, role = 'CASHIER', phone = '', is_active = true, avatar_url = null }) {
    try {
      const cleanEmail = email.trim();
      const cleanName = name.trim();

      // 1. Crear en Supabase Auth con cliente aislado
      const secondaryAuthClient = getSecondaryAuthClient();
      const { data: authData, error: authError } = await secondaryAuthClient.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            name: cleanName,
            role,
          },
        },
      });

      if (authError) {
        throw new Error(authError.message || 'No se pudo crear el usuario en Supabase Auth');
      }

      const userId = authData?.user?.id;

      // 2. Guardar avatar en caché local si hay foto
      if (avatar_url) {
        if (userId) saveLocalAvatar(userId, avatar_url);
        saveLocalAvatar(cleanEmail, avatar_url);
      }

      // 3. Asegurar que los datos del perfil se guarden en public.profiles
      if (userId) {
        const profilePayload = {
          id: userId,
          name: cleanName,
          email: cleanEmail,
          role,
          phone: phone || null,
          is_active,
          updated_at: new Date().toISOString(),
        };

        // Intentar guardar con avatar_url si la columna existiera
        try {
          await supabase.from('profiles').upsert({
            ...profilePayload,
            avatar_url: avatar_url || null,
          });
        } catch {
          // Si avatar_url no existe como columna, guardar sin ella
          await supabase.from('profiles').upsert(profilePayload);
        }
      }

      return { success: true, user: authData.user };
    } catch (err) {
      return { success: false, error: err.message || 'Error al crear colaborador' };
    }
  },

  /**
   * Actualiza los datos de un colaborador existente
   */
  async updateUser(id, { name, role, phone, is_active, avatar_url, email }) {
    try {
      const updatePayload = {
        name: name.trim(),
        role,
        phone: phone || null,
        is_active,
        updated_at: new Date().toISOString(),
      };

      // Guardar avatar
      if (avatar_url !== undefined) {
        saveLocalAvatar(id, avatar_url);
        if (email) saveLocalAvatar(email, avatar_url);
      }

      let error = null;
      try {
        const res = await supabase
          .from('profiles')
          .update({
            ...updatePayload,
            avatar_url: avatar_url || null,
          })
          .eq('id', id);
        error = res.error;
      } catch {
        const res = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', id);
        error = res.error;
      }

      if (error) {
        // Reintentar sin avatar_url si la columna no existe
        const resFallback = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', id);
        if (resFallback.error) throw resFallback.error;
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Error al actualizar colaborador' };
    }
  },

  /**
   * Elimina un colaborador de la base de datos
   */
  async deleteUser(id, email) {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      removeLocalAvatar(id);
      if (email) removeLocalAvatar(email);

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Error al eliminar colaborador' };
    }
  },

  /**
   * Cambia la contraseña del colaborador
   * Si es el usuario actual, usa updateUser de Supabase.
   * Si es otro usuario, envía el enlace de reseteo oficial de Supabase.
   */
  async changePassword({ email, newPassword, isCurrentUser = false }) {
    try {
      if (isCurrentUser) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        return { success: true, message: 'Tu contraseña ha sido actualizada correctamente.' };
      }

      // Para colaboradores, enviar correo de reseteo o actualizar vía endpoint
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + '/login',
      });
      if (error) throw error;

      return {
        success: true,
        message: `Se ha enviado un enlace de restablecimiento seguro al correo ${email}.`,
      };
    } catch (err) {
      return { success: false, error: err.message || 'Error al cambiar la contraseña' };
    }
  },
};

export default usersService;

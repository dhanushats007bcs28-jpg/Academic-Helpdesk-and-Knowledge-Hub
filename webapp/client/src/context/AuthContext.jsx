
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api, { errText } from '../api/client.js';

const AuthContext = createContext(null);

function getStoredUser() {
  try {
    const raw = localStorage.getItem('ah_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem('ah_user');
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      try {
        const token = localStorage.getItem('ah_token');

        if (!token) {
          if (active) setUser(null);
          localStorage.removeItem('ah_user');
          return;
        }

        const { data } = await api.get('/auth/me');

        if (!active) return;

        setUser(data.user);
        localStorage.setItem('ah_user', JSON.stringify(data.user));
      } catch (error) {
        if (!active) return;

        localStorage.removeItem('ah_token');
        localStorage.removeItem('ah_user');
        setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    checkSession();

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });

      localStorage.setItem('ah_token', data.token);
      localStorage.setItem('ah_user', JSON.stringify(data.user));
      setUser(data.user);

      toast.success(`Welcome back, ${data.user.name.split(' ')[0]}!`);
      return data.user;
    } catch (error) {
      toast.error(errText(error));
      throw error;
    }
  }, []);

  const register = useCallback(async (payload) => {
    try {
      const { data } = await api.post('/auth/register', payload);

      localStorage.setItem('ah_token', data.token);
      localStorage.setItem('ah_user', JSON.stringify(data.user));
      setUser(data.user);

      toast.success('Account created');
      return data.user;
    } catch (error) {
      toast.error(errText(error));
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ah_token');
    localStorage.removeItem('ah_user');
    setUser(null);
    toast.success('Signed out');
  }, []);

  const homeFor = useCallback((role) => {
    if (role === 'admin') return '/admin';
    if (role === 'hod') return '/hod';
    if (role === 'faculty') return '/faculty';
    return '/student';
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, login, register, logout, homeFor }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api, { errText } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('ah_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ah_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem('ah_user', JSON.stringify(data.user));
      })
      .catch(() => {
        localStorage.removeItem('ah_token');
        localStorage.removeItem('ah_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('ah_token', data.token);
      localStorage.setItem('ah_user', JSON.stringify(data.user));
      setUser(data.user);
      toast.success(`Welcome back, ${data.user.name.split(' ')[0]}!`);
      return data.user;
    } catch (e) {
      toast.error(errText(e));
      throw e;
    }
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('ah_token', data.token);
    localStorage.setItem('ah_user', JSON.stringify(data.user));
    setUser(data.user);
    toast.success('Account created');
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ah_token');
    localStorage.removeItem('ah_user');
    setUser(null);
    toast.success('Signed out');
  }, []);

  const homeFor = (role) =>
    role === 'admin' ? '/admin' : role === 'hod' ? '/hod' : role === 'faculty' ? '/faculty' : '/student';

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, homeFor }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  const login = async (employeeId, password) => {
    const data = await api.login(employeeId, password);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify({
      employeeId: data.employeeId,
      name: data.name,
      role: data.role,
    }));
    setUser({ employeeId: data.employeeId, name: data.name, role: data.role });
    return data.role;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
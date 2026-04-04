import React, { createContext, useContext, useState, useEffect } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  changeCredentials: (newUsername: string, newPassword: string) => void;
  username: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEFAULT_CREDS = { username: "admin", password: "1234" };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [creds, setCreds] = useState(() => {
    const stored = localStorage.getItem("edulab_creds");
    return stored ? JSON.parse(stored) : DEFAULT_CREDS;
  });

  useEffect(() => {
    const session = sessionStorage.getItem("edulab_session");
    if (session === "true") setIsAuthenticated(true);
  }, []);

  const login = (username: string, password: string): boolean => {
    if (username === creds.username && password === creds.password) {
      setIsAuthenticated(true);
      sessionStorage.setItem("edulab_session", "true");
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("edulab_session");
  };

  const changeCredentials = (newUsername: string, newPassword: string) => {
    const newCreds = { username: newUsername, password: newPassword };
    setCreds(newCreds);
    localStorage.setItem("edulab_creds", JSON.stringify(newCreds));
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, changeCredentials, username: creds.username }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

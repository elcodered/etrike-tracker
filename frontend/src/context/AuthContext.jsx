import { createContext, useContext, useEffect, useState } from "react";
import { api, get, post } from "../api/client";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    get("me")
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const id = api.interceptors.response.use(
      (r) => r,
      (e) => {
        if (e.response?.status === 401) setUser(null);
        return Promise.reject(e);
      },
    );
    return () => api.interceptors.response.eject(id);
  }, []);
  async function login(email, password) {
    await api.get("/sanctum/csrf-cookie");
    const r = await post("login", { email, password });
    setUser(r.user);
  }
  async function logout() {
    await post("logout");
    setUser(null);
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAdmin: user?.role === "admin",
        canEdit: ["admin", "operator"].includes(user?.role),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);

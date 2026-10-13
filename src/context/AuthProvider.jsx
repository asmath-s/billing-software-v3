import { useState } from "react";
import { AuthContext } from "./auth-context";

const safeJsonParse = (str, fallback = null) => {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    return safeJsonParse(localStorage.getItem("user"), null);
  });

  const [role, setRole] = useState(() => {
    return localStorage.getItem("role") || null;
  });

  const [showOverview, setShowOverview] = useState(() => {
    const storedValue = localStorage.getItem("showOverview");
    if (storedValue === null) {
      return false;
    }
    return safeJsonParse(storedValue, false);
  });

  const login = (data) => {
    if (!data) return;
    const userData = data.user || data;
    localStorage.setItem("jwt", data.jwt);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("role", data.role);

    setUser(userData);
    setRole(data.role);
  };

  const logout = () => {
    localStorage.removeItem("jwt");
    localStorage.removeItem("user");
    localStorage.removeItem("role");

    setUser(null);
    setRole(null);
  };

  const toggleOverview = () => {
    setShowOverview((prev) => {
      const newValue = !prev;
      localStorage.setItem("showOverview", JSON.stringify(newValue));
      return newValue;
    });
  };

  const canViewOverview =
    role !== "authenticated" &&
    role !== "Authenticated" &&
    role !== null;

  const effectiveShowOverview = canViewOverview ? showOverview : false;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        showOverview: effectiveShowOverview,
        canViewOverview,
        login,
        logout,
        toggleOverview,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;

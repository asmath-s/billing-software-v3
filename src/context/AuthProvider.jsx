import { useState } from "react";
import { AuthContext } from "./auth-context";

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [role, setRole] = useState(() => {
    return localStorage.getItem("role") || null;
  });

  const [showOverview, setShowOverview] = useState(() => {
    const storedValue = localStorage.getItem("showOverview");

    if (storedValue === null) {
      return false;
    }

    return JSON.parse(storedValue);
  });

  const login = (data) => {
    localStorage.setItem("jwt", data.jwt);
    localStorage.setItem("user", JSON.stringify(data));
    localStorage.setItem("role", data.role);

    setUser(data.user);
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

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        showOverview,
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

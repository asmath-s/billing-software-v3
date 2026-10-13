import { Navigate } from "react-router-dom";
import { useAuth } from "../context/auth-context";

/**
 * Route protection guard that checks authentication and role permissions.
 * Redirects unauthenticated or unauthorized users to the login route.
 */
export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { role, user } = useAuth();
  const token = typeof window !== "undefined" ? localStorage.getItem("jwt") : null;

  // Unauthenticated check
  if (!token && !user) {
    return <Navigate to="/" replace />;
  }

  // Role permissions check
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && role) {
    const isAllowed = allowedRoles.some(
      (r) => String(r).toLowerCase() === String(role).toLowerCase(),
    );

    if (!isAllowed) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;

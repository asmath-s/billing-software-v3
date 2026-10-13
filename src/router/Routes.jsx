import { appConfig, ROLES } from "../config/appConfig";
import LoginPage from "../pages/Login";
import NotFound from "../pages/NotFound";
import { elementMap } from "./elementMap";
import { LOGIN } from "./paths";
import ProtectedRoute from "./ProtectedRoute";

const buildRoutes = () => {
  const routes = [];
  routes.push({
    path: LOGIN,
    element: <LoginPage />,
  });

  appConfig.forEach((item) => {
    // 🔹 Normal link
    if (item.type === "link") {
      const Component = elementMap[item.elementKey];

      if (Component) {
        routes.push({
          path: item.path,
          element: (
            <ProtectedRoute allowedRoles={item.roles}>
              <Component />
            </ProtectedRoute>
          ),
        });
      }
    }

    // 🔹 Submenu children
    if (item.type === "submenu") {
      item.children.forEach((child) => {
        const Component = elementMap[child.elementKey];

        if (Component) {
          routes.push({
            path: child.path,
            element: (
              <ProtectedRoute allowedRoles={child.roles}>
                <Component />
              </ProtectedRoute>
            ),
          });
        }
      });
    }
  });

  // 🔹 Standalone detail routes (Purchase History Customer Bills - Admin only)
  routes.push({
    path: "/purshistory/local/:customerId",
    element: (
      <ProtectedRoute allowedRoles={[ROLES.Admin, "admin"]}>
        <elementMap.LocalPurchaseHistoryDetail />
      </ProtectedRoute>
    ),
  });
  routes.push({
    path: "/purshistory/gst/:customerId",
    element: (
      <ProtectedRoute allowedRoles={[ROLES.Admin, "admin"]}>
        <elementMap.GstPurchaseHistoryDetail />
      </ProtectedRoute>
    ),
  });

  // 🔹 Not Found
  routes.push({
    path: "*",
    element: <NotFound />,
  });

  return routes;
};

export const routes = buildRoutes();

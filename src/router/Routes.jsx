import { appConfig } from "../config/appConfig";
import LoginPage from "../pages/Login";
import NotFound from "../pages/NotFound";
import { elementMap } from "./elementMap";
import { LOGIN } from "./paths";

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
          element: <Component />,
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
            element: <Component />,
          });
        }
      });
    }
  });

  // 🔹 Standalone detail routes (Purchase History Customer Bills)
  routes.push({
    path: "/purshistory/local/:customerId",
    element: <elementMap.LocalPurchaseHistoryDetail />,
  });
  routes.push({
    path: "/purshistory/gst/:customerId",
    element: <elementMap.GstPurchaseHistoryDetail />,
  });

  // 🔹 Not Found
  routes.push({
    path: "*",
    element: <NotFound />,
  });

  return routes;
};

export const routes = buildRoutes();

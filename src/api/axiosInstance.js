import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_APP_BACKEND_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000,
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("jwt");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle unauthorized session expiry
    if (error.response?.status === 401) {
      const currentToken = localStorage.getItem("jwt");
      if (currentToken) {
        localStorage.removeItem("jwt");
        localStorage.removeItem("user");
        localStorage.removeItem("role");

        if (typeof window !== "undefined" && window.location.pathname !== "/") {
          window.location.href = "/";
        }
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;

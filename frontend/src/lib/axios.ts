import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Crucial for HttpOnly refresh tokens
});

// Request interceptor to add access token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh or auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh the token using the refresh token (sent automatically via cookies)
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { accessToken } = response.data;
        localStorage.setItem("accessToken", accessToken);

        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, log out the user
        localStorage.removeItem("accessToken");
        // We could also redirect to login here, but better handled in AuthContext
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

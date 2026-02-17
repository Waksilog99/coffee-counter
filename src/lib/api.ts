
// Simple utility to get the API base URL
// In production, this will be empty (relative path)
// In development, Vite proxy will handle it
export const API_BASE_URL = "";

export const getApiUrl = (endpoint: string) => {
    return `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

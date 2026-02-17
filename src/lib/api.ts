
// Simple utility to get the API base URL
// In production, this will be empty (relative path)
// In development, Vite proxy will handle it
export const API_BASE_URL = "";

// Debug log to confirm new code is running
console.log("[App Version] v2.0 - Forced Relative Path", new Date().toISOString());

export const getApiUrl = (endpoint: string) => {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    console.log(`[API Debug] Resolved URL for ${endpoint}:`, url, "Base:", API_BASE_URL);
    return url;
};

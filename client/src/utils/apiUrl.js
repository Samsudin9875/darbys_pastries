const configuredBaseUrl = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");

export function apiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!configuredBaseUrl) return normalizedPath;
  return `${configuredBaseUrl}${normalizedPath.replace(/^\/api(?=\/|$)/, "")}`;
}

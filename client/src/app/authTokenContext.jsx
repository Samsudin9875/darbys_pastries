import { useAuth } from "@clerk/react";
import { AuthTokenContext } from "./authToken";

export function ClerkAuthTokenProvider({ children }) {
  const { getToken } = useAuth();
  return <AuthTokenContext.Provider value={getToken}>{children}</AuthTokenContext.Provider>;
}

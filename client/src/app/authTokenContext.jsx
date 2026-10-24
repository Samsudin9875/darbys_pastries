import { createContext, useContext } from "react";
import { useAuth } from "@clerk/react";

const AuthTokenContext = createContext(async () => null);

export function ClerkAuthTokenProvider({ children }) {
  const { getToken } = useAuth();
  return <AuthTokenContext.Provider value={getToken}>{children}</AuthTokenContext.Provider>;
}

export function useAuthToken() {
  return useContext(AuthTokenContext);
}

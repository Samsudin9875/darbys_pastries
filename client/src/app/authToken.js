import { createContext, useContext } from "react";

export const AuthTokenContext = createContext(async () => null);
export const useAuthToken = () => useContext(AuthTokenContext);

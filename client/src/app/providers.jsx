import { ClerkProvider } from "@clerk/react";
import { BrowserRouter } from "react-router-dom";

import ErrorBoundary from "../components/common/ErrorBoundary";
import { ClerkAuthTokenProvider } from "./authTokenContext";
import ScrollRestoration from "./ScrollRestoration";

export default function AppProviders({ children }) {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  const app = <ErrorBoundary><BrowserRouter><ScrollRestoration />{children}</BrowserRouter></ErrorBoundary>;

  if (!publishableKey) return app;

  return (
    <ErrorBoundary>
      <ClerkProvider publishableKey={publishableKey} signInUrl="/sign-in" signUpUrl="/sign-up" signInFallbackRedirectUrl="/" signUpFallbackRedirectUrl="/" appearance={{ variables: { colorPrimary: "#cf3037", colorText: "#24242a", colorBackground: "#ffffff", borderRadius: "0.75rem" } }}>
        <ClerkAuthTokenProvider>{app}</ClerkAuthTokenProvider>
      </ClerkProvider>
    </ErrorBoundary>
  );
}

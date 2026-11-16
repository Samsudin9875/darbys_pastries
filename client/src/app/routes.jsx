import { lazy, Suspense } from "react";
import { SignIn, SignUp } from "@clerk/react";
import { Navigate, Route, Routes } from "react-router-dom";

import NotFoundPage from "../pages/NotFoundPage";
import PolicyPage from "../pages/PolicyPage";
import StorefrontStateProvider from "../features/storefront/StorefrontStateProvider";

const HomePage = lazy(() => import("../pages/home/HomePage"));
const ProductDetailsPage = lazy(() => import("../pages/ProductDetailsPage"));

export default function AppRoutes() {
  return (
    <StorefrontStateProvider>
    <Routes>
      <Route path="/" element={<Suspense fallback={<main className="app-message" role="status">Loading storefront…</main>}><HomePage /></Suspense>} />
      <Route path="/category/:category" element={<Suspense fallback={<main className="app-message" role="status">Loading storefront...</main>}><HomePage /></Suspense>} />
      <Route path="/custom-cake" element={<Suspense fallback={<main className="app-message" role="status">Loading custom cake form…</main>}><HomePage /></Suspense>} />
      <Route path="/products/:id" element={<Suspense fallback={<main className="app-message" role="status">Loading product…</main>}><ProductDetailsPage /></Suspense>} />
      <Route path="/sign-in/*" element={<main className="auth-page"><section className="auth-intro"><p>WELCOME TO DARBY'S</p><h1>Your celebrations, all in one place.</h1><span>Sign in to view your orders, saved cakes and account details.</span></section><section className="auth-card"><SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl="/?account=1" /></section></main>} />
      <Route path="/sign-up/*" element={<main className="auth-page"><section className="auth-intro"><p>JOIN DARBY'S</p><h1>Fresh bakes for every milestone.</h1><span>Create an account to keep your celebrations close.</span></section><section className="auth-card"><SignUp routing="path" path="/sign-up" signInUrl="/sign-in" forceRedirectUrl="/?account=1" /></section></main>} />
      <Route path="/policies/:slug" element={<PolicyPage />} />
      <Route path="/legacy" element={<Navigate to="/" replace />} />
      <Route path="/preview/react-storefront" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </StorefrontStateProvider>
  );
}

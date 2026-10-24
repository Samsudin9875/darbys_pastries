import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="app-message" aria-labelledby="not-found-title">
      <p>404</p>
      <h1 id="not-found-title">This page could not be found.</h1>
      <Link to="/">Return to Darby&apos;s Pastries</Link>
    </main>
  );
}

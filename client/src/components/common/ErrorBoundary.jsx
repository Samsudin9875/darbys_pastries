import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("Application render error", error);
  }

  render() {
    if (this.state.hasError) {
      return <main className="app-message"><h1>Something went wrong.</h1><button type="button" onClick={() => window.location.reload()}>Reload page</button></main>;
    }
    return this.props.children;
  }
}

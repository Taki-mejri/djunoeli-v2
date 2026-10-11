import { StrictMode, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import "./i18n/config";
import App from "./App.tsx";
import { bootstrapAuth } from "./lib/authQueries";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,           // 30s avant qu'une donnée soit considérée "vieille"
      gcTime: 5 * 60 * 1000,          // garde en cache 5 min
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Ne retente pas un 401 ou 403
        const status =
          typeof error === "object" && error !== null && "response" in error
            ? (error as { response?: { status?: number } }).response?.status
            : undefined;
        if (status === 401 || status === 403) return false;
        return failureCount < 2;
      },
    },
  },
});

function Root() {
  // Guard against React StrictMode double-invocation which would rotate the
  // refresh token twice, revoking the first one and breaking auth on reload.
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    bootstrapAuth();
  }, []);

  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Root />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);

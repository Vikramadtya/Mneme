import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "sonner";

const queryClient = new QueryClient();

const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

if (
  (window as any).api &&
  (window as any).api.app &&
  (window as any).api.app.log
) {
  console.log = (...args) => {
    originalConsoleLog(...args);
    (window as any).api.app.log("info", ...args).catch(() => {});
  };
  console.warn = (...args) => {
    originalConsoleWarn(...args);
    (window as any).api.app.log("warn", ...args).catch(() => {});
  };
  console.error = (...args) => {
    originalConsoleError(...args);
    (window as any).api.app.log("error", ...args).catch(() => {});
  };
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  </StrictMode>,
);

import { AppProvider } from "./application/context";
import { AppContent } from "./components/AppContent";
import { Toaster } from "sonner";

export default function App() {
  return (
    <AppProvider>
      <AppContent />
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        duration={3500}
        toastOptions={{
          style: {
            background: "var(--color-zinc-900)",
            border: "1px solid var(--color-zinc-800)",
            color: "var(--color-zinc-100)",
          },
        }}
      />
    </AppProvider>
  );
}

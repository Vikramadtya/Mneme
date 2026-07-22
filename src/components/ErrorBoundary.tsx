import { Component, type ErrorInfo, type ReactNode } from "react";
import { ipc } from "../ipc";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    ipc.invoke("app:reportError", {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 m-4 flex flex-col items-center justify-center">
            <h2 className="font-bold mb-2">Something went wrong.</h2>
            <p className="text-sm mb-4">
              A component failed to render properly.
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium rounded-md transition-colors"
            >
              Try Again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

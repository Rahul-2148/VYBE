import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * RenderErrorBoundary — Reusable React Error Boundary for isolated subtrees.
 *
 * Prevents a single broken card, reel, story or post from crashing the entire app.
 */
export class RenderErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("⚠️ [RenderErrorBoundary caught an error]:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className={`p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 text-center flex flex-col items-center justify-center gap-2 ${this.props.className || ""}`}>
          <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-text">
            {this.props.title || "Unable to display this content"}
          </p>
          <p className="text-[11px] text-text-secondary max-w-xs line-clamp-2">
            {this.state.error?.message || "An unexpected error occurred while loading this view."}
          </p>
          <button
            onClick={this.handleReset}
            className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-rose-500/80 hover:bg-rose-500 rounded-full transition cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Try Again</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RenderErrorBoundary;

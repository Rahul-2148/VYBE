import React from "react";
import { Link } from "react-router-dom";
import { Compass, Home, ShieldAlert } from "lucide-react";

export const NotFoundPage = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 select-none font-sans text-center">
      <div className="max-w-md w-full space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto shadow-2xl shadow-purple-500/20">
          <Compass className="w-8 h-8 animate-spin-slow" />
        </div>

        <div className="space-y-1">
          <span className="text-6xl font-black font-['Outfit'] text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-rose-400">
            404
          </span>
          <h2 className="text-lg font-bold text-white font-['Outfit']">Administrative Desk Not Found</h2>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto">
            The operational view or resource route you requested is unavailable or has been relocated.
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-purple-600 hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-rose-500/25 transition cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Return to Command Console</span>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;

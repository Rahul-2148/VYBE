import React from "react";
import logo2 from "../assets/logo2.png";

export const RouteLoadingSpinner = () => (
  <div className="w-screen h-screen bg-bg flex flex-col items-center justify-center gap-3">
    <img src={logo2} alt="VYBE" className="w-16 object-contain animate-pulse" />
    <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
  </div>
);

export default RouteLoadingSpinner;

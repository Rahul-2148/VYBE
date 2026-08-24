import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import ToastContainer from "./ToastContainer";

export const AdminLayout = () => {
  return (
    <div className="flex min-h-screen bg-[#090b10] text-[#f3f4f6]">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area — Resizes smoothly with sidebar */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
        <Topbar />
        <main className="flex-1 p-3.5 sm:p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto space-y-5 sm:space-y-6 min-w-0">
          <Outlet />
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};

export default AdminLayout;

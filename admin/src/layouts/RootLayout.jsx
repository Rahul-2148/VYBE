import React from "react";
import { Outlet } from "react-router-dom";
import { AdminAuthProvider } from "../context/AdminAuthContext";
import { SoundProvider } from "../context/SoundContext";
import { AdminSocketProvider } from "../context/AdminSocketContext";
import { SidebarProvider } from "../context/SidebarContext";

/**
 * RootLayout — Top-level layout providing Admin Authentication, Sound Engine, WebSocket telemetry,
 * and Sidebar collapse state to all child routes in the application.
 */
export const RootLayout = () => {
  return (
    <AdminAuthProvider>
      <SoundProvider>
        <AdminSocketProvider>
          <SidebarProvider>
            <Outlet />
          </SidebarProvider>
        </AdminSocketProvider>
      </SoundProvider>
    </AdminAuthProvider>
  );
};

export default RootLayout;

import React, { useState, useEffect } from "react";
import api from "../lib/api";
import { toast } from "../lib/toast";
import { useAdminAuth } from "../context/AdminAuthContext";

// Role-specific dashboard views
import SuperAdminDashboardView from "../components/dashboards/SuperAdminDashboardView";
import AdminDashboardView from "../components/dashboards/AdminDashboardView";
import ModeratorDashboardView from "../components/dashboards/ModeratorDashboardView";
import SupportDashboardView from "../components/dashboards/SupportDashboardView";
import FinanceDashboardView from "../components/dashboards/FinanceDashboardView";

/**
 * Dashboard renders the appropriate view based on the authenticated user's role.
 * No switcher, no gimmicks. A moderator sees the moderator workspace. Period.
 */
export const Dashboard = () => {
  const { adminUser } = useAdminAuth();
  const [stats, setStats] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [growthData, setGrowthData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [overviewRes, growthRes] = await Promise.all([
          api.get("/overview"),
          api.get("/growth-analytics?days=14"),
        ]);

        if (overviewRes.data?.success) {
          setStats(overviewRes.data.stats);
          setRecentReports(overviewRes.data.recentReports || []);
        }

        if (growthRes.data?.success) {
          const userMap = {};
          const postMap = {};

          (growthRes.data.analytics?.userGrowth || []).forEach((u) => {
            userMap[u._id] = u.count;
          });
          (growthRes.data.analytics?.postGrowth || []).forEach((p) => {
            postMap[p._id] = p.count;
          });

          const allDates = Array.from(
            new Set([...Object.keys(userMap), ...Object.keys(postMap)])
          ).sort();

          setGrowthData(
            allDates.map((d) => ({
              date: d.slice(5),
              users: userMap[d] || 0,
              posts: postMap[d] || 0,
            }))
          );
        }
      } catch {
        toast.error("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const role = adminUser?.role;

  // Route to the correct dashboard based on authenticated role
  switch (role) {
    case "superadmin":
      return <SuperAdminDashboardView stats={stats} growthData={growthData} recentReports={recentReports} />;
    case "admin":
      return <AdminDashboardView stats={stats} growthData={growthData} recentReports={recentReports} />;
    case "moderator":
      return <ModeratorDashboardView stats={stats} recentReports={recentReports} />;
    case "support":
      return <SupportDashboardView stats={stats} />;
    case "finance":
      return <FinanceDashboardView />;
    default:
      return <AdminDashboardView stats={stats} growthData={growthData} recentReports={recentReports} />;
  }
};

export default Dashboard;

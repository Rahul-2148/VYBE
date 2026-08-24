import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { SoundProvider } from "./context/SoundContext";
import "./index.css";
import router from "./router/index.jsx";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "806066087982-6mp4ree3r9jnm2o8dsfdm3neoavg789r.apps.googleusercontent.com";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <SoundProvider>
        <RouterProvider router={router} />
      </SoundProvider>
    </GoogleOAuthProvider>
  </StrictMode>
);

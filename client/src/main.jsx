import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import store from "./redux/store.js";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ThemeProvider } from "./lib/theme.jsx";
import { SnackbarProvider } from "./context/SnackbarContext.jsx";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Provider store={store}>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <ThemeProvider defaultTheme="system">
          <SnackbarProvider>
            <App />
          </SnackbarProvider>
        </ThemeProvider>
      </GoogleOAuthProvider>
    </Provider>
  </BrowserRouter>
);

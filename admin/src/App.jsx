import React from "react";
import { RouterProvider } from "react-router-dom";
import router from "./router/index.jsx";

export const App = () => {
  return <RouterProvider router={router} />;
};

export default App;

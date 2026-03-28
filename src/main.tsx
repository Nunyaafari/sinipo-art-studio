import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { installSafeResponseJson } from "./lib/api";
import { initializeAnalytics } from "./lib/analytics";

installSafeResponseJson();
initializeAnalytics();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

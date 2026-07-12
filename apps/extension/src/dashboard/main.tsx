import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CollectionDashboard } from "./CollectionDashboard";
import "../shared/styles.css";
import "./collection-dashboard.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Dashboard root element was not found");
}

createRoot(root).render(
  <StrictMode>
    <CollectionDashboard />
  </StrictMode>,
);

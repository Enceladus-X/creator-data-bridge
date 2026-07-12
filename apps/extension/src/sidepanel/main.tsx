import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "../shared/styles.css";
import "./sidepanel.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Side panel root element was not found");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

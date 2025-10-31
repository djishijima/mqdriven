import React from "react";
import ReactDOM from "react-dom/client";
import App from "../App.tsx";
import ErrorBoundary from "./ErrorBoundary";

window.addEventListener("error",(e)=>{
  console.error("GlobalError:",e.error||e);
});
window.addEventListener("unhandledrejection",(e)=>{
  console.error("UnhandledRejection:", e.reason);
});

ReactDOM.createRoot(document.getElementById("root")!)
  .render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
import "./index.css";

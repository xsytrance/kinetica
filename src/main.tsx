import React from "react";
import ReactDOM from "react-dom/client";
import { MusicPlayerProvider } from "@/audio/player";
import { ThemeEngine } from "@/engine/ThemeEngine";
import { App } from "@/ui/App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MusicPlayerProvider>
      <ThemeEngine />
      <App />
    </MusicPlayerProvider>
  </React.StrictMode>,
);

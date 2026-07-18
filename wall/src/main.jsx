import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import ProjectPage from "./components/ProjectPage.jsx";
import EditPage from "./components/EditPage.jsx";
import "./index.css";

// HashRouter keeps deep links working from static hosting (ascii.dev) with no
// server rewrite: the wall lives at #/, a project at #/p/<id>, edit at #/edit.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/p/:id" element={<ProjectPage />} />
        <Route path="/edit" element={<EditPage mode="edit" />} />
        <Route path="/signup" element={<EditPage mode="signup" />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);

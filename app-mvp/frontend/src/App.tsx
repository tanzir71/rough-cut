import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import Project from "@/pages/Project";
import Editor from "@/pages/Editor";
import ExportPage from "@/pages/Export";
import Settings from "@/pages/Settings";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects/:projectId" element={<Project />} />
        <Route path="/projects/:projectId/editor" element={<Editor />} />
        <Route path="/projects/:projectId/export" element={<ExportPage />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
}

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import PlanList from "./pages/PlanList";
import PlanDetail from "./pages/PlanDetail";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/plans" element={<PlanList />} />
          <Route path="/plans/:id" element={<PlanDetail />} />
        </Route>
      </Routes>
    </Router>
  );
}

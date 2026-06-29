import { NavLink, Route, Routes } from "react-router-dom";
import GaragePage from "./pages/GaragePage";
import MotorcycleDetailPage from "./pages/MotorcycleDetailPage";
import ModelSearchPage from "./pages/ModelSearchPage";

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">🔧 Clank</span>
        <nav>
          <NavLink to="/" end>
            Garage
          </NavLink>
          <NavLink to="/search">Model Search</NavLink>
        </nav>
      </header>
      <main className="content">
        <Routes>
          <Route path="/" element={<GaragePage />} />
          <Route path="/motorcycles/:id" element={<MotorcycleDetailPage />} />
          <Route path="/search" element={<ModelSearchPage />} />
        </Routes>
      </main>
    </div>
  );
}

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import Home from "../components/Home";
import Dashboard from "../components/Dashboard";

export default function AppRouter({ activeChannel, setActiveChannel }) {
  const [user, setUser] = useState(null);

  // Khi app khởi chạy, lấy user từ localStorage (nếu có)
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home setUser={setUser} />} />
        <Route
          path="/dashboard"
          element={user ? <Dashboard user={user} activeChannel={activeChannel} setActiveChannel={setActiveChannel} /> : <Home setUser={setUser} />}
        />
      </Routes>
    </Router>
  );
}

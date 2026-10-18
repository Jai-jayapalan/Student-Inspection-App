import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './components/Auth';
import Dashboard from './layouts/Dashboard';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" /> : <Auth mode="login" setToken={setToken} />} />
        <Route path="/signup" element={token ? <Navigate to="/" /> : <Auth mode="signup" setToken={setToken} />} />
        <Route path="/" element={token ? <Dashboard setToken={setToken} /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}
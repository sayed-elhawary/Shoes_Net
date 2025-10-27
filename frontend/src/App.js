// frontend/src/App.js
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import VendorDashboard from './pages/VendorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Orders from './pages/Orders';
import CreateVendor from './pages/CreateVendor';
import CreateCustomer from './pages/CreateCustomer';
import Login from './pages/Login';
import VendorProducts from './pages/VendorProducts';
import Vendors from './pages/Vendors';
import Navbar from './components/Navbar';
import { useState, useEffect } from 'react';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if token exists in localStorage to determine authentication status
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);

    // Handler for both storage and custom authChange events
    const handleAuthChange = () => {
      const newToken = localStorage.getItem('token');
      setIsAuthenticated(!!newToken);
    };

    // Listen for storage events (cross-tab updates)
    window.addEventListener('storage', handleAuthChange);
    // Listen for custom authChange event (same-tab login/logout)
    window.addEventListener('authChange', handleAuthChange);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('authChange', handleAuthChange);
    };
  }, []);

  return (
    <Router>
      {isAuthenticated && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/vendor" element={<VendorDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/create-vendor" element={<CreateVendor />} />
        <Route path="/create-customer" element={<CreateCustomer />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/vendors/:vendorId/products" element={<VendorProducts />} />
      </Routes>
    </Router>
  );
}

export default App;

// frontend/src/App.js
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import VendorDashboard from './pages/VendorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Orders from './pages/Orders';
import CreateVendor from './pages/CreateVendor';
import CreateCustomer from './pages/CreateCustomer';
import BlockCustomer from './pages/BlockCustomer';
import Login from './pages/Login';
import VendorProducts from './pages/VendorProducts';
import Vendors from './pages/Vendors';
import Navbar from './components/Navbar';
import { useState, useEffect } from 'react';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    const handleAuthChange = () => {
      const token = localStorage.getItem('token');
      setIsAuthenticated(!!token);
    };

    // تحديث فوري عند التحميل
    handleAuthChange();

    // استماع للتغييرات
    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('authChange', handleAuthChange);

    return () => {
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('authChange', handleAuthChange);
    };
  }, []);

  return (
    <>
      {isAuthenticated && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/vendor" element={<VendorDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/create-vendor" element={<CreateVendor />} />
        <Route path="/create-customer" element={<CreateCustomer />} />
        <Route path="/block-customer" element={<BlockCustomer />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/vendors/:vendorId/products" element={<VendorProducts />} />
      </Routes>
    </>
  );
}

export default App;

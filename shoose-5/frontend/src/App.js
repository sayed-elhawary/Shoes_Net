import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import VendorDashboard from './pages/VendorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Orders from './pages/Orders';
import CreateVendor from './pages/CreateVendor';
import Login from './pages/Login';
import VendorProducts from './pages/VendorProducts'; // ← الجديد
import Navbar from './components/Navbar';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/vendor" element={<VendorDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/create-vendor" element={<CreateVendor />} />
        <Route path="/vendors/:vendorId/products" element={<VendorProducts />} /> {/* ← الجديد */}
      </Routes>
    </Router>
  );
}

export default App;

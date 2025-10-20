import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // تحديث حالة المستخدم عند التحميل الأولي أو تغيير localStorage
  useEffect(() => {
    const updateUser = () => {
      const token = localStorage.getItem('token');
      const userRole = localStorage.getItem('role');
      if (token && userRole) {
        setUser({ role: userRole });
      } else {
        setUser(null);
      }
    };

    // التحقق الأولي عند التحميل
    updateUser();

    // مراقبة تغييرات localStorage (على سبيل المثال، عند تسجيل الدخول في علامة تبويب أخرى)
    window.addEventListener('storage', updateUser);

    // تحديث يدوي كل ثانية للتأكد من تحديث فوري بعد تسجيل الدخول
    const interval = setInterval(updateUser, 1000);

    return () => {
      window.removeEventListener('storage', updateUser);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    setUser(null);
    setIsMobileMenuOpen(false); // إغلاق قائمة الهاتف عند تسجيل الخروج
    window.location.href = '/';
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const navItemVariants = {
    hover: {
      scale: 1.05,
      backgroundColor: 'rgba(59, 130, 246, 0.7)',
      transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
    },
    tap: {
      scale: 0.98,
      transition: { duration: 0.1, ease: 'easeOut' },
    },
  };

  return (
    <motion.nav
      className="bg-[#1F1F2E] text-white p-4 shadow-2xl border-b border-gray-700"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      style={{ willChange: 'opacity, transform' }}
    >
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold flex items-center">
          🛒 التجارة الإلكترونية
        </Link>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 rounded-lg focus:outline-none"
          onClick={toggleMobileMenu}
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>

        {/* Desktop Menu */}
        <div className="hidden md:flex space-x-6 space-x-reverse items-center">
          <Link
            to="/"
            className={`px-4 py-2 rounded-xl transition duration-200 ${
              location.pathname === '/' ? 'bg-blue-600/50' : 'hover:bg-blue-600/30'
            }`}
          >
            🏠 الرئيسية
          </Link>
          <Link
            to="/vendors"
            className={`px-4 py-2 rounded-xl transition duration-200 ${
              location.pathname === '/vendors' ? 'bg-blue-600/50' : 'hover:bg-blue-600/30'
            }`}
          >
            👥 التجار
          </Link>
          {(user?.role === 'admin' || user?.role === 'vendor') && (
            <Link
              to="/orders"
              className={`px-4 py-2 rounded-xl transition duration-200 ${
                location.pathname === '/orders' ? 'bg-blue-600/50' : 'hover:bg-blue-600/30'
              }`}
            >
              📦 الطلبات
            </Link>
          )}
          {user?.role === 'vendor' && (
            <Link
              to="/vendor"
              className={`px-4 py-2 rounded-xl transition duration-200 ${
                location.pathname === '/vendor' ? 'bg-blue-600/50' : 'hover:bg-blue-600/30'
              }`}
            >
              🏪 لوحة التاجر
            </Link>
          )}
          {user?.role === 'admin' && (
            <>
              <Link
                to="/admin"
                className={`px-4 py-2 rounded-xl transition duration-200 ${
                  location.pathname === '/admin' ? 'bg-blue-600/50' : 'hover:bg-blue-600/30'
                }`}
              >
                👨‍💼 لوحة الأدمن
              </Link>
              <Link
                to="/create-vendor"
                className={`px-4 py-2 rounded-xl transition duration-200 ${
                  location.pathname === '/create-vendor' ? 'bg-green-600/50' : 'hover:bg-green-600/30'
                }`}
              >
                ➕ إضافة تاجر
              </Link>
            </>
          )}
          {user ? (
            <motion.button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600/80 rounded-xl text-white font-semibold"
              variants={navItemVariants}
              whileHover="hover"
              whileTap="tap"
            >
              🚪 تسجيل الخروج
            </motion.button>
          ) : (
            <motion.div
              className="px-4 py-2 bg-green-600/80 rounded-xl text-white font-semibold"
              variants={navItemVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <Link to="/login">🔐 تسجيل الدخول</Link>
            </motion.div>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <motion.div
          className="md:hidden mt-4 flex flex-col space-y-4"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          <Link
            to="/"
            className={`px-4 py-2 rounded-xl transition duration-200 text-right ${
              location.pathname === '/' ? 'bg-blue-600/50' : 'hover:bg-blue-600/30'
            }`}
            onClick={toggleMobileMenu}
          >
            🏠 الرئيسية
          </Link>
          <Link
            to="/vendors"
            className={`px-4 py-2 rounded-xl transition duration-200 text-right ${
              location.pathname === '/vendors' ? 'bg-blue-600/50' : 'hover:bg-blue-600/30'
            }`}
            onClick={toggleMobileMenu}
          >
            👥 التجار
          </Link>
          {(user?.role === 'admin' || user?.role === 'vendor') && (
            <Link
              to="/orders"
              className={`px-4 py-2 rounded-xl transition duration-200 text-right ${
                location.pathname === '/orders' ? 'bg-blue-600/50' : 'hover:bg-blue-600/30'
              }`}
              onClick={toggleMobileMenu}
            >
              📦 الطلبات
            </Link>
          )}
          {user?.role === 'vendor' && (
            <Link
              to="/vendor"
              className={`px-4 py-2 rounded-xl transition duration-200 text-right ${
                location.pathname === '/vendor' ? 'bg-blue-600/50' : 'hover:bg-blue-600/30'
              }`}
              onClick={toggleMobileMenu}
            >
              🏪 لوحة التاجر
            </Link>
          )}
          {user?.role === 'admin' && (
            <>
              <Link
                to="/admin"
                className={`px-4 py-2 rounded-xl transition duration-200 text-right ${
                  location.pathname === '/admin' ? 'bg-blue-600/50' : 'hover:bg-blue-600/30'
                }`}
                onClick={toggleMobileMenu}
              >
                👨‍💼 لوحة الأدمن
              </Link>
              <Link
                to="/create-vendor"
                className={`px-4 py-2 rounded-xl transition duration-200 text-right ${
                  location.pathname === '/create-vendor' ? 'bg-green-600/50' : 'hover:bg-green-600/30'
                }`}
                onClick={toggleMobileMenu}
              >
                ➕ إضافة تاجر
              </Link>
            </>
          )}
          {user ? (
            <motion.button
              onClick={() => {
                handleLogout();
                toggleMobileMenu();
              }}
              className="px-4 py-2 bg-red-600/80 rounded-xl text-white font-semibold text-right"
              variants={navItemVariants}
              whileHover="hover"
              whileTap="tap"
            >
              🚪 تسجيل الخروج
            </motion.button>
          ) : (
            <motion.div
              className="px-4 py-2 bg-green-600/80 rounded-xl text-white font-semibold text-right"
              variants={navItemVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <Link to="/login" onClick={toggleMobileMenu}>
                🔐 تسجيل الدخول
              </Link>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;

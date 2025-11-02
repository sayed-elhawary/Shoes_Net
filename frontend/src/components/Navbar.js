// frontend/src/components/Navbar.js
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // تحديث حالة المستخدم
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
    updateUser();
    window.addEventListener('storage', updateUser);
    window.addEventListener('authChange', updateUser);
    return () => {
      window.removeEventListener('storage', updateUser);
      window.removeEventListener('authChange', updateUser);
    };
  }, []);

  // === تسجيل الخروج مع توجيه فوري لـ /login ===
  const handleLogout = () => {
    // مسح البيانات
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');

    // تحديث الحالة محليًا
    setUser(null);
    setIsMobileMenuOpen(false);

    // إرسال الحدث لتحديث App.js
    window.dispatchEvent(new Event('authChange'));

    // التوجيه الفوري إلى /login
    navigate('/login', { replace: true });
  };

  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(prev => !prev);
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
      className="bg-[#1F1F2E] text-white p-4 shadow-2xl border-b border-gray-700 sticky top-0 z-50"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="container mx-auto flex justify-between items-center">
        {/* === اللوجو === */}
        <Link
          to="/"
          className="flex items-center space-x-2 space-x-reverse"
          onClick={handleLinkClick}
        >
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center"
          >
            <img
              src="/icon.png"
              alt="SHOSE NET"
              className="w-10 h-10 object-contain drop-shadow-lg"
            />
            <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600 hidden sm:block">
              SHOSE NET
            </span>
          </motion.div>
        </Link>

        {/* زر القائمة على الموبايل */}
        <button
          className="md:hidden p-2 rounded-lg focus:outline-none"
          onClick={toggleMobileMenu}
          aria-label="قائمة"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
            />
          </svg>
        </button>

        {/* القائمة على الشاشات الكبيرة */}
        <div className="hidden md:flex space-x-6 space-x-reverse items-center">
          {renderNavLinks(handleLinkClick)}
          {renderAuthButton(handleLogout)}
        </div>
      </div>

      {/* القائمة على الموبايل */}
      {isMobileMenuOpen && (
        <motion.div
          className="md:hidden mt-4 flex flex-col space-y-3"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          {renderNavLinks(handleLinkClick)}
          {renderAuthButton(handleLogout, true)}
        </motion.div>
      )}
    </motion.nav>
  );

  // دالة لتوليد الروابط
  function renderNavLinks(onClick) {
    return (
      <>
        <NavLink to="/" currentPath={location.pathname} onClick={onClick}>الرئيسية</NavLink>
        <NavLink to="/vendors" currentPath={location.pathname} onClick={onClick}>التجار</NavLink>
        {user && <NavLink to="/orders" currentPath={location.pathname} onClick={onClick}>الطلبات</NavLink>}
        {user?.role === 'vendor' && (
          <NavLink to="/vendor" currentPath={location.pathname} onClick={onClick}>لوحة التاجر</NavLink>
        )}
        {user?.role === 'admin' && (
          <>
            <NavLink to="/admin" currentPath={location.pathname} onClick={onClick}>لوحة الأدمن</NavLink>
            <NavLink to="/create-vendor" currentPath={location.pathname} onClick={onClick} color="green">
              إضافة تاجر
            </NavLink>
            <NavLink to="/create-customer" currentPath={location.pathname} onClick={onClick} color="green">
              إضافة عميل
            </NavLink>
            <NavLink to="/block-customer" currentPath={location.pathname} onClick={onClick} color="red">
              حظر عميل
            </NavLink>
          </>
        )}
      </>
    );
  }

  // دالة لزر تسجيل الدخول/الخروج
  function renderAuthButton(onLogout, isMobile = false) {
    if (user) {
      return (
        <motion.button
          onClick={onLogout}
          className={`px-4 py-2 bg-red-600/80 rounded-xl text-white font-semibold ${isMobile ? 'text-right w-full' : ''}`}
          variants={navItemVariants}
          whileHover="hover"
          whileTap="tap"
        >
          تسجيل الخروج
        </motion.button>
      );
    }
    return (
      <motion.div
        className={`px-4 py-2 bg-green-600/80 rounded-xl text-white font-semibold ${isMobile ? 'text-right w-full' : ''}`}
        variants={navItemVariants}
        whileHover="hover"
        whileTap="tap"
      >
        <Link to="/login" onClick={handleLinkClick}>تسجيل الدخول</Link>
      </motion.div>
    );
  }
};

// مكون صغير للرابط
const NavLink = ({ to, currentPath, children, onClick, color = 'blue' }) => {
  const isActive = currentPath === to;
  const activeColor = color === 'green' ? 'bg-green-600/50' : color === 'red' ? 'bg-red-600/50' : 'bg-blue-600/50';
  const hoverColor = color === 'green' ? 'hover:bg-green-600/30' : color === 'red' ? 'hover:bg-red-600/30' : 'hover:bg-blue-600/30';
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`px-4 py-2 rounded-xl transition duration-200 text-right block ${
        isActive ? activeColor : hoverColor
      }`}
    >
      {children}
    </Link>
  );
};

export default Navbar;

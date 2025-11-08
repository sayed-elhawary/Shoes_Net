// frontend/src/components/Navbar.js
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

  // === تسجيل الخروج ===
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    setUser(null);
    setIsMobileMenuOpen(false);
    window.dispatchEvent(new Event('authChange'));
    navigate('/login', { replace: true });
  };

  const handleLinkClick = () => setIsMobileMenuOpen(false);
  const toggleMobileMenu = () => setIsMobileMenuOpen(prev => !prev);

  // أنيميشن خفيفة
  const navItemVariants = {
    hover: { scale: 1.03, transition: { duration: 0.2 } },
    tap: { scale: 0.98, transition: { duration: 0.1 } }
  };

  return (
    <motion.nav
      className="bg-[#18191a] text-white p-4 border-b border-[#3a3b3c] sticky top-0 z-50 shadow-sm"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* === اللوجو + النص (في الموبايل والكمبيوتر) === */}
        <Link to="/" onClick={handleLinkClick} className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
            {/* حجم الأيقونة أكبر في الموبايل */}
            <img 
              src="/icon.png" 
              alt="SHOSE NET" 
              className="w-14 h-14 sm:w-16 sm:h-16 object-contain" 
            />
          </motion.div>
          {/* النص يظهر دائمًا في الموبايل */}
          <span className="text-xl sm:text-2xl font-bold text-white">
            Web Shose
          </span>
        </Link>

        {/* زر الموبايل */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-[#242526] transition"
          onClick={toggleMobileMenu}
          aria-label="قائمة"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
            />
          </svg>
        </button>

        {/* القائمة على الشاشات الكبيرة */}
        <div className="hidden md:flex items-center gap-4">
          {renderNavLinks(handleLinkClick)}
          {renderAuthButton(handleLogout)}
        </div>
      </div>

      {/* القائمة على الموبايل */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="md:hidden mt-4 flex flex-col gap-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            {renderNavLinks(handleLinkClick)}
            {renderAuthButton(handleLogout, true)}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );

  // === الروابط ===
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
            <NavLink to="/create-vendor" currentPath={location.pathname} onClick={onClick} color="green">إضافة تاجر</NavLink>
            <NavLink to="/create-customer" currentPath={location.pathname} onClick={onClick} color="green">إضافة عميل</NavLink>
            <NavLink to="/block-customer" currentPath={location.pathname} onClick={onClick} color="red">حظر عميل</NavLink>
            <NavLink to="/admin/pending-customers" currentPath={location.pathname} onClick={onClick} color="yellow">طلبات التسجيل</NavLink>
          </>
        )}
      </>
    );
  }

  // === زر تسجيل الدخول/الخروج ===
  function renderAuthButton(onLogout, isMobile = false) {
    if (user) {
      return (
        <motion.button
          onClick={onLogout}
          className={`px-4 py-2 bg-red-600/80 rounded-lg text-sm font-medium hover:bg-red-700 transition ${isMobile ? 'w-full text-right' : ''}`}
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
        className={`px-4 py-2 bg-green-600/80 rounded-lg text-sm font-medium hover:bg-green-700 transition ${isMobile ? 'w-full text-right' : ''}`}
        variants={navItemVariants}
        whileHover="hover"
        whileTap="tap"
      >
        <Link to="/login" onClick={handleLinkClick}>تسجيل الدخول</Link>
      </motion.div>
    );
  }
};

// === مكون الرابط ===
const NavLink = ({ to, currentPath, children, onClick, color = 'blue' }) => {
  const isActive = currentPath === to;
  const activeBg =
    color === 'green' ? 'bg-green-600/30' :
    color === 'red' ? 'bg-red-600/30' :
    color === 'yellow' ? 'bg-yellow-600/30' :
    'bg-blue-600/30';
  const hoverBg =
    color === 'green' ? 'hover:bg-green-600/20' :
    color === 'red' ? 'hover:bg-red-600/20' :
    color === 'yellow' ? 'hover:bg-yellow-600/20' :
    'hover:bg-blue-600/20';
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${isActive ? activeBg : hoverBg} ${isActive ? 'ring-2 ring-white/50' : ''}`}
    >
      {children}
    </Link>
  );
};

export default Navbar;

// frontend/src/pages/Vendors.js
import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Search } from 'lucide-react';

const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // جلب التجار
  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/vendors`);
      setVendors(res.data);
      setError('');
    } catch (err) {
      console.error('خطأ في جلب التجار:', err);
      setError('فشل جلب التجار، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  // Debounce للبحث (300ms)
  const debouncedSearch = useCallback(
    debounce((term) => {
      setSearchTerm(term);
    }, 300),
    []
  );

  // فلترة التجار بناءً على البحث
  const filteredVendors = useMemo(() => {
    if (!searchTerm.trim()) return vendors;
    const term = searchTerm.toLowerCase().trim();
    return vendors.filter(vendor =>
      vendor.name?.toLowerCase().includes(term)
    );
  }, [vendors, searchTerm]);

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
    },
    hover: {
      scale: 1.03,
      y: -8,
      boxShadow: '0 20px 40px rgba(139, 92, 246, 0.15)',
      transition: { duration: 0.3 }
    }
  };

  const buttonVariants = {
    hover: { scale: 1.05 },
    tap: { scale: 0.95 }
  };

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center bg-[#18191a] p-4 sm:p-6 text-white overflow-x-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* خلفية ديناميكية */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-900 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-800 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto">

        {/* العنوان */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-purple-600 drop-shadow-lg">
            قائمة التجار
          </h1>
          <p className="text-purple-300 mt-2 text-lg">اختر تاجرك المفضل</p>
        </motion.div>

        {/* رسالة الخطأ */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="w-full max-w-4xl mx-auto bg-red-900/90 text-white p-4 rounded-2xl mb-6 text-center font-medium shadow-2xl"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {error}
              <button onClick={() => setError('')} className="ml-4 text-xl font-bold">×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* خانة البحث */}
        <motion.div
          className="w-full max-w-2xl mx-auto mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="relative">
            <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-purple-400 w-6 h-6" />
            <input
              type="text"
              placeholder="ابحث عن تاجر بالاسم..."
              onChange={(e) => debouncedSearch(e.target.value)}
              className="w-full p-4 pr-12 pl-6 rounded-2xl bg-[#242526] text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-lg"
            />
          </div>
        </motion.div>

        {/* حالة التحميل أو لا نتائج */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.p
              key="loading"
              className="text-center text-2xl text-purple-400 py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              جاري تحميل التجار...
            </motion.p>
          ) : filteredVendors.length === 0 ? (
            <motion.p
              key="no-results"
              className="text-center text-2xl text-gray-400 py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {searchTerm ? 'لا يوجد تاجر بهذا الاسم.' : 'لا توجد تجار متاحين حاليًا.'}
            </motion.p>
          ) : (
            <motion.div
              key="vendors-grid"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {filteredVendors.map((vendor, index) => (
                <motion.div
                  key={vendor._id}
                  className="bg-[#242526]/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden flex flex-col"
                  variants={cardVariants}
                  whileHover="hover"
                  custom={index}
                >
                  {/* اللوجو */}
                  <div className="p-6 flex justify-center items-center flex-1">
                    <img
                      src={
                        vendor.logo
                          ? `${process.env.REACT_APP_API_URL}/Uploads/${vendor.logo}`
                          : `${process.env.REACT_APP_API_URL}/Uploads/placeholder-image.jpg`
                      }
                      alt={`لوجو ${vendor.name}`}
                      className="w-32 h-32 object-contain rounded-xl border border-gray-600 shadow-lg"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `${process.env.REACT_APP_API_URL}/Uploads/placeholder-image.jpg`;
                      }}
                    />
                  </div>

                  {/* المعلومات */}
                  <div className="p-5 space-y-3 text-right border-t border-gray-700 bg-gradient-to-t from-[#1f2021] to-transparent">
                    <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-purple-600">
                      {vendor.name}
                    </h3>
                    <p className="text-sm text-gray-300 line-clamp-2 min-h-[3rem]">
                      {vendor.description || 'لا يوجد وصف'}
                    </p>
                    <motion.div
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                    >
                      <Link
                        to={`/vendors/${vendor._id}/products`}
                        className="block w-full py-3 text-center rounded-xl text-white font-bold bg-gradient-to-r from-purple-600 to-purple-800 shadow-lg hover:from-purple-700 hover:to-purple-900 transition-all duration-300 text-lg"
                      >
                        عرض المنتجات
                      </Link>
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// دالة Debounce
function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

export default Vendors;

// frontend/src/pages/Vendors.js
import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Search } from 'lucide-react';

// مكون الكارت محول لـ memo + استخراج خارجي لتحسين الأداء
const VendorCard = memo(({ vendor }) => {
  const apiUrl = process.env.REACT_APP_API_URL;

  const logoSrc = useMemo(() => {
    return vendor.logo
      ? `${apiUrl}/Uploads/${vendor.logo}`
      : `${apiUrl}/Uploads/placeholder-image.jpg`;
  }, [vendor.logo, apiUrl]);

  return (
    <motion.div
      className="bg-[#242526]/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden flex flex-col"
      variants={{
        hidden: { opacity: 0, y: 20, scale: 0.98 },
        visible: { opacity: 1, y: 0, scale: 1 },
        hover: { scale: 1.03, y: -8, boxShadow: '0 20px 40px rgba(239, 68, 68, 0.15)' }
      }}
      whileHover="hover"
      transition={{ duration: 0.3 }}
      layout // أهم إضافة للسلاسة عند الفلترة
    >
      <div className="p-6 flex justify-center items-center flex-1">
        <img
          src={logoSrc}
          alt={`لوجو ${vendor.name}`}
          className="w-32 h-32 object-contain rounded-xl border border-gray-600 shadow-lg"
          loading="lazy" // تحميل الصور كسول لسرعة رهيبة
          onError={(e) => {
            e.currentTarget.src = `${apiUrl}/Uploads/placeholder-image.jpg`;
          }}
        />
      </div>

      <div className="p-5 space-y-3 text-right border-t border-gray-700 bg-gradient-to-t from-[#1f2021] to-transparent">
        <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-red-600">
          {vendor.name}
        </h3>
        <p className="text-sm text-gray-300 line-clamp-2 min-h-[3rem]">
          {vendor.description || 'لا يوجد وصف'}
        </p>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link
            to={`/vendors/${vendor._id}/products`}
            className="block w-full py-3 text-center rounded-xl text-white font-bold bg-gradient-to-r from-red-600 to-red-800 shadow-lg hover:from-red-700 hover:to-red-900 transition-all duration-300 text-lg"
          >
            عرض المنتجات
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
});

const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchVendors(controller.signal);
    return () => controller.abort(); // تنظيف الطلب عند الخروج
  }, []);

  const fetchVendors = async (signal) => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/vendors`, { signal });
      setVendors(res.data);
      setError('');
    } catch (err) {
      if (!axios.isCancel(err)) {
        console.error('خطأ في جلب التجار:', err);
        setError('فشل جلب التجار، حاول مرة أخرى');
      }
    } finally {
      setLoading(false);
    }
  };

  // Debounce محسن ومستقر
  const debouncedSearch = useCallback(
    debounce((term) => setSearchTerm(term), 250), // 250ms أسرع وأنعم
    []
  );

  // فلترة فائقة السرعة مع useMemo
  const filteredVendors = useMemo(() => {
    if (!searchTerm.trim()) return vendors;
    const term = searchTerm.toLowerCase().trim();
    return vendors.filter(vendor =>
      vendor.name?.toLowerCase().includes(term)
    );
  }, [vendors, searchTerm]);

  // Animation variants خارج المكون لتوفير الذاكرة
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.07, delayChildren: 0.1 } // أسرع شوية
    }
  };

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center bg-[#18191a] p-4 sm:p-6 text-white overflow-x-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-900 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-red-800 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-red-600 drop-shadow-lg">
            قائمة التجار
          </h1>
          <p className="text-red-300 mt-2 text-lg">اختر تاجرك المفضل</p>
        </motion.div>

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

        <motion.div
          className="w-full max-w-2xl mx-auto mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="relative">
            <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-red-400 w-6 h-6" />
            <input
              type="text"
              placeholder="ابحث عن تاجر بالاسم..."
              onChange={(e) => debouncedSearch(e.target.value)}
              className="w-full p-4 pr-12 pl-6 rounded-2xl bg-[#242526] text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300 text-lg"
            />
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.p
              key="loading"
              className="text-center text-2xl text-red-400 py-12"
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
              layout // أهم شيء للسلاسة عند البحث والفلترة
            >
              {filteredVendors.map((vendor) => (
                <VendorCard key={vendor._id} vendor={vendor} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// Debounce محسنة وأخف
function debounce(func, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

export default Vendors;

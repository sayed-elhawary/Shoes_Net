// frontend/src/pages/Vendors.js
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = () => {
    axios
      .get(`${process.env.REACT_APP_API_URL}/api/vendors`)
      .then(res => {
        console.log('Vendors data:', res.data);
        setVendors(res.data);
        setError('');
      })
      .catch(err => {
        console.error('خطأ في جلب التجار:', err);
        setError('فشل جلب التجار، حاول مرة أخرى');
      });
  };

  // أنيميشن خفيفة وسالسة
  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
    hover: { scale: 1.03, boxShadow: '0 10px 20px rgba(0, 0, 0, 0.15)', transition: { duration: 0.2 } }
  };

  return (
    <div className="min-h-screen bg-[#18191a] text-white p-4 relative overflow-hidden">
      {/* خلفية ناعمة */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-900 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-red-800 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto">

        {/* === العنوان === */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
            قائمة التجار
          </h1>
          <p className="text-red-300 mt-2">اختر تاجرك المفضل</p>
        </motion.div>

        {/* === رسالة الخطأ === */}
        <AnimatePresence>
          {error && (
            <motion.p
              className="text-center text-red-400 mb-6"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* === الكروت === */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {vendors.length === 0 ? (
            <motion.p
              className="col-span-full text-center text-slate-400 text-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              لا توجد تجار متاحين حاليًا.
            </motion.p>
          ) : (
            vendors.map((vendor, index) => (
              <motion.div
                key={vendor._id}
                className="bg-[#242526]/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-700/50 overflow-hidden"
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                whileHover="hover"
                custom={index}
              >
                {/* === اللوجو === */}
                <div className="p-6 flex justify-center">
                  {vendor.logo ? (
                    <img
                      src={`${process.env.REACT_APP_API_URL}/uploads/${vendor.logo}`}
                      alt={`لوجو ${vendor.name}`}
                      className="w-28 h-28 object-contain rounded-xl border border-gray-600 shadow-md"
                      onError={e => {
                        e.target.onerror = null;
                        e.target.src = `${process.env.REACT_APP_API_URL}/uploads/placeholder-image.jpg`;
                      }}
                    />
                  ) : (
                    <img
                      src={`${process.env.REACT_APP_API_URL}/uploads/placeholder-image.jpg`}
                      alt="لوجو بديل"
                      className="w-28 h-28 object-contain rounded-xl border border-gray-600 shadow-md"
                    />
                  )}
                </div>

                {/* === المعلومات === */}
                <div className="p-5 space-y-3 text-right border-t border-gray-700">
                  <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
                    {vendor.name}
                  </h3>
                  <p className="text-sm text-gray-300 line-clamp-2">
                    {vendor.description || 'لا يوجد وصف'}
                  </p>
                  <Link
                    to={`/vendors/${vendor._id}/products`}
                    className="block w-full mt-4 py-3 text-center rounded-xl text-white font-bold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md transition-all duration-200"
                  >
                    عرض المنتجات
                  </Link>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Vendors;

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Vendors = () => {
  const [vendors, setVendors] = useState([]);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = () => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/vendors`)
      .then(res => {
        console.log('Vendors data:', res.data); // للتحقق من بيانات التجار ومسار logo
        setVendors(res.data);
      })
      .catch(err => console.error('خطأ في جلب التجار: ' + err.message));
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6 } },
    hover: { scale: 1.03, boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)' },
  };

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center bg-gradient-to-b from-gray-900 to-gray-800 p-4 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-2xl md:text-3xl font-bold mb-8 text-center">👥 قائمة التجار</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
        {vendors.length === 0 ? (
          <p className="text-gray-400 text-xl col-span-full text-center">لا توجد تجار متاحين حاليًا.</p>
        ) : (
          vendors.map(vendor => (
            <motion.div
              key={vendor._id}
              className="bg-[#1F1F2E] rounded-2xl shadow-2xl p-6 border border-gray-700"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover="hover"
            >
              {vendor.logo ? (
                <img 
                  src={`${process.env.REACT_APP_API_URL}/uploads/${vendor.logo}`} 
                  alt={`لوجو ${vendor.name}`} 
                  className="w-32 h-32 object-contain rounded-lg mb-4 mx-auto border border-gray-500 shadow-lg" 
                  style={{ boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)' }}
                  onError={(e) => {
                    console.error(`فشل تحميل صورة لـ ${vendor.name}: ${e.target.src}`);
                    e.target.src = `${process.env.REACT_APP_API_URL}/uploads/placeholder-image.jpg`; // صورة بديلة
                  }}
                />
              ) : (
                <img
                  src={`${process.env.REACT_APP_API_URL}/uploads/placeholder-image.jpg`}
                  alt="لوجو بديل"
                  className="w-32 h-32 object-contain rounded-lg mb-4 mx-auto border border-gray-500 shadow-lg"
                  style={{ boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)' }}
                  onError={(e) => console.error('خطأ في تحميل الصورة البديلة:', e)}
                />
              )}
              <h3 className="text-lg font-semibold mb-2 text-right">{vendor.name}</h3>
              <p className="text-gray-300 mb-4 text-right">📝 الوصف: {vendor.description || 'لا يوجد وصف'}</p>
              <Link
                to={`/vendors/${vendor._id}/products`}
                className="w-full block text-center p-3 rounded-xl text-white font-semibold bg-blue-600/80 hover:bg-blue-600 transition duration-200"
              >
                🛒 عرض المنتجات
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default Vendors;

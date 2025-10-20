import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Home = () => {
  const [vendors, setVendors] = useState([]);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/vendors`)
      .then(res => setVendors(res.data))
      .catch(err => console.error('خطأ في جلب التجار:', err));
  }, []);

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1],
        type: 'spring',
        stiffness: 100,
        damping: 20,
      },
    },
    hover: {
      scale: 1.03,
      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
      transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
    },
  };

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center bg-gradient-to-b from-gray-900 to-gray-800 p-4 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ willChange: 'opacity' }}
    >
      <h1 className="text-2xl md:text-3xl font-bold mb-8 text-center">👥 قائمة التجار</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
        {vendors.length === 0 ? (
          <p className="text-gray-400 text-xl col-span-full text-center">لا توجد تجار متاحين حاليًا أو جاري التحميل...</p>
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
              <h2 className="text-xl font-semibold mb-2 text-right">{vendor.name}</h2>
              <p className="text-gray-300 mb-4 text-right">{vendor.description || 'لا يوجد وصف'}</p>
              <Link
                to={`/vendors/${vendor._id}/products`}
                className="w-full bg-blue-600/80 text-white py-3 rounded-xl hover:bg-blue-600 transition duration-200 font-semibold text-center block"
              >
                🛒 عرض منتجات التاجر
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default Home;

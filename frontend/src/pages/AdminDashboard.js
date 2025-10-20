import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const AdminDashboard = () => {
  const [products, setProducts] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState(null); // للـ modal

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/products/all-products`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(res => setProducts(res.data))
      .catch(err => console.error(err));
  }, []);

  const handleApprove = (id) => {
    axios.put(`${process.env.REACT_APP_API_URL}/api/products/${id}/approve`, {}, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(res => setProducts(products.map(p => (p._id === id ? res.data : p))))
      .catch(err => alert('خطأ: ' + err.message));
  };

  const openMedia = (media, type) => {
    setSelectedMedia({ url: `${process.env.REACT_APP_API_URL}/${media}`, type });
  };

  const closeMedia = () => setSelectedMedia(null);

  const cardVariants = { /* ... الحالي زي ما هو */ };
  const buttonVariants = { /* ... */ };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  };

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center bg-gradient-to-b from-gray-900 to-gray-800 p-4 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ willChange: 'opacity' }}
    >
      <h1 className="text-2xl md:text-3xl font-bold mb-8 text-center">👨‍💼 لوحة تحكم الأدمن</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
        {products.map(product => (
          <motion.div
            key={product._id}
            className="bg-[#1F1F2E] rounded-2xl shadow-2xl p-6 border border-gray-700"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
          >
            <h2 className="text-xl font-semibold mb-2 text-right">{product.name}</h2>
            <p className="text-gray-300 mb-2 text-right">👤 التاجر: {product.vendor?.name || 'غير معروف'}</p>
            <p className="text-gray-300 text-right">💰 السعر: {product.price}</p>
            <p className="text-gray-300 text-right">📦 الكمية لكل كرتونة: {product.quantityPerCarton}</p>
            <p className="text-gray-300 text-right">🏭 المصنع: {product.manufacturer}</p>
            <p className="text-gray-300 text-right">📝 الوصف: {product.description}</p>
            <p className={`mb-4 px-3 py-2 rounded-full text-sm font-medium text-center ${
              product.approved 
                ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
            }`}>
              📋 الحالة: {product.approved ? '✅ موافق عليه' : '⏳ في انتظار الموافقة'}
            </p>
            <div className="flex flex-wrap mt-2 space-x-2 space-x-reverse justify-end">
              {product.images?.map((img, idx) => (
                <img 
                  key={idx} 
                  src={`${process.env.REACT_APP_API_URL}/${img}`} 
                  className="w-16 h-16 object-cover rounded-xl cursor-pointer" 
                  alt={`صورة ${idx + 1}`} 
                  onClick={() => openMedia(img, 'image')}
                />
              ))}
              {product.videos?.map((vid, idx) => (
                <video 
                  key={idx} 
                  src={`${process.env.REACT_APP_API_URL}/${vid}`} 
                  className="w-16 h-16 object-cover rounded-xl cursor-pointer" 
                  alt={`فيديو ${idx + 1}`} 
                  onClick={() => openMedia(vid, 'video')}
                />
              ))}
            </div>
            {!product.approved && (
              <motion.button
                onClick={() => handleApprove(product._id)}
                className="w-full p-3 rounded-xl text-white font-semibold mt-4"
                style={{ backgroundColor: 'rgba(59, 130, 246, 0.5)' }}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                ✅ الموافقة
              </motion.button>
            )}
          </motion.div>
        ))}
      </div>

      {/* Modal لفتح الصورة/الفيديو */}
      <AnimatePresence>
        {selectedMedia && (
          <motion.div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={modalVariants}
            onClick={closeMedia}
          >
            <motion.div className="relative" onClick={(e) => e.stopPropagation()}>
              {selectedMedia.type === 'image' ? (
                <img src={selectedMedia.url} className="max-w-full max-h-screen rounded-xl" alt="صورة كاملة" />
              ) : (
                <video src={selectedMedia.url} className="max-w-full max-h-screen rounded-xl" controls autoPlay />
              )}
              <button className="absolute top-2 right-2 text-white text-2xl" onClick={closeMedia}>×</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdminDashboard;

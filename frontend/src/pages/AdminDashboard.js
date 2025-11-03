// frontend/src/pages/AdminDashboard.js
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const AdminDashboard = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState({});
  const [currentMediaType, setCurrentMediaType] = useState({});
  const [error, setError] = useState('');
  const intervalRefs = useRef({});

  // === جلب المنتجات ===
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('غير مصرح: يرجى تسجيل الدخول');
      return;
    }

    axios
      .get(`${process.env.REACT_APP_API_URL}/api/products/all-products`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(res => {
        setProducts(res.data);
        setFilteredProducts(res.data);
        const initialIndexes = res.data.reduce((acc, p) => ({ ...acc, [p._id]: 0 }), {});
        const initialTypes = res.data.reduce((acc, p) => ({
          ...acc,
          [p._id]: p.videos?.length > 0 ? 'video' : 'image'
        }), {});
        setCurrentMediaIndex(initialIndexes);
        setCurrentMediaType(initialTypes);
        setError('');
      })
      .catch(err => {
        const msg = err.response?.data?.message || 'خطأ في جلب المنتجات';
        setError(msg);
        if (err.response?.status === 401) {
          localStorage.clear();
          window.location.href = '/login';
        }
      });
  }, []);

  // === تصفية المنتجات ===
  useEffect(() => {
    setFilteredProducts(filterType ? products.filter(p => p.type === filterType) : products);
  }, [filterType, products]);

  // === تدوير الصور تلقائيًا ===
  useEffect(() => {
    products.forEach(p => {
      const totalImages = p.images?.length || 0;
      if (totalImages > 1 && (!p.videos || p.videos.length === 0)) {
        clearInterval(intervalRefs.current[p._id]);
        intervalRefs.current[p._id] = setInterval(() => {
          setCurrentMediaIndex(prev => ({
            ...prev,
            [p._id]: (prev[p._id] + 1) % totalImages
          }));
          setCurrentMediaType(prev => ({ ...prev, [p._id]: 'image' }));
        }, 3000);
      }
    });
    return () => Object.values(intervalRefs.current).forEach(clearInterval);
  }, [products]);

  // === الموافقة على المنتج ===
  const handleApprove = (id) => {
    const token = localStorage.getItem('token');
    axios
      .put(`${process.env.REACT_APP_API_URL}/api/products/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(res => {
        setProducts(prev => prev.map(p => p._id === id ? res.data : p));
        alert('تمت الموافقة على المنتج بنجاح');
      })
      .catch(err => {
        alert('خطأ في الموافقة: ' + (err.response?.data?.message || err.message));
      });
  };

  // === الوسائط ===
  const openMedia = (media, type) => setSelectedMedia({ url: `${process.env.REACT_APP_API_URL}/uploads/${media}`, type });
  const closeMedia = () => setSelectedMedia(null);

  const handlePrevMedia = (id, p) => {
    const total = (p.videos?.length || 0) + (p.images?.length || 0);
    setCurrentMediaIndex(prev => {
      const next = (prev[id] - 1 + total) % total;
      setCurrentMediaType(t => ({ ...t, [id]: next < (p.videos?.length || 0) ? 'video' : 'image' }));
      return { ...prev, [id]: next };
    });
    clearInterval(intervalRefs.current[id]);
  };

  const handleNextMedia = (id, p) => {
    const total = (p.videos?.length || 0) + (p.images?.length || 0);
    setCurrentMediaIndex(prev => {
      const next = (prev[id] + 1) % total;
      setCurrentMediaType(t => ({ ...t, [id]: next < (p.videos?.length || 0) ? 'video' : 'image' }));
      return { ...prev, [id]: next };
    });
    clearInterval(intervalRefs.current[id]);
  };

  // === أنيميشن خفيفة ===
  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
    hover: { scale: 1.03, boxShadow: '0 10px 20px rgba(0, 0, 0, 0.15)' }
  };

  return (
    <div className="min-h-screen bg-[#18191a] text-white p-4 relative overflow-hidden">
      {/* خلفية ناعمة */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-900 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-red-800 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto">

        {/* === العنوان + الفلتر === */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
              لوحة تحكم الأدمن
            </h1>
            <p className="text-red-300 mt-2">مراجعة وموافقة المنتجات</p>
          </motion.div>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="p-3 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition"
          >
            <option value="">الكل</option>
            <option value="رجالي">رجالي</option>
            <option value="حريمي">حريمي</option>
            <option value="أطفال">أطفال</option>
          </select>
        </div>

        {/* === رسالة الخطأ === */}
        <AnimatePresence>
          {error && (
            <motion.p
              className="text-center text-red-400 mb-6"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* === الكروت === */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.length === 0 ? (
            <motion.p
              className="col-span-full text-center text-slate-400 text-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              لا توجد منتجات للمراجعة
            </motion.p>
          ) : (
            filteredProducts.map((product, i) => (
              <motion.div
                key={product._id}
                className="bg-[#242526]/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-700/50 overflow-hidden"
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                whileHover="hover"
                custom={i}
              >
                {/* === الوسائط === */}
                <div className="relative aspect-[4/3] bg-[#3a3b3c]">
                  {currentMediaType[product._id] === 'video' && product.videos?.length > 0 ? (
                    <video
                      src={`${process.env.REACT_APP_API_URL}/uploads/${product.videos[currentMediaIndex[product._id]]}`}
                      className="w-full h-full object-contain"
                      controls
                      onClick={() => openMedia(product.videos[currentMediaIndex[product._id]], 'video')}
                    />
                  ) : product.images?.length > 0 ? (
                    <img
                      src={`${process.env.REACT_APP_API_URL}/uploads/${product.images[(currentMediaIndex[product._id] || 0) - (product.videos?.length || 0)]}`}
                      alt={product.name}
                      className="w-full h-full object-contain"
                      onClick={() => openMedia(product.images[(currentMediaIndex[product._id] || 0) - (product.videos?.length || 0)], 'image')}
                      onError={e => { e.target.onerror = null; e.target.src = `${process.env.REACT_APP_API_URL}/uploads/placeholder-image.jpg`; }}
                    />
                  ) : (
                    <img src={`${process.env.REACT_APP_API_URL}/uploads/placeholder-image.jpg`} alt="بديل" className="w-full h-full object-contain" />
                  )}

                  {/* أزرار التنقل */}
                  {(product.videos?.length + product.images?.length) > 1 && (
                    <div className="absolute inset-x-0 bottom-3 flex justify-center gap-3">
                      <button onClick={() => handlePrevMedia(product._id, product)} className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70">←</button>
                      <button onClick={() => handleNextMedia(product._id, product)} className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70">→</button>
                    </div>
                  )}
                </div>

                {/* === المعلومات === */}
                <div className="p-5 space-y-2 text-right">
                  <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-300">التاجر: {product.vendor?.name || 'غير معروف'}</p>
                  <p className="text-sm text-gray-300">النوع: {product.type}</p>
                  <p className="text-sm text-gray-300">سعر الكرتونة: {product.price} جنيه</p>
                  <p className="text-sm text-gray-300">سعر الجوز: {(product.price / product.quantityPerCarton).toFixed(2)} جنيه</p>
                  <p className="text-sm text-gray-300">الكمية: {product.quantityPerCarton} جوز</p>
                  <p className="text-sm text-gray-300">المصنع: {product.manufacturer}</p>

                  {/* معاينة الوسائط */}
                  <div className="flex flex-wrap gap-2 mt-3 justify-end">
                    {product.images?.map((img, idx) => (
                      <img
                        key={idx}
                        src={`${process.env.REACT_APP_API_URL}/uploads/${img}`}
                        alt=""
                        className="w-12 h-12 object-cover rounded-lg cursor-pointer hover:ring-2 hover:ring-red-500"
                        onClick={() => {
                          setCurrentMediaIndex(prev => ({ ...prev, [product._id]: idx + (product.videos?.length || 0) }));
                          setCurrentMediaType(prev => ({ ...prev, [product._id]: 'image' }));
                          openMedia(img, 'image');
                        }}
                        onError={e => { e.target.onerror = null; e.target.src = `${process.env.REACT_APP_API_URL}/uploads/placeholder-image.jpg`; }}
                      />
                    ))}
                    {product.videos?.map((vid, idx) => (
                      <video
                        key={idx}
                        src={`${process.env.REACT_APP_API_URL}/uploads/${vid}`}
                        className="w-12 h-12 object-cover rounded-lg cursor-pointer hover:ring-2 hover:ring-red-500"
                        onClick={() => openMedia(vid, 'video')}
                      />
                    ))}
                  </div>

                  {/* حالة الموافقة */}
                  <div className={`mt-4 p-3 rounded-xl text-center font-medium text-sm ${product.approved ? 'bg-green-600/20 text-green-300' : 'bg-yellow-600/20 text-yellow-300'}`}>
                    {product.approved ? 'موافق عليه' : 'في انتظار الموافقة'}
                  </div>

                  {/* زر الموافقة */}
                  {!product.approved && (
                    <motion.button
                      onClick={() => handleApprove(product._id)}
                      className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-white font-bold shadow-md hover:from-green-700 hover:to-green-800"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      الموافقة
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* === مودال الوسائط === */}
      <AnimatePresence>
        {selectedMedia && (
          <motion.div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeMedia}>
            <motion.div className="relative max-w-4xl max-h-screen" onClick={e => e.stopPropagation()}>
              {selectedMedia.type === 'image' ? (
                <img src={selectedMedia.url} alt="" className="max-w-full max-h-screen rounded-2xl shadow-2xl" />
              ) : (
                <video src={selectedMedia.url} controls autoPlay className="max-w-full max-h-screen rounded-2xl shadow-2xl" />
              )}
              <button onClick={closeMedia} className="absolute top-4 right-4 bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-lg hover:bg-red-700">×</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;

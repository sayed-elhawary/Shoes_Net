// frontend/src/pages/AdminDashboard.js
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const AdminDashboard = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filterType, setFilterType] = useState(''); // نوع المنتج: رجالي، حريمي، أطفال
  const [filterStatus, setFilterStatus] = useState(''); // حالة الموافقة: all, pending, approved
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

  // === تصفية المنتجات بناءً على النوع + الحالة ===
  useEffect(() => {
    let filtered = products;

    // تصفية حسب النوع
    if (filterType) {
      filtered = filtered.filter(p => p.type === filterType);
    }

    // تصفية حسب الحالة
    if (filterStatus === 'pending') {
      filtered = filtered.filter(p => !p.approved);
    } else if (filterStatus === 'approved') {
      filtered = filtered.filter(p => p.approved);
    }

    setFilteredProducts(filtered);
  }, [filterType, filterStatus, products]);

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

  // === إلغاء الموافقة على المنتج (جديد) ===
  const handleUnapprove = (id) => {
    if (!window.confirm('هل أنت متأكد أنك تريد إلغاء الموافقة على هذا المنتج؟ سيُعاد إلى قائمة الانتظار.')) {
      return;
    }

    const token = localStorage.getItem('token');
    axios
      .put(`${process.env.REACT_APP_API_URL}/api/products/${id}/unapprove`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(res => {
        setProducts(prev => prev.map(p => p._id === id ? res.data : p));
        alert('تم إلغاء الموافقة وإعادة المنتج إلى الانتظار');
      })
      .catch(err => {
        alert('خطأ في إلغاء الموافقة: ' + (err.response?.data?.message || err.message));
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
      {/* خلفية ناعمة - موف */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-900 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-800 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto">
        {/* === العنوان + الفلاتر === */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
              لوحة تحكم الأدمن
            </h1>
            <p className="text-purple-300 mt-2">مراجعة وموافقة المنتجات</p>
          </motion.div>

          {/* فلتر الحالة + النوع */}
          <div className="flex gap-3">
            {/* فلتر الحالة */}
            <motion.select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="p-3 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
              whileHover={{ scale: 1.03 }}
            >
              <option value="">جميع الحالات</option>
              <option value="pending">في انتظار الموافقة</option>
              <option value="approved">الموافق عليها</option>
            </motion.select>

            {/* فلتر النوع */}
            <motion.select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="p-3 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
              whileHover={{ scale: 1.03 }}
            >
              <option value="">جميع الأنواع</option>
              <option value="رجالي">رجالي</option>
              <option value="حريمي">حريمي</option>
              <option value="أطفال">أطفال</option>
            </motion.select>
          </div>
        </div>

        {/* === رسالة الخطأ === */}
        <AnimatePresence>
          {error && (
            <motion.p
              className="text-center text-purple-400 mb-6"
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
              لا توجد منتجات تطابق الفلاتر المحددة
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
                      src={`${process.env.REACT_APP_API_URL}/uploads/${product.images[Math.max(0, (currentMediaIndex[product._id] || 0) - (product.videos?.length || 0))]}`}
                      alt={product.name}
                      className="w-full h-full object-contain"
                      onClick={() => openMedia(product.images[Math.max(0, (currentMediaIndex[product._id] || 0) - (product.videos?.length || 0))], 'image')}
                      onError={e => { e.target.onerror = null; e.target.src = `${process.env.REACT_APP_API_URL}/uploads/placeholder-image.jpg`; }}
                    />
                  ) : (
                    <img src={`${process.env.REACT_APP_API_URL}/uploads/placeholder-image.jpg`} alt="بديل" className="w-full h-full object-contain" />
                  )}
                  {/* أزرار التنقل */}
                  {(product.videos?.length + product.images?.length) > 1 && (
                    <div className="absolute inset-x-0 bottom-3 flex justify-center gap-3">
                      <button onClick={() => handlePrevMedia(product._id, product)} className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <button onClick={() => handleNextMedia(product._id, product)} className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* === المعلومات === */}
                <div className="p-5 space-y-2 text-right">
                  <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
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
                        className="w-12 h-12 object-cover rounded-lg cursor-pointer hover:ring-2 hover:ring-purple-500 transition"
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
                        className="w-12 h-12 object-cover rounded-lg cursor-pointer hover:ring-2 hover:ring-purple-500 transition"
                        onClick={() => openMedia(vid, 'video')}
                      />
                    ))}
                  </div>

                  {/* حالة الموافقة */}
                  <div className={`mt-4 p-3 rounded-xl text-center font-medium text-sm ${
                    product.approved
                      ? 'bg-green-600/20 text-green-300 border border-green-600/50'
                      : 'bg-yellow-600/20 text-yellow-300 border border-yellow-600/50 animate-pulse'
                  }`}>
                    {product.approved ? 'موافق عليه' : 'في انتظار الموافقة'}
                  </div>

                  {/* أزرار الموافقة / إلغاء الموافقة */}
                  <div className="mt-4">
                    {!product.approved ? (
                      <motion.button
                        onClick={() => handleApprove(product._id)}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold shadow-md hover:from-purple-700 hover:to-purple-800 transition"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        الموافقة
                      </motion.button>
                    ) : (
                      <motion.button
                        onClick={() => handleUnapprove(product._id)}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-bold shadow-md hover:from-red-700 hover:to-red-800 transition"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        إلغاء الموافقة
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* === مودال الوسائط === */}
      <AnimatePresence>
        {selectedMedia && (
          <motion.div
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMedia}
          >
            <motion.div className="relative max-w-4xl max-h-screen" onClick={e => e.stopPropagation()}>
              {selectedMedia.type === 'image' ? (
                <img src={selectedMedia.url} alt="" className="max-w-full max-h-screen rounded-2xl shadow-2xl" />
              ) : (
                <video src={selectedMedia.url} controls autoPlay className="max-w-full max-h-screen rounded-2xl shadow-2xl" />
              )}
              <button onClick={closeMedia} className="absolute top-4 right-4 bg-purple-600 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-lg hover:bg-purple-700 transition">
                ×
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;

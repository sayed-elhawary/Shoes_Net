// frontend/src/pages/VendorProducts.js
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const VendorProducts = () => {
  const { vendorId } = useParams();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [cart, setCart] = useState([]);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderForm, setOrderForm] = useState({ address: '' });
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState({});
  const [currentMediaType, setCurrentMediaType] = useState({});
  const [showAddedToCart, setShowAddedToCart] = useState(null);
  const [error, setError] = useState('');
  const intervalRefs = useRef({});
  const navigate = useNavigate();

  // === جلب المنتجات + التحقق من الصلاحية ===
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || !['customer', 'vendor', 'admin'].includes(role)) {
      setError('غير مصرح: يرجى تسجيل الدخول');
      navigate('/login');
      return;
    }

    axios
      .get(`${process.env.REACT_APP_API_URL}/api/products/vendor/${vendorId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(res => {
        setProducts(res.data);
        setFilteredProducts(res.data);
        setVendorName(res.data[0]?.vendor?.name || 'تاجر غير معروف');
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
          window.dispatchEvent(new Event('authChange'));
          navigate('/login');
        }
      });

    if (role === 'customer') {
      const saved = localStorage.getItem('cart');
      if (saved) setCart(JSON.parse(saved));
    }
  }, [vendorId, navigate]);

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

  // === حفظ السلة ===
  useEffect(() => {
    if (localStorage.getItem('role') === 'customer') {
      localStorage.setItem('cart', JSON.stringify(cart));
    }
  }, [cart]);

  // === إضافة إلى السلة ===
  const addToCart = (product) => {
    const idx = currentMediaIndex[product._id] || 0;
    const type = currentMediaType[product._id] || 'image';
    if (type === 'video') return alert('اختر صورة للإضافة');

    const imgIndex = idx - (product.videos?.length || 0);
    const selectedImage = product.images[imgIndex] || 'placeholder-image.jpg';

    setCart(prev => {
      const exists = prev.find(i => i.product._id === product._id && i.selectedImage === selectedImage);
      if (exists) {
        return prev.map(i => i.product._id === product._id && i.selectedImage === selectedImage
          ? { ...i, quantity: i.quantity + 1 }
          : i
        );
      }
      return [...prev, { product, quantity: 1, selectedImage }];
    });

    setShowAddedToCart(product._id);
    setTimeout(() => setShowAddedToCart(null), 2000);
  };

  // === تحديث الكمية / حذف ===
  const updateCartQuantity = (id, img, qty) => {
    if (qty < 1) return;
    setCart(prev => prev.map(i => i.product._id === id && i.selectedImage === img ? { ...i, quantity: qty } : i));
  };
  const removeFromCart = (id, img) => setCart(prev => prev.filter(i => !(i.product._id === id && i.selectedImage === img)));

  // === تقديم الطلب ===
  const handleOrderSubmit = () => {
    if (!orderForm.address) return setError('يرجى إدخال العنوان');
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');

    const promises = cart.map(item =>
      axios.post(`${process.env.REACT_APP_API_URL}/api/orders`, {
        product: item.product._id,
        vendor: item.product.vendor._id || item.product.vendor,
        quantity: item.quantity,
        user: userId,
        address: orderForm.address,
        selectedImage: item.selectedImage
      }, { headers: { Authorization: `Bearer ${token}` } })
    );

    Promise.all(promises)
      .then(() => {
        alert('تم إنشاء الطلبات بنجاح!');
        setCart([]);
        setShowOrderForm(false);
        setOrderForm({ address: '' });
      })
      .catch(err => {
        setError(err.response?.data?.message || 'خطأ في تقديم الطلب');
        if (err.response?.status === 401) {
          localStorage.clear();
          navigate('/login');
        }
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

  const role = localStorage.getItem('role');
  const isCustomer = role === 'customer';

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

        {/* === العنوان + الفلتر + السلة === */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
              منتجات التاجر: {vendorName}
            </h1>
          </motion.div>

          <div className="flex items-center gap-3">
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

            {isCustomer && (
              <motion.button
                onClick={() => setShowCartModal(true)}
                className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl font-bold shadow-md hover:from-blue-700 hover:to-blue-800"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                السلة ({cart.reduce((a, i) => a + i.quantity, 0)})
              </motion.button>
            )}
          </div>
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
              لا توجد منتجات متاحة
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

                  {isCustomer && (
                    <motion.button
                      onClick={() => addToCart(product)}
                      className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold shadow-md hover:from-blue-700 hover:to-blue-800"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      إضافة إلى السلة
                    </motion.button>
                  )}

                  <AnimatePresence>
                    {showAddedToCart === product._id && (
                      <motion.div
                        className="absolute top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-full text-sm shadow-lg"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        تمت الإضافة!
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* === مودال السلة === */}
      <AnimatePresence>
        {showCartModal && isCustomer && (
          <motion.div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCartModal(false)}>
            <motion.div className="bg-[#242526]/90 backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <h2 className="text-2xl font-bold text-red-400 mb-5 text-right">السلة</h2>
              {cart.length === 0 ? (
                <p className="text-center text-gray-400">السلة فارغة</p>
              ) : (
                <>
                  {cart.map(item => (
                    <div key={`${item.product._id}-${item.selectedImage}`} className="flex items-center justify-between mb-4 p-3 bg-[#3a3b3c]/50 rounded-xl">
                      <img src={`${process.env.REACT_APP_API_URL}/uploads/${item.selectedImage}`} alt="" className="w-16 h-16 object-cover rounded-lg" />
                      <div className="flex-1 mx-3 text-right">
                        <p className="font-semibold">{item.product.name}</p>
                        <p className="text-sm text-gray-300">{item.product.price} جنيه</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="number" min="1" value={item.quantity} onChange={e => updateCartQuantity(item.product._id, item.selectedImage, +e.target.value)} className="w-16 p-2 bg-[#3a3b3c] rounded-lg text-center" />
                        <button onClick={() => removeFromCart(item.product._id, item.selectedImage)} className="text-red-400 hover:text-red-300">✕</button>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-3 mt-5">
                    <button onClick={() => { setShowCartModal(false); setShowOrderForm(true); }} className="flex-1 py-3 bg-gradient-to-r from-green-600 to-green-700 rounded-xl font-bold">طلب</button>
                    <button onClick={() => setShowCartModal(false)} className="flex-1 py-3 bg-gradient-to-r from-gray-600 to-gray-700 rounded-xl font-bold">إغلاق</button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === مودال الطلب === */}
      <AnimatePresence>
        {showOrderForm && isCustomer && (
          <motion.div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowOrderForm(false)}>
            <motion.div className="bg-[#242526]/90 backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h2 className="text-2xl font-bold text-red-400 mb-5 text-right">إكمال الطلب</h2>
              <input
                type="text"
                placeholder="العنوان"
                value={orderForm.address}
                onChange={e => setOrderForm({ address: e.target.value })}
                className="w-full p-4 mb-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-right placeholder-gray-400 focus:outline-none focus:border-red-500"
              />
              <div className="flex gap-3">
                <button onClick={handleOrderSubmit} className="flex-1 py-3 bg-gradient-to-r from-green-600 to-green-700 rounded-xl font-bold">إرسال</button>
                <button onClick={() => setShowOrderForm(false)} className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-700 rounded-xl font-bold">إلغاء</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

export default VendorProducts;

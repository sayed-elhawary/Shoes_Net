// frontend/src/pages/Home.js
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [cart, setCart] = useState([]);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderForm, setOrderForm] = useState({ address: '' });
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState({});
  const [currentMediaType, setCurrentMediaType] = useState({});
  const [showAddedToCart, setShowAddedToCart] = useState(false);
  const [error, setError] = useState('');
  const [previousOrders, setPreviousOrders] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const intervalRefs = useRef({});
  const navigate = useNavigate();

  // فحص التوكن ودور المستخدم
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const userId = localStorage.getItem('userId');

    if (!token || !['admin', 'vendor', 'customer'].includes(role)) {
      setError('غير مصرح: يرجى تسجيل الدخول كأدمن، تاجر، أو عميل');
      navigate('/login');
      return;
    }

    // جلب المنتجات
    axios
      .get(`${process.env.REACT_APP_API_URL}/api/products`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(res => {
        setProducts(res.data);
        setFilteredProducts(res.data);
        const initialIndexes = res.data.reduce((acc, product) => ({
          ...acc,
          [product._id]: 0
        }), {});
        const initialTypes = res.data.reduce((acc, product) => ({
          ...acc,
          [product._id]: product.videos && product.videos.length > 0 ? 'video' : 'image'
        }), {});
        setCurrentMediaIndex(initialIndexes);
        setCurrentMediaType(initialTypes);
        setError('');
      })
      .catch(err => {
        console.error('خطأ في جلب المنتجات:', err);
        setError(err.response?.data?.message || 'خطأ في جلب المنتجات');
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          localStorage.removeItem('userId');
          navigate('/login');
        }
      });

    // جلب السلة (للعملاء)
    if (role === 'customer') {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) setCart(JSON.parse(savedCart));
    }

    // جلب الطلبات السابقة
    if (role === 'customer' && userId) {
      axios
        .get(`${process.env.REACT_APP_API_URL}/api/orders/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then(res => setPreviousOrders(res.data))
        .catch(err => console.error('خطأ في جلب الطلبات السابقة:', err));
    }
  }, [navigate]);

  // تصفية المنتجات
  useEffect(() => {
    if (filterType === '') {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(products.filter(p => p.type === filterType));
    }
  }, [filterType, products]);

  // تدوير الصور تلقائيًا
  useEffect(() => {
    products.forEach(product => {
      const totalImages = product.images?.length || 0;
      if (totalImages > 1 && (!product.videos || product.videos.length === 0)) {
        clearInterval(intervalRefs.current[product._id]);
        intervalRefs.current[product._id] = setInterval(() => {
          setCurrentMediaIndex(prev => ({
            ...prev,
            [product._id]: (prev[product._id] + 1) % totalImages
          }));
          setCurrentMediaType(prev => ({ ...prev, [product._id]: 'image' }));
        }, 3000);
      }
    });
    return () => Object.values(intervalRefs.current).forEach(clearInterval);
  }, [products]);

  // حفظ السلة
  useEffect(() => {
    if (localStorage.getItem('role') === 'customer') {
      localStorage.setItem('cart', JSON.stringify(cart));
    }
  }, [cart]);

  const addToCart = (product) => {
    const currentIndex = currentMediaIndex[product._id] || 0;
    const currentType = currentMediaType[product._id] || 'image';
    if (currentType === 'video') {
      alert('يرجى اختيار صورة لإضافتها إلى السلة');
      return;
    }
    const selectedImage = product.images[currentIndex - (product.videos?.length || 0)] || 'placeholder-image.jpg';
    setCart(prev => {
      const existing = prev.find(i => i.product._id === product._id && i.selectedImage === selectedImage);
      if (existing) {
        return prev.map(i =>
          i.product._id === product._id && i.selectedImage === selectedImage
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { product, quantity: 1, selectedImage }];
    });
    setShowAddedToCart(true);
    setTimeout(() => setShowAddedToCart(false), 2000);
  };

  const updateCartQuantity = (productId, selectedImage, qty) => {
    if (qty < 1) return;
    setCart(prev => prev.map(i =>
      i.product._id === productId && i.selectedImage === selectedImage
        ? { ...i, quantity: qty }
        : i
    ));
  };

  const removeFromCart = (productId, selectedImage) => {
    setCart(prev => prev.filter(i => !(i.product._id === productId && i.selectedImage === selectedImage)));
  };

  const handleOrderSubmit = () => {
    if (isSubmitting || !orderForm.address) return;
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    if (!token || !userId) return navigate('/login');

    let confirmSubmit = true;
    if (previousOrders.length > 0) {
      confirmSubmit = window.confirm('أنت طلبت الطلب مرة، هل تريد تأكيد طلبه مرة أخرى؟');
    }
    if (!confirmSubmit) return;

    setIsSubmitting(true);
    const promises = cart.map(item =>
      axios.post(
        `${process.env.REACT_APP_API_URL}/api/orders`,
        {
          product: item.product._id,
          vendor: item.product.vendor._id || item.product.vendor,
          quantity: item.quantity,
          user: userId,
          address: orderForm.address,
          selectedImage: item.selectedImage
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
    );

    Promise.all(promises)
      .then(() => {
        alert('تم إنشاء الطلبات بنجاح!');
        setCart([]);
        setShowOrderForm(false);
        setOrderForm({ address: '' });
        axios.get(`${process.env.REACT_APP_API_URL}/api/orders/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => setPreviousOrders(res.data));
      })
      .catch(err => {
        setError(err.response?.data?.message || 'خطأ في تقديم الطلب');
        if (err.response?.status === 401) {
          localStorage.clear();
          navigate('/login');
        }
      })
      .finally(() => setIsSubmitting(false));
  };

  const openMedia = (media, type) => {
    setSelectedMedia({ url: `${process.env.REACT_APP_API_URL}/uploads/${media}`, type });
  };

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

  // === الأنيميشن ===
  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
    hover: { scale: 1.05, boxShadow: '0 20px 40px rgba(239, 68, 68, 0.3)', transition: { duration: 0.3 } }
  };

  const buttonVariants = {
    hover: { scale: 1.08, boxShadow: '0 8px 16px rgba(239, 68, 68, 0.4)' },
    tap: { scale: 0.95 }
  };

  const modalVariants = { hidden: { opacity: 0, scale: 0.85 }, visible: { opacity: 1, scale: 1 } };

  const toastVariants = { hidden: { opacity: 0, x: 50 }, visible: { opacity: 1, x: 0 } };

  const role = localStorage.getItem('role');
  const isCustomer = role === 'customer';

  return (
    <div
      className="min-h-screen flex flex-col items-center p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      }}
    >
      {/* خلفية ناعمة */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-900 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-red-800 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="relative z-10 w-full max-w-7xl">
        {/* === اللوجو + العنوان === */}
        <motion.div
          className="flex flex-col items-center mb-8"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600 mt-3">
            متجر SHOSE NET
          </h1>
          <p className="text-red-300 text-lg mt-1">المنتجات المتاحة</p>
        </motion.div>

        {/* === الفلتر + السلة === */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <motion.select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="p-3 rounded-xl bg-slate-800/60 backdrop-blur-md border border-slate-600 text-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
            whileHover={{ scale: 1.03 }}
          >
            <option value="">الكل</option>
            <option value="رجالي">رجالي</option>
            <option value="حريمي">حريمي</option>
            <option value="أطفال">أطفال</option>
          </motion.select>

          {isCustomer && (
            <motion.button
              onClick={() => setShowCartModal(true)}
              className="px-6 py-3 rounded-xl text-white font-bold bg-gradient-to-r from-red-600 to-red-700 shadow-lg hover:from-red-700 hover:to-red-800"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              السلة ({cart.reduce((a, i) => a + i.quantity, 0)})
            </motion.button>
          )}
        </div>

        {/* === المنتجات === */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.length === 0 ? (
            <p className="col-span-full text-center text-slate-400 text-xl">لا توجد منتجات...</p>
          ) : (
            filteredProducts.map(product => (
              <motion.div
                key={product._id}
                className="bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden"
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                whileHover="hover"
              >
                <div className="relative aspect-[4/3] bg-slate-800">
                  {currentMediaType[product._id] === 'video' && product.videos?.length > 0 ? (
                    <video
                      src={`${process.env.REACT_APP_API_URL}/uploads/${product.videos[currentMediaIndex[product._id]]}`}
                      controls
                      className="w-full h-full object-cover"
                      onClick={() => openMedia(product.videos[currentMediaIndex[product._id]], 'video')}
                    />
                  ) : product.images?.length > 0 ? (
                    <img
                      src={`${process.env.REACT_APP_API_URL}/uploads/${product.images[(currentMediaIndex[product._id] || 0) - (product.videos?.length || 0)]}`}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onClick={() => openMedia(product.images[(currentMediaIndex[product._id] || 0) - (product.videos?.length || 0)], 'image')}
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                      <span className="text-slate-500">بدون صورة</span>
                    </div>
                  )}

                  {/* أزرار التنقل */}
                  {(product.videos?.length || 0) + (product.images?.length || 0) > 1 && (
                    <div className="absolute inset-x-0 bottom-3 flex justify-center gap-3">
                      <button onClick={() => handlePrevMedia(product._id, product)} className="bg-black/50 text-white p-2 rounded-full backdrop-blur-sm">←</button>
                      <button onClick={() => handleNextMedia(product._id, product)} className="bg-black/50 text-white p-2 rounded-full backdrop-blur-sm">→</button>
                    </div>
                  )}
                </div>

                <div className="p-5 space-y-2 text-right">
                  <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
                    {product.name}
                  </h2>
                  <div className="text-sm text-slate-300 space-y-1">
                    <p>التاجر: <Link to={`/vendors/${product.vendor?._id}/products`} className="text-red-400 hover:text-red-300">{product.vendor?.name}</Link></p>
                    <p>النوع: {product.type}</p>
                    <p>سعر الكرتونة: {product.price} جنيه</p>
                    <p>سعر الجوز: {(product.price / product.quantityPerCarton).toFixed(2)} جنيه</p>
                    <p>الكرتونة: {product.quantityPerCarton} جوز</p>
                    <p>المصنع: {product.manufacturer}</p>
                  </div>

                  {isCustomer && (
                    <motion.button
                      onClick={() => addToCart(product)}
                      className="w-full mt-4 py-3 rounded-xl text-white font-bold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg"
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                    >
                      إضافة إلى السلة
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* === Toast === */}
      <AnimatePresence>
        {showAddedToCart && (
          <motion.div
            className="fixed top-6 right-6 bg-green-600 text-white px-5 py-3 rounded-full shadow-xl flex items-center gap-2 z-50"
            variants={toastVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <span>تمت الإضافة</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === مودال السلة + الطلب + الصورة === */}
      {/* (نفس الكود مع تغيير الألوان فقط) */}
      <AnimatePresence>
        {showCartModal && isCustomer && (
          <motion.div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" variants={modalVariants} initial="hidden" animate="visible" exit="hidden" onClick={() => setShowCartModal(false)}>
            <motion.div className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-slate-700 w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600 mb-6 text-right">السلة</h2>
              {cart.length === 0 ? <p className="text-center text-slate-400">السلة فارغة</p> : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {cart.map(item => (
                    <div key={`${item.product._id}-${item.selectedImage}`} className="flex items-center justify-between gap-4 p-3 bg-slate-800/50 rounded-xl">
                      <img src={`${process.env.REACT_APP_API_URL}/uploads/${item.selectedImage}`} alt="" className="w-16 h-16 object-cover rounded-lg" />
                      <div className="text-right flex-1">
                        <p className="font-semibold">{item.product.name}</p>
                        <p className="text-sm text-slate-400">سعر الكرتونة: {item.product.price} جنيه</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="number" min="1" value={item.quantity} onChange={e => updateCartQuantity(item.product._id, item.selectedImage, parseInt(e.target.value))} className="w-16 p-2 bg-slate-700 rounded text-center" />
                        <button onClick={() => removeFromCart(item.product._id, item.selectedImage)} className="text-red-400 hover:text-red-300">×</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {cart.length > 0 && (
                <div className="flex gap-3 mt-6">
                  <button onClick={() => { setShowCartModal(false); setShowOrderForm(true); }} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-white font-bold">طلب</button>
                  <button onClick={() => setShowCartModal(false)} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-bold">إغلاق</button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* مودال الطلب */}
      <AnimatePresence>
        {showOrderForm && isCustomer && (
          <motion.div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" variants={modalVariants} initial="hidden" animate="visible" exit="hidden" onClick={() => setShowOrderForm(false)}>
            <motion.div className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-slate-700 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600 mb-6 text-right">إدخال العنوان</h2>
              <input type="text" placeholder="العنوان" value={orderForm.address} onChange={e => setOrderForm({ address: e.target.value })} className="w-full p-4 mb-6 bg-slate-800/60 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30" />
              <div className="flex gap-3">
                <button onClick={handleOrderSubmit} disabled={isSubmitting} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-white font-bold disabled:opacity-70">
                  {isSubmitting ? 'جاري...' : 'إرسال'}
                </button>
                <button onClick={() => setShowOrderForm(false)} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-bold">إلغاء</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* مودال الصورة */}
      <AnimatePresence>
        {selectedMedia && (
          <motion.div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50" variants={modalVariants} initial="hidden" animate="visible" exit="hidden" onClick={closeMedia}>
            <motion.div className="relative max-w-4xl max-h-screen p-4" onClick={e => e.stopPropagation()}>
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

export default Home;

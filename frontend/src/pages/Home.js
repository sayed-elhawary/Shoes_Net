import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderForm, setOrderForm] = useState({
    customerName: '',
    phone: '',
    address: ''
  });
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const intervalRefs = useRef({});

  useEffect(() => {
    // Load products
    axios.get(`${process.env.REACT_APP_API_URL}/api/products`)
      .then(res => {
        setProducts(res.data);
        const initialIndexes = res.data.reduce((acc, product) => ({
          ...acc,
          [product._id]: 0
        }), {});
        setCurrentImageIndex(initialIndexes);
      })
      .catch(err => console.error(err));

    // Load cart from localStorage
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  useEffect(() => {
    // Set up intervals for image rotation
    products.forEach(product => {
      if (product.images && product.images.length > 1) {
        clearInterval(intervalRefs.current[product._id]);
        intervalRefs.current[product._id] = setInterval(() => {
          setCurrentImageIndex(prev => ({
            ...prev,
            [product._id]: (prev[product._id] + 1) % product.images.length
          }));
        }, 3000);
      }
    });

    return () => {
      Object.values(intervalRefs.current).forEach(clearInterval);
    };
  }, [products]);

  useEffect(() => {
    // Save cart to localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product._id === product._id);
      if (existingItem) {
        return prevCart.map(item =>
          item.product._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) return;
    setCart(prevCart =>
      prevCart.map(item =>
        item.product._id === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.product._id !== productId));
  };

  const handleOrderSubmit = () => {
    if (!orderForm.customerName || !orderForm.phone || !orderForm.address) {
      alert('يرجى ملء جميع الحقول');
      return;
    }

    const promises = cart.map(item =>
      axios.post(`${process.env.REACT_APP_API_URL}/api/orders`, {
        product: item.product._id,
        vendor: item.product.vendor._id || item.product.vendor,
        quantity: item.quantity,
        customerName: orderForm.customerName,
        phone: orderForm.phone,
        address: orderForm.address
      })
    );

    Promise.all(promises)
      .then(() => {
        alert('تم إنشاء الطلبات بنجاح!');
        setCart([]);
        setShowOrderForm(false);
        setOrderForm({ customerName: '', phone: '', address: '' });
      })
      .catch(err => alert('خطأ: ' + err.message));
  };

  const handleOrderCancel = () => {
    setShowOrderForm(false);
    setOrderForm({ customerName: '', phone: '', address: '' });
  };

  const openMedia = (media, type) => {
    setSelectedMedia({ url: `${process.env.REACT_APP_API_URL}/${media}`, type });
  };

  const closeMedia = () => setSelectedMedia(null);

  const handlePrevImage = (productId, imageCount) => {
    setCurrentImageIndex(prev => ({
      ...prev,
      [productId]: (prev[productId] - 1 + imageCount) % imageCount
    }));
    clearInterval(intervalRefs.current[productId]);
    intervalRefs.current[productId] = setInterval(() => {
      setCurrentImageIndex(prev => ({
        ...prev,
        [productId]: (prev[productId] + 1) % imageCount
      }));
    }, 3000);
  };

  const handleNextImage = (productId, imageCount) => {
    setCurrentImageIndex(prev => ({
      ...prev,
      [productId]: (prev[productId] + 1) % imageCount
    }));
    clearInterval(intervalRefs.current[productId]);
    intervalRefs.current[productId] = setInterval(() => {
      setCurrentImageIndex(prev => ({
        ...prev,
        [productId]: (prev[productId] + 1) % imageCount
      }));
    }, 3000);
  };

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

  const buttonVariants = {
    hover: {
      scale: 1.05,
      boxShadow: '0 6px 12px rgba(0, 0, 0, 0.15)',
      backgroundColor: 'rgba(59, 130, 246, 0.7)',
      transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
    },
    tap: {
      scale: 0.98,
      transition: { duration: 0.1, ease: 'easeOut' },
    },
  };

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
      <div className="flex justify-between items-center w-full max-w-6xl mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-center">🛒 المنتجات المتاحة</h1>
        <motion.button
          onClick={() => setShowCartModal(true)}
          className="p-3 rounded-xl text-white font-semibold"
          style={{ backgroundColor: 'rgba(59, 130, 246, 0.5)' }}
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
        >
          🛒 السلة ({cart.reduce((acc, item) => acc + item.quantity, 0)})
        </motion.button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
        {products.length === 0 ? (
          <p className="text-gray-400 text-xl col-span-full text-center">لا توجد منتجات متاحة أو جاري التحميل...</p>
        ) : (
          products.map(product => (
            <motion.div
              key={product._id}
              className="bg-[#1F1F2E] rounded-2xl shadow-2xl overflow-hidden border border-gray-700"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover="hover"
            >
              <div className="relative w-full h-64">
                {product.images && product.images.length > 0 ? (
                  <>
                    <img
                      src={`${process.env.REACT_APP_API_URL}/${product.images[currentImageIndex[product._id] || 0]}`}
                      alt={`${product.name}`}
                      className="w-full h-64 object-cover rounded-xl cursor-pointer"
                      onClick={() => openMedia(product.images[currentImageIndex[product._id] || 0], 'image')}
                    />
                    {product.images.length > 1 && (
                      <>
                        <button
                          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full"
                          onClick={() => handlePrevImage(product._id, product.images.length)}
                        >
                          ←
                        </button>
                        <button
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full"
                          onClick={() => handleNextImage(product._id, product.images.length)}
                        >
                          →
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-64 bg-gray-700 flex items-center justify-center rounded-xl">
                    <span>لا توجد صور</span>
                  </div>
                )}
              </div>
              <div className="p-6">
                {product.videos && product.videos.map((vid, idx) => (
                  <video
                    key={`vid-${idx}`}
                    src={`${process.env.REACT_APP_API_URL}/${vid}`}
                    controls
                    className="w-full h-32 object-cover rounded-xl mb-2 cursor-pointer"
                    onClick={() => openMedia(vid, 'video')}
                  />
                ))}
                <h2 className="text-xl font-semibold mb-2 text-right">{product.name}</h2>
                <p className="text-gray-300 mb-1 text-right">
                  👤 التاجر: <Link to={`/vendors/${product.vendor?._id}/products`} className="text-blue-400 hover:underline">{product.vendor?.name || 'غير معروف'}</Link>
                </p>
                <p className="text-gray-300 mb-1 text-right">📦 النوع: {product.type}</p>
                <p className="text-gray-300 mb-1 text-right">💰 سعر الكرتونة: {product.price} جنيه</p>
                <p className="text-gray-300 mb-1 text-right">📦 الكرتونة: {product.quantityPerCarton} جوز</p>
                <p className="text-gray-300 mb-1 text-right">🏭 المصنع: {product.manufacturer}</p>
                <p className="text-gray-400 mb-4 text-right">{product.description}</p>
                <motion.button
                  onClick={() => addToCart(product)}
                  className="w-full p-3 rounded-xl text-white font-semibold"
                  style={{ backgroundColor: 'rgba(59, 130, 246, 0.5)' }}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  🛒 إضافة إلى السلة
                </motion.button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal لعرض السلة */}
      <AnimatePresence>
        {showCartModal && (
          <motion.div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={modalVariants}
            onClick={() => setShowCartModal(false)}
          >
            <motion.div
              className="bg-[#1F1F2E] p-6 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-4 text-right">السلة</h2>
              {cart.length === 0 ? (
                <p className="text-gray-400 text-center">السلة فارغة</p>
              ) : (
                cart.map(item => (
                  <div key={item.product._id} className="flex justify-between items-center mb-4">
                    <div className="text-right">
                      <p>{item.product.name}</p>
                      <p>سعر الكرتونة: {item.product.price} جنيه</p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateCartQuantity(item.product._id, parseInt(e.target.value))}
                        className="w-16 p-2 border border-gray-200/30 rounded-xl bg-[#2A2A3E] text-white text-center mx-2"
                      />
                      <button
                        onClick={() => removeFromCart(item.product._id)}
                        className="text-red-500"
                      >
                        ❌
                      </button>
                    </div>
                  </div>
                ))
              )}
              {cart.length > 0 && (
                <div className="flex space-x-2 space-x-reverse mt-4">
                  <motion.button
                    onClick={() => {
                      setShowCartModal(false);
                      setShowOrderForm(true);
                    }}
                    className="w-full p-3 rounded-xl text-white font-semibold"
                    style={{ backgroundColor: 'rgba(34, 197, 94, 0.5)' }}
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    طلب
                  </motion.button>
                  <motion.button
                    onClick={() => setShowCartModal(false)}
                    className="w-full p-3 rounded-xl text-white font-semibold"
                    style={{ backgroundColor: 'rgba(220, 38, 38, 0.5)' }}
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    إغلاق
                  </motion.button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal لإدخال بيانات الطلب */}
      <AnimatePresence>
        {showOrderForm && (
          <motion.div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={modalVariants}
            onClick={handleOrderCancel}
          >
            <motion.div
              className="bg-[#1F1F2E] p-6 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-4 text-right">إدخال بيانات الطلب</h2>
              <input
                type="text"
                placeholder="اسم العميل"
                value={orderForm.customerName}
                onChange={(e) => setOrderForm({ ...orderForm, customerName: e.target.value })}
                className="w-full p-3 mb-4 border border-gray-200/30 rounded-xl bg-[#2A2A3E] text-white text-right"
              />
              <input
                type="text"
                placeholder="رقم الهاتف"
                value={orderForm.phone}
                onChange={(e) => setOrderForm({ ...orderForm, phone: e.target.value })}
                className="w-full p-3 mb-4 border border-gray-200/30 rounded-xl bg-[#2A2A3E] text-white text-right"
              />
              <input
                type="text"
                placeholder="العنوان"
                value={orderForm.address}
                onChange={(e) => setOrderForm({ ...orderForm, address: e.target.value })}
                className="w-full p-3 mb-4 border border-gray-200/30 rounded-xl bg-[#2A2A3E] text-white text-right"
              />
              <div className="flex space-x-2 space-x-reverse">
                <motion.button
                  onClick={handleOrderSubmit}
                  className="w-full p-3 rounded-xl text-white font-semibold"
                  style={{ backgroundColor: 'rgba(34, 197, 94, 0.5)' }}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  إرسال
                </motion.button>
                <motion.button
                  onClick={handleOrderCancel}
                  className="w-full p-3 rounded-xl text-white font-semibold"
                  style={{ backgroundColor: 'rgba(220, 38, 38, 0.5)' }}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  إلغاء
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

export default Home;

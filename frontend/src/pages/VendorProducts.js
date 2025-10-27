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
  const [orderForm, setOrderForm] = useState({
    address: '' // إزالة customerName و phone
  });
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState({});
  const [currentMediaType, setCurrentMediaType] = useState({});
  const [showAddedToCart, setShowAddedToCart] = useState(null);
  const [error, setError] = useState(''); // إضافة حالة للأخطاء
  const intervalRefs = useRef({});
  const navigate = useNavigate();

  // فحص التوكن وجلب المنتجات
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || (role !== 'customer' && role !== 'vendor' && role !== 'admin')) {
      setError('غير مصرح: يرجى تسجيل الدخول');
      navigate('/login');
      return;
    }

    // جلب منتجات التاجر
    axios
      .get(`${process.env.REACT_APP_API_URL}/api/products/vendor/${vendorId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(res => {
        setProducts(res.data);
        setFilteredProducts(res.data);
        setVendorName(res.data[0]?.vendor?.name || 'تاجر غير معروف');
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
          setError('غير مصرح: يرجى تسجيل الدخول مرة أخرى');
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          localStorage.removeItem('userId');
          navigate('/login');
        }
      });

    // جلب السلة من localStorage (فقط للعملاء)
    if (role === 'customer') {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    }
  }, [vendorId, navigate]);

  useEffect(() => {
    // تصفية المنتجات بناءً على filterType
    if (filterType === '') {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(products.filter(product => product.type === filterType));
    }
  }, [filterType, products]);

  useEffect(() => {
    // إعداد التدوير التلقائي للصور
    products.forEach(product => {
      const totalImages = product.images?.length || 0;
      if (totalImages > 1 && (!product.videos || product.videos.length === 0)) {
        clearInterval(intervalRefs.current[product._id]);
        intervalRefs.current[product._id] = setInterval(() => {
          setCurrentMediaIndex(prev => {
            const currentIndex = prev[product._id] || 0;
            const nextIndex = (currentIndex + 1) % totalImages;
            return {
              ...prev,
              [product._id]: nextIndex
            };
          });
          setCurrentMediaType(prevType => ({
            ...prevType,
            [product._id]: 'image'
          }));
        }, 3000);
      }
    });
    return () => {
      Object.values(intervalRefs.current).forEach(clearInterval);
    };
  }, [products]);

  useEffect(() => {
    // حفظ السلة في localStorage (فقط للعملاء)
    const role = localStorage.getItem('role');
    if (role === 'customer') {
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
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product._id === product._id && item.selectedImage === selectedImage);
      if (existingItem) {
        return prevCart.map(item =>
          item.product._id === product._id && item.selectedImage === selectedImage
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1, selectedImage }];
    });
    setShowAddedToCart(product._id);
    setTimeout(() => setShowAddedToCart(null), 2000);
  };

  const updateCartQuantity = (productId, selectedImage, newQuantity) => {
    if (newQuantity < 1) return;
    setCart(prevCart =>
      prevCart.map(item =>
        item.product._id === productId && item.selectedImage === selectedImage
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const removeFromCart = (productId, selectedImage) => {
    setCart(prevCart => prevCart.filter(item => !(item.product._id === productId && item.selectedImage === selectedImage)));
  };

  const handleOrderSubmit = () => {
    if (!orderForm.address) {
      alert('يرجى إدخال العنوان');
      return;
    }
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    if (!token || !userId) {
      setError('غير مصرح: يرجى تسجيل الدخول مرة أخرى');
      navigate('/login');
      return;
    }

    const promises = cart.map(item =>
      axios.post(
        `${process.env.REACT_APP_API_URL}/api/orders`,
        {
          product: item.product._id,
          vendor: item.product.vendor._id || item.product.vendor,
          quantity: item.quantity,
          user: userId, // إرسال معرف العميل
          address: orderForm.address,
          selectedImage: item.selectedImage
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
    );

    Promise.all(promises)
      .then(() => {
        alert('تم إنشاء الطلبات بنجاح!');
        setCart([]);
        setShowOrderForm(false);
        setOrderForm({ address: '' });
        setError('');
      })
      .catch(err => {
        const errorMessage = err.response?.data?.message || 'خطأ في تقديم الطلب';
        setError(errorMessage);
        if (err.response?.status === 401) {
          setError('غير مصرح: يرجى تسجيل الدخول مرة أخرى');
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          localStorage.removeItem('userId');
          navigate('/login');
        }
      });
  };

  const handleOrderCancel = () => {
    setShowOrderForm(false);
    setOrderForm({ address: '' });
  };

  const openMedia = (media, type) => {
    setSelectedMedia({ url: `${process.env.REACT_APP_API_URL}/uploads/${media}`, type });
  };

  const closeMedia = () => setSelectedMedia(null);

  const handlePrevMedia = (productId, product) => {
    const totalMedia = (product.videos?.length || 0) + (product.images?.length || 0);
    setCurrentMediaIndex(prev => {
      const currentIndex = prev[productId] || 0;
      const nextIndex = (currentIndex - 1 + totalMedia) % totalMedia;
      const mediaType = nextIndex < (product.videos?.length || 0) ? 'video' : 'image';
      setCurrentMediaType(prevType => ({
        ...prevType,
        [productId]: mediaType
      }));
      return {
        ...prev,
        [productId]: nextIndex
      };
    });
    clearInterval(intervalRefs.current[productId]);
  };

  const handleNextMedia = (productId, product) => {
    const totalMedia = (product.videos?.length || 0) + (product.images?.length || 0);
    setCurrentMediaIndex(prev => {
      const currentIndex = prev[productId] || 0;
      const nextIndex = (currentIndex + 1) % totalMedia;
      const mediaType = nextIndex < (product.videos?.length || 0) ? 'video' : 'image';
      setCurrentMediaType(prevType => ({
        ...prevType,
        [productId]: mediaType
      }));
      return {
        ...prev,
        [productId]: nextIndex
      };
    });
    clearInterval(intervalRefs.current[productId]);
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
      boxShadow: '0 10px 20px rgba(0, 0, 0, 0.3)',
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
    },
  };

  const buttonVariants = {
    hover: {
      scale: 1.1,
      boxShadow: '0 6px 12px rgba(0, 0, 0, 0.2)',
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
      transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
    },
    tap: {
      scale: 0.95,
      transition: { duration: 0.1, ease: 'easeOut' },
    },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  };

  const toastVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
    },
  };

  const role = localStorage.getItem('role');
  const isCustomer = role === 'customer';

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center bg-gradient-to-b from-gray-900 to-gray-800 p-4 sm:p-6 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ willChange: 'opacity' }}
    >
      {error && (
        <motion.p
          className="text-center text-red-400 text-lg mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {error}
        </motion.p>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-center w-full max-w-7xl mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          🛒 منتجات التاجر: {vendorName}
        </h1>
        <div className="flex items-center gap-4">
          <motion.select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="p-2 rounded-xl bg-[#2A2A3E] text-white text-sm border border-gray-200/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
            whileHover={{ scale: 1.02 }}
            whileFocus={{ scale: 1.02 }}
          >
            <option value="">الكل</option>
            <option value="رجالي">رجالي</option>
            <option value="حريمي">حريمي</option>
            <option value="أطفال">أطفال</option>
          </motion.select>
          {isCustomer && (
            <motion.button
              onClick={() => setShowCartModal(true)}
              className="px-4 py-2 sm:px-6 sm:py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-500 to-blue-700 shadow-lg"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              🛒 السلة ({cart.reduce((acc, item) => acc + item.quantity, 0)})
            </motion.button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full max-w-7xl">
        {filteredProducts.length === 0 ? (
          <p className="text-gray-400 text-xl col-span-full text-center">لا توجد منتجات متاحة أو جاري التحميل...</p>
        ) : (
          filteredProducts.map(product => (
            <motion.div
              key={product._id}
              className="bg-[#1F1F2E] rounded-2xl shadow-xl overflow-hidden border border-gray-600/50 transition-all duration-300 flex flex-col"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover="hover"
            >
              <div className="relative w-full aspect-[4/3] bg-gray-800">
                {(product.videos && product.videos.length > 0 && currentMediaType[product._id] === 'video') ? (
                  <>
                    <video
                      src={`${process.env.REACT_APP_API_URL}/uploads/${product.videos[currentMediaIndex[product._id] || 0]}`}
                      controls
                      className="w-full h-full object-contain rounded-t-xl transition-transform duration-300"
                      onClick={() => openMedia(product.videos[currentMediaIndex[product._id] || 0], 'video')}
                      onError={(e) => console.error('خطأ في تحميل الفيديو:', e)}
                    />
                    {(product.videos.length + (product.images?.length || 0)) > 1 && (
                      <div className="absolute inset-x-0 bottom-2 flex justify-between px-4">
                        <motion.button
                          className="bg-gray-900/70 text-white p-2 rounded-full shadow-md hover:bg-gray-900/90"
                          onClick={() => handlePrevMedia(product._id, product)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          ←
                        </motion.button>
                        <motion.button
                          className="bg-gray-900/70 text-white p-2 rounded-full shadow-md hover:bg-gray-900/90"
                          onClick={() => handleNextMedia(product._id, product)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          →
                        </motion.button>
                      </div>
                    )}
                  </>
                ) : (product.images && product.images.length > 0) ? (
                  <>
                    <img
                      src={`${process.env.REACT_APP_API_URL}/uploads/${product.images[(currentMediaIndex[product._id] || 0) - (product.videos?.length || 0)]}`}
                      alt={`${product.name}`}
                      className="w-full h-full object-contain rounded-t-xl transition-transform duration-300"
                      onClick={() => openMedia(product.images[(currentMediaIndex[product._id] || 0) - (product.videos?.length || 0)], 'image')}
                      onError={(e) => {
                        console.error('خطأ في تحميل الصورة:', e);
                        e.target.src = `${process.env.REACT_APP_API_URL}/Uploads/placeholder-image.jpg`;
                      }}
                    />
                    {(product.videos.length + (product.images?.length || 0)) > 1 && (
                      <div className="absolute inset-x-0 bottom-2 flex justify-between px-4">
                        <motion.button
                          className="bg-gray-900/70 text-white p-2 rounded-full shadow-md hover:bg-gray-900/90"
                          onClick={() => handlePrevMedia(product._id, product)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          ←
                        </motion.button>
                        <motion.button
                          className="bg-gray-900/70 text-white p-2 rounded-full shadow-md hover:bg-gray-900/90"
                          onClick={() => handleNextMedia(product._id, product)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          →
                        </motion.button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center rounded-t-xl">
                    <img
                      src={`${process.env.REACT_APP_API_URL}/uploads/placeholder-image.jpg`}
                      alt="صورة بديلة"
                      className="w-full h-full object-contain"
                      onError={(e) => console.error('خطأ في تحميل الصورة البديلة:', e)}
                    />
                  </div>
                )}
              </div>
              <div className="p-4 sm:p-6 flex flex-col flex-grow">
                <h2 className="text-xl sm:text-2xl font-semibold mb-3 text-right bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                  {product.name}
                </h2>
                {(product.videos?.length > 0 || product.images?.length > 0) && (
                  <div className="flex flex-wrap gap-2 mb-3 justify-end">
                    {product.videos?.map((vid, idx) => (
                      <video
                        key={`vid-${idx}`}
                        src={`${process.env.REACT_APP_API_URL}/uploads/${vid}`}
                        controls
                        className="w-20 h-20 object-cover rounded-lg cursor-pointer shadow-sm"
                        onClick={() => openMedia(vid, 'video')}
                        onError={(e) => console.error('خطأ في تحميل الفيديو:', e)}
                      />
                    ))}
                    {product.images?.map((img, idx) => (
                      <img
                        key={`img-${idx}`}
                        src={`${process.env.REACT_APP_API_URL}/uploads/${img}`}
                        alt={`صورة ${idx + 1}`}
                        className="w-20 h-20 object-cover rounded-lg cursor-pointer shadow-sm"
                        onClick={() => {
                          setCurrentMediaIndex(prev => ({
                            ...prev,
                            [product._id]: idx + (product.videos?.length || 0)
                          }));
                          setCurrentMediaType(prev => ({
                            ...prev,
                            [product._id]: 'image'
                          }));
                          openMedia(img, 'image');
                        }}
                        onError={(e) => {
                          console.error('خطأ في تحميل الصورة:', e);
                          e.target.src = `${process.env.REACT_APP_API_URL}/Uploads/placeholder-image.jpg`;
                        }}
                      />
                    ))}
                  </div>
                )}
                <div className="space-y-2 text-right text-gray-300 text-sm sm:text-base flex-grow">
                  <p>
                    👤 التاجر:{' '}
                    <Link
                      to={`/vendors/${product.vendor?._id}/products`}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {product.vendor?.name || 'غير معروف'}
                    </Link>
                  </p>
                  <p>📦 النوع: {product.type}</p>
                  <p>💰 سعر الكرتونة: {product.price} جنيه</p>
                  <p>💸 سعر الجوز: {(product.price / product.quantityPerCarton).toFixed(2)} جنيه</p>
                  <p>📦 الكرتونة: {product.quantityPerCarton} جوز</p>
                  <p>🏭 المصنع: {product.manufacturer}</p>
                  <p className="text-gray-400 line-clamp-2">{product.description}</p>
                </div>
                {isCustomer && (
                  <motion.button
                    onClick={() => addToCart(product)}
                    className="w-full mt-4 py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg hover:shadow-xl transition-all duration-300"
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    🛒 إضافة إلى السلة
                  </motion.button>
                )}
                <AnimatePresence>
                  {showAddedToCart === product._id && (
                    <motion.div
                      className="absolute top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-full text-sm shadow-md"
                      variants={toastVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                    >
                      تمت الإضافة إلى السلة
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))
        )}
      </div>
      {/* Modal لعرض السلة (فقط للعملاء) */}
      <AnimatePresence>
        {showCartModal && isCustomer && (
          <motion.div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={modalVariants}
            onClick={() => setShowCartModal(false)}
          >
            <motion.div
              className="bg-[#1F1F2E] p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-right bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                السلة
              </h2>
              {cart.length === 0 ? (
                <p className="text-gray-400 text-center">السلة فارغة</p>
              ) : (
                cart.map(item => (
                  <div key={`${item.product._id}-${item.selectedImage}`} className="flex items-center justify-between mb-4 gap-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={`${process.env.REACT_APP_API_URL}/uploads/${item.selectedImage}`}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded-lg"
                        onError={(e) => {
                          console.error('خطأ في تحميل صورة السلة:', e);
                          e.target.src = `${process.env.REACT_APP_API_URL}/Uploads/placeholder-image.jpg`;
                        }}
                      />
                      <div className="text-right">
                        <p className="font-semibold">{item.product.name}</p>
                        <p>سعر الكرتونة: {item.product.price} جنيه</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateCartQuantity(item.product._id, item.selectedImage, parseInt(e.target.value))}
                        className="w-16 p-2 border border-gray-200/30 rounded-xl bg-[#2A2A3E] text-white text-center"
                      />
                      <motion.button
                        onClick={() => removeFromCart(item.product._id, item.selectedImage)}
                        className="text-red-500 hover:text-red-400 p-2 rounded-full"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        ❌
                      </motion.button>
                    </div>
                  </div>
                ))
              )}
              {cart.length > 0 && (
                <div className="flex space-x-2 space-x-reverse mt-6">
                  <motion.button
                    onClick={() => {
                      setShowCartModal(false);
                      setShowOrderForm(true);
                    }}
                    className="w-full py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-green-500 to-green-700 shadow-lg"
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    طلب
                  </motion.button>
                  <motion.button
                    onClick={() => setShowCartModal(false)}
                    className="w-full py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-red-500 to-red-700 shadow-lg"
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
      {/* Modal لإدخال بيانات الطلب (فقط للعملاء) */}
      <AnimatePresence>
        {showOrderForm && isCustomer && (
          <motion.div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={modalVariants}
            onClick={handleOrderCancel}
          >
            <motion.div
              className="bg-[#1F1F2E] p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-right bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                إدخال بيانات الطلب
              </h2>
              <input
                type="text"
                placeholder="العنوان"
                value={orderForm.address}
                onChange={(e) => setOrderForm({ ...orderForm, address: e.target.value })}
                className="w-full p-3 mb-4 border border-gray-200/30 rounded-xl bg-[#2A2A3E] text-white text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex space-x-2 space-x-reverse">
                <motion.button
                  onClick={handleOrderSubmit}
                  className="w-full py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-green-500 to-green-700 shadow-lg"
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  إرسال
                </motion.button>
                <motion.button
                  onClick={handleOrderCancel}
                  className="w-full py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-red-500 to-red-700 shadow-lg"
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
                <img
                  src={selectedMedia.url}
                  className="max-w-full max-h-screen rounded-xl shadow-lg"
                  alt="صورة كاملة"
                  onError={(e) => {
                    console.error('خطأ في تحميل الصورة في المودال:', e);
                    e.target.src = `${process.env.REACT_APP_API_URL}/Uploads/placeholder-image.jpg`;
                  }}
                />
              ) : (
                <video
                  src={selectedMedia.url}
                  className="max-w-full max-h-screen rounded-xl shadow-lg"
                  controls
                  autoPlay
                  onError={(e) => console.error('خطأ في تحميل الفيديو في المودال:', e)}
                />
              )}
              <motion.button
                onClick={closeMedia}
                className="absolute top-2 right-2 text-red-500 text-2xl bg-gray-900/70 rounded-full p-2 hover:bg-gray-900/90 hover:text-red-400"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                ×
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default VendorProducts;

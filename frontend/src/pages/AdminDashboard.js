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
  const intervalRefs = useRef({});

  useEffect(() => {
    // Load products
    axios
      .get(`${process.env.REACT_APP_API_URL}/api/products/all-products`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
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
      })
      .catch(err => console.error('خطأ في جلب المنتجات:', err));
  }, []);

  useEffect(() => {
    // Filter products based on filterType
    if (filterType === '') {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(products.filter(product => product.type === filterType));
    }
  }, [filterType, products]);

  useEffect(() => {
    // Set up intervals for media rotation (only for images)
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

  const handleApprove = (id) => {
    axios
      .put(`${process.env.REACT_APP_API_URL}/api/products/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      .then(res => setProducts(products.map(p => (p._id === id ? res.data : p))))
      .catch(err => alert('خطأ: ' + err.message));
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

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center bg-gradient-to-b from-gray-900 to-gray-800 p-4 sm:p-6 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ willChange: 'opacity' }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-center w-full max-w-7xl mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          👨‍💼 لوحة تحكم الأدمن
        </h1>
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
                      onError={(e) => {
                        console.error('خطأ في تحميل الفيديو:', e);
                        e.target.src = `${process.env.REACT_APP_API_URL}/uploads/placeholder-video.mp4`;
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
                ) : (product.images && product.images.length > 0) ? (
                  <>
                    <img
                      src={`${process.env.REACT_APP_API_URL}/uploads/${product.images[(currentMediaIndex[product._id] || 0) - (product.videos?.length || 0)]}`}
                      alt={`${product.name}`}
                      className="w-full h-full object-contain rounded-t-xl transition-transform duration-300"
                      onClick={() => openMedia(product.images[(currentMediaIndex[product._id] || 0) - (product.videos?.length || 0)], 'image')}
                      onError={(e) => {
                        console.error('خطأ في تحميل الصورة:', e);
                        e.target.src = `${process.env.REACT_APP_API_URL}/uploads/placeholder-image.jpg`;
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
                          e.target.src = `${process.env.REACT_APP_API_URL}/uploads/placeholder-image.jpg`;
                        }}
                      />
                    ))}
                  </div>
                )}
                <div className="space-y-2 text-right text-gray-300 text-sm sm:text-base flex-grow">
                  <p>👤 التاجر: {product.vendor?.name || 'غير معروف'}</p>
                  <p>📦 النوع: {product.type}</p>
                  <p>💰 سعر الكرتونة: {product.price} جنيه</p>
                  <p>💸 سعر الجوز: {(product.price / product.quantityPerCarton).toFixed(2)} جنيه</p>
                  <p>📦 الكرتونة: {product.quantityPerCarton} جوز</p>
                  <p>🏭 المصنع: {product.manufacturer}</p>
                  <p className="text-gray-400 line-clamp-2">{product.description}</p>
                  <p
                    className={`mb-4 px-3 py-2 rounded-full text-sm font-medium text-center ${
                      product.approved
                        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                        : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                    }`}
                  >
                    📋 الحالة: {product.approved ? '✅ موافق عليه' : '⏳ في انتظار الموافقة'}
                  </p>
                </div>
                {!product.approved && (
                  <motion.button
                    onClick={() => handleApprove(product._id)}
                    className="w-full mt-4 py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg hover:shadow-xl transition-all duration-300"
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    ✅ الموافقة
                  </motion.button>
                )}
              </div>
            </motion.div>
          ))
        )}
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
                <img
                  src={selectedMedia.url}
                  className="max-w-full max-h-screen rounded-xl shadow-lg"
                  alt="صورة كاملة"
                  onError={(e) => {
                    console.error('خطأ في تحميل الصورة في المودال:', e);
                    e.target.src = `${process.env.REACT_APP_API_URL}/uploads/placeholder-image.jpg`;
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

export default AdminDashboard;

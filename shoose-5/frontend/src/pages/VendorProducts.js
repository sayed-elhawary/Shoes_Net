import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const VendorProducts = () => {
  const { vendorId } = useParams();
  const [products, setProducts] = useState([]);
  const [vendorName, setVendorName] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const intervalRefs = useRef({});

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/products/vendor/${vendorId}`)
      .then(res => {
        setProducts(res.data);
        setVendorName(res.data[0]?.vendor?.name || 'تاجر غير معروف');
        const initialIndexes = res.data.reduce((acc, product) => ({
          ...acc,
          [product._id]: 0
        }), {});
        setCurrentImageIndex(initialIndexes);
      })
      .catch(err => console.error('خطأ في جلب المنتجات:', err));

    products.forEach(product => {
      if (product.images && product.images.length > 1) {
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
      <h1 className="text-2xl md:text-3xl font-bold mb-8 text-center">🛒 منتجات التاجر: {vendorName}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
        {products.length === 0 ? (
          <p className="text-gray-400 text-xl">لا توجد منتجات لهذا التاجر.</p>
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
                <p className="text-gray-300 mb-1 text-right">📦 النوع: {product.type}</p>
                <p className="text-gray-300 mb-1 text-right">💰 السعر: {product.price} جنيه</p>
                <p className="text-gray-300 mb-1 text-right">📦 الكرتونة: {product.quantityPerCarton} جوز</p>
                <p className="text-gray-300 mb-1 text-right">🏭 المصنع: {product.manufacturer}</p>
                <p className="text-gray-400 mb-4 text-right">{product.description}</p>
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

export default VendorProducts;

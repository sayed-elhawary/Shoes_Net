// frontend/src/pages/VendorProducts.js
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';

const VendorProducts = () => {
  const { vendorId } = useParams();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [vendorName, setVendorName] = useState('');
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

  // === الرسائل ===
  const [orders, setOrders] = useState([]);
  const [selectedOrderForMessages, setSelectedOrderForMessages] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [newImage, setNewImage] = useState(null);
  const [newImagePreview, setNewImagePreview] = useState(null);
  const [showUnreadList, setShowUnreadList] = useState(false);
  const socketRef = useRef(null);
  const currentOrderIdRef = useRef(null);
  const messagesEndRef = useRef(null);

  // === Toast ===
  const showToast = (message, type = 'success') => {
    setError(type === 'error' ? message : '');
    if (type === 'success') {
      setShowAddedToCart(true);
      setTimeout(() => setShowAddedToCart(false), 2000);
    }
  };

  // === Image preview effect ===
  useEffect(() => {
    if (newImage) {
      const reader = new FileReader();
      reader.onloadend = () => setNewImagePreview(reader.result);
      reader.readAsDataURL(newImage);
    } else {
      setNewImagePreview(null);
    }
  }, [newImage]);

  // === Scroll to bottom ===
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // === دالة جلب المنتجات (تُستخدم في كل الحالات) ===
  const fetchProducts = () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    axios
      .get(`${process.env.REACT_APP_API_URL}/api/products/vendor/${vendorId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(res => {
        const approved = res.data.filter(p => p.approved);

        // ترتيب حسب updatedAt تنازليًا
        const sorted = [...approved].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        setProducts(sorted);
        setFilteredProducts(sorted);
        setVendorName(sorted[0]?.vendor?.name || 'تاجر غير معروف');

        const initialIndexes = sorted.reduce((acc, p) => ({ ...acc, [p._id]: 0 }), {});
        const initialTypes = sorted.reduce((acc, p) => ({
          ...acc,
          [p._id]: p.videos?.length > 0 ? 'video' : 'image'
        }), {});
        setCurrentMediaIndex(initialIndexes);
        setCurrentMediaType(initialTypes);
        setError('');
      })
      .catch(err => {
        showToast(err.response?.data?.message || 'خطأ في جلب المنتجات', 'error');
        if (err.response?.status === 401) {
          localStorage.clear();
          navigate('/login');
        }
      });
  };

  // === جلب المنتجات + التحقق من الـ Token ===
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const userId = localStorage.getItem('userId');

    if (!token || !['admin', 'vendor', 'customer'].includes(role)) {
      showToast('غير مصرح', 'error');
      navigate('/login');
      return;
    }

    fetchProducts();

    if (role === 'customer') {
      const saved = localStorage.getItem('cart');
      if (saved) setCart(JSON.parse(saved));
    }

    if (role === 'customer' && userId) {
      axios
        .get(`${process.env.REACT_APP_API_URL}/api/orders/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then(res => setPreviousOrders(res.data))
        .catch(() => {});
    }
  }, [vendorId, navigate]);

  // === Socket.IO connection & product updates ===
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      socketRef.current = io(process.env.REACT_APP_API_URL, { autoConnect: false });
      const socket = socketRef.current;
      socket.connect();
      socket.emit('authenticate', { userId: payload.id, role: payload.role });

      socket.on('productUpdated', (updatedProduct) => {
        if (updatedProduct.vendor._id !== vendorId && updatedProduct.vendor !== vendorId) return;

        setProducts(prev => {
          const exists = prev.some(p => p._id === updatedProduct._id);
          const newList = exists
            ? prev.map(p => (p._id === updatedProduct._id ? updatedProduct : p))
            : [updatedProduct, ...prev.filter(p => p._id !== updatedProduct._id)];
          return newList.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        });

        setFilteredProducts(prev => {
          const exists = prev.some(p => p._id === updatedProduct._id);
          const newList = exists
            ? prev.map(p => (p._id === updatedProduct._id ? updatedProduct : p))
            : [updatedProduct, ...prev.filter(p => p._id !== updatedProduct._id)];

          let filtered = newList.filter(p => p.approved && (p.vendor._id === vendorId || p.vendor === vendorId));

          if (filterType) {
            filtered = filtered.filter(p => p.type === filterType);
          }
          if (priceRange.min || priceRange.max) {
            const min = parseFloat(priceRange.min) || 0;
            const max = parseFloat(priceRange.max) || Infinity;
            filtered = filtered.filter(p => {
              const pairPrice = p.price / p.quantityPerCarton;
              return pairPrice >= min && pairPrice <= max;
            });
          }
          return filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        });
      });

      socket.on('productDeleted', ({ _id }) => {
        setProducts(prev => prev.filter(p => p._id !== _id));
        setFilteredProducts(prev => prev.filter(p => p._id !== _id));
      });

      socket.on('connect', () => {
        console.log('Socket reconnected in VendorProducts');
        fetchProducts();
        if (currentOrderIdRef.current) {
          socket.emit('joinOrder', currentOrderIdRef.current);
        }
      });

      socket.on('error', (err) => {
        showToast(`خطأ في الاتصال: ${err.message || 'غير معروف'}`, 'error');
      });

      return () => {
        if (socket.connected) socket.disconnect();
      };
    } catch (e) {
      showToast('خطأ في التوثيق', 'error');
      localStorage.clear();
      navigate('/login');
    }
  }, [navigate, vendorId, filterType, priceRange]);

  // === Fetch unread messages ===
  const fetchUnreadOrders = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    axios
      .get(`${process.env.REACT_APP_API_URL}/api/orders?unreadOnly=true`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(res => setOrders(res.data.orders || []))
      .catch(err => {
        if (err.response?.status === 401) {
          localStorage.clear();
          navigate('/login');
        }
      });
  };

  useEffect(() => {
    fetchUnreadOrders();
  }, []);

  // === Messages socket handling ===
  useEffect(() => {
    if (!selectedOrderForMessages || !socketRef.current) {
      if (currentOrderIdRef.current && socketRef.current) {
        socketRef.current.emit('leaveOrder', currentOrderIdRef.current);
        currentOrderIdRef.current = null;
      }
      return;
    }

    const orderId = selectedOrderForMessages._id;
    currentOrderIdRef.current = orderId;
    socketRef.current.emit('joinOrder', orderId);

    const token = localStorage.getItem('token');
    axios
      .post(
        `${process.env.REACT_APP_API_URL}/api/orders/${orderId}/markRead`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(res => {
        setOrders(prev => prev.map(o => (o._id === orderId ? { ...o, unreadCount: 0 } : o)));
        setSelectedOrderForMessages(prev => ({
          ...prev,
          messages: res.data.order.messages || [],
          unreadCount: 0,
        }));
      })
      .catch(() => {});

    const handleNewMessage = (message) => {
      if (message.orderId !== orderId) return;
      setSelectedOrderForMessages(prev => {
        const exists = prev.messages?.some(m => m._id === message._id);
        if (exists) return prev;
        return { ...prev, messages: [...(prev.messages || []), message] };
      });
      if (message.from !== getUserRole()) {
        setOrders(prev => prev.map(o =>
          o._id === orderId ? { ...o, unreadCount: (o.unreadCount || 0) + 1 } : o
        ));
      }
    };

    const socket = socketRef.current;
    socket.on('newMessage', handleNewMessage);
    socket.on('messagesUpdated', (data) => {
      if (data.orderId !== orderId) return;
      setSelectedOrderForMessages(prev => ({
        ...prev,
        messages: data.messages || [],
        unreadCount: data.messages.filter(m => !m.isRead && m.from !== getUserRole()).length,
      }));
    });
    socket.on('unreadUpdate', ({ orderId: updatedId, unreadCount }) => {
      setOrders(prev => prev.map(o => (o._id === updatedId ? { ...o, unreadCount } : o)));
      if (updatedId === orderId) {
        setSelectedOrderForMessages(prev => ({ ...prev, unreadCount }));
      }
    });

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.emit('leaveOrder', orderId);
      currentOrderIdRef.current = null;
    };
  }, [selectedOrderForMessages]);

  // === Send message ===
  const handleSendMessage = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const token = localStorage.getItem('token');
    if (!token || (!newMessage.trim() && !newImage)) {
      showToast('يجب إدخال رسالة أو رفع صورة', 'error');
      return;
    }
    const formData = new FormData();
    if (newMessage.trim()) formData.append('text', newMessage.trim());
    if (newImage) formData.append('image', newImage);
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/orders/${selectedOrderForMessages._id}/message`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );
      setSelectedOrderForMessages(prev => ({ ...prev, messages: res.data.order.messages || [] }));
      setNewMessage('');
      setNewImage(null);
      setNewImagePreview(null);
      scrollToBottom();
    } catch (err) {
      showToast(err.response?.data?.message || 'خطأ في إرسال الرسالة', 'error');
    }
  };

  const openMessages = (order) => {
    setSelectedOrderForMessages(order);
    setShowUnreadList(false);
  };
  const closeMessages = () => {
    setSelectedOrderForMessages(null);
    setNewMessage('');
    setNewImage(null);
    setNewImagePreview(null);
  };

  const getUserRole = () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.role || 'user';
      } catch (e) {
        localStorage.clear();
        navigate('/login');
        return 'user';
      }
    }
    return 'user';
  };
  const userRole = getUserRole();

  // === تصفية المنتجات ===
  useEffect(() => {
    let filtered = products.filter(p => p.vendor._id === vendorId || p.vendor === vendorId);
    if (filterType) {
      filtered = filtered.filter(p => p.type === filterType);
    }
    if (priceRange.min || priceRange.max) {
      const min = parseFloat(priceRange.min) || 0;
      const max = parseFloat(priceRange.max) || Infinity;
      filtered = filtered.filter(p => {
        const pairPrice = p.price / p.quantityPerCarton;
        return pairPrice >= min && pairPrice <= max;
      });
    }
    setFilteredProducts(filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
  }, [filterType, priceRange, products, vendorId]);

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

  const addToCart = (product) => {
    const type = currentMediaType[product._id] || 'image';
    if (type === 'video') {
      showToast('يرجى اختيار صورة', 'error');
      return;
    }
    const imgIndex = (currentMediaIndex[product._id] || 0) - (product.videos?.length || 0);
    const selectedImage = product.images[imgIndex] || 'placeholder-image.jpg';
    setCart(prev => {
      const exists = prev.find(i => i.product._id === product._id && i.selectedImage === selectedImage);
      if (exists) {
        return prev.map(i =>
          i.product._id === product._id && i.selectedImage === selectedImage
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { product, quantity: 1, selectedImage }];
    });
    showToast('تمت الإضافة إلى السلة');
  };

  const updateCartQuantity = (id, img, qty) => {
    if (qty < 1) return;
    setCart(prev => prev.map(i => i.product._id === id && i.selectedImage === img ? { ...i, quantity: qty } : i));
  };

  const removeFromCart = (id, img) => {
    setCart(prev => prev.filter(i => !(i.product._id === id && i.selectedImage === img)));
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
        showToast('تم إنشاء الطلبات بنجاح');
        setCart([]);
        setShowOrderForm(false);
        setOrderForm({ address: '' });
        axios.get(`${process.env.REACT_APP_API_URL}/api/orders/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => setPreviousOrders(res.data));
      })
      .catch(err => {
        showToast(err.response?.data?.message || 'خطأ في تقديم الطلب', 'error');
        if (err.response?.status === 401) {
          localStorage.clear();
          navigate('/login');
        }
      })
      .finally(() => setIsSubmitting(false));
  };

  const openMedia = (media, type) => {
    setSelectedMedia({ url: `${process.env.REACT_APP_API_URL}/Uploads/${media}`, type });
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
    hover: { scale: 1.03, boxShadow: '0 12px 24px rgba(0, 0, 0, 0.2)' }
  };
  const buttonVariants = { hover: { scale: 1.05 }, tap: { scale: 0.95 } };
  const modalVariants = { hidden: { opacity: 0, scale: 0.85 }, visible: { opacity: 1, scale: 1 } };
  const toastVariants = { hidden: { opacity: 0, x: 50 }, visible: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 50 } };

  const role = localStorage.getItem('role');
  const isCustomer = role === 'customer';
  const totalUnread = orders.reduce((acc, o) => acc + (o.unreadCount || 0), 0);
  const cartCount = cart.reduce((a, i) => a + i.quantity, 0);

  const openMessagesFromFloating = () => {
    if (orders.length === 1) {
      openMessages(orders[0]);
    } else {
      setShowUnreadList(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#18191a] text-white p-4 relative overflow-hidden">
      {/* خلفية موف ناعمة */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-900 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-800 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto">
        {/* === العنوان === */}
        <motion.div
          className="flex flex-col items-center mb-8"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
            منتجات التاجر: {vendorName}
          </h1>
          <p className="text-purple-300 text-lg mt-1">المنتجات المتاحة</p>
        </motion.div>

        {/* === الفلتر + السلة === */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <motion.select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="p-3 rounded-xl bg-[#3a3b3c]/60 backdrop-blur-md border border-gray-600 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30"
            whileHover={{ scale: 1.03 }}
          >
            <option value="">الكل</option>
            <option value="رجالي">رجالي</option>
            <option value="حريمي">حريمي</option>
            <option value="أطفال">أطفال</option>
          </motion.select>

          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="من (جوز)"
              value={priceRange.min}
              onChange={e => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
              className="p-3 w-24 rounded-xl bg-[#3a3b3c]/60 border border-gray-600 text-white placeholder:text-gray-400 focus:outline-none focus:border-purple-500"
            />
            <span className="text-gray-400">إلى</span>
            <input
              type="number"
              placeholder="إلى (جوز)"
              value={priceRange.max}
              onChange={e => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
              className="p-3 w-24 rounded-xl bg-[#3a3b3c]/60 border border-gray-600 text-white placeholder:text-gray-400 focus:outline-none focus:border-purple-500"
            />
          </div>

          {isCustomer && (
            <motion.button
              onClick={() => setShowCartModal(true)}
              className="relative px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 shadow-lg hover:from-purple-700 hover:to-purple-800 flex items-center gap-2"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </motion.button>
          )}
        </div>

        {/* === المنتجات === */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.length === 0 ? (
            <p className="col-span-full text-center text-gray-400 text-xl">لا توجد منتجات...</p>
          ) : (
            filteredProducts.map(product => (
              <motion.div
                key={product._id}
                className="bg-[#242526]/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden"
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                whileHover="hover"
              >
                <div className="relative aspect-square bg-[#3a3b3c]">
                  {currentMediaType[product._id] === 'video' && product.videos?.length > 0 ? (
                    <video
                      src={`${process.env.REACT_APP_API_URL}/Uploads/${product.videos[currentMediaIndex[product._id]]}`}
                      controls
                      className="w-full h-full object-contain"
                      onClick={() => openMedia(product.videos[currentMediaIndex[product._id]], 'video')}
                    />
                  ) : product.images?.length > 0 ? (
                    <img
                      src={`${process.env.REACT_APP_API_URL}/Uploads/${product.images[(currentMediaIndex[product._id] || 0) - (product.videos?.length || 0)]}`}
                      alt={product.name}
                      className="w-full h-full object-contain"
                      onClick={() => openMedia(product.images[(currentMediaIndex[product._id] || 0) - (product.videos?.length || 0)], 'image')}
                    />
                  ) : (
                    <div className="w-full h-full bg-[#3a3b3c] flex items-center justify-center">
                      <span className="text-gray-500">بدون صورة</span>
                    </div>
                  )}
                  {(product.videos?.length || 0) + (product.images?.length || 0) > 1 && (
                    <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-3">
                      <button onClick={() => handlePrevMedia(product._id, product)} className="bg-black/50 text-white p-2 rounded-full backdrop-blur-sm hover:bg-black/70 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button onClick={() => handleNextMedia(product._id, product)} className="bg-black/50 text-white p-2 rounded-full backdrop-blur-sm hover:bg-black/70 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-5 space-y-2 text-right">
                  <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
                    {product.name}
                  </h2>
                  <div className="text-sm text-gray-300 space-y-1">
                    <p>النوع: {product.type}</p>
                    <p>سعر الكرتونة: {product.price} جنيه</p>
                    <p>سعر الجوز: {(product.price / product.quantityPerCarton).toFixed(2)} جنيه</p>
                    <p>الكرتونة: {product.quantityPerCarton} جوز</p>
                    <p>المصنع: {product.manufacturer}</p>
                  </div>
                  {isCustomer && (
                    <motion.button
                      onClick={() => addToCart(product)}
                      className="w-full mt-4 py-3 rounded-xl text-white font-bold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg"
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

      {/* === مودال السلة === */}
      <AnimatePresence>
        {showCartModal && isCustomer && (
          <motion.div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" variants={modalVariants} initial="hidden" animate="visible" exit="hidden" onClick={() => setShowCartModal(false)}>
            <motion.div className="bg-[#242526]/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-gray-700 w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600 mb-6 text-right">السلة</h2>
              {cart.length === 0 ? <p className="text-center text-gray-400">السلة فارغة</p> : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {cart.map(item => (
                    <div key={`${item.product._id}-${item.selectedImage}`} className="flex items-center justify-between gap-4 p-3 bg-[#3a3b3c]/50 rounded-xl">
                      <img src={`${process.env.REACT_APP_API_URL}/Uploads/${item.selectedImage}`} alt="" className="w-16 h-16 object-cover rounded-lg" />
                      <div className="text-right flex-1">
                        <p className="font-semibold">{item.product.name}</p>
                        <p className="text-sm text-gray-400">سعر الكرتونة: {item.product.price} جنيه</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="number" min="1" value={item.quantity} onChange={e => updateCartQuantity(item.product._id, item.selectedImage, parseInt(e.target.value))} className="w-16 p-2 bg-[#3a3b3c] rounded text-center" />
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

      {/* === مودال الطلب === */}
      <AnimatePresence>
        {showOrderForm && isCustomer && (
          <motion.div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" variants={modalVariants} initial="hidden" animate="visible" exit="hidden" onClick={() => setShowOrderForm(false)}>
            <motion.div className="bg-[#242526]/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-gray-700 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600 mb-6 text-right">إدخال العنوان</h2>
              <input type="text" placeholder="العنوان" value={orderForm.address} onChange={e => setOrderForm({ address: e.target.value })} className="w-full p-4 mb-6 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30" />
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

      {/* === مودال الوسائط === */}
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

      {/* === مودال الرسائل === */}
      <AnimatePresence>
        {selectedOrderForMessages && (
          <motion.div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={closeMessages}
          >
            <motion.div
              className="bg-[#242526] p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-3xl font-bold mb-6 text-right bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-purple-700">
                الرسائل للطلب #{selectedOrderForMessages.orderNumber}
              </h2>
              <div className="flex-1 overflow-y-auto mb-6 bg-[#3a3b3c] p-4 rounded-2xl shadow-inner">
                {selectedOrderForMessages.messages && selectedOrderForMessages.messages.length > 0 ? (
                  <div className="space-y-4">
                    {selectedOrderForMessages.messages.map((msg, index) => {
                      const isMyMessage = msg.from === userRole;
                      const senderName = msg.from === 'vendor' ? selectedOrderForMessages.product?.vendor?.name : selectedOrderForMessages.user?.name || 'غير معروف';
                      return (
                        <div key={msg._id || index} className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs sm:max-w-sm p-4 rounded-2xl shadow-md ${isMyMessage ? 'bg-gradient-to-r from-purple-600 to-purple-800 text-white' : 'bg-gray-700 text-white'}`}>
                            <p className="font-bold text-sm opacity-90">
                              {msg.from === 'vendor' ? 'التاجر' : 'العميل'}: {senderName}
                            </p>
                            {msg.text && <p className="mt-2 text-lg">{msg.text}</p>}
                            {msg.image && (
                              <img
                                src={`${process.env.REACT_APP_API_URL}/Uploads/${msg.image}`}
                                alt="صورة الرسالة"
                                className="mt-3 w-full max-w-48 object-cover rounded-xl cursor-pointer shadow-lg hover:shadow-xl transition"
                                onClick={(e) => { e.stopPropagation(); openMedia(msg.image, 'image'); }}
                              />
                            )}
                            <div className="flex items-center justify-between mt-3 text-xs opacity-70">
                              <p>{new Date(msg.timestamp).toLocaleString('ar-EG')}</p>
                              {isMyMessage && (
                                <span>{msg.isRead ? 'Seen' : msg.isDelivered ? 'Delivered' : 'Sent'}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-gray-400 text-lg">لا توجد رسائل بعد.</p>
                )}
                <div ref={messagesEndRef} />
              </div>
              {(userRole === 'vendor' || userRole === 'customer') && (
                <form onSubmit={handleSendMessage} className="space-y-4">
                  <textarea
                    placeholder="اكتب رسالتك هنا..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="w-full p-4 rounded-xl bg-[#3a3b3c] text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 text-right resize-none"
                    rows="4"
                  />
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setNewImage(e.target.files[0] || null)}
                      className="text-sm text-gray-300 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                    />
                    {newImagePreview && (
                      <div className="relative">
                        <img src={newImagePreview} alt="معاينة" className="w-24 h-24 object-cover rounded-xl shadow-lg" />
                        <button
                          type="button"
                          onClick={() => { setNewImage(null); setNewImagePreview(null); }}
                          className="absolute top-0 right-0 bg-red-800 text-white rounded-full w-8 h-8 flex items-center justify-center text-xl"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                  <motion.button
                    type="submit"
                    className="w-full py-4 rounded-xl text-white font-bold bg-gradient-to-r from-purple-600 to-purple-800 shadow-xl text-lg"
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    إرسال الرسالة
                  </motion.button>
                </form>
              )}
              <motion.button
                onClick={closeMessages}
                className="w-full mt-4 py-4 rounded-xl text-white font-bold bg-gradient-to-r from-gray-700 to-gray-900 shadow-xl text-lg"
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                إغلاق
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === زر الرسائل الثابت === */}
      {(userRole === 'customer' || userRole === 'vendor') && totalUnread > 0 && (
        <motion.div className="fixed bottom-6 right-6 z-40 block md:hidden" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
          <button onClick={openMessagesFromFloating} className="relative w-16 h-16 bg-gradient-to-r from-purple-600 to-purple-700 rounded-full shadow-2xl flex items-center justify-center text-white hover:from-purple-700 hover:to-purple-800 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {totalUnread > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center animate-pulse">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </button>
        </motion.div>
      )}

      {/* === قائمة الطلبات غير المقروءة === */}
      <AnimatePresence>
        {showUnreadList && (
          <motion.div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowUnreadList(false)}>
            <motion.div className="bg-[#242526] w-full max-w-md rounded-t-3xl shadow-2xl p-6 max-h-[80vh] overflow-y-auto" initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-purple-400 mb-4 text-center">الرسائل غير المقروءة</h3>
              {orders.length > 0 ? (
                <div className="space-y-3">
                  {orders.map(order => (
                    <div key={order._id} onClick={() => openMessages(order)} className="p-4 bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-700 transition">
                      <p className="font-bold text-purple-300">طلب #{order.orderNumber}</p>
                      <p className="text-sm text-gray-300">المنتج: {order.product?.name}</p>
                      <p className="text-xs text-red-400 mt-1">غير مقروء: {order.unreadCount}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-400">لا توجد رسائل غير مقروءة</p>
              )}
              <button onClick={() => setShowUnreadList(false)} className="w-full mt-6 py-3 bg-red-600 text-white rounded-xl font-bold">
                إغلاق
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VendorProducts;

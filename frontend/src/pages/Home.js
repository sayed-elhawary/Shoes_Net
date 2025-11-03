// frontend/src/pages/Home.js
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';

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

  // إضافات جديدة للرسائل
  const [orders, setOrders] = useState([]);
  const [selectedOrderForMessages, setSelectedOrderForMessages] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [newImage, setNewImage] = useState(null);
  const [newImagePreview, setNewImagePreview] = useState(null);
  const [showUnreadList, setShowUnreadList] = useState(false);
  const socketRef = useRef(null);
  const currentOrderIdRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Image preview effect
  useEffect(() => {
    if (newImage) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImagePreview(reader.result);
      };
      reader.readAsDataURL(newImage);
    } else {
      setNewImagePreview(null);
    }
  }, [newImage]);

  // دالة التمرير إلى الأسفل (تُستدعى فقط عند إرسال رسالة)
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Socket authentication & connection management
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('يرجى تسجيل الدخول');
      navigate('/login');
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      socketRef.current = io(process.env.REACT_APP_API_URL, { autoConnect: false });
      const socket = socketRef.current;
      socket.connect();
      socket.emit('authenticate', { userId: payload.id, role: payload.role });
      socket.on('connect', () => {
        console.log('Socket connected successfully');
        if (currentOrderIdRef.current) {
          socket.emit('joinOrder', currentOrderIdRef.current);
        }
      });
      socket.on('error', (err) => {
        console.error('Socket.IO error:', err);
        setError(`خطأ في الاتصال: ${err.message || 'غير معروف'}`);
      });
      socket.on('orderJoined', ({ orderId }) => {
        console.log(`Successfully joined order room: ${orderId}`);
      });
      socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });
      return () => {
        if (socket.connected) {
          socket.disconnect();
        }
      };
    } catch (e) {
      console.error('Token decode error:', e);
      setError('خطأ في التوثيق، يرجى تسجيل الدخول مرة أخرى');
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userId');
      navigate('/login');
    }
  }, [navigate]);

  // Fetch unread messages/orders
  const fetchUnreadOrders = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('يرجى تسجيل الدخول لجلب الطلبات');
      navigate('/login');
      return;
    }
    axios
      .get(`${process.env.REACT_APP_API_URL}/api/orders?unreadOnly=true`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(res => {
        setOrders(res.data.orders || []);
        setError(null);
      })
      .catch(err => {
        console.error('Fetch orders error:', err);
        const errorMessage = err.response?.data?.message || 'خطأ في جلب الطلبات: ' + err.message;
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

  // Trigger fetch on mount
  useEffect(() => {
    fetchUnreadOrders();
  }, []);

  // Messages modal socket handling
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
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      .then(res => {
        setOrders(prevOrders =>
          prevOrders.map(o => (o._id === orderId ? { ...o, unreadCount: 0 } : o))
        );
        setSelectedOrderForMessages(prev => ({
          ...prev,
          messages: res.data.order.messages || [],
          unreadCount: 0,
        }));
        // لا يوجد scrollToBottom هنا — لا تمرير تلقائي عند فتح المحادثة
      })
      .catch(err => {
        console.error('Mark read error:', err);
        setError('خطأ في تحديث حالة القراءة');
      });

    const handleNewMessage = (message) => {
      if (message.orderId !== orderId) return;
      setSelectedOrderForMessages(prev => {
        const exists = prev.messages?.some(m => m._id === message._id);
        if (exists) return prev;
        return {
          ...prev,
          messages: [...(prev.messages || []), message],
        };
      });
      if (message.from !== getUserRole()) {
        setOrders(prevOrders =>
          prevOrders.map(o =>
            o._id === orderId
              ? { ...o, unreadCount: (o.unreadCount || 0) + 1 }
              : o
          )
        );
      }
      // لا يوجد scrollToBottom هنا — لا تمرير تلقائي عند استقبال رسالة
    };

    const handleMessagesUpdated = (data) => {
      if (data.orderId !== orderId) return;
      setSelectedOrderForMessages(prev => ({
        ...prev,
        messages: data.messages || [],
        unreadCount: data.messages.filter(msg => !msg.isRead && msg.from !== getUserRole()).length,
      }));
      // لا يوجد scrollToBottom هنا
    };

    const handleUnreadUpdate = ({ orderId: updatedId, unreadCount }) => {
      setOrders(prev =>
        prev.map(o => (o._id === updatedId ? { ...o, unreadCount } : o))
      );
      if (updatedId === orderId) {
        setSelectedOrderForMessages(prev => ({ ...prev, unreadCount }));
      }
    };

    const socket = socketRef.current;
    socket.on('newMessage', handleNewMessage);
    socket.on('messagesUpdated', handleMessagesUpdated);
    socket.on('unreadUpdate', handleUnreadUpdate);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('messagesUpdated', handleMessagesUpdated);
      socket.off('unreadUpdate', handleUnreadUpdate);
      socket.emit('leaveOrder', orderId);
      currentOrderIdRef.current = null;
    };
  }, [selectedOrderForMessages]);

  // Send message handler — التمرير يحدث هنا فقط
  const handleSendMessage = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const token = localStorage.getItem('token');
    if (!token) {
      setError('يرجى تسجيل الدخول');
      navigate('/login');
      return;
    }
    if (!newMessage.trim() && !newImage) {
      setError('يجب إدخال رسالة أو رفع صورة');
      return;
    }
    const formData = new FormData();
    if (newMessage.trim()) formData.append('text', newMessage.trim());
    if (newImage) formData.append('image', newImage);

    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/orders/${selectedOrderForMessages._id}/message`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      setSelectedOrderForMessages(prev => ({
        ...prev,
        messages: res.data.order.messages || [],
      }));
      setNewMessage('');
      setNewImage(null);
      setNewImagePreview(null);
      setError(null);
      // التمرير يحدث فقط عند إرسال الرسالة من المستخدم
      scrollToBottom();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'خطأ في إرسال الرسالة';
      setError(errorMessage);
    }
  };

  // Messages modal open/close
  const openMessages = (order) => {
    setSelectedOrderForMessages(order);
    setShowUnreadList(false);
    // لا يوجد scrollToBottom هنا — لا تمرير تلقائي عند فتح المحادثة
  };
  const closeMessages = () => {
    setSelectedOrderForMessages(null);
    setNewMessage('');
    setNewImage(null);
    setNewImagePreview(null);
  };

  // User role getter
  const getUserRole = () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.role || 'user';
      } catch (e) {
        console.error('Error decoding token:', e);
        setError('خطأ في فك تشفير التوكن، يرجى تسجيل الدخول مرة أخرى');
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('userId');
        navigate('/login');
        return 'user';
      }
    }
    return 'user';
  };
  const userRole = getUserRole();

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
    hover: { scale: 1.03, boxShadow: '0 12px 24px rgba(0, 0, 0, 0.2)', transition: { duration: 0.2 } }
  };
  const buttonVariants = {
    hover: { scale: 1.05, boxShadow: '0 8px 16px rgba(239, 68, 68, 0.3)' },
    tap: { scale: 0.95 }
  };
  const modalVariants = { hidden: { opacity: 0, scale: 0.85 }, visible: { opacity: 1, scale: 1 } };
  const toastVariants = { hidden: { opacity: 0, x: 50 }, visible: { opacity: 1, x: 0 } };
  const listVariants = { hidden: { opacity: 0, y: -10 }, visible: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 } };

  const role = localStorage.getItem('role');
  const isCustomer = role === 'customer';
  const totalUnread = orders.reduce((acc, o) => acc + (o.unreadCount || 0), 0);

  return (
    <div className="min-h-screen bg-[#18191a] text-white p-4 relative overflow-hidden">
      <div className="relative z-10 w-full max-w-7xl mx-auto">
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

        {/* === الفلتر + السلة + الرسائل === */}
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

          {(userRole === 'customer' || userRole === 'vendor') && totalUnread > 0 && (
            <div className="relative">
              <motion.button
                onClick={() => setShowUnreadList(prev => !prev)}
                className="px-6 py-3 rounded-xl text-white font-bold bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg hover:from-blue-700 hover:to-blue-800 flex items-center gap-2"
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                الرسائل غير المقروءة ({totalUnread})
                <span className={`transition-transform duration-200 ${showUnreadList ? 'rotate-180' : ''}`}>Down Arrow</span>
              </motion.button>
              <AnimatePresence>
                {showUnreadList && (
                  <motion.div
                    variants={listVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="absolute top-full mt-2 w-72 bg-[#242526] backdrop-blur-xl rounded-xl shadow-2xl border border-gray-700 z-50 max-h-64 overflow-y-auto"
                  >
                    {orders.map(order => (
                      <div
                        key={order._id}
                        onClick={() => openMessages(order)}
                        className="p-4 border-b border-gray-700 hover:bg-gray-800/60 cursor-pointer transition-colors duration-200"
                      >
                        <p className="font-bold text-red-400">طلب #{order.orderNumber}</p>
                        <p className="text-sm text-gray-300">المنتج: {order.product?.name}</p>
                        <p className="text-xs text-red-400 mt-1">غير مقروء: {order.unreadCount}</p>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
                      <button onClick={() => handlePrevMedia(product._id, product)} className="bg-black/50 text-white p-2 rounded-full backdrop-blur-sm hover:bg-black/70 transition">Left Arrow</button>
                      <button onClick={() => handleNextMedia(product._id, product)} className="bg-black/50 text-white p-2 rounded-full backdrop-blur-sm hover:bg-black/70 transition">Right Arrow</button>
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
      {/* Cart Modal */}
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

      {/* Order Modal */}
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

      {/* Media Modal */}
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

      {/* Messages Modal */}
      <AnimatePresence>
        {selectedOrderForMessages && (
          <motion.div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={closeMessages}
          >
            <motion.div
              className="bg-[#242526] p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-3xl font-bold mb-6 text-right bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-red-700">
                الرسائل للطلب #{selectedOrderForMessages.orderNumber}
              </h2>
              <div className="flex-1 overflow-y-auto mb-6 bg-[#3a3b3c] p-4 rounded-2xl shadow-inner">
                {selectedOrderForMessages.messages && selectedOrderForMessages.messages.length > 0 ? (
                  <div className="space-y-4">
                    {selectedOrderForMessages.messages.map((msg, index) => {
                      const isMyMessage = msg.from === userRole;
                      const senderName = msg.from === 'vendor' ? selectedOrderForMessages.product?.vendor?.name : selectedOrderForMessages.user?.name || 'غير معروف';
                      return (
                        <div
                          key={msg._id || index}
                          className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs sm:max-w-sm p-4 rounded-2xl shadow-md ${
                              isMyMessage ? 'bg-gradient-to-r from-red-600 to-red-800 text-white' : 'bg-gray-700 text-white'
                            }`}
                          >
                            <p className="font-bold text-sm opacity-90">
                              {msg.from === 'vendor' ? 'التاجر' : 'العميل'}: {senderName}
                            </p>
                            {msg.text && <p className="mt-2 text-lg">{msg.text}</p>}
                            {msg.image && (
                              <img
                                src={`${process.env.REACT_APP_API_URL}/Uploads/${msg.image}`}
                                alt="صورة الرسالة"
                                className="mt-3 w-full max-w-48 object-cover rounded-xl cursor-pointer shadow-lg hover:shadow-xl transition"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openMedia(msg.image, 'image');
                                }}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = `${process.env.REACT_APP_API_URL}/Uploads/placeholder-image.jpg`;
                                }}
                              />
                            )}
                            <div className="flex items-center justify-between mt-3 text-xs opacity-70">
                              <p>{new Date(msg.timestamp).toLocaleString('ar-EG')}</p>
                              {isMyMessage && (
                                <span>
                                  {msg.isRead ? 'Seen' : msg.isDelivered ? 'Delivered' : 'Sent'}
                                </span>
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
                    className="w-full p-4 rounded-xl bg-[#3a3b3c] text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 text-right resize-none"
                    rows="4"
                  />
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setNewImage(e.target.files[0] || null)}
                      className="text-sm text-gray-300 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:bg-red-600 file:text-white hover:file:bg-red-700"
                    />
                    {newImagePreview && (
                      <div className="relative">
                        <img src={newImagePreview} alt="معاينة" className="w-24 h-24 object-cover rounded-xl shadow-lg" />
                        <button
                          type="button"
                          onClick={() => {
                            setNewImage(null);
                            setNewImagePreview(null);
                          }}
                          className="absolute top-0 right-0 bg-red-800 text-white rounded-full w-8 h-8 flex items-center justify-center text-xl"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                  <motion.button
                    type="submit"
                    className="w-full py-4 rounded-xl text-white font-bold bg-gradient-to-r from-red-600 to-red-800 shadow-xl text-lg"
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
    </div>
  );
};

export default Home;

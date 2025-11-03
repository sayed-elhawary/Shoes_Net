import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import { io } from 'socket.io-client';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [vendorSearch, setVendorSearch] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [orderNumberSearch, setOrderNumberSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilters, setStatusFilters] = useState({ rejected: false, shipped: false, delivered: false });
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [error, setError] = useState(null);
  const [editOrder, setEditOrder] = useState(null);
  const [editForm, setEditForm] = useState({ quantity: 1, address: '' });
  const [selectedOrderForMessages, setSelectedOrderForMessages] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [newImage, setNewImage] = useState(null);
  const [newImagePreview, setNewImagePreview] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 20;
  const navigate = useNavigate();

  // Refs
  const socketRef = useRef(null);
  const currentOrderIdRef = useRef(null);
  const messagesContainerRef = useRef(null);
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

  // Scroll to bottom ONLY when sending a message
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

  // Fetch orders
  const fetchOrders = useCallback(() => {
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setError('يرجى تسجيل الدخول لجلب الطلبات');
      navigate('/login');
      return;
    }
    let url = `${process.env.REACT_APP_API_URL}/api/orders`;
    const params = new URLSearchParams();
    if (vendorSearch) params.append('vendorName', vendorSearch);
    if (phoneSearch) params.append('phone', phoneSearch);
    if (orderNumberSearch) params.append('orderNumber', orderNumberSearch);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (statusFilters.rejected) params.append('status', 'rejected');
    if (statusFilters.shipped) params.append('status', 'shipped');
    if (statusFilters.delivered) params.append('status', 'delivered');
    params.append('page', page);
    params.append('limit', limit);
    if (params.toString()) url += `?${params.toString()}`;
    axios
      .get(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(res => {
        console.log('Fetched orders:', res.data);
        setOrders(res.data.orders || []);
        setTotal(res.data.total || 0);
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
      })
      .finally(() => {
        setLoading(false);
      });
  }, [vendorSearch, phoneSearch, orderNumberSearch, startDate, endDate, statusFilters, page, navigate]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Messages modal socket handling (NO AUTO SCROLL)
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

    // Mark as read
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
        // NO SCROLL HERE
      })
      .catch(err => {
        console.error('Mark read error:', err);
	     // setError('خطأ في تحديث حالة القراءة');
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
      // NO SCROLL ON RECEIVING MESSAGE
    };

    const handleMessagesUpdated = (data) => {
      if (data.orderId !== orderId) return;
      setSelectedOrderForMessages(prev => ({
        ...prev,
        messages: data.messages || [],
        unreadCount: data.messages.filter(msg => !msg.isRead && msg.from !== getUserRole()).length,
      }));
      // NO SCROLL
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

    // NO INITIAL SCROLL

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('messagesUpdated', handleMessagesUpdated);
      socket.off('unreadUpdate', handleUnreadUpdate);
      socket.emit('leaveOrder', orderId);
      currentOrderIdRef.current = null;
    };
  }, [selectedOrderForMessages]);

  // Delete order
  const handleDeleteOrder = (id) => {
    if (!window.confirm('هل تريد حذف هذا الطلب؟')) return;
    const token = localStorage.getItem('token');
    if (!token) {
      setError('يرجى تسجيل الدخول لتتمكن من حذف الطلبات');
      navigate('/login');
      return;
    }
    axios
      .delete(`${process.env.REACT_APP_API_URL}/api/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        setOrders(prev => prev.filter(o => o._id !== id));
        setError(null);
        alert('تم حذف الطلب بنجاح');
      })
      .catch(err => {
        const errorMessage = err.response?.data?.message || 'خطأ في الحذف: ' + err.message;
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

  // Update status
  const handleUpdateStatus = (id, status) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('يرجى تسجيل الدخول لتتمكن من تحديث حالة الطلب');
      navigate('/login');
      return;
    }
    axios
      .put(
        `${process.env.REACT_APP_API_URL}/api/orders/${id}/status`,
        { status },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      .then(res => {
        setOrders(prev => prev.map(o => (o._id === id ? res.data.order : o)));
        setError(null);
        alert('تم تحديث حالة الطلب بنجاح');
      })
      .catch(err => {
        const errorMessage = err.response?.data?.message || 'خطأ في التحديث: ' + err.message;
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

  // Edit order
  const handleEditOrder = (order) => {
    setEditOrder(order);
    setEditForm({ quantity: order.quantity || 1, address: order.address || '' });
  };

  const handleEditSubmit = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('يرجى تسجيل الدخول لتتمكن من تعديل الطلب');
      navigate('/login');
      return;
    }
    axios
      .put(
        `${process.env.REACT_APP_API_URL}/api/orders/${editOrder._id}`,
        editForm,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      .then(res => {
        setOrders(prev => prev.map(o => (o._id === editOrder._id ? res.data.order : o)));
        setEditOrder(null);
        setEditForm({ quantity: 1, address: '' });
        setError(null);
        alert('تم تعديل الطلب بنجاح');
      })
      .catch(err => {
        const errorMessage = err.response?.data?.message || 'خطأ في تعديل الطلب: ' + err.message;
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

  // Media handlers
  const openMedia = (media) => {
    if (media) {
      setSelectedMedia({ url: `${process.env.REACT_APP_API_URL}/Uploads/${media}`, type: 'image' });
    }
  };
  const closeMedia = () => setSelectedMedia(null);

  // Group orders
  const groupOrders = useCallback((ordersList, role) => {
    if (role === 'customer') return ordersList;
    const grouped = {};
    ordersList.forEach(order => {
      const key = `${order.product._id}-${order.user._id}-${order.address}`;
      if (!grouped[key]) {
        grouped[key] = {
          ...order,
          quantity: 0,
          orderIds: [],
          selectedImages: new Set(),
          messages: [],
          unreadCount: 0,
        };
      }
      grouped[key].quantity += order.quantity;
      grouped[key].orderIds.push(order._id);
      grouped[key].messages = grouped[key].messages.concat(order.messages || []);
      if (order.selectedImage) {
        grouped[key].selectedImages.add(order.selectedImage);
      }
      if (order.messages) {
        const unread = order.messages.filter(msg => !msg.isRead && msg.from !== role).length;
        grouped[key].unreadCount += unread;
      }
    });
    for (let key in grouped) {
      grouped[key].messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }
    return Object.values(grouped).map(group => ({
      ...group,
      selectedImage: Array.from(group.selectedImages)[0] || 'placeholder-image.jpg',
      isGrouped: group.orderIds.length > 1,
      totalOrders: group.orderIds.length,
      unreadCount: group.unreadCount,
    }));
  }, []);

  // Export to Word
  const exportToWord = async () => {
    try {
      const token = localStorage.getItem('token');
      let url = `${process.env.REACT_APP_API_URL}/api/orders`;
      const params = new URLSearchParams();
      if (vendorSearch) params.append('vendorName', vendorSearch);
      if (phoneSearch) params.append('phone', phoneSearch);
      if (orderNumberSearch) params.append('orderNumber', orderNumberSearch);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (statusFilters.rejected) params.append('status', 'rejected');
      if (statusFilters.shipped) params.append('status', 'shipped');
      if (statusFilters.delivered) params.append('status', 'delivered');
      if (params.toString()) url += `?${params.toString()}`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allOrders = res.data.orders || res.data;
      const grouped = groupOrders(allOrders, getUserRole());
      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'قائمة الطلبات', size: 32, bold: true, rtl: true }),
                ],
                alignment: 'right',
                spacing: { after: 200 },
              }),
              new Table({
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ text: 'رقم الطلب', rtl: true, bold: true })],
                        width: { size: 10, type: WidthType.PERCENTAGE },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: 'الصورة', rtl: true, bold: true })],
                        width: { size: 12, type: WidthType.PERCENTAGE },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: 'العميل', rtl: true, bold: true })],
                        width: { size: 12, type: WidthType.PERCENTAGE },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: 'رقم الهاتف', rtl: true, bold: true })],
                        width: { size: 12, type: WidthType.PERCENTAGE },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: 'العنوان', rtl: true, bold: true })],
                        width: { size: 15, type: WidthType.PERCENTAGE },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: 'المنتج', rtl: true, bold: true })],
                        width: { size: 12, type: WidthType.PERCENTAGE },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: 'التاجر', rtl: true, bold: true })],
                        width: { size: 12, type: WidthType.PERCENTAGE },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: 'تاريخ الطلب', rtl: true, bold: true })],
                        width: { size: 12, type: WidthType.PERCENTAGE },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: 'الحالة', rtl: true, bold: true })],
                        width: { size: 12, type: WidthType.PERCENTAGE },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: 'الكمية', rtl: true, bold: true })],
                        width: { size: 13, type: WidthType.PERCENTAGE },
                      }),
                    ],
                  }),
                  ...grouped.map(order =>
                    new TableRow({
                      children: [
                        new TableCell({
                          children: [
                            new Paragraph({ text: (order.orderNumber || '-').toString(), rtl: true }),
                          ],
                        }),
                        new TableCell({
                          children: [
                            new Paragraph({
                              text: order.selectedImage || 'placeholder-image.jpg',
                              rtl: true,
                            }),
                          ],
                        }),
                        new TableCell({
                          children: [new Paragraph({ text: order.user?.name || 'زائر', rtl: true })],
                        }),
                        new TableCell({
                          children: [new Paragraph({ text: order.user?.phone || '-', rtl: true })],
                        }),
                        new TableCell({
                          children: [new Paragraph({ text: order.address || '-', rtl: true })],
                        }),
                        new TableCell({
                          children: [
                            new Paragraph({ text: order.product?.name || 'غير معروف', rtl: true }),
                          ],
                        }),
                        new TableCell({
                          children: [
                            new Paragraph({
                              text: order.product?.vendor?.name || 'غير معروف',
                              rtl: true,
                            }),
                          ],
                        }),
                        new TableCell({
                          children: [
                            new Paragraph({
                              text: new Date(order.createdAt).toLocaleDateString('ar-EG') || '-',
                              rtl: true,
                            }),
                          ],
                        }),
                        new TableCell({
                          children: [
                            new Paragraph({
                              text:
                                {
                                  pending: 'تحت المراجعة',
                                  shipped: 'جاري الشحن',
                                  delivered: 'تم التسليم',
                                  rejected: 'مرفوض',
                                }[order.status] || 'غير معروف',
                              rtl: true,
                            }),
                          ],
                        }),
                        new TableCell({
                          children: [
                            new Paragraph({
                              text: order.isGrouped ? `${order.quantity} (مجمع)` : order.quantity.toString(),
                              rtl: true,
                            }),
                          ],
                        }),
                      ],
                    })
                  ),
                ],
                width: { size: 100, type: WidthType.PERCENTAGE },
              }),
            ],
          },
        ],
      });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, 'orders.docx');
      setError(null);
    } catch (error) {
      console.error('Export to Word error:', error);
      setError('خطأ في تصدير الـ Word: ' + error.message);
    }
  };

  // Send message handler (ONLY HERE WE SCROLL)
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

      // ONLY SCROLL WHEN SENDING MESSAGE
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'خطأ في إرسال الرسالة';
      setError(errorMessage);
    }
  };

  // Messages modal open/close
  const openMessages = (order) => {
    setSelectedOrderForMessages(order);
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

  // Display orders
  const rawDisplayOrders = showUnreadOnly ? orders.filter(o => (o.unreadCount || 0) > 0) : orders;
  const displayOrders = groupOrders(rawDisplayOrders, userRole);

  // Animation variants
  const tableVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, staggerChildren: 0.05 },
    },
  };
  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  };
  const buttonVariants = {
    hover: { scale: 1.05, boxShadow: '0 8px 16px rgba(255,0,0,0.3)' },
    tap: { scale: 0.95 },
  };
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.85 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.25 } },
    exit: { opacity: 0, scale: 0.85, transition: { duration: 0.2 } },
  };

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center bg-[#18191a] p-4 sm:p-6 text-white overflow-x-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-red-700 drop-shadow-lg">
        قائمة الطلبات
      </h1>

      {/* Error Display */}
      {error && (
        <motion.div
          className="w-full max-w-4xl bg-red-900/90 text-white p-4 rounded-2xl mb-6 text-center font-medium shadow-2xl"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-4 text-xl font-bold"
          >
            ×
          </button>
        </motion.div>
      )}

      {/* Filters Section */}
      {userRole !== 'customer' && (
        <div className="w-full max-w-7xl mb-8 bg-[#242526] p-6 rounded-2xl shadow-2xl border border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
            <input
              type="text"
              placeholder="ابحث باسم التاجر"
              value={vendorSearch}
              onChange={(e) => setVendorSearch(e.target.value)}
              className="p-4 rounded-xl bg-[#3a3b3c] text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
            />
            <input
              type="text"
              placeholder="ابحث برقم الهاتف"
              value={phoneSearch}
              onChange={(e) => setPhoneSearch(e.target.value)}
              className="p-4 rounded-xl bg-[#3a3b3c] text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
            />
            <input
              type="text"
              placeholder="ابحث برقم الطلب"
              value={orderNumberSearch}
              onChange={(e) => setOrderNumberSearch(e.target.value)}
              className="p-4 rounded-xl bg-[#3a3b3c] text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
            />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-4 rounded-xl bg-[#3a3b3c] text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-4 rounded-xl bg-[#3a3b3c] text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <span className="text-gray-300 font-medium">فلتر الحالة:</span>
            {['rejected', 'shipped', 'delivered'].map(status => (
              <label key={status} className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                <input
                  type="checkbox"
                  checked={statusFilters[status]}
                  onChange={(e) => setStatusFilters(prev => ({ ...prev, [status]: e.target.checked }))}
                  className="w-5 h-5 text-red-600 rounded focus:ring-red-500 accent-red-600"
                />
                <span className="text-white">
                  {status === 'rejected' ? 'مرفوض' : status === 'shipped' ? 'جاري الشحن' : 'تم التسليم'}
                </span>
              </label>
            ))}
            <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
              <input
                type="checkbox"
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
                className="w-5 h-5 text-red-600 rounded focus:ring-red-500 accent-red-600"
              />
              <span className="text-white">الطلبات التي بها رسائل غير مقروءة فقط</span>
            </label>
          </div>
          <div className="flex flex-wrap gap-4">
            <motion.button
              onClick={fetchOrders}
              className="px-8 py-4 rounded-xl text-white font-bold bg-gradient-to-r from-red-600 to-red-800 shadow-xl text-lg"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              بحث
            </motion.button>
            <motion.button
              onClick={exportToWord}
              className="px-8 py-4 rounded-xl text-white font-bold bg-gradient-to-r from-red-600 to-red-800 shadow-xl text-lg"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              تصدير إلى Word
            </motion.button>
          </div>
        </div>
      )}

      {/* Loading / Empty / Table */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.p
            key="loading"
            className="text-2xl text-gray-400 py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            جاري التحميل...
          </motion.p>
        )}
        {!loading && displayOrders.length === 0 && (
          <motion.p
            key="no-orders"
            className="text-2xl text-gray-400 py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            لا توجد طلبات حالياً.
          </motion.p>
        )}
        {!loading && displayOrders.length > 0 && (
          <motion.div
            key="table-container"
            className="w-full max-w-7xl overflow-x-auto bg-[#242526] rounded-2xl shadow-2xl border border-gray-700"
            variants={tableVariants}
            initial="hidden"
            animate="visible"
          >
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-[#3a3b3c]">
                <tr>
                  <th className="py-5 px-6 text-right text-sm font-bold text-gray-300 uppercase tracking-wider">رقم الطلب</th>
                  <th className="py-5 px-6 text-right text-sm font-bold text-gray-300 uppercase tracking-wider">الصورة</th>
                  <th className="py-5 px-6 text-right text-sm font-bold text-gray-300 uppercase tracking-wider">العميل</th>
                  <th className="py-5 px-6 text-right text-sm font-bold text-gray-300 uppercase tracking-wider">رقم الهاتف</th>
                  <th className="py-5 px-6 text-right text-sm font-bold text-gray-300 uppercase tracking-wider">العنوان</th>
                  <th className="py-5 px-6 text-right text-sm font-bold text-gray-300 uppercase tracking-wider">المنتج</th>
                  <th className="py-5 px-6 text-right text-sm font-bold text-gray-300 uppercase tracking-wider">التاجر</th>
                  <th className="py-5 px-6 text-right text-sm font-bold text-gray-300 uppercase tracking-wider">تاريخ الطلب</th>
                  <th className="py-5 px-6 text-right text-sm font-bold text-gray-300 uppercase tracking-wider">الحالة</th>
                  <th className="py-5 px-6 text-right text-sm font-bold text-gray-300 uppercase tracking-wider">الكمية</th>
                  <th className="py-5 px-6 text-right text-sm font-bold text-gray-300 uppercase tracking-wider">الرسائل غير المقروءة</th>
                  <th className="py-5 px-6 text-right text-sm font-bold text-gray-300 uppercase tracking-wider">إجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-[#242526] divide-y divide-gray-700">
                {displayOrders.map((order, idx) => (
                  <motion.tr
                    key={order.isGrouped ? `group-${idx}` : order._id}
                    className="hover:bg-[#3a3b3c] transition duration-200"
                    variants={rowVariants}
                  >
                    <td className="py-4 px-6 text-right text-sm">{order.orderNumber || '-'}</td>
                    <td className="py-4 px-6 text-center">
                      <img
                        src={`${process.env.REACT_APP_API_URL}/Uploads/${order.selectedImage}`}
                        alt="صورة الطلب"
                        className="w-20 h-20 object-cover rounded-xl mx-auto cursor-pointer shadow-md hover:shadow-xl transition"
                        onClick={() => openMedia(order.selectedImage)}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `${process.env.REACT_APP_API_URL}/Uploads/placeholder-image.jpg`;
                        }}
                      />
                    </td>
                    <td className="py-4 px-6 text-right font-medium">{order.user?.name || 'زائر'}</td>
                    <td className="py-4 px-6 text-right">{order.user?.phone || '-'}</td>
                    <td className="py-4 px-6 text-right text-ellipsis overflow-hidden max-w-xs">{order.address || '-'}</td>
                    <td className="py-4 px-6 text-right">{order.product?.name || 'غير معروف'}</td>
                    <td className="py-4 px-6 text-right">{order.product?.vendor?.name || 'غير معروف'}</td>
                    <td className="py-4 px-6 text-right">{new Date(order.createdAt).toLocaleDateString('ar-EG')}</td>
                    <td className="py-4 px-6 text-right">
                      <span
                        className={`px-4 py-2 rounded-full text-xs font-bold ${
                          order.status === 'pending'
                            ? 'bg-yellow-600/30 text-yellow-300 border border-yellow-600'
                            : order.status === 'shipped'
                            ? 'bg-blue-600/30 text-blue-300 border border-blue-600'
                            : order.status === 'delivered'
                            ? 'bg-green-600/30 text-green-300 border border-green-600'
                            : 'bg-red-600/30 text-red-300 border border-red-600'
                        }`}
                      >
                        {{
                          pending: 'تحت المراجعة',
                          shipped: 'جاري الشحن',
                          delivered: 'تم التسليم',
                          rejected: 'مرفوض',
                        }[order.status] || 'غير معروف'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-yellow-400">
                      {order.quantity} {order.isGrouped && `(مجمع من ${order.totalOrders} طلب)`}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <motion.button
                        onClick={() => openMessages(order)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-lg text-lg ${
                          order.unreadCount > 0
                            ? 'bg-gradient-to-r from-red-600 to-red-800 animate-pulse'
                            : 'bg-gradient-to-r from-gray-600 to-gray-800'
                        }`}
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        {order.unreadCount > 0 ? order.unreadCount : 0}
                      </motion.button>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-3 flex-wrap">
                        {userRole === 'admin' && !order.isGrouped && (
                          <>
                            <motion.button
                              className="px-5 py-2 rounded-xl text-white font-bold bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg"
                              variants={buttonVariants}
                              whileHover="hover"
                              whileTap="tap"
                              onClick={() => handleEditOrder(order)}
                            >
                              تعديل
                            </motion.button>
                            <motion.button
                              onClick={() => handleDeleteOrder(order._id)}
                              className="px-5 py-2 rounded-xl text-white font-bold bg-gradient-to-r from-red-600 to-red-800 shadow-lg"
                              variants={buttonVariants}
                              whileHover="hover"
                              whileTap="tap"
                            >
                              حذف
                            </motion.button>
                          </>
                        )}
                        {userRole === 'vendor' && !order.isGrouped && (
                          <motion.select
                            value={order.status}
                            onChange={(e) => handleUpdateStatus(order._id, e.target.value)}
                            className="p-3 rounded-xl bg-[#3a3b3c] text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                            variants={buttonVariants}
                            whileHover="hover"
                          >
                            <option value="pending">تحت المراجعة</option>
                            <option value="shipped">جاري الشحن</option>
                            <option value="delivered">تم التسليم</option>
                            <option value="rejected">مرفوض</option>
                          </motion.select>
                        )}
                        {userRole === 'customer' && order.status === 'pending' && !order.isGrouped && (
                          <>
                            <motion.button
                              className="px-5 py-2 rounded-xl text-white font-bold bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg"
                              variants={buttonVariants}
                              whileHover="hover"
                              whileTap="tap"
                              onClick={() => handleEditOrder(order)}
                            >
                              تعديل
                            </motion.button>
                            <motion.button
                              onClick={() => handleDeleteOrder(order._id)}
                              className="px-5 py-2 rounded-xl text-white font-bold bg-gradient-to-r from-red-600 to-red-800 shadow-lg"
                              variants={buttonVariants}
                              whileHover="hover"
                              whileTap="tap"
                            >
                              حذف
                            </motion.button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      {!loading && total > limit && (
        <div className="flex justify-center items-center gap-6 mt-8">
          <motion.button
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            disabled={page === 1}
            className="px-8 py-4 rounded-xl text-white font-bold bg-gradient-to-r from-red-600 to-red-800 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            variants={buttonVariants}
            whileHover={page !== 1 ? "hover" : {}}
            whileTap={page !== 1 ? "tap" : {}}
          >
            السابق
          </motion.button>
          <span className="text-xl text-gray-300">
            صفحة {page} من {Math.ceil(total / limit)}
          </span>
          <motion.button
            onClick={() => setPage(prev => prev + 1)}
            disabled={page * limit >= total}
            className="px-8 py-4 rounded-xl text-white font-bold bg-gradient-to-r from-red-600 to-red-800 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            variants={buttonVariants}
            whileHover={page * limit < total ? "hover" : {}}
            whileTap={page * limit < total ? "tap" : {}}
          >
            التالي
          </motion.button>
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editOrder && !editOrder.isGrouped && (
          <motion.div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => setEditOrder(null)}
          >
            <motion.div
              className="bg-[#242526] p-8 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-3xl font-bold mb-8 text-right bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-red-700">
                تعديل الطلب
              </h2>
              <div className="space-y-6">
                <input
                  type="number"
                  placeholder="الكمية"
                  value={editForm.quantity}
                  onChange={(e) => setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full p-4 rounded-xl bg-[#3a3b3c] text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 text-right text-lg"
                  min="1"
                />
                <input
                  type="text"
                  placeholder="العنوان"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full p-4 rounded-xl bg-[#3a3b3c] text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 text-right text-lg"
                />
              </div>
              <div className="flex gap-4 mt-8">
                <motion.button
                  onClick={handleEditSubmit}
                  className="flex-1 py-4 rounded-xl text-white font-bold bg-gradient-to-r from-green-600 to-green-800 shadow-xl text-lg"
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  حفظ التعديلات
                </motion.button>
                <motion.button
                  onClick={() => setEditOrder(null)}
                  className="flex-1 py-4 rounded-xl text-white font-bold bg-gradient-to-r from-red-600 to-red-800 shadow-xl text-lg"
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
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto mb-6 bg-[#3a3b3c] p-4 rounded-2xl shadow-inner"
              >
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
                                  openMedia(msg.image);
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
                                  {msg.isRead ? '✓✓' : msg.isDelivered ? '✓' : '✓'}
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

      {/* Media Viewer Modal */}
      <AnimatePresence>
        {selectedMedia && (
          <motion.div
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={closeMedia}
          >
            <motion.div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
              <img
                src={selectedMedia.url}
                className="max-w-full max-h-full rounded-2xl shadow-2xl"
                alt="صورة مكبرة"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `${process.env.REACT_APP_API_URL}/Uploads/placeholder-image.jpg`;
                }}
              />
              <motion.button
                onClick={closeMedia}
                className="absolute top-4 right-4 text-white text-5xl bg-black/70 rounded-full w-14 h-14 flex items-center justify-center shadow-xl hover:bg-black/90 transition"
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
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

export default Orders;

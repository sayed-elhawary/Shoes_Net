import { useState, useEffect, useRef } from 'react';
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
  const socket = useRef(io(process.env.REACT_APP_API_URL)).current;
  const currentOrderIdRef = useRef(null);
  const messagesEndRef = useRef(null);

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

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        socket.connect();
        socket.emit('authenticate', { userId: payload.id, role: payload.role });
        socket.on('error', (error) => {
          console.error('Socket.IO error:', error.message);
          setError(`خطأ في الاتصال: ${error.message}`);
        });
        socket.on('orderJoined', ({ orderId }) => {
          console.log(`Joined order: ${orderId}`);
        });
      } catch (e) {
        console.error('Error in socket authentication:', e);
        setError('خطأ في التوثيق، يرجى تسجيل الدخول مرة أخرى');
        navigate('/login');
      }
    }
    fetchOrders();
    return () => {
      socket.disconnect();
    };
  }, [page, vendorSearch, phoneSearch, orderNumberSearch, startDate, endDate, statusFilters, showUnreadOnly]);

  useEffect(() => {
    if (!selectedOrderForMessages) return;

    const orderId = selectedOrderForMessages._id;
    currentOrderIdRef.current = orderId;
    socket.emit('joinOrder', orderId);

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
          messages: res.data.order.messages,
          unreadCount: 0,
        }));
        scrollToBottom();
      })
      .catch(err => {
        console.error('Error marking read:', err);
        setError('خطأ في تحديث حالة القراءة');
      });

    const handleNewMessage = (message) => {
      if (currentOrderIdRef.current !== message.orderId) return;

      setSelectedOrderForMessages(prev => {
        const existingMessage = prev.messages?.find(m => m._id === message._id);
        if (existingMessage) return prev;
        return {
          ...prev,
          messages: [...(prev.messages || []), message],
        };
      });

      setOrders(prevOrders =>
        prevOrders.map(o =>
          o._id === message.orderId && message.from !== getUserRole()
            ? { ...o, unreadCount: (o.unreadCount || 0) + 1 }
            : o
        )
      );
      scrollToBottom();
    };

    const handleMessagesUpdated = (messages) => {
      if (currentOrderIdRef.current !== selectedOrderForMessages._id) return;

      setSelectedOrderForMessages(prev => ({
        ...prev,
        messages,
        unreadCount: messages.filter(msg => !msg.isRead && msg.from !== getUserRole()).length,
      }));
      scrollToBottom();
    };

    const handleUnreadUpdate = ({ orderId: updatedId, unreadCount }) => {
      if (currentOrderIdRef.current === updatedId) {
        setSelectedOrderForMessages(prev => ({ ...prev, unreadCount }));
      }
      setOrders(prev =>
        prev.map(o => (o._id === updatedId ? { ...o, unreadCount } : o))
      );
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('messagesUpdated', handleMessagesUpdated);
    socket.on('unreadUpdate', handleUnreadUpdate);

    scrollToBottom();

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('messagesUpdated', handleMessagesUpdated);
      socket.off('unreadUpdate', handleUnreadUpdate);
      socket.emit('leaveOrder', orderId);
      currentOrderIdRef.current = null;
    };
  }, [selectedOrderForMessages?._id]);

  const fetchOrders = () => {
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
        console.log('API Response for Orders:', res.data);
        setOrders(res.data.orders);
        setTotal(res.data.total);
        setError(null);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching orders:', err);
        const errorMessage = err.response?.data?.message || 'خطأ في جلب الطلبات: ' + err.message;
        setError(errorMessage);
        setLoading(false);
        if (err.response?.status === 401) {
          setError('غير مصرح: يرجى تسجيل الدخول مرة أخرى');
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          localStorage.removeItem('userId');
          navigate('/login');
        }
      });
  };

  const handleDeleteOrder = (id) => {
    if (window.confirm('هل تريد حذف هذا الطلب؟')) {
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
          setOrders(orders.filter(o => o._id !== id));
          setError(null);
        })
        .catch(err => {
          const errorMessage = err.response?.data?.message || 'خطأ: ' + err.message;
          setError(errorMessage);
          if (err.response?.status === 401) {
            setError('غير مصرح: يرجى تسجيل الدخول مرة أخرى');
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            localStorage.removeItem('userId');
            navigate('/login');
          }
        });
    }
  };

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
        setOrders(orders.map(o => (o._id === id ? res.data.order : o)));
        setError(null);
        alert('تم تحديث حالة الطلب بنجاح');
      })
      .catch(err => {
        const errorMessage = err.response?.data?.message || 'خطأ: ' + err.message;
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

  const handleEditOrder = (order) => {
    setEditOrder(order);
    setEditForm({ quantity: order.quantity, address: order.address || '' });
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
        setOrders(orders.map(o => (o._id === editOrder._id ? res.data.order : o)));
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

  const openMedia = (media) => {
    if (media) {
      setSelectedMedia({ url: `${process.env.REACT_APP_API_URL}/Uploads/${media}`, type: 'image' });
    }
  };

  const closeMedia = () => setSelectedMedia(null);

  const groupOrders = (orders, role) => {
    if (role === 'customer') return orders;
    const grouped = {};
    orders.forEach(order => {
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
  };

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
      const grouped = groupOrders(allOrders, userRole);
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
      Packer.toBlob(doc).then(blob => saveAs(blob, 'orders.docx'));
    } catch (error) {
      console.error('Error exporting Word:', error);
      setError('خطأ في تصدير الـ Word: ' + error.message);
    }
  };

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

      // تحديث الرسائل محليًا بعد الإرسال
      setSelectedOrderForMessages(prev => ({
        ...prev,
        messages: res.data.order.messages,
      }));

      setNewMessage('');
      setNewImage(null);
      setNewImagePreview(null);
      setError(null);
      scrollToBottom();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'خطأ في إرسال الرسالة';
      setError(errorMessage);
    }
  };

  const openMessages = (order) => {
    setSelectedOrderForMessages(order);
  };

  const closeMessages = () => {
    setSelectedOrderForMessages(null);
    setNewMessage('');
    setNewImage(null);
    setNewImagePreview(null);
  };

  const tableVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1],
        staggerChildren: 0.1,
      },
    },
  };
  const rowVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
    },
  };
  const buttonVariants = {
    hover: {
      scale: 1.1,
      boxShadow: '0 6px 12px rgba(0, 0, 0, 0.2)',
      transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
    },
    tap: {
      scale: 0.9,
      transition: { duration: 0.1, ease: 'easeOut' },
    },
  };
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, scale: 0.8, transition: { duration: 0.3 } },
  };

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
  const displayOrders = groupOrders(orders, userRole).filter(order => {
    if (showUnreadOnly && order.unreadCount === 0) return false;
    return true;
  });

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center bg-gradient-to-b from-gray-900 to-gray-800 p-4 sm:p-6 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ willChange: 'opacity' }}
    >
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
        قائمة الطلبات
      </h1>
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
      {userRole !== 'customer' && (
        <div className="w-full max-w-7xl mb-6 flex flex-col space-y-4">
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 md:space-x-reverse">
            <input
              type="text"
              placeholder="ابحث باسم التاجر"
              value={vendorSearch}
              onChange={(e) => setVendorSearche(e.target.value)}
              className="p-3 rounded-xl bg-[#2A2A3E] text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="ابحث برقم الهاتف"
              value={phoneSearch}
              onChange={(e) => setPhoneSearch(e.target.value)}
              className="p-3 rounded-xl bg-[#2A2A3E] text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="ابحث برقم الطلب"
              value={orderNumberSearch}
              onChange={(e) => setOrderNumberSearch(e.target.value)}
              className="p-3 rounded-xl bg-[#2A2A3E] text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-3 rounded-xl bg-[#2A2A3E] text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-3 rounded-xl bg-[#2A2A3E] text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            <span className="text-white font-medium">فلتر الحالة:</span>
            {['rejected', 'shipped', 'delivered'].map(status => (
              <label key={status} className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                <input
                  type="checkbox"
                  checked={statusFilters[status]}
                  onChange={(e) => setStatusFilters(prev => ({ ...prev, [status]: e.target.checked }))}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-white">
                  {status === 'rejected' ? 'مرفوض' : status === 'shipped' ? 'جاري الشحن' : 'تم التسليم'}
                </span>
              </label>
            ))}
            <label className="flex items-center space-x-2 space-x-reverse cursor-pointer ml-6">
              <input
                type="checkbox"
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
                className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
              />
              <span className="text-white">الطلبات التي بها رسائل غير مقروءة فقط</span>
            </label>
          </div>
          <div className="flex space-x-4 space-x-reverse">
            <motion.button
              onClick={fetchOrders}
              className="px-4 py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-500 to-blue-700 shadow-lg"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              بحث
            </motion.button>
            <motion.button
              onClick={exportToWord}
              className="px-4 py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-purple-500 to-purple-700 shadow-lg"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              تصدير إلى Word
            </motion.button>
          </div>
        </div>
      )}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.p
            key="loading"
            className="text-center text-gray-400 text-xl py-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            جاري التحميل...
          </motion.p>
        )}
        {!loading && displayOrders.length === 0 && !error && (
          <motion.p
            key="no-orders"
            className="text-center text-gray-400 text-xl py-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            لا توجد طلبات حالياً.
          </motion.p>
        )}
        {!loading && displayOrders.length > 0 && (
          <motion.div
            key="table"
            className="w-full max-w-7xl overflow-x-auto shadow-2xl rounded-2xl border border-gray-600/50"
            variants={tableVariants}
            initial="hidden"
            animate="visible"
          >
            <table className="min-w-full bg-[#1F1F2E] border border-gray-600/50">
              <thead className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
                <tr>
                  <th className="py-4 px-4 text-right font-semibold">رقم الطلب</th>
                  <th className="py-4 px-4 text-right font-semibold">الصورة</th>
                  <th className="py-4 px-4 text-right font-semibold">العميل</th>
                  <th className="py-4 px-4 text-right font-semibold">رقم الهاتف</th>
                  <th className="py-4 px-4 text-right font-semibold">العنوان</th>
                  <th className="py-4 px-4 text-right font-semibold">المنتج</th>
                  <th className="py-4 px-4 text-right font-semibold">التاجر</th>
                  <th className="py-4 px-4 text-right font-semibold">تاريخ الطلب</th>
                  <th className="py-4 px-4 text-right font-semibold">الحالة</th>
                  <th className="py-4 px-4 text-right font-semibold">الكمية</th>
                  <th className="py-4 px-4 text-right font-semibold">الرسائل غير المقروءة</th>
                  <th className="py-4 px-4 text-right font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {displayOrders.map((order, idx) => (
                  <motion.tr
                    key={order.isGrouped ? `group-${idx}` : order._id}
                    className="hover:bg-gray-700/30 transition duration-200 border-b border-gray-600/50"
                    variants={rowVariants}
                  >
                    <td className="py-3 px-4 text-right">{order.orderNumber}</td>
                    <td className="py-3 px-4 text-center">
                      <img
                        src={`${process.env.REACT_APP_API_URL}/Uploads/${order.selectedImage}`}
                        alt="صورة الطلب"
                        className="w-16 h-16 object-cover rounded-lg mx-auto cursor-pointer"
                        onClick={() => openMedia(order.selectedImage)}
                        onError={(e) => {
                          e.target.src = `${process.env.REACT_APP_API_URL}/Uploads/placeholder-image.jpg`;
                        }}
                      />
                    </td>
                    <td className="py-3 px-4 font-medium text-right">{order.user?.name || 'زائر'}</td>
                    <td className="py-3 px-4 text-right">{order.user?.phone || '-'}</td>
                    <td className="py-3 px-4 text-right">{order.address || '-'}</td>
                    <td className="py-3 px-4 text-right">{order.product?.name || 'غير معروف'}</td>
                    <td className="py-3 px-4 text-right">{order.product?.vendor?.name || 'غير معروف'}</td>
                    <td className="py-3 px-4 text-right">{new Date(order.createdAt).toLocaleDateString('ar-EG')}</td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          order.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                            : order.status === 'shipped'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : order.status === 'delivered'
                            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
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
                    <td className="py-3 px-4 text-right font-bold text-yellow-300">
                      {order.quantity} {order.isGrouped && `(مجمع من ${order.totalOrders} طلب)`}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <motion.button
                        onClick={() => openMessages(order)}
                        className={`px-3 py-1 rounded-lg text-white shadow-md relative ${
                          order.unreadCount > 0
                            ? 'bg-gradient-to-r from-red-500 to-red-700'
                            : 'bg-gradient-to-r from-indigo-500 to-indigo-700'
                        }`}
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        {order.unreadCount > 0 ? order.unreadCount : 0}
                      </motion.button>
                    </td>
                    <td className="py-3 px-4 flex space-x-2 space-x-reverse justify-end">
                      {userRole === 'admin' && !order.isGrouped && (
                        <>
                          <motion.button
                            className="px-3 py-1 rounded-lg text-white bg-gradient-to-r from-blue-500 to-blue-700 shadow-md"
                            variants={buttonVariants}
                            whileHover="hover"
                            whileTap="tap"
                            onClick={() => handleEditOrder(order)}
                          >
                            تعديل
                          </motion.button>
                          <motion.button
                            onClick={() => handleDeleteOrder(order._id)}
                            className="px-3 py-1 rounded-lg text-white bg-gradient-to-r from-red-500 to-red-700 shadow-md"
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
                          className="p-2 rounded-xl bg-[#2A2A3E] text-white text-sm border border-gray-200/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          whileHover={{ scale: 1.02 }}
                          whileFocus={{ scale: 1.02 }}
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
                            className="px-3 py-1 rounded-lg text-white bg-gradient-to-r from-blue-500 to-blue-700 shadow-md"
                            variants={buttonVariants}
                            whileHover="hover"
                            whileTap="tap"
                            onClick={() => handleEditOrder(order)}
                          >
                            تعديل
                          </motion.button>
                          <motion.button
                            onClick={() => handleDeleteOrder(order._id)}
                            className="px-3 py-1 rounded-lg text-white bg-gradient-to-r from-red-500 to-red-700 shadow-md"
                            variants={buttonVariants}
                            whileHover="hover"
                            whileTap="tap"
                          >
                            حذف
                          </motion.button>
                        </>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>
      {!loading && total > 0 && (
        <div className="flex justify-center mt-4 space-x-4">
          <motion.button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl text-white bg-gradient-to-r from-blue-500 to-blue-700 shadow-lg disabled:opacity-50"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            السابق
          </motion.button>
          <span className="text-white py-2">صفحة {page} من {Math.ceil(total / limit)}</span>
          <motion.button
            onClick={() => setPage(p => p + 1)}
            disabled={page * limit >= total}
            className="px-4 py-2 rounded-xl text-white bg-gradient-to-r from-blue-500 to-blue-700 shadow-lg disabled:opacity-50"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            التالي
          </motion.button>
        </div>
      )}
      <AnimatePresence mode="wait">
        {editOrder && !editOrder.isGrouped && (
          <motion.div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={modalVariants}
            onClick={(e) => {
              e.stopPropagation();
              setEditOrder(null);
            }}
            key="editModal"
          >
            <motion.div
              className="bg-[#1F1F2E] p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-right bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                تعديل الطلب
              </h2>
              <input
                type="number"
                placeholder="الكمية"
                value={editForm.quantity}
                onChange={(e) => setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 1 })}
                className="w-full p-3 mb-4 border border-gray-200/30 rounded-xl bg-[#2A2A3E] text-white text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
              <input
                type="text"
                placeholder="العنوان"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                className="w-full p-3 mb-4 border border-gray-200/30 rounded-xl bg-[#2A2A3E] text-white text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex space-x-2 space-x-reverse">
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditSubmit();
                  }}
                  className="w-full py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-green-500 to-green-700 shadow-lg"
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  حفظ التعديلات
                </motion.button>
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditOrder(null);
                  }}
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
      <AnimatePresence mode="wait">
        {selectedOrderForMessages && (
          <motion.div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={modalVariants}
            onClick={closeMessages}
            key={`msg-${selectedOrderForMessages._id}`}
          >
            <motion.div
              className="bg-[#1F1F2E] p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-right bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                الرسائل للطلب
              </h2>
              <div className="max-h-60 overflow-y-auto mb-4 bg-[#e5ddd5] p-4 rounded-lg flex flex-col">
                {selectedOrderForMessages.messages && selectedOrderForMessages.messages.length > 0 ? (
                  selectedOrderForMessages.messages.map((msg, index) => {
                    const isMyMessage = msg.from === userRole;
                    const senderName =
                      msg.from === 'vendor' ? selectedOrderForMessages.product?.vendor?.name : selectedOrderForMessages.user?.name;
                    return (
                      <div
                        key={msg._id || index}
                        className={`mb-2 p-2 rounded-lg max-w-xs shadow-sm ${
                          isMyMessage ? 'bg-[#dcf8c6] text-black ml-auto' : 'bg-white text-black mr-auto'
                        }`}
                      >
                        <p className="font-bold text-black">
                          {msg.from === 'vendor' ? 'التاجر' : 'العميل'}: {senderName || 'غير معروف'}
                        </p>
                        {msg.text && <p className="text-black">{msg.text}</p>}
                        {msg.image && (
                          <img
                            src={`${process.env.REACT_APP_API_URL}/Uploads/${msg.image}`}
                            alt="صورة الرسالة"
                            className="w-32 h-32 object-cover rounded mt-2 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              openMedia(msg.image);
                            }}
                            onError={(e) => {
                              console.error(`Failed to load image: ${msg.image}`);
                              e.target.src = `${process.env.REACT_APP_API_URL}/Uploads/placeholder-image.jpg`;
                            }}
                          />
                        )}
                        <div className="flex justify-end items-center text-xs text-gray-600">
                          <p>{new Date(msg.timestamp).toLocaleString('ar-EG')}</p>
                          {isMyMessage && (
                            <span className="ml-1">
                              {msg.isRead ? (
                                <span className="text-blue-500">✓✓</span>
                              ) : msg.isDelivered ? (
                                <span className="text-gray-600">✓✓</span>
                              ) : (
                                <span className="text-gray-600">✓</span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-gray-600">لا توجد رسائل بعد.</p>
                )}
                <div ref={messagesEndRef} />
              </div>
              {(userRole === 'vendor' || userRole === 'customer') && (
                <form onSubmit={handleSendMessage} className="flex flex-col">
                  <textarea
                    placeholder="اكتب رسالتك هنا..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="w-full p-3 mb-2 border border-gray-200/30 rounded-xl bg-[#2A2A3E] text-white text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex items-center space-x-2 space-x-reverse mb-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setNewImage(e.target.files[0])}
                      className="text-sm text-gray-300"
                    />
                    {newImagePreview && (
                      <img src={newImagePreview} alt="معاينة" className="w-16 h-16 object-cover rounded" />
                    )}
                  </div>
                  <motion.button
                    type="submit"
                    className="w-full py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-green-500 to-green-700 shadow-lg"
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
                className="w-full py-3 mt-4 rounded-xl text-white font-semibold bg-gradient-to-r from-red-500 to-red-700 shadow-lg"
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
      <AnimatePresence mode="wait">
        {selectedMedia && (
          <motion.div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={modalVariants}
            onClick={(e) => {
              e.stopPropagation();
              closeMedia();
            }}
            key="mediaModal"
          >
            <motion.div className="relative" onClick={(e) => e.stopPropagation()}>
              <img
                src={selectedMedia.url}
                className="max-w-full max-h-screen rounded-xl shadow-lg"
                alt="صورة الطلب"
                onError={(e) => {
                  e.target.src = `${process.env.REACT_APP_API_URL}/Uploads/placeholder-image.jpg`;
                }}
              />
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  closeMedia();
                }}
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

export default Orders;

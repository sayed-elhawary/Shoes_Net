// frontend/src/pages/Orders.js
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import { saveAs } from 'file-saver';

// إضافة خط Cairo كـ base64 (استبدل بـ base64 الحقيقي لخط Cairo)
const cairoFontBase64 = 'data:font/ttf;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD...'; // ضع base64 لخط Cairo هنا

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [vendorSearch, setVendorSearch] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [error, setError] = useState(null);
  const [editOrder, setEditOrder] = useState(null); // حالة لتخزين الطلب المراد تعديله
  const [editForm, setEditForm] = useState({ quantity: 1, address: '' }); // نموذج التعديل
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = () => {
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
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;
    axios
      .get(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(res => {
        console.log('API Response for Orders:', res.data);
        setOrders(res.data);
        setError(null);
      })
      .catch(err => {
        console.error('Error fetching orders:', err);
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
    setSelectedMedia({ url: `${process.env.REACT_APP_API_URL}/uploads/${media}`, type: 'image' });
  };

  const closeMedia = () => setSelectedMedia(null);

  const exportToPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      doc.addFileToVFS('Cairo-Regular.ttf', cairoFontBase64);
      doc.addFont('Cairo-Regular.ttf', 'Cairo', 'normal');
      doc.setFont('Cairo');
      doc.setFontSize(16);
      doc.text('قائمة الطلبات', 190, 10, { align: 'right' });
      doc.autoTable({
        head: [['الصورة', 'اسم العميل', 'رقم الهاتف', 'العنوان', 'المنتج', 'اسم التاجر', 'تاريخ الطلب', 'الحالة']],
        body: orders.map(order => [
          order.selectedImage || 'placeholder-image.jpg',
          order.user?.name || 'زائر',
          order.user?.phone || '-',
          order.address || '-',
          order.product?.name || 'غير معروف',
          order.product?.vendor?.name || 'غير معروف',
          new Date(order.createdAt).toLocaleDateString('ar-EG') || '-',
          {
            pending: 'تحت المراجعة',
            shipped: 'جاري الشحن',
            delivered: 'تم التسليم',
            rejected: 'مرفوض'
          }[order.status] || 'غير معروف'
        ]),
        styles: {
          font: 'Cairo',
          halign: 'right',
          fontSize: 10,
          cellPadding: 4,
          textColor: [0, 0, 0],
        },
        headStyles: {
          fillColor: [0, 102, 204],
          textColor: [255, 255, 255],
          fontSize: 12,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240],
        },
        margin: { top: 20, right: 10, left: 10 },
        columnStyles: {
          0: { cellWidth: 30, halign: 'center' },
          1: { cellWidth: 30 },
          2: { cellWidth: 30 },
          3: { cellWidth: 40 },
          4: { cellWidth: 30 },
          5: { cellWidth: 30 },
          6: { cellWidth: 30 },
          7: { cellWidth: 30 }
        },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 0 && data.cell.text[0]) {
            doc.setFont('Cairo');
            doc.setTextColor([0, 0, 0]);
          } else if (data.section === 'head') {
            doc.setFont('Cairo');
            doc.setTextColor([255, 255, 255]);
          }
        },
      });
      doc.save('orders.pdf');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      setError('خطأ في تصدير الـ PDF: ' + error.message);
    }
  };

  const exportToWord = () => {
    try {
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'قائمة الطلبات',
                    font: 'Cairo',
                    size: 32,
                    bold: true,
                    rtl: true,
                  }),
                ],
                alignment: 'right',
                spacing: { after: 200 },
              }),
              new Table({
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ text: 'الصورة', font: 'Cairo', rtl: true, bold: true })],
                        width: { size: 15, type: WidthType.PERCENTAGE },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: 'اسم العميل', font: 'Cairo', rtl: true, bold: true })],
                        width: { size: 15, type: WidthType.PERCENTAGE },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: 'رقم الهاتف', font: 'Cairo', rtl: true, bold: true })],
                        width: { size: 15, type: WidthType.PERCENTAGE },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: 'العنوان', font: 'Cairo', rtl: true, bold: true })],
                        width: { size: 20, type: WidthType.PERCENTAGE },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: 'المنتج', font: 'Cairo', rtl: true, bold: true })],
                        width: { size: 15, type: WidthType.PERCENTAGE },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: 'اسم التاجر', font: 'Cairo', rtl: true, bold: true })],
                        width: { size: 15, type: WidthType.PERCENTAGE },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: 'تاريخ الطلب', font: 'Cairo', rtl: true, bold: true })],
                        width: { size: 15, type: WidthType.PERCENTAGE },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: 'الحالة', font: 'Cairo', rtl: true, bold: true })],
                        width: { size: 15, type: WidthType.PERCENTAGE },
                      }),
                    ],
                  }),
                  ...orders.map(
                    order =>
                      new TableRow({
                        children: [
                          new TableCell({
                            children: [
                              new Paragraph({
                                text: order.selectedImage || 'placeholder-image.jpg',
                                font: 'Cairo',
                                rtl: true,
                              }),
                            ],
                          }),
                          new TableCell({
                            children: [
                              new Paragraph({
                                text: order.user?.name || 'زائر',
                                font: 'Cairo',
                                rtl: true,
                              }),
                            ],
                          }),
                          new TableCell({
                            children: [
                              new Paragraph({
                                text: order.user?.phone || '-',
                                font: 'Cairo',
                                rtl: true,
                              }),
                            ],
                          }),
                          new TableCell({
                            children: [
                              new Paragraph({
                                text: order.address || '-',
                                font: 'Cairo',
                                rtl: true,
                              }),
                            ],
                          }),
                          new TableCell({
                            children: [
                              new Paragraph({
                                text: order.product?.name || 'غير معروف',
                                font: 'Cairo',
                                rtl: true,
                              }),
                            ],
                          }),
                          new TableCell({
                            children: [
                              new Paragraph({
                                text: order.product?.vendor?.name || 'غير معروف',
                                font: 'Cairo',
                                rtl: true,
                              }),
                            ],
                          }),
                          new TableCell({
                            children: [
                              new Paragraph({
                                text: new Date(order.createdAt).toLocaleDateString('ar-EG') || '-',
                                font: 'Cairo',
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
                                    rejected: 'مرفوض'
                                  }[order.status] || 'غير معروف',
                                font: 'Cairo',
                                rtl: true,
                              }),
                            ],
                          }),
                        ],
                      }),
                  ),
                ],
                width: { size: 100, type: WidthType.PERCENTAGE },
              }),
            ],
          },
        ],
      });
      Packer.toBlob(doc).then(blob => {
        saveAs(blob, 'orders.docx');
      });
    } catch (error) {
      console.error('Error exporting Word:', error);
      setError('خطأ في تصدير الـ Word: ' + error.message);
    }
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
  };

  const getUserRole = () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('Decoded user role:', payload.role);
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

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center bg-gradient-to-b from-gray-900 to-gray-800 p-4 sm:p-6 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ willChange: 'opacity' }}
    >
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
        📋 قائمة الطلبات
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
      {/* حقول البحث (مخفية للعملاء) */}
      {userRole !== 'customer' && (
        <div className="w-full max-w-7xl mb-6 flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 md:space-x-reverse">
          <input
            type="text"
            placeholder="ابحث باسم التاجر"
            value={vendorSearch}
            onChange={(e) => setVendorSearch(e.target.value)}
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
            type="date"
            placeholder="تاريخ البداية"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-3 rounded-xl bg-[#2A2A3E] text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            placeholder="تاريخ النهاية"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="p-3 rounded-xl bg-[#2A2A3E] text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
            onClick={exportToPDF}
            className="px-4 py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-green-500 to-green-700 shadow-lg"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            تصدير إلى PDF
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
      )}
      <AnimatePresence>
        {orders.length === 0 && !error ? (
          <motion.p
            className="text-center text-gray-400 text-xl py-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            لا توجد طلبات حالياً.
          </motion.p>
        ) : (
          <motion.div
            className="w-full max-w-7xl overflow-x-auto shadow-2xl rounded-2xl border border-gray-600/50"
            variants={tableVariants}
            initial="hidden"
            animate="visible"
          >
            <table className="min-w-full bg-[#1F1F2E] border border-gray-600/50">
              <thead className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
                <tr>
                  <th className="py-4 px-4 text-right font-semibold">🖼️ الصورة</th>
                  <th className="py-4 px-4 text-right font-semibold">👤 اسم العميل</th>
                  <th className="py-4 px-4 text-right font-semibold">📞 رقم الهاتف</th>
                  <th className="py-4 px-4 text-right font-semibold">📍 العنوان</th>
                  <th className="py-4 px-4 text-right font-semibold">📦 المنتج</th>
                  <th className="py-4 px-4 text-right font-semibold">🏪 اسم التاجر</th>
                  <th className="py-4 px-4 text-right font-semibold">🗓️ تاريخ الطلب</th>
                  <th className="py-4 px-4 text-right font-semibold">📋 الحالة</th>
                  <th className="py-4 px-4 text-right font-semibold">⚙️ إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <motion.tr
                    key={order._id}
                    className="hover:bg-gray-700/30 transition duration-200 border-b border-gray-600/50"
                    variants={rowVariants}
                  >
                    <td className="py-3 px-4 text-center">
                      <img
                        src={`${process.env.REACT_APP_API_URL}/uploads/${order.selectedImage || 'placeholder-image.jpg'}`}
                        alt="صورة الطلب"
                        className="w-16 h-16 object-cover rounded-lg mx-auto cursor-pointer"
                        onClick={() => openMedia(order.selectedImage || 'placeholder-image.jpg')}
                        onError={(e) => {
                          console.error('خطأ في تحميل صورة الطلب:', e);
                          e.target.src = `${process.env.REACT_APP_API_URL}/Uploads/placeholder-image.jpg`;
                        }}
                      />
                    </td>
                    <td className="py-3 px-4 font-medium text-right">
                      {order.user?.name || 'زائر'}
                    </td>
                    <td className="py-3 px-4 text-right">{order.user?.phone || '-'}</td>
                    <td className="py-3 px-4 text-right">{order.address || '-'}</td>
                    <td className="py-3 px-4 text-right">{order.product?.name || 'غير معروف'}</td>
                    <td className="py-3 px-4 text-right">{order.product?.vendor?.name || 'غير معروف'}</td>
                    <td className="py-3 px-4 text-right">{new Date(order.createdAt).toLocaleDateString('ar-EG') || '-'}</td>
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
                          pending: '⏳ تحت المراجعة',
                          shipped: '🚚 جاري الشحن',
                          delivered: '✅ تم التسليم',
                          rejected: '❌ مرفوض'
                        }[order.status] || 'غير معروف'}
                      </span>
                    </td>
                    <td className="py-3 px-4 flex space-x-2 space-x-reverse justify-end">
                      {userRole === 'admin' && (
                        <>
                          <motion.button
                            className="px-3 py-1 rounded-lg text-white bg-gradient-to-r from-blue-500 to-blue-700 shadow-md"
                            variants={buttonVariants}
                            whileHover="hover"
                            whileTap="tap"
                            onClick={() => handleEditOrder(order)}
                          >
                            ✏️
                          </motion.button>
                          <motion.button
                            onClick={() => handleDeleteOrder(order._id)}
                            className="px-3 py-1 rounded-lg text-white bg-gradient-to-r from-red-500 to-red-700 shadow-md"
                            variants={buttonVariants}
                            whileHover="hover"
                            whileTap="tap"
                          >
                            🗑️
                          </motion.button>
                        </>
                      )}
                      {userRole === 'vendor' && (
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
                      {userRole === 'customer' && order.status === 'pending' && (
                        <motion.button
                          className="px-3 py-1 rounded-lg text-white bg-gradient-to-r from-blue-500 to-blue-700 shadow-md"
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                          onClick={() => handleEditOrder(order)}
                        >
                          ✏️ تعديل
                        </motion.button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Modal لتعديل الطلب */}
      <AnimatePresence>
        {editOrder && (
          <motion.div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={modalVariants}
            onClick={() => setEditOrder(null)}
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
                onChange={(e) => setEditForm({ ...editForm, quantity: parseInt(e.target.value) })}
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
                  onClick={handleEditSubmit}
                  className="w-full py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-green-500 to-green-700 shadow-lg"
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  حفظ التعديلات
                </motion.button>
                <motion.button
                  onClick={() => setEditOrder(null)}
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
      {/* Modal لعرض الصورة */}
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
              <img
                src={selectedMedia.url}
                className="max-w-full max-h-screen rounded-xl shadow-lg"
                alt="صورة الطلب"
                onError={(e) => {
                  console.error('خطأ في تحميل الصورة في المودال:', e);
                  e.target.src = `${process.env.REACT_APP_API_URL}/Uploads/placeholder-image.jpg`;
                }}
              />
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

export default Orders;

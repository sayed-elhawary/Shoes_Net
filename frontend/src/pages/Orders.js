import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [selectedMedia, setSelectedMedia] = useState(null); // لحالة المودال

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = () => {
    const token = localStorage.getItem('token');
    if (token) {
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
        })
        .catch(err => {
          console.error('Error fetching orders:', err);
          alert('خطأ في جلب الطلبات: ' + err.message);
        });
    } else {
      console.log('No token found, skipping orders fetch');
      alert('يرجى تسجيل الدخول لجلب الطلبات');
    }
  };

  const handleDeleteOrder = (id) => {
    if (window.confirm('هل تريد حذف هذا الطلب؟')) {
      const token = localStorage.getItem('token');
      axios
        .delete(`${process.env.REACT_APP_API_URL}/api/orders/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then(() => setOrders(orders.filter(o => o._id !== id)))
        .catch(err => alert('خطأ: ' + err.message));
    }
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
        head: [['الصورة', 'اسم العميل', 'رقم الهاتف', 'العنوان', 'المنتج', 'اسم التاجر', 'تاريخ الطلب']],
        body: orders.map(order => [
          order.selectedImage || 'placeholder-image.jpg',
          order.customerName || order.user?.name || 'زائر',
          order.phone || '-',
          order.address || '-',
          order.product?.name || 'غير معروف',
          order.product?.vendor?.name || 'غير معروف',
          new Date(order.createdAt).toLocaleDateString('ar-EG') || '-',
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
          0: { cellWidth: 30, halign: 'center' }, // عمود الصورة
          1: { cellWidth: 30 },
          2: { cellWidth: 30 },
          3: { cellWidth: 40 },
          4: { cellWidth: 30 },
          5: { cellWidth: 30 },
          6: { cellWidth: 30 },
        },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 0 && data.cell.text[0]) {
            // لا يمكن عرض الصور مباشرة في jsPDF، لذلك نعرض المسار كنص
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
      alert('خطأ في تصدير الـ PDF: ' + error.message);
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
                        width: { size: 20, type: WidthType.PERCENTAGE },
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
                                text: order.customerName || order.user?.name || 'زائر',
                                font: 'Cairo',
                                rtl: true,
                              }),
                            ],
                          }),
                          new TableCell({
                            children: [
                              new Paragraph({
                                text: order.phone || '-',
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
      alert('خطأ في تصدير الـ Word: ' + error.message);
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

      {/* حقول البحث */}
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

      <AnimatePresence>
        {orders.length === 0 ? (
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
                          e.target.src = `${process.env.REACT_APP_API_URL}/uploads/placeholder-image.jpg`;
                        }}
                      />
                    </td>
                    <td className="py-3 px-4 font-medium text-right">
                      {order.customerName || order.user?.name || 'زائر'}
                    </td>
                    <td className="py-3 px-4 text-right">{order.phone || '-'}</td>
                    <td className="py-3 px-4 text-right">{order.address || '-'}</td>
                    <td className="py-3 px-4 text-right">{order.product?.name || 'غير معروف'}</td>
                    <td className="py-3 px-4 text-right">{order.product?.vendor?.name || 'غير معروف'}</td>
                    <td className="py-3 px-4 text-right">{new Date(order.createdAt).toLocaleDateString('ar-EG') || '-'}</td>
                    <td className="py-3 px-4 flex space-x-2 space-x-reverse justify-end">
                      <motion.button
                        className="px-3 py-1 rounded-lg text-white bg-gradient-to-r from-blue-500 to-blue-700 shadow-md"
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
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
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
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
                  e.target.src = `${process.env.REACT_APP_API_URL}/uploads/placeholder-image.jpg`;
                }}
              />
              <button className="absolute top-2 right-2 text-white text-2xl bg-gray-900/70 rounded-full p-2 hover:bg-gray-900/90">
                ×
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Orders;

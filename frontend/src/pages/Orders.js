import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import { saveAs } from 'file-saver';

// إضافة خط Cairo كـ base64
// استبدل هذا بنص base64 الناتج من تحويل ملف Cairo-Regular.ttf
const cairoFontBase64 = 'data:font/ttf;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD...'; // ضع هنا نص base64 لخط Cairo

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [vendorSearch, setVendorSearch] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  const exportToPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // إضافة خط Cairo
      doc.addFileToVFS('Cairo-Regular.ttf', cairoFontBase64);
      doc.addFont('Cairo-Regular.ttf', 'Cairo', 'normal');
      doc.setFont('Cairo');

      // إضافة عنوان
      doc.setFontSize(16);
      doc.text('قائمة الطلبات', 190, 10, { align: 'right' });

      // إنشاء الجدول
      doc.autoTable({
        head: [['اسم العميل', 'رقم الهاتف', 'العنوان', 'المنتج', 'اسم التاجر', 'تاريخ الطلب']],
        body: orders.map(order => [
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
          0: { cellWidth: 30 },
          1: { cellWidth: 30 },
          2: { cellWidth: 40 },
          3: { cellWidth: 30 },
          4: { cellWidth: 30 },
          5: { cellWidth: 30 },
        },
        didDrawCell: (data) => {
          if (data.section === 'body' || data.section === 'head') {
            doc.setFont('Cairo');
            doc.setTextColor(data.section === 'head' ? [255, 255, 255] : [0, 0, 0]);
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
      transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
    },
    tap: {
      scale: 0.9,
      transition: { duration: 0.1, ease: 'easeOut' },
    },
  };

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center bg-gradient-to-b from-gray-900 to-gray-800 p-4 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ willChange: 'opacity' }}
    >
      <h1 className="text-2xl md:text-3xl font-bold mb-8 text-center">📋 قائمة الطلبات</h1>

      {/* حقول البحث */}
      <div className="w-full max-w-6xl mb-6 flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 md:space-x-reverse">
        <input
          type="text"
          placeholder="ابحث باسم التاجر"
          value={vendorSearch}
          onChange={(e) => setVendorSearch(e.target.value)}
          className="p-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-blue-500"
        />
        <input
          type="text"
          placeholder="ابحث برقم الهاتف"
          value={phoneSearch}
          onChange={(e) => setPhoneSearch(e.target.value)}
          className="p-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-blue-500"
        />
        <input
          type="date"
          placeholder="تاريخ البداية"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="p-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-blue-500"
        />
        <input
          type="date"
          placeholder="تاريخ النهاية"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="p-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={fetchOrders}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500"
        >
          بحث
        </button>
        <button
          onClick={exportToPDF}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-500"
        >
          تصدير إلى PDF
        </button>
        <button
          onClick={exportToWord}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-500"
        >
          تصدير إلى Word
        </button>
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
            className="w-full max-w-6xl overflow-x-auto shadow-2xl rounded-2xl border border-gray-700"
            variants={tableVariants}
            initial="hidden"
            animate="visible"
          >
            <table className="min-w-full bg-[#1F1F2E] border border-gray-700">
              <thead className="bg-blue-600/50 text-white">
                <tr>
                  <th className="py-3 px-4 text-right font-semibold">👤 اسم العميل</th>
                  <th className="py-3 px-4 text-right font-semibold">📞 رقم الهاتف</th>
                  <th className="py-3 px-4 text-right font-semibold">📍 العنوان</th>
                  <th className="py-3 px-4 text-right font-semibold">📦 المنتج</th>
                  <th className="py-3 px-4 text-right font-semibold">🗓️ تاريخ الطلب</th>
                  <th className="py-3 px-4 text-right font-semibold">🏪 اسم التاجر</th>
                  <th className="py-3 px-4 text-right font-semibold">⚙️ إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <motion.tr
                    key={order._id}
                    className="hover:bg-gray-700/30 transition duration-200 border-b border-gray-700"
                    variants={rowVariants}
                  >
                    <td className="py-3 px-4 font-medium text-right">
                      {order.customerName || order.user?.name || 'زائر'}
                    </td>
                    <td className="py-3 px-4 text-right">{order.phone || '-'}</td>
                    <td className="py-3 px-4 text-right">{order.address || '-'}</td>
                    <td className="py-3 px-4 text-right">{order.product?.name || 'غير معروف'}</td>
                    <td className="py-3 px-4 text-right">{new Date(order.createdAt).toLocaleDateString('ar-EG') || '-'}</td>
                    <td className="py-3 px-4 text-right">{order.product?.vendor?.name || 'غير معروف'}</td>
                    <td className="py-3 px-4 flex space-x-2 space-x-reverse justify-end">
                      <motion.button
                        className="text-blue-400 hover:text-blue-300 p-1"
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        ✏️
                      </motion.button>
                      <motion.button
                        onClick={() => handleDeleteOrder(order._id)}
                        className="text-red-400 hover:text-red-300 p-1"
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
    </motion.div>
  );
};

export default Orders;

// frontend/src/pages/PendingCustomers.js
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const PendingCustomers = () => {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchPending();
  }, [navigate]);

  const fetchPending = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/auth/pending-customers`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPending(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const approve = async (phone) => {
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/approve-customer`, { phone }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPending(pending.filter(c => c.phone !== phone));
    } catch (err) {
      alert(err.response?.data?.message || 'فشل');
    }
  };

  const reject = async (phone) => {
    if (!window.confirm('هل تريد رفض هذا الطلب؟')) return;
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/reject-customer`, { phone }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPending(pending.filter(c => c.phone !== phone));
    } catch (err) {
      alert(err.response?.data?.message || 'فشل');
    }
  };

  if (loading) return <div className="text-center p-8 text-white">جارٍ التحميل...</div>;

  return (
    <div className="min-h-screen bg-[#18191a] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <motion.h1
          className="text-3xl font-bold text-center mb-8 text-red-400"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          طلبات التسجيل المعلقة
        </motion.h1>

        {pending.length === 0 ? (
          <p className="text-center text-gray-400">لا توجد طلبات معلقة</p>
        ) : (
          <div className="grid gap-4">
            {pending.map((customer) => (
              <motion.div
                key={customer._id}
                className="bg-[#242526] p-6 rounded-xl border border-gray-700 flex justify-between items-center"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div>
                  <p className="text-lg font-semibold">{customer.name}</p>
                  <p className="text-sm text-gray-400">{customer.phone}</p>
                  <p className="text-xs text-gray-500">تاريخ الطلب: {new Date(customer.createdAt).toLocaleString('ar-EG')}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approve(customer.phone)}
                    className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition text-sm font-medium"
                  >
                    موافقة
                  </button>
                  <button
                    onClick={() => reject(customer.phone)}
                    className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition text-sm font-medium"
                  >
                    رفض
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingCustomers;

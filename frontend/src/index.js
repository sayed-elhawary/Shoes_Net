// frontend/src/index.js
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import App from './App';
import './index.css';

// === إضافة الـ CSS للـ Toast مرة واحدة فقط ===
const injectToastStyles = () => {
  if (document.getElementById('toast-styles')) return;

  const style = document.createElement('style');
  style.id = 'toast-styles';
  style.textContent = `
    @keyframes toastFade {
      0%, 100% { opacity: 0; transform: translateX(-50%) translateY(10px); }
      15%, 85% { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
  `;
  document.head.appendChild(style);
};
injectToastStyles();

// === دالة عرض Toast (نظيفة وآمنة) ===
const showToast = (message) => {
  // إزالة أي Toast قديم
  const oldToast = document.getElementById('app-toast');
  if (oldToast) oldToast.remove();

  const toast = document.createElement('div');
  toast.id = 'app-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 60px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 10000;
    animation: toastFade 2s ease-in-out forwards;
    pointer-events: none;
  `;
  document.body.appendChild(toast);

  // إزالة بعد 2 ثانية
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }
  }, 2000);
};

// === مكون التحكم في زر الـ Back ===
const BackButtonHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let lastBackPress = 0;
    let backListener = null;

    const handleBackButton = async () => {
      try {
        const canGoBack = await CapacitorApp.canGoBack?.();
        const currentPath = window.location.pathname;

        // لو في الصفحة الرئيسية أو تسجيل الدخول → خروج بضغطتين
        if (['/', '/login'].includes(currentPath)) {
          const now = Date.now();
          if (now - lastBackPress < 2000) {
            CapacitorApp.exitApp();
          } else {
            lastBackPress = now;
            showToast('اضغط مرة أخرى للخروج');
          }
          return;
        }

        // لو فيه تاريخ → ارجع خطوة واحدة
        if (canGoBack) {
          navigate(-1);
        } else {
          // لو مفيش تاريخ (نادر) → ارجع للرئيسية
          navigate('/', { replace: true });
        }
      } catch (error) {
        console.warn('Back button error:', error);
        // في حالة فشل → ارجع يدويًا
        navigate(-1);
      }
    };

    // إضافة الـ listener
    CapacitorApp.addListener('backButton', handleBackButton).then((listener) => {
      backListener = listener;
    });

    // تنظيف
    return () => {
      backListener?.remove();
    };
  }, [navigate]);

  return null;
};

// === رندر التطبيق ===
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <BackButtonHandler />
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

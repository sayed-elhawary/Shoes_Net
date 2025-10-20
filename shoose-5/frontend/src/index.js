import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // لو عندك CSS عام، أو احذفه لو مش موجود

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

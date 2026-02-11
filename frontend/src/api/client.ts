// src/api/client.ts
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ CORRECTION : Choisir le token selon la route
api.interceptors.request.use((config) => {
  let token = null;
  
  // 1. D'ABORD les routes ADMIN (priorité)
  if (
    config.url?.includes('/admin/') || 
    config.url?.includes('/auth/admin/') ||
    config.url?.includes('/qualification/')
  ) {
    token = localStorage.getItem('admin_token');
    console.log('👑 Route ADMIN - Token:', token ? '✅' : '❌');
  }
  
  // 2. ENSUITE les routes JURY
  else if (
    config.url?.includes('/judges/') || 
    config.url?.includes('/scores/') ||
    config.url?.includes('/auth/judge/')
  ) {
    token = localStorage.getItem('judge_token');
    console.log('🎯 Route JURY - Token:', token ? '✅' : '❌');
  }
  
  // 3. Routes publiques ou autres
  else if (
    config.url?.includes('/rounds/') ||
    config.url?.includes('/candidates/')
  ) {
    // ICI il faut DÉTERMINER selon le contexte
    // Par défaut, pour /rounds/ et /candidates/ dans admin, c'est ADMIN
    if (window.location.pathname.includes('/admin/')) {
      token = localStorage.getItem('admin_token');
      console.log('👑 Route ADMIN (via contexte) - Token:', token ? '✅' : '❌');
    } else {
      token = localStorage.getItem('judge_token');
      console.log('🎯 Route JURY (via contexte) - Token:', token ? '✅' : '❌');
    }
  }

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

// Interceptor pour gérer les erreurs (inchangé)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAdminRoute = error.config.url?.includes('/admin/');
      const isAuthRoute = error.config.url?.includes('/auth/');
      
      if (!isAuthRoute) {
        if (isAdminRoute) {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_data');
          window.location.href = '/admin/login';
        } else {
          localStorage.removeItem('judge_token');
          localStorage.removeItem('judge_data');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
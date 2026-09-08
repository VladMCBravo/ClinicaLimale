// src/hooks/useWebPush.js
import { useEffect } from 'react';
import apiClient from '../api/axiosConfig';

export const PUBLIC_VAPID_KEY = process.env.REACT_APP_PUBLIC_VAPID_KEY;

function urlBase64ToUint8Array(base64String) {
  if (!base64String) return new Uint8Array();
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useWebPush(user) {
  useEffect(() => {
    if (user && 'serviceWorker' in navigator && 'PushManager' in window && PUBLIC_VAPID_KEY) {
      registrarServiceWorkerEInscrever();
    }
  }, [user]);

  const registrarServiceWorkerEInscrever = async () => {
    try {
      // FIX 1: Pede a permissão DE MODO EXPLÍCITO (Exigência do iOS)
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
          console.warn('Permissão de notificação web foi negada ou ignorada no iOS.');
          return;
      }

      const register = await navigator.serviceWorker.register('/sw.js');
      const sw = await navigator.serviceWorker.ready;
      
      const subscription = await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY) 
      });

      await apiClient.post('/push/subscribe/', subscription);
      console.log('Push registrado com sucesso!');

    } catch (error) {
      console.error('Erro ao registrar Web Push:', error);
    }
  };
}
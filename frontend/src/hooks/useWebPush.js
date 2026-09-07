// src/hooks/useWebPush.js
import { useEffect } from 'react';
import apiClient from '../api/axiosConfig'; // Usamos sua config existente

// Agora a chave vem diretamente do Vercel
export const PUBLIC_VAPID_KEY = process.env.REACT_APP_PUBLIC_VAPID_KEY;

function urlBase64ToUint8Array(base64String) {
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
    // Só tenta registrar se tiver usuário logado e suporte no navegador
    if (user && 'serviceWorker' in navigator && 'PushManager' in window) {
      registrarServiceWorkerEInscrever();
    }
  }, [user]);

  const registrarServiceWorkerEInscrever = async () => {
    try {
      // 1. Registra o Service Worker criado no passo anterior
      const register = await navigator.serviceWorker.register('/sw.js');
      
      // 2. Espera o SW ficar pronto
      const sw = await navigator.serviceWorker.ready;
      
      // 3. Pede permissão e se inscreve no servidor de Push (Google/Apple)
      const subscription = await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY) 
      });

      // 4. Envia a inscrição para o nosso Django
      await apiClient.post('/push/subscribe/', subscription);
      console.log('Push registrado com sucesso!');

    } catch (error) {
      console.error('Erro ao registrar Web Push:', error);
    }
  };
}
import axios from 'axios';
import { auth } from './AuthConfig';
import { API_BASE_URL } from './APIConfig';

const getIdToken = async () => (auth.currentUser ? auth.currentUser.getIdToken() : null);

// Attach the signed-in user's Firebase ID token to axios calls to our own API only
axios.interceptors.request.use(async (config) => {
  if ((config.url || '').startsWith(API_BASE_URL)) {
    const token = await getIdToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authFetch = async (url, options = {}) => {
  const token = await getIdToken();
  const headers = { ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
};

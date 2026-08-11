import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${window.location.origin}/api`;

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

export default client;

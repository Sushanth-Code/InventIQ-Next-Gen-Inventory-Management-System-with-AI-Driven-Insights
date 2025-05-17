import axios, { InternalAxiosRequestConfig } from 'axios';
import { LoginResponse } from '../types/auth';

const API_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor to attach token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      // Extract the token if it has Bearer prefix, otherwise use as is
      const tokenValue = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      config.headers.set('Authorization', tokenValue);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Authentication services
export const authService = {
  login: async (username: string, password: string, role: string = 'staff'): Promise<LoginResponse> => {
    try {
      const response = await api.post<LoginResponse>('/auth/login', { username, password, role });
      return response.data;
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.response) {
        throw new Error(error.response.data.message || 'Login failed');
      } else if (error.request) {
        throw new Error('Network error. Please check if the server is running.');
      } else {
        throw new Error('Error: ' + error.message);
      }
    }
  },
  register: async (userData: any) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error: any) {
      console.error('Register error:', error);
      if (error.response) {
        throw new Error(error.response.data.message || 'Registration failed');
      } else if (error.request) {
        throw new Error('Network error. Please check if the server is running.');
      } else {
        throw new Error('Error: ' + error.message);
      }
    }
  },
  getUserStatus: async () => {
    try {
      const response = await api.get('/auth/status');
      return response.data;
    } catch (error: any) {
      console.error('Get user status error:', error);
      throw new Error('Failed to get user status');
    }
  },
};

// Inventory services
export const inventoryService = {
  getAllProducts: async () => {
    try {
      const response = await api.get('/inventory/');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching products:', error);
      throw new Error('Failed to fetch products');
    }
  },
  
  getProduct: async (productId: string) => {
    try {
      const response = await api.get(`/inventory/${productId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching product:', error);
      throw new Error('Failed to fetch product');
    }
  },
  
  addProduct: async (productData: any) => {
    try {
      const response = await api.post('/inventory/', productData);
      return response.data;
    } catch (error: any) {
      console.error('Error adding product:', error);
      throw new Error(error.response?.data?.message || 'Failed to add product');
    }
  },
  
  updateProduct: async (productId: string, productData: any) => {
    try {
      const response = await api.put(`/inventory/${productId}`, productData);
      return response.data;
    } catch (error: any) {
      console.error('Error updating product:', error);
      throw new Error(error.response?.data?.message || 'Failed to update product');
    }
  },
  
  deleteProduct: async (productId: string, deleteSupplier: boolean = false) => {
    try {
      const response = await api.delete(`/inventory/${productId}?delete_supplier=${deleteSupplier}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting product:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete product');
    }
  },
  
  recordTransaction: async (transactionData: any) => {
    try {
      const response = await api.post('/inventory/transaction', transactionData);
      return response.data;
    } catch (error: any) {
      console.error('Error recording transaction:', error);
      throw new Error(error.response?.data?.message || 'Failed to record transaction');
    }
  },
};

// Prediction services
export const predictionService = {
  getDemandForecast: async (productId: string, days: number = 30) => {
    try {
      const response = await api.get(`/predictions/forecast/${productId}?days=${days}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching forecast:', error);
      throw new Error('Failed to fetch demand forecast');
    }
  },
  
  getRestockRecommendation: async (productId: string, isTrending: boolean = false) => {
    try {
      const response = await api.get(`/predictions/restock/${productId}?trending=${isTrending}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching restock recommendation:', error);
      throw new Error('Failed to fetch restock recommendation');
    }
  },
  
  getLLMInsights: async (query: string, productId?: string) => {
    try {
      const payload = productId ? { query, product_id: productId } : { query };
      const response = await api.post('/predictions/insights', payload);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching insights:', error);
      throw new Error('Failed to fetch insights');
    }
  },
  
  getDashboardData: async () => {
    try {
      const response = await api.get('/predictions/dashboard');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      throw new Error('Failed to fetch dashboard data');
    }
  },
  
  getTrendData: async () => {
    try {
      const response = await api.get('/predictions/trends');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching trend data:', error);
      throw new Error('Failed to fetch trend data');
    }
  }
};

export default api;
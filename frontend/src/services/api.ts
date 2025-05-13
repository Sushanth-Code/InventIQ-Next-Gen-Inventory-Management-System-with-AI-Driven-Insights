import axios from 'axios';
import { mockApiService } from './mockData';

const API_URL = 'http://localhost:5000/api';

// Flag to determine if we should use mock data
// This will be set to true if we detect the backend is not available
let useMockData = false;

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Set a timeout to quickly detect if the server is not available
  timeout: 3000
});

// Add request interceptor to attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Check if the backend server is available
const checkServerAvailability = async () => {
  try {
    await axios.get(`${API_URL}/health`, { timeout: 2000 });
    useMockData = false;
    console.log('Using real backend API');
    return true;
  } catch (error) {
    useMockData = true;
    console.log('Backend server not available, using mock data');
    return false;
  }
};

// Initial check
checkServerAvailability();

// If we have a demo token, always use mock data
if (localStorage.getItem('token') === 'demo-admin-token' || 
    localStorage.getItem('token') === 'demo-staff-token') {
  useMockData = true;
  console.log('Using demo account with mock data');
}

// Authentication services
export const authService = {
  login: async (username: string, password: string, role: string = 'staff') => {
    try {
      const response = await api.post('/auth/login', { username, password, role });
      return response.data;
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        throw new Error(error.response.data.message || 'Login failed');
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error('Network error. Please check if the server is running.');
      } else {
        // Something happened in setting up the request that triggered an Error
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
    if (useMockData) {
      return await mockApiService.getAllProducts();
    }
    try {
      const response = await api.get('/inventory/');
      return response.data;
    } catch (error) {
      console.error('Error fetching products, using mock data:', error);
      useMockData = true;
      return await mockApiService.getAllProducts();
    }
  },
  getProduct: async (productId: string) => {
    if (useMockData) {
      return await mockApiService.getProduct(productId);
    }
    try {
      const response = await api.get(`/inventory/${productId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching product, using mock data:', error);
      useMockData = true;
      return await mockApiService.getProduct(productId);
    }
  },
  addProduct: async (productData: any) => {
    if (useMockData) {
      // Use the mock service to add the product
      const result = await mockApiService.addProduct(productData);
      
      // Force a refresh of the inventory data in localStorage
      localStorage.removeItem('inventoryData');
      await mockApiService.getAllProducts();
      
      return result;
    }
    try {
      const response = await api.post('/inventory/', productData);
      return response.data;
    } catch (error) {
      console.error('Error adding product, using mock data:', error);
      useMockData = true;
      
      // Use mock service as fallback
      const result = await mockApiService.addProduct(productData);
      localStorage.removeItem('inventoryData');
      await mockApiService.getAllProducts();
      return result;
    }
  },
  updateProduct: async (productId: string, productData: any) => {
    if (useMockData) {
      // Use the mock service to update the product
      const result = await mockApiService.updateProduct(productId, productData);
      
      // Force a refresh of the inventory data in localStorage
      localStorage.removeItem('inventoryData');
      await mockApiService.getAllProducts();
      
      return result;
    }
    try {
      const response = await api.put(`/inventory/${productId}`, productData);
      return response.data;
    } catch (error) {
      console.error('Error updating product, using mock data:', error);
      useMockData = true;
      
      // Use mock service as fallback
      const result = await mockApiService.updateProduct(productId, productData);
      localStorage.removeItem('inventoryData');
      await mockApiService.getAllProducts();
      return result;
    }
  },
  deleteProduct: async (productId: string, deleteSupplier: boolean = false) => {
    if (useMockData) {
      // Use mock service to delete the product
      const result = await mockApiService.deleteProduct(productId, deleteSupplier);
      
      // Force a refresh of the inventory data in localStorage
      localStorage.removeItem('inventoryData');
      await mockApiService.getAllProducts();
      
      return result;
    }
    try {
      const response = await api.delete(`/inventory/${productId}?delete_supplier=${deleteSupplier}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting product, using mock data:', error);
      useMockData = true;
      
      // Use mock service as fallback
      const result = await mockApiService.deleteProduct(productId, deleteSupplier);
      localStorage.removeItem('inventoryData');
      await mockApiService.getAllProducts();
      return result;
    }
  },
  recordTransaction: async (transactionData: any) => {
    if (useMockData) {
      // Simulate successful transaction recording
      return { success: true, message: 'Transaction recorded successfully (Mock)' };
    }
    const response = await api.post('/inventory/transaction', transactionData);
    return response.data;
  },
};

// Prediction services
export const predictionService = {
  getDemandForecast: async (productId: string, days: number = 30) => {
    if (useMockData) {
      // Return mock forecast data
      return {
        product_id: productId,
        forecast: Array.from({ length: days }, (_, i) => ({
          day: i + 1,
          predicted_demand: Math.floor(Math.random() * 50) + 10,
          confidence_interval: [Math.floor(Math.random() * 30) + 5, Math.floor(Math.random() * 70) + 20]
        })),
        accuracy: 0.85
      };
    }
    try {
      const response = await api.get(`/predictions/forecast/${productId}?days=${days}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching forecast, using mock data:', error);
      useMockData = true;
      // Return mock forecast data
      return {
        product_id: productId,
        forecast: Array.from({ length: days }, (_, i) => ({
          day: i + 1,
          predicted_demand: Math.floor(Math.random() * 50) + 10,
          confidence_interval: [Math.floor(Math.random() * 30) + 5, Math.floor(Math.random() * 70) + 20]
        })),
        accuracy: 0.85
      };
    }
  },
  getRestockRecommendation: async (productId: string, isTrending: boolean = false) => {
    if (useMockData) {
      // Return mock restock recommendation
      return {
        product_id: productId,
        recommended_restock: Math.floor(Math.random() * 100) + 50,
        optimal_order_time: new Date(Date.now() + 86400000 * 3).toISOString(),
        is_trending: isTrending,
        confidence: 0.92
      };
    }
    try {
      const response = await api.get(`/predictions/restock/${productId}?trending=${isTrending}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching restock recommendation, using mock data:', error);
      useMockData = true;
      // Return mock restock recommendation
      return {
        product_id: productId,
        recommended_restock: Math.floor(Math.random() * 100) + 50,
        optimal_order_time: new Date(Date.now() + 86400000 * 3).toISOString(),
        is_trending: isTrending,
        confidence: 0.92
      };
    }
  },
  getLLMInsights: async (query: string, productId?: string) => {
    if (useMockData) {
      // Return mock insights
      return {
        query: query,
        insights: `Based on the analysis of ${productId || 'your inventory'}, we recommend optimizing stock levels. Sales are trending ${Math.random() > 0.5 ? 'up' : 'down'} by approximately ${Math.floor(Math.random() * 20) + 5}% compared to last month.`,
        confidence: 0.88
      };
    }
    try {
      const payload = productId ? { query, product_id: productId } : { query };
      const response = await api.post('/predictions/insights', payload);
      return response.data;
    } catch (error) {
      console.error('Error fetching insights, using mock data:', error);
      useMockData = true;
      // Return mock insights
      return {
        query: query,
        insights: `Based on the analysis of ${productId || 'your inventory'}, we recommend optimizing stock levels. Sales are trending ${Math.random() > 0.5 ? 'up' : 'down'} by approximately ${Math.floor(Math.random() * 20) + 5}% compared to last month.`,
        confidence: 0.88
      };
    }
  },
  
  // Add a method to get dashboard data
  getDashboardData: async () => {
    if (useMockData) {
      return await mockApiService.getDashboardData();
    }
    try {
      const response = await api.get('/predictions/dashboard');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard data, using mock data:', error);
      useMockData = true;
      return await mockApiService.getDashboardData();
    }
  },
  
  // Add a method to get trend data
  getTrendData: async () => {
    if (useMockData) {
      return await mockApiService.getTrendData();
    }
    try {
      const response = await api.get('/predictions/trends');
      return response.data;
    } catch (error) {
      console.error('Error fetching trend data, using mock data:', error);
      useMockData = true;
      return await mockApiService.getTrendData();
    }
  }
};

export default api;
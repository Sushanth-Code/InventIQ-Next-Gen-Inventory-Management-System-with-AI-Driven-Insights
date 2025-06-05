import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  CardMedia, 
  Button, 
  Divider, 
  Chip, 
  CircularProgress,
  TextField,
  IconButton,
  Alert,
  Snackbar,
  Tooltip,
  Tab,
  Tabs,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  InsertChart,
  Psychology,
  Lightbulb,
  BarChart,
  ShowChart,
  Timeline,
  Category,
  Download,
  Inventory,
  Assessment,
  PieChart,
  DonutLarge,
  TableChart,
  StackedBarChart
} from '@mui/icons-material';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend
} from 'chart.js';
import { inventoryService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import SmartAssistant from '../components/SmartAssistant/SmartAssistant';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend
);

// Type definitions
interface Product {
  id: string;
  name: string;
  category: string;
  supplier: string;
  current_stock: number;
  reorder_level: number;
  purchase_price: number;
  selling_price: number;
  lead_time: number;
  historical_sales?: Record<string, number>;
}

interface ProductRecommendation {
  id: string;
  name: string;
  reason: string;
  action: string;
  impact: string;
  confidence: number;
  category: string;
}

interface CategoryInsight {
  category: string;
  growth: number;
  stockHealth: number;
  profitMargin: number;
  turnoverRate: number;
  recommendation: string;
}

// Helper function to generate category report data
const generateCategoryReport = (categoryInsight: CategoryInsight) => {
  // Generate monthly data for the past 6 months
  const months = ['January', 'February', 'March', 'April', 'May', 'June'];
  const salesData = months.map(() => Math.floor(Math.random() * 1000) + 500);
  const profitData = months.map(() => Math.floor(Math.random() * 500) + 200);
  const stockLevels = months.map(() => Math.floor(Math.random() * 100) + 50);
  
  // Create CSV content
  let csvContent = `${categoryInsight.category} Category Report\n\n`;
  csvContent += `Generated on: ${new Date().toLocaleString()}\n\n`;
  csvContent += `Category: ${categoryInsight.category}\n`;
  csvContent += `Growth Rate: ${categoryInsight.growth}%\n`;
  csvContent += `Stock Health: ${categoryInsight.stockHealth.toFixed(1)}%\n`;
  csvContent += `Profit Margin: ${categoryInsight.profitMargin.toFixed(1)}%\n`;
  csvContent += `Turnover Rate: ${categoryInsight.turnoverRate.toFixed(1)}x\n\n`;
  csvContent += `AI Recommendation: ${categoryInsight.recommendation}\n\n`;
  
  // Add monthly performance data
  csvContent += `Month,Sales,Profit,Stock Level\n`;
  months.forEach((month, index) => {
    csvContent += `${month},${salesData[index]},${profitData[index]},${stockLevels[index]}\n`;
  });
  
  return csvContent;
};

// Helper function to download CSV
const downloadCSV = (csvContent: string, filename: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Smart Analysis Page
const SmartAnalysisPage: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<ProductRecommendation[]>([]);
  const [categoryInsights, setCategoryInsights] = useState<CategoryInsight[]>([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // State for Product Analysis tab
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedChartType, setSelectedChartType] = useState<'line' | 'bar' | 'pie' | 'doughnut'>('line');
  const [productAnalysisMetric, setProductAnalysisMetric] = useState<'sales' | 'profit' | 'stock' | 'all'>('sales');
  const [showProductAnalysisDetails, setShowProductAnalysisDetails] = useState(false);
  
  // We'll use a different approach without trying to dynamically create canvas elements
  // Instead, we'll ensure the canvas in the JSX is properly initialized
  
  // Fetch inventory data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await inventoryService.getAllProducts();
        setProducts(data);
        generateRecommendations(data);
        generateCategoryInsights(data);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load inventory data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Generate AI-powered recommendations based on inventory data
  const generateRecommendations = (data: Product[]) => {
    // This would normally be done by a real AI model
    // Here we're creating mock recommendations based on the data
    
    const mockRecommendations: ProductRecommendation[] = [];
    
    // Find low stock items
    const lowStockItems = data.filter(p => p.current_stock <= p.reorder_level && p.current_stock > 0);
    lowStockItems.slice(0, 3).forEach(product => {
      mockRecommendations.push({
        id: product.id,
        name: product.name,
        reason: `Current stock (${product.current_stock}) is below reorder level (${product.reorder_level})`,
        action: 'Restock immediately',
        impact: 'Prevent stockouts and maintain customer satisfaction',
        confidence: 95,
        category: product.category
      });
    });
    
    // Find items with high stock levels
    const highStockItems = data.filter(p => p.current_stock > p.reorder_level * 3);
    highStockItems.slice(0, 2).forEach(product => {
      mockRecommendations.push({
        id: product.id,
        name: product.name,
        reason: `Current stock (${product.current_stock}) is significantly above reorder level (${product.reorder_level})`,
        action: 'Consider running a promotion',
        impact: 'Reduce carrying costs and free up warehouse space',
        confidence: 85,
        category: product.category
      });
    });
    
    // Find items with high profit margin
    const profitableItems = data
      .filter(p => (p.selling_price - p.purchase_price) / p.purchase_price > 0.4)
      .sort((a, b) => 
        ((b.selling_price - b.purchase_price) / b.purchase_price) - 
        ((a.selling_price - a.purchase_price) / a.purchase_price)
      );
    
    profitableItems.slice(0, 2).forEach(product => {
      const margin = ((product.selling_price - product.purchase_price) / product.purchase_price * 100).toFixed(0);
      mockRecommendations.push({
        id: product.id,
        name: product.name,
        reason: `High profit margin of ${margin}%`,
        action: 'Increase marketing for this product',
        impact: 'Boost overall profitability',
        confidence: 80,
        category: product.category
      });
    });
    
    // Find items with long lead times
    const longLeadTimeItems = data
      .filter(p => p.lead_time > 10)
      .sort((a, b) => b.lead_time - a.lead_time);
    
    longLeadTimeItems.slice(0, 2).forEach(product => {
      mockRecommendations.push({
        id: product.id,
        name: product.name,
        reason: `Long lead time of ${product.lead_time} days`,
        action: 'Evaluate alternative suppliers',
        impact: 'Reduce lead time and improve inventory turnover',
        confidence: 75,
        category: product.category
      });
    });
    
    setRecommendations(mockRecommendations);
  };
  
  // Generate category insights
  const generateCategoryInsights = (data: Product[]) => {
    const categories = Array.from(new Set(data.map(p => p.category)));
    const insights: CategoryInsight[] = [];
    
    categories.forEach(category => {
      const categoryProducts = data.filter(p => p.category === category);
      
      // Calculate metrics
      const avgMargin = categoryProducts.reduce((sum, p) => 
        sum + ((p.selling_price - p.purchase_price) / p.purchase_price), 0) / categoryProducts.length;
      
      const stockHealth = categoryProducts.reduce((sum, p) => 
        sum + (p.current_stock >= p.reorder_level ? 1 : 0), 0) / categoryProducts.length;
      
      // Generate random growth rate between -20% and +40%
      const growth = Math.floor(Math.random() * 60) - 20;
      
      // Generate random turnover rate between 2 and 12
      const turnoverRate = 2 + Math.random() * 10;
      
      let recommendation = '';
      if (growth > 20) {
        recommendation = 'Increase inventory levels to meet growing demand';
      } else if (growth < 0) {
        recommendation = 'Reduce inventory and consider promotions';
      } else if (avgMargin > 0.3) {
        recommendation = 'Maintain current levels and optimize pricing';
      } else {
        recommendation = 'Evaluate supplier costs to improve margins';
      }
      
      insights.push({
        category,
        growth,
        stockHealth: stockHealth * 100,
        profitMargin: avgMargin * 100,
        turnoverRate,
        recommendation
      });
    });
    
    setCategoryInsights(insights);
  };
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };
  
  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };
  
  // Handle product selection for Product Analysis tab
  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
  };
  
  // Handle chart type change
  const handleChartTypeChange = (type: 'line' | 'bar' | 'pie' | 'doughnut') => {
    setSelectedChartType(type);
    
    // If switching to pie or doughnut chart and 'all' metric is selected, switch to 'sales' metric
    if ((type === 'pie' || type === 'doughnut') && productAnalysisMetric === 'all') {
      setProductAnalysisMetric('sales');
    }
  };
  
  // Handle metric change for product analysis
  const handleMetricChange = (metric: 'sales' | 'profit' | 'stock' | 'all') => {
    setProductAnalysisMetric(metric);
    
    // If pie or doughnut chart is selected and 'all' metric is chosen, switch to line chart
    if (metric === 'all' && (selectedChartType === 'pie' || selectedChartType === 'doughnut')) {
      setSelectedChartType('line');
    }
  };
  
  // Generate product analysis report data
  const generateProductReport = (product: Product) => {
    // Generate daily data for the past 30 days
    const days: string[] = [];
    const today = new Date();
    
    // Create array of day labels (e.g., "Jun 1", "Jun 2", etc.)
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayLabel = `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}`;
      days.push(dayLabel);
    }
    
    // Initialize sales data array with zeros
    const salesData = new Array(days.length).fill(0);
    
    // If historical sales data exists, map it to the correct days
    const historicalSales = product.historical_sales || {};
    const historicalDays = Object.keys(historicalSales).sort().slice(-30);
    
    if (historicalDays.length > 0) {
      // Map historical sales to the salesData array
      historicalDays.forEach((day, index) => {
        const dayIndex = days.length - historicalDays.length + index;
        if (dayIndex >= 0 && historicalSales[day] !== undefined) {
          salesData[dayIndex] = historicalSales[day];
        }
      });
    }
    
    // Calculate profit based on sales and margins
    const profitData = salesData.map(sales => 
      Math.round(sales * (product.selling_price - product.purchase_price)));
    
    // Calculate stock levels based on sales
    const stockData: number[] = [];
    let currentStock = product.current_stock;
    
    // Start from the most recent day and work backwards to calculate stock levels
    for (let i = salesData.length - 1; i >= 0; i--) {
      // Add sales back to stock to get the starting stock for the day
      currentStock += salesData[i];
      stockData[i] = currentStock;
    }
    
    // If we have restock data, we could incorporate it here
    // For now, we'll just ensure stock never goes below 0
    stockData.forEach((_, i) => {
      stockData[i] = Math.max(0, stockData[i]);
    });
    
    // Create CSV content
    let csvContent = `${product.name} Product Analysis Report\n\n`;
    csvContent += `Generated on: ${new Date().toLocaleString()}\n\n`;
    csvContent += `Product ID: ${product.id}\n`;
    csvContent += `Product Name: ${product.name}\n`;
    csvContent += `Category: ${product.category}\n`;
    csvContent += `Supplier: ${product.supplier}\n\n`;
    csvContent += `Current Stock: ${product.current_stock} units\n`;
    csvContent += `Reorder Level: ${product.reorder_level} units\n`;
    csvContent += `Purchase Price: $${product.purchase_price.toFixed(2)}\n`;
    csvContent += `Selling Price: $${product.selling_price.toFixed(2)}\n`;
    csvContent += `Profit Margin: ${(((product.selling_price - product.purchase_price) / product.purchase_price) * 100).toFixed(1)}%\n`;
    csvContent += `Lead Time: ${product.lead_time} days\n\n`;
    
    // Add daily performance data
    csvContent += `Day,Date,Sales (Units),Profit ($),Stock Level\n`;
    days.forEach((day, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - index));
      const dateStr = date.toISOString().split('T')[0];
      csvContent += `${day},${dateStr},${salesData[index]},${profitData[index]},${stockData[index]}\n`;
    });
    
    return {
      csvContent,
      months: days, // Keep the property name for compatibility
      days, // Add days property to match the destructuring in the component
      salesData,
      profitData,
      stockData
    };
  };
  
  // Open product analysis details dialog
  const handleViewProductDetails = () => {
    if (selectedProduct) {
      setShowProductAnalysisDetails(true);
    }
  };
  
  // Close product analysis details dialog
  const closeProductAnalysisDetails = () => {
    setShowProductAnalysisDetails(false);
  };

  // State for product recommendation details modal
  const [selectedRecommendation, setSelectedRecommendation] = useState<ProductRecommendation | null>(null);
  const [showRecommendationDetails, setShowRecommendationDetails] = useState(false);
  
  // Handle view details button click for product recommendations
  const handleViewRecommendationDetails = (recommendation: ProductRecommendation) => {
    setSelectedRecommendation(recommendation);
    setShowRecommendationDetails(true);
  };
  
  // Close recommendation details modal
  const closeRecommendationDetails = () => {
    setShowRecommendationDetails(false);
    setSelectedRecommendation(null);
  };
  
  // State for category insights details modal
  const [selectedCategoryInsight, setSelectedCategoryInsight] = useState<CategoryInsight | null>(null);
  const [showCategoryDetails, setShowCategoryDetails] = useState(false);
  
  // Handle view detailed analysis button click for category insights
  const handleViewCategoryDetails = (insight: CategoryInsight) => {
    setSelectedCategoryInsight(insight);
    setShowCategoryDetails(true);
  };
  
  // Close category details modal
  const closeCategoryDetails = () => {
    setShowCategoryDetails(false);
    setSelectedCategoryInsight(null);
  };
  
  // State for restock dialog
  const [showRestockDialog, setShowRestockDialog] = useState(false);
  const [restockProduct, setRestockProduct] = useState<ProductRecommendation | null>(null);
  const [restockQuantity, setRestockQuantity] = useState(0);
  const [restockLoading, setRestockLoading] = useState(false);
  
  // Handle take action button click
  const handleTakeAction = (recommendation: ProductRecommendation) => {
    if (recommendation.action.toLowerCase().includes('restock')) {
      // For restock actions, show the restock dialog
      setRestockProduct(recommendation);
      // Calculate a suggested restock quantity based on the recommendation
      const currentStock = parseInt(recommendation.reason.match(/\d+/)?.[0] || '0');
      const reorderLevel = parseInt(recommendation.reason.match(/\d+/g)?.[1] || '0');
      const suggestedQuantity = Math.max(reorderLevel - currentStock, 10);
      setRestockQuantity(suggestedQuantity);
      setShowRestockDialog(true);
    } else {
      // For other actions, just show a snackbar
      setSnackbarMessage(`Taking action on ${recommendation.name}: ${recommendation.action}`);
      setSnackbarOpen(true);
    }
  };
  
  // Handle restock confirmation
  const handleRestockConfirm = async () => {
    if (!restockProduct) return;
    
    setRestockLoading(true);
    try {
      // Call the API to restock the product
      await inventoryService.restockProduct(restockProduct.id, restockQuantity);
      
      // Update the local data
      const updatedRecommendations = recommendations.filter(rec => rec.id !== restockProduct.id);
      setRecommendations(updatedRecommendations);
      
      // Show success message
      setSnackbarMessage(`Successfully restocked ${restockProduct.name} with ${restockQuantity} units`);
      setSnackbarOpen(true);
      
      // Close the dialog
      setShowRestockDialog(false);
      setRestockProduct(null);
    } catch (error) {
      console.error('Restock error:', error);
      setSnackbarMessage(`Failed to restock: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSnackbarOpen(true);
    } finally {
      setRestockLoading(false);
    }
  };
  
  // Handle restock cancel
  const handleRestockCancel = () => {
    setShowRestockDialog(false);
    setRestockProduct(null);
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <Psychology sx={{ mr: 1 }} /> Smart Inventory Analysis
      </Typography>
      
      <Tabs
        value={selectedTab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3 }}
      >
        <Tab icon={<Lightbulb />} label="AI Recommendations" />
        <Tab icon={<BarChart />} label="Category Insights" />
        <Tab icon={<Assessment />} label="Product Analysis" />
        <Tab icon={<Psychology />} label="Smart Assistant" />
      </Tabs>
      
      {/* AI Recommendations Tab */}
      {selectedTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                AI-Powered Inventory Recommendations
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Our AI has analyzed your inventory data and generated the following recommendations to optimize your stock levels, 
                improve profitability, and enhance overall inventory management.
              </Typography>
            </Paper>
          </Grid>
          
          {recommendations.map((rec, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Card elevation={3}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="h3" gutterBottom>
                      {rec.name}
                    </Typography>
                    <Chip 
                      label={`${rec.confidence}% confidence`}
                      color={rec.confidence > 90 ? "success" : rec.confidence > 75 ? "primary" : "default"}
                      size="small"
                    />
                  </Box>
                  
                  <Divider sx={{ mb: 2 }} />
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Category:</strong> {rec.category}
                  </Typography>
                  
                  <Typography variant="body2" paragraph>
                    <strong>Reason:</strong> {rec.reason}
                  </Typography>
                  
                  <Typography variant="body2" paragraph>
                    <strong>Recommended Action:</strong> {rec.action}
                  </Typography>
                  
                  <Typography variant="body2" paragraph>
                    <strong>Expected Impact:</strong> {rec.impact}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={() => handleViewRecommendationDetails(rec)}
                    >
                      View Details
                    </Button>
                    <Button 
                      variant="contained" 
                      size="small" 
                      sx={{ ml: 1 }}
                      onClick={() => handleTakeAction(rec)}
                    >
                      Take Action
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Category Insights Tab */}
      {selectedTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Category Performance Insights
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                AI-powered analysis of your inventory categories, showing growth trends, stock health, profitability, 
                and turnover rates with personalized recommendations.
              </Typography>
            </Paper>
          </Grid>
          
          {categoryInsights.map((insight, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card elevation={3}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" component="h3">
                      {insight.category}
                    </Typography>
                    <Chip 
                      icon={insight.growth >= 0 ? <TrendingUp /> : <TrendingDown />}
                      label={`${insight.growth >= 0 ? '+' : ''}${insight.growth}% growth`}
                      color={insight.growth > 10 ? "success" : insight.growth < 0 ? "error" : "default"}
                      size="small"
                    />
                  </Box>
                  
                  <Divider sx={{ mb: 3 }} />
                  
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Stock Health
                        </Typography>
                        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                          <CircularProgress 
                            variant="determinate" 
                            value={insight.stockHealth} 
                            color={insight.stockHealth > 75 ? "success" : insight.stockHealth > 50 ? "warning" : "error"}
                          />
                          <Box
                            sx={{
                              top: 0,
                              left: 0,
                              bottom: 0,
                              right: 0,
                              position: 'absolute',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Typography variant="caption" component="div" color="text.secondary">
                              {`${Math.round(insight.stockHealth)}%`}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Profit Margin
                        </Typography>
                        <Typography variant="h6" component="div">
                          {insight.profitMargin.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Turnover Rate
                        </Typography>
                        <Typography variant="h6" component="div">
                          {insight.turnoverRate.toFixed(1)}x
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  
                  <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      AI Recommendation:
                    </Typography>
                    <Typography variant="body2">
                      {insight.recommendation}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      startIcon={<InsertChart />}
                      onClick={() => handleViewCategoryDetails(insight)}
                    >
                      View Detailed Analysis
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      

      
      {/* Product Analysis Tab */}
      {selectedTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Product Performance Analysis
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Select a product to view detailed performance metrics, profit analysis, and stock trends. 
                Customize the visualization with different chart types to gain deeper insights.
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>Select Product</Typography>
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {products.map((product) => (
                  <Card 
                    key={product.id} 
                    sx={{ 
                      mb: 1, 
                      cursor: 'pointer',
                      border: selectedProduct?.id === product.id ? '2px solid #1976d2' : 'none',
                      '&:hover': { boxShadow: 3 }
                    }}
                    onClick={() => handleProductSelect(product)}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="subtitle1">{product.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Category: {product.category}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Chip 
                          label={`Stock: ${product.current_stock}`} 
                          size="small"
                          color={product.current_stock > product.reorder_level ? "success" : "error"}
                        />
                        <Typography variant="body2">
                          ${product.selling_price.toFixed(2)}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }}>
              {selectedProduct ? (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">{selectedProduct.name} Analysis</Typography>
                    <Button 
                      variant="outlined" 
                      startIcon={<InsertChart />}
                      onClick={handleViewProductDetails}
                    >
                      View Detailed Analysis
                    </Button>
                  </Box>
                  
                  <Divider sx={{ mb: 2 }} />
                  
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Current Stock
                        </Typography>
                        <Typography variant="h5" color={selectedProduct.current_stock > selectedProduct.reorder_level ? "success.main" : "error.main"}>
                          {selectedProduct.current_stock}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Reorder Level: {selectedProduct.reorder_level}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Profit Margin
                        </Typography>
                        <Typography variant="h5">
                          {(((selectedProduct.selling_price - selectedProduct.purchase_price) / selectedProduct.purchase_price) * 100).toFixed(1)}%
                        </Typography>
                        <Typography variant="caption" display="block">
                          ${(selectedProduct.selling_price - selectedProduct.purchase_price).toFixed(2)} per unit
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Lead Time
                        </Typography>
                        <Typography variant="h5">
                          {selectedProduct.lead_time} days
                        </Typography>
                        <Typography variant="caption" display="block">
                          {selectedProduct.lead_time > 10 ? "Above Average" : "Good"}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Supplier
                        </Typography>
                        <Typography variant="h5" sx={{ fontSize: '1.2rem' }}>
                          {selectedProduct.supplier}
                        </Typography>
                        <Typography variant="caption" display="block">
                          ID: {selectedProduct.id.substring(0, 8)}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>Visualization Options</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Button 
                        variant={selectedChartType === 'line' ? 'contained' : 'outlined'}
                        startIcon={<ShowChart />}
                        size="small"
                        onClick={() => handleChartTypeChange('line')}
                      >
                        Line
                      </Button>
                      <Button 
                        variant={selectedChartType === 'bar' ? 'contained' : 'outlined'}
                        startIcon={<BarChart />}
                        size="small"
                        onClick={() => handleChartTypeChange('bar')}
                      >
                        Bar
                      </Button>
                      <Button 
                        variant={selectedChartType === 'pie' ? 'contained' : 'outlined'}
                        startIcon={<PieChart />}
                        size="small"
                        onClick={() => handleChartTypeChange('pie')}
                      >
                        Pie
                      </Button>
                      <Button 
                        variant={selectedChartType === 'doughnut' ? 'contained' : 'outlined'}
                        startIcon={<DonutLarge />}
                        size="small"
                        onClick={() => handleChartTypeChange('doughnut')}
                      >
                        Doughnut
                      </Button>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button 
                        variant={productAnalysisMetric === 'sales' ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => handleMetricChange('sales')}
                      >
                        Sales
                      </Button>
                      <Button 
                        variant={productAnalysisMetric === 'profit' ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => handleMetricChange('profit')}
                      >
                        Profit
                      </Button>
                      <Button 
                        variant={productAnalysisMetric === 'stock' ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => handleMetricChange('stock')}
                      >
                        Stock Levels
                      </Button>
                      <Button 
                        variant={productAnalysisMetric === 'all' ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => handleMetricChange('all')}
                        disabled={selectedChartType === 'pie' || selectedChartType === 'doughnut'}
                      >
                        All Metrics
                      </Button>
                    </Box>
                  </Box>
                  
                  <Box sx={{ height: 300, width: '100%' }}>
                    {(() => {
                      const reportData = generateProductReport(selectedProduct);
                      const { days, salesData, profitData, stockData } = reportData;
                      
                      // For pie and doughnut charts, we need different data structure
                      if (selectedChartType === 'pie' || selectedChartType === 'doughnut') {
                        // Determine which data to display based on selected metric
                        let dataToDisplay;
                        let label;
                        
                        switch (productAnalysisMetric) {
                          case 'sales':
                            dataToDisplay = salesData;
                            label = 'Sales (Units)';
                            break;
                          case 'profit':
                            dataToDisplay = profitData;
                            label = 'Profit ($)';
                            break;
                          case 'stock':
                            dataToDisplay = stockData;
                            label = 'Stock Level';
                            break;
                          default:
                            dataToDisplay = salesData;
                            label = 'Sales (Units)';
                        }
                        
                        const chartData = {
                          labels: days,
                          datasets: [
                            {
                              label,
                              data: dataToDisplay,
                              backgroundColor: [
                                'rgba(255, 99, 132, 0.6)',
                                'rgba(54, 162, 235, 0.6)',
                                'rgba(255, 206, 86, 0.6)',
                                'rgba(75, 192, 192, 0.6)',
                                'rgba(153, 102, 255, 0.6)',
                                'rgba(255, 159, 64, 0.6)',
                              ],
                              borderColor: [
                                'rgba(255, 99, 132, 1)',
                                'rgba(54, 162, 235, 1)',
                                'rgba(255, 206, 86, 1)',
                                'rgba(75, 192, 192, 1)',
                                'rgba(153, 102, 255, 1)',
                                'rgba(255, 159, 64, 1)',
                              ],
                              borderWidth: 1,
                            },
                          ],
                        };
                        
                        const chartOptions = {
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'right' as const,
                            },
                            title: {
                              display: true,
                              text: `${selectedProduct.name} - ${label} by Day`,
                            },
                          },
                        };
                        
                        return selectedChartType === 'pie' ? 
                          <Pie data={chartData} options={chartOptions} /> : 
                          <Doughnut data={chartData} options={chartOptions} />;
                      } else {
                        // For line and bar charts
                        let datasets = [];
                        
                        // Add the appropriate dataset based on the selected metric
                        if (productAnalysisMetric === 'sales' || productAnalysisMetric === 'all') {
                          datasets.push({
                            label: 'Sales (Units)',
                            data: salesData,
                            borderColor: 'rgb(75, 192, 192)',
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            tension: 0.4,
                          });
                        }
                        
                        if (productAnalysisMetric === 'profit' || productAnalysisMetric === 'all') {
                          datasets.push({
                            label: 'Profit ($)',
                            data: profitData,
                            borderColor: 'rgb(54, 162, 235)',
                            backgroundColor: 'rgba(54, 162, 235, 0.2)',
                            tension: 0.4,
                          });
                        }
                        
                        if (productAnalysisMetric === 'stock' || productAnalysisMetric === 'all') {
                          datasets.push({
                            label: 'Stock Level',
                            data: stockData,
                            borderColor: 'rgb(255, 159, 64)',
                            backgroundColor: 'rgba(255, 159, 64, 0.2)',
                            tension: 0.4,
                          });
                        }
                        
                        const chartData = {
                          labels: days,
                          datasets: datasets,
                        };
                        
                        const chartOptions = {
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'top' as const,
                            },
                            title: {
                              display: true,
                              text: `${selectedProduct.name} - Performance by Day`,
                            },
                          },
                        };
                        
                        return selectedChartType === 'line' ? 
                          <Line data={chartData} options={chartOptions} /> : 
                          <Bar data={chartData} options={chartOptions} />;
                      }
                    })()} 
                  </Box>
                  
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="subtitle1" color="primary" gutterBottom>
                      AI Analysis:
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {selectedProduct.current_stock <= selectedProduct.reorder_level ? 
                        `This product is currently below the reorder level. Consider restocking soon to avoid stockouts.` : 
                        selectedProduct.current_stock > selectedProduct.reorder_level * 3 ? 
                        `This product has excess inventory. Consider running a promotion to reduce stock levels.` : 
                        `This product has healthy stock levels relative to its reorder point.`
                      }
                    </Typography>
                    <Typography variant="body2">
                      {(((selectedProduct.selling_price - selectedProduct.purchase_price) / selectedProduct.purchase_price) * 100) > 30 ? 
                        `With a high profit margin of ${(((selectedProduct.selling_price - selectedProduct.purchase_price) / selectedProduct.purchase_price) * 100).toFixed(1)}%, this is one of your more profitable products. Consider increasing marketing efforts.` : 
                        (((selectedProduct.selling_price - selectedProduct.purchase_price) / selectedProduct.purchase_price) * 100) < 15 ? 
                        `This product has a relatively low profit margin of ${(((selectedProduct.selling_price - selectedProduct.purchase_price) / selectedProduct.purchase_price) * 100).toFixed(1)}%. Consider evaluating pricing strategy or negotiating better supplier terms.` : 
                        `This product has a moderate profit margin of ${(((selectedProduct.selling_price - selectedProduct.purchase_price) / selectedProduct.purchase_price) * 100).toFixed(1)}%, which is within the average range for its category.`
                      }
                    </Typography>
                  </Box>
                </>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400 }}>
                  <Assessment sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Select a Product
                  </Typography>
                  <Typography variant="body2" color="text.secondary" align="center">
                    Choose a product from the list to view detailed performance analysis, 
                    profit metrics, and stock trends with customizable visualizations.
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
      
      {/* Smart Assistant Tab */}
      {selectedTab === 3 && (
        <SmartAssistant />
      )}
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
      />
      
      {/* Restock Dialog */}
      <Dialog open={showRestockDialog} onClose={handleRestockCancel}>
        <DialogTitle>Restock {restockProduct?.name}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Current stock is low. Please specify the quantity to restock.
          </DialogContentText>
          <Box sx={{ my: 2 }}>
            <TextField
              label="Restock Quantity"
              type="number"
              fullWidth
              value={restockQuantity}
              onChange={(e) => setRestockQuantity(parseInt(e.target.value) || 0)}
              InputProps={{
                startAdornment: <Inventory sx={{ mr: 1, color: 'text.secondary' }} />,
                inputProps: { min: 1 }
              }}
              variant="outlined"
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRestockCancel}>Cancel</Button>
          <Button 
            onClick={handleRestockConfirm} 
            variant="contained" 
            disabled={restockQuantity <= 0 || restockLoading}
          >
            {restockLoading ? <CircularProgress size={24} /> : 'Confirm Restock'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Product Recommendation Details Dialog */}
      <Dialog
        open={showRecommendationDetails}
        onClose={closeRecommendationDetails}
        maxWidth="md"
        fullWidth
      >
        {selectedRecommendation && (
          <>
            <DialogTitle>
              <Typography variant="h5">{selectedRecommendation.name}</Typography>
              <Chip 
                label={`${selectedRecommendation.confidence}% confidence`}
                color={selectedRecommendation.confidence > 90 ? "success" : selectedRecommendation.confidence > 75 ? "primary" : "default"}
                size="small"
                sx={{ ml: 1 }}
              />
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>Product Information</Typography>
                    <Typography variant="body2" paragraph>
                      <strong>Category:</strong> {selectedRecommendation.category}
                    </Typography>
                    <Typography variant="body2" paragraph>
                      <strong>Product ID:</strong> {selectedRecommendation.id}
                    </Typography>
                    <Typography variant="body2" paragraph>
                      <strong>Analysis Reason:</strong> {selectedRecommendation.reason}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>AI Recommendation</Typography>
                    <Typography variant="body2" paragraph>
                      <strong>Recommended Action:</strong> {selectedRecommendation.action}
                    </Typography>
                    <Typography variant="body2" paragraph>
                      <strong>Expected Impact:</strong> {selectedRecommendation.impact}
                    </Typography>
                    <Typography variant="body2" paragraph>
                      <strong>Confidence Level:</strong> {selectedRecommendation.confidence}%
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>Detailed Analysis</Typography>
                    <Typography variant="body2" paragraph>
                      Our AI system has analyzed your inventory data and identified this product as requiring attention. 
                      The recommendation is based on historical sales patterns, current stock levels, lead times, and profit margins.
                    </Typography>
                    <Typography variant="body2" paragraph>
                      <strong>Key Factors:</strong>
                    </Typography>
                    <ul>
                      <li>
                        <Typography variant="body2">
                          {selectedRecommendation.reason}
                        </Typography>
                      </li>
                      <li>
                        <Typography variant="body2">
                          Category performance trends show {selectedRecommendation.category} products have 
                          {Math.random() > 0.5 ? "increasing" : "stable"} demand.
                        </Typography>
                      </li>
                      <li>
                        <Typography variant="body2">
                          Implementing the recommended action could result in 
                          {selectedRecommendation.action.includes("promotion") ? "increased sales velocity and reduced holding costs" : 
                           selectedRecommendation.action.includes("Restock") ? "avoiding stockouts and maintaining customer satisfaction" :
                           "optimized inventory levels and improved profitability"}.
                        </Typography>
                      </li>
                    </ul>
                  </Paper>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={closeRecommendationDetails}>Close</Button>
              <Button 
                variant="contained" 
                onClick={() => {
                  handleTakeAction(selectedRecommendation);
                  closeRecommendationDetails();
                }}
              >
                Take Action
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Category Insights Details Dialog */}
      <Dialog
        open={showCategoryDetails}
        onClose={closeCategoryDetails}
        maxWidth="md"
        fullWidth
      >
        {selectedCategoryInsight && (
          <>
            <DialogTitle>
              <Typography variant="h5">{selectedCategoryInsight.category} Category Analysis</Typography>
              <Chip 
                icon={selectedCategoryInsight.growth >= 0 ? <TrendingUp /> : <TrendingDown />}
                label={`${selectedCategoryInsight.growth >= 0 ? '+' : ''}${selectedCategoryInsight.growth}% growth`}
                color={selectedCategoryInsight.growth > 10 ? "success" : selectedCategoryInsight.growth < 0 ? "error" : "default"}
                size="small"
                sx={{ ml: 1 }}
              />
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Typography variant="h6" gutterBottom>Performance Metrics</Typography>
                    <Box sx={{ my: 3 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>Stock Health</Typography>
                      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                        <CircularProgress 
                          variant="determinate" 
                          value={selectedCategoryInsight.stockHealth} 
                          color={selectedCategoryInsight.stockHealth > 75 ? "success" : selectedCategoryInsight.stockHealth > 50 ? "warning" : "error"}
                          size={80}
                        />
                        <Box
                          sx={{
                            top: 0,
                            left: 0,
                            bottom: 0,
                            right: 0,
                            position: 'absolute',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography variant="body1" component="div">
                            {`${Math.round(selectedCategoryInsight.stockHealth)}%`}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>Profit Margin</Typography>
                      <Typography variant="h5">{selectedCategoryInsight.profitMargin.toFixed(1)}%</Typography>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>Turnover Rate</Typography>
                      <Typography variant="h5">{selectedCategoryInsight.turnoverRate.toFixed(1)}x</Typography>
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={8}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Typography variant="h6" gutterBottom>Category Analysis</Typography>
                    <Typography variant="body2" paragraph>
                      The {selectedCategoryInsight.category} category is showing 
                      {selectedCategoryInsight.growth >= 10 ? " strong positive growth" : 
                       selectedCategoryInsight.growth >= 0 ? " stable growth" : 
                       " negative growth"} of {selectedCategoryInsight.growth}% compared to the previous period.
                    </Typography>
                    <Typography variant="body2" paragraph>
                      <strong>Stock Health:</strong> {selectedCategoryInsight.stockHealth}% of products in this category have healthy stock levels 
                      (current stock above reorder level).
                      {selectedCategoryInsight.stockHealth < 50 ? " This indicates potential supply chain issues or high demand outpacing inventory replenishment." : 
                       selectedCategoryInsight.stockHealth > 90 ? " This indicates excellent inventory management for this category." : 
                       " This is within acceptable range but could be improved."}
                    </Typography>
                    <Typography variant="body2" paragraph>
                      <strong>Profit Margin:</strong> The average profit margin for this category is {selectedCategoryInsight.profitMargin.toFixed(1)}%.
                      {selectedCategoryInsight.profitMargin > 30 ? " This is an excellent profit margin that exceeds company targets." : 
                       selectedCategoryInsight.profitMargin > 20 ? " This is a healthy profit margin within company targets." : 
                       " This is below target profit margins and should be addressed."}
                    </Typography>
                    <Typography variant="body2" paragraph>
                      <strong>Turnover Rate:</strong> Products in this category turn over {selectedCategoryInsight.turnoverRate.toFixed(1)} times per period on average.
                      {selectedCategoryInsight.turnoverRate > 8 ? " This is an excellent turnover rate indicating strong sales velocity." : 
                       selectedCategoryInsight.turnoverRate > 4 ? " This is a good turnover rate within expected ranges." : 
                       " This turnover rate is lower than optimal and may indicate slow-moving inventory."}
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="subtitle1" color="primary" gutterBottom>
                        AI Recommendation:
                      </Typography>
                      <Typography variant="body1">
                        {selectedCategoryInsight.recommendation}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>Historical Performance</Typography>
                    <Typography variant="body2" paragraph>
                      The {selectedCategoryInsight.category} category has shown the following trends over the past 6 months:
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" paragraph>
                        <strong>Sales Trend:</strong> {selectedCategoryInsight.growth >= 10 ? 
                          "Consistent upward trajectory with significant growth in the last quarter." : 
                          selectedCategoryInsight.growth >= 0 ? 
                          "Steady performance with slight fluctuations but overall positive trend." : 
                          "Declining sales pattern requiring attention and strategic intervention."}
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Profit Margins:</strong> {selectedCategoryInsight.profitMargin > 30 ? 
                          "Excellent profit margins maintained throughout the period with peak performance in recent months." : 
                          selectedCategoryInsight.profitMargin > 20 ? 
                          "Stable profit margins within target range, showing resilience to market fluctuations." : 
                          "Below-target margins with pressure points identified in supply chain and pricing strategy."}
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Inventory Turnover:</strong> {selectedCategoryInsight.turnoverRate > 6 ? 
                          "High velocity inventory movement indicating strong market demand and efficient stock management." : 
                          selectedCategoryInsight.turnoverRate > 3 ? 
                          "Moderate turnover rates aligned with category benchmarks." : 
                          "Slow-moving inventory suggesting potential overstock situations or weakening demand."}
                      </Typography>
                    </Box>
                    <Box sx={{ height: 200, width: '100%', borderRadius: 1 }}>
                      <Line
                        data={{
                          labels: ['January', 'February', 'March', 'April', 'May', 'June'],
                          datasets: [
                            {
                              label: 'Sales',
                              data: [
                                Math.floor(Math.random() * 1000) + 500,
                                Math.floor(Math.random() * 1000) + 500,
                                Math.floor(Math.random() * 1000) + 500,
                                Math.floor(Math.random() * 1000) + 500,
                                Math.floor(Math.random() * 1000) + 500,
                                Math.floor(Math.random() * 1000) + 500,
                              ],
                              borderColor: 'rgb(75, 192, 192)',
                              backgroundColor: 'rgba(75, 192, 192, 0.2)',
                              tension: 0.4,
                            },
                            {
                              label: 'Profit',
                              data: [
                                Math.floor(Math.random() * 500) + 200,
                                Math.floor(Math.random() * 500) + 200,
                                Math.floor(Math.random() * 500) + 200,
                                Math.floor(Math.random() * 500) + 200,
                                Math.floor(Math.random() * 500) + 200,
                                Math.floor(Math.random() * 500) + 200,
                              ],
                              borderColor: 'rgb(54, 162, 235)',
                              backgroundColor: 'rgba(54, 162, 235, 0.2)',
                              tension: 0.4,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'top',
                            },
                            title: {
                              display: true,
                              text: `${selectedCategoryInsight.category} 6-Month Performance`,
                            },
                          },
                        }}
                      />
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={closeCategoryDetails}>Close</Button>
              <Button 
                variant="contained" 
                startIcon={<Download />}
                onClick={() => {
                  // Generate and download a CSV report
                  const reportData = generateCategoryReport(selectedCategoryInsight);
                  downloadCSV(reportData, `${selectedCategoryInsight.category}_Category_Report.csv`);
                  setSnackbarMessage(`Report for ${selectedCategoryInsight.category} category has been downloaded`);
                  setSnackbarOpen(true);
                }}
              >
                Download Report
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
      
      {/* Product Analysis Details Dialog */}
      <Dialog
        open={showProductAnalysisDetails}
        onClose={closeProductAnalysisDetails}
        maxWidth="lg"
        fullWidth
      >
        {selectedProduct && (
          <>
            <DialogTitle>
              <Typography variant="h5">{selectedProduct.name} - Detailed Analysis</Typography>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>Product Information</Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>Product ID</Typography>
                      <Typography variant="body1">{selectedProduct.id}</Typography>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>Category</Typography>
                      <Typography variant="body1">{selectedProduct.category}</Typography>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>Supplier</Typography>
                      <Typography variant="body1">{selectedProduct.supplier}</Typography>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>Current Stock</Typography>
                      <Typography variant="body1" color={selectedProduct.current_stock > selectedProduct.reorder_level ? "success.main" : "error.main"}>
                        {selectedProduct.current_stock} units
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>Reorder Level</Typography>
                      <Typography variant="body1">{selectedProduct.reorder_level} units</Typography>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>Purchase Price</Typography>
                      <Typography variant="body1">${selectedProduct.purchase_price.toFixed(2)}</Typography>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>Selling Price</Typography>
                      <Typography variant="body1">${selectedProduct.selling_price.toFixed(2)}</Typography>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>Lead Time</Typography>
                      <Typography variant="body1">{selectedProduct.lead_time} days</Typography>
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={8}>
                  <Paper sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>Performance Metrics</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>Stock Health</Typography>
                          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                            <CircularProgress 
                              variant="determinate" 
                              value={selectedProduct.current_stock / (selectedProduct.reorder_level * 2) * 100} 
                              color={selectedProduct.current_stock > selectedProduct.reorder_level ? "success" : "error"}
                              size={80}
                            />
                            <Box
                              sx={{
                                top: 0,
                                left: 0,
                                bottom: 0,
                                right: 0,
                                position: 'absolute',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Typography variant="body1" component="div">
                                {Math.min(100, Math.round(selectedProduct.current_stock / (selectedProduct.reorder_level * 2) * 100))}%
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} md={4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>Profit Margin</Typography>
                          <Typography variant="h5">
                            {(((selectedProduct.selling_price - selectedProduct.purchase_price) / selectedProduct.purchase_price) * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} md={4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>Turnover Rate</Typography>
                          <Typography variant="h5">
                            {(Math.random() * 5 + 2).toFixed(1)}x
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                  
                  <Paper sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>Historical Performance</Typography>
                    <Box sx={{ height: 250, width: '100%', mb: 3 }}>
                      {(() => {
                        const reportData = generateProductReport(selectedProduct);
                        const { days, salesData, profitData, stockData } = reportData;
                        
                        return (
                          <Line
                            data={{
                              labels: days,
                              datasets: [
                                {
                                  label: 'Sales (Units)',
                                  data: salesData,
                                  borderColor: 'rgb(75, 192, 192)',
                                  backgroundColor: 'rgba(75, 192, 192, 0.2)',
                                  tension: 0.4,
                                  yAxisID: 'y',
                                },
                                {
                                  label: 'Profit ($)',
                                  data: profitData,
                                  borderColor: 'rgb(54, 162, 235)',
                                  backgroundColor: 'rgba(54, 162, 235, 0.2)',
                                  tension: 0.4,
                                  yAxisID: 'y1',
                                },
                                {
                                  label: 'Stock Level',
                                  data: stockData,
                                  borderColor: 'rgb(255, 159, 64)',
                                  backgroundColor: 'rgba(255, 159, 64, 0.2)',
                                  tension: 0.4,
                                  yAxisID: 'y2',
                                },
                              ],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: {
                                  position: 'top',
                                },
                                title: {
                                  display: true,
                                  text: `${selectedProduct.name} - 30-Day Performance`,
                                },
                              },
                              scales: {
                                y: {
                                  type: 'linear',
                                  display: true,
                                  position: 'left',
                                  title: {
                                    display: true,
                                    text: 'Sales (Units)',
                                  },
                                },
                                y1: {
                                  type: 'linear',
                                  display: true,
                                  position: 'right',
                                  grid: {
                                    drawOnChartArea: false,
                                  },
                                  title: {
                                    display: true,
                                    text: 'Profit ($)',
                                  },
                                },
                                y2: {
                                  type: 'linear',
                                  display: true,
                                  position: 'right',
                                  grid: {
                                    drawOnChartArea: false,
                                  },
                                  title: {
                                    display: true,
                                    text: 'Stock Level',
                                  },
                                },
                              },
                            }}
                          />
                        );
                      })()}
                    </Box>
                  </Paper>
                  
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>AI Analysis</Typography>
                    <Typography variant="body2" paragraph>
                      <strong>Stock Status:</strong> {selectedProduct.current_stock <= selectedProduct.reorder_level ? 
                        `This product is currently below the reorder level with only ${selectedProduct.current_stock} units in stock. The recommended action is to place a restock order immediately to avoid potential stockouts. Based on historical data, we recommend ordering at least ${selectedProduct.reorder_level * 2 - selectedProduct.current_stock} units.` : 
                        selectedProduct.current_stock > selectedProduct.reorder_level * 3 ? 
                        `This product has excess inventory with ${selectedProduct.current_stock} units in stock, which is significantly above the reorder level of ${selectedProduct.reorder_level}. This may lead to increased carrying costs and potential obsolescence. Consider running a promotion or temporarily reducing purchase orders.` : 
                        `This product has healthy stock levels with ${selectedProduct.current_stock} units in stock relative to its reorder point of ${selectedProduct.reorder_level}. No immediate action is required.`
                      }
                    </Typography>
                    
                    <Typography variant="body2" paragraph>
                      <strong>Profit Analysis:</strong> {(((selectedProduct.selling_price - selectedProduct.purchase_price) / selectedProduct.purchase_price) * 100) > 30 ? 
                        `With a high profit margin of ${(((selectedProduct.selling_price - selectedProduct.purchase_price) / selectedProduct.purchase_price) * 100).toFixed(1)}%, this is one of your more profitable products. Each unit sold generates $${(selectedProduct.selling_price - selectedProduct.purchase_price).toFixed(2)} in gross profit. Consider increasing marketing efforts to boost sales of this high-margin product.` : 
                        (((selectedProduct.selling_price - selectedProduct.purchase_price) / selectedProduct.purchase_price) * 100) < 15 ? 
                        `This product has a relatively low profit margin of ${(((selectedProduct.selling_price - selectedProduct.purchase_price) / selectedProduct.purchase_price) * 100).toFixed(1)}%. Each unit sold generates only $${(selectedProduct.selling_price - selectedProduct.purchase_price).toFixed(2)} in gross profit. Consider evaluating pricing strategy, negotiating better supplier terms, or finding cost efficiencies.` : 
                        `This product has a moderate profit margin of ${(((selectedProduct.selling_price - selectedProduct.purchase_price) / selectedProduct.purchase_price) * 100).toFixed(1)}%, which is within the average range for its category. Each unit sold generates $${(selectedProduct.selling_price - selectedProduct.purchase_price).toFixed(2)} in gross profit.`
                      }
                    </Typography>
                    
                    <Typography variant="body2" paragraph>
                      <strong>Lead Time Impact:</strong> {selectedProduct.lead_time > 14 ? 
                        `The lead time of ${selectedProduct.lead_time} days is relatively long, which increases the risk of stockouts if demand suddenly increases. Consider maintaining higher safety stock levels or exploring alternative suppliers with shorter lead times.` : 
                        selectedProduct.lead_time < 7 ? 
                        `The lead time of ${selectedProduct.lead_time} days is excellent, allowing for more responsive inventory management. This short lead time means you can operate with lower safety stock levels and respond quickly to demand changes.` : 
                        `The lead time of ${selectedProduct.lead_time} days is within the average range, providing a reasonable buffer for reordering. Monitor for any changes in supplier delivery performance.`
                      }
                    </Typography>
                    
                    <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, mt: 2 }}>
                      <Typography variant="subtitle1" color="primary" gutterBottom>
                        Recommendations:
                      </Typography>
                      <Typography variant="body2" paragraph>
                        {selectedProduct.current_stock <= selectedProduct.reorder_level ? 
                          `1. Place a restock order for at least ${selectedProduct.reorder_level * 2 - selectedProduct.current_stock} units.` : 
                          selectedProduct.current_stock > selectedProduct.reorder_level * 3 ? 
                          `1. Consider running a promotion to reduce excess inventory.` : 
                          `1. Maintain current inventory management approach for this product.`
                        }
                      </Typography>
                      <Typography variant="body2" paragraph>
                        {(((selectedProduct.selling_price - selectedProduct.purchase_price) / selectedProduct.purchase_price) * 100) > 30 ? 
                          `2. Increase marketing efforts for this high-margin product to maximize profitability.` : 
                          (((selectedProduct.selling_price - selectedProduct.purchase_price) / selectedProduct.purchase_price) * 100) < 15 ? 
                          `2. Review pricing strategy or negotiate better supplier terms to improve margins.` : 
                          `2. Monitor market trends to identify opportunities for margin improvement.`
                        }
                      </Typography>
                      <Typography variant="body2">
                        {selectedProduct.lead_time > 14 ? 
                          `3. Explore alternative suppliers to reduce lead time and minimize stockout risk.` : 
                          selectedProduct.lead_time < 7 ? 
                          `3. Leverage the short lead time to optimize inventory levels and reduce carrying costs.` : 
                          `3. Continue monitoring supplier performance to maintain consistent lead times.`
                        }
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={closeProductAnalysisDetails}>Close</Button>
              <Button 
                variant="contained" 
                startIcon={<Download />}
                onClick={() => {
                  // Generate and download a CSV report
                  const reportData = generateProductReport(selectedProduct);
                  downloadCSV(reportData.csvContent, `${selectedProduct.name}_Product_Analysis_Report.csv`);
                  setSnackbarMessage(`Report for ${selectedProduct.name} has been downloaded`);
                  setSnackbarOpen(true);
                }}
              >
                Download Report
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default SmartAnalysisPage;

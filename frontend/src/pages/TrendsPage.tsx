import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Chip, 
  CircularProgress, 
  Alert, 
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart, 
  PieChart, 
  Timeline, 
  Download, 
  Print, 
  Share 
} from '@mui/icons-material';
import { 
  LineChart, 
  Line, 
  BarChart as RechartsBarChart, 
  Bar, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
// PDF generation will be implemented using browser's print functionality
import { inventoryService, predictionService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// Define colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

const TrendsPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('week');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [trendingProducts, setTrendingProducts] = useState<any[]>([]);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [categoryTrends, setCategoryTrends] = useState<any[]>([]);
  const [stockDistribution, setStockDistribution] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch products
        const productsData = await inventoryService.getAllProducts();
        setProducts(productsData);
        
        // Extract unique categories
        const uniqueCategories = Array.from(new Set(productsData.map((p: any) => p.category))) as string[];
        setCategories(['all', ...uniqueCategories]);
        
        // Fetch trend data
        const trendData = await predictionService.getTrendData();
        console.log('Trend data:', trendData); // Debug log
        
        // Process trending products
        const trending = trendData.topSellingProducts || [];
        setTrendingProducts(trending);
        
        // Process sales trend
        const sales = trendData.salesTrend || [];
        setSalesTrend(sales);
        
        // Process category trends
        const catTrends = trendData.categoryTrends || [];
        setCategoryTrends(catTrends);
        
        // Calculate stock distribution
        const stockDist = [
          { name: 'In Stock', value: productsData.filter((p: any) => p.current_stock > p.reorder_level).length },
          { name: 'Low Stock', value: productsData.filter((p: any) => p.current_stock <= p.reorder_level && p.current_stock > 0).length },
          { name: 'Out of Stock', value: productsData.filter((p: any) => p.current_stock === 0).length }
        ];
        setStockDistribution(stockDist);
        
        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching trend data:', err);
        setError(err.message || 'Failed to fetch trend data');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Filter products based on category
  const filteredProducts = categoryFilter === 'all' 
    ? products 
    : products.filter((p: any) => p.category === categoryFilter);
  
  // Calculate trending products based on historical sales
  const calculateTrendingProducts = () => {
    // Sort products by average sales in historical_sales
    return filteredProducts
      .filter((p: any) => p.historical_sales)
      .map((p: any) => {
        const salesValues = Object.values(p.historical_sales) as number[];
        const avgSales = salesValues.reduce((sum: number, val: number) => sum + val, 0) / salesValues.length;
        return {
          ...p,
          avgSales,
          trend: Math.random() > 0.5 ? 'up' : 'down', // Simplified trend calculation
          trendPercentage: Math.floor(Math.random() * 30) + 1 // Random percentage for demo
        };
      })
      .sort((a: any, b: any) => b.avgSales - a.avgSales)
      .slice(0, 10);
  };
  
  const trendingProductsData = calculateTrendingProducts();
  
  // Generate PDF report using browser print functionality
  const generatePDF = () => {
    if (!reportRef.current) return;
    
    try {
      // Open print dialog
      const printContent = document.createElement('div');
      printContent.innerHTML = `
        <h1 style="text-align: center;">InventIQ Trend Report</h1>
        <p style="text-align: center;">Generated on: ${currentDate} | User: ${user?.username} | Role: ${user?.role}</p>
        <div>${reportRef.current.innerHTML}</div>
      `;
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>InventIQ Trend Report</title>
              <style>
                body { font-family: Arial, sans-serif; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .chart-container { height: 300px; margin-bottom: 20px; }
                h1, h2, h3 { color: #333; }
                @media print {
                  button { display: none; }
                }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
              <script>
                setTimeout(() => {
                  window.print();
                  window.close();
                }, 500);
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        alert('Please allow pop-ups to download the report');
      }
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate report');
    }
  };
  
  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <CircularProgress />
    </Box>
  );
  
  if (error) return (
    <Alert severity="error" sx={{ m: 2 }}>
      {error}
    </Alert>
  );
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Trend Analysis
        </Typography>
        
        <Box>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<Download />}
            onClick={generatePDF}
            sx={{ mr: 1 }}
          >
            Download Report
          </Button>
          
          <FormControl variant="outlined" size="small" sx={{ minWidth: 150, ml: 2 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as string)}
              label="Category"
            >
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl variant="outlined" size="small" sx={{ minWidth: 120, ml: 2 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as string)}
              label="Time Range"
            >
              <MenuItem value="week">Last Week</MenuItem>
              <MenuItem value="month">Last Month</MenuItem>
              <MenuItem value="quarter">Last Quarter</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>
      
      <div ref={reportRef}>
        <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            InventIQ Trend Report
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Generated on: {currentDate} | User: {user?.username} | Role: {user?.role}
          </Typography>
        </Box>
        
        <Grid container spacing={3}>
          {/* Trending Products Chart */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Top Trending Products
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart
                  data={trendingProductsData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avgSales" fill="#8884d8" name="Avg. Sales" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          
          {/* Sales Trend Chart */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Sales Trend
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={salesTrend}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="day"
                    tickFormatter={(value) => {
                      const date = new Date();
                      date.setDate(parseInt(value.split('-')[1]));
                      return date.toISOString().split('T')[0];
                    }}
                  />
                  <YAxis 
                    domain={[0, 'auto']}
                    ticks={[0, 35, 70, 105, 140]}
                    tickFormatter={(value) => value.toString()}
                  />
                  <Tooltip
                    labelFormatter={(value) => {
                      const date = new Date();
                      date.setDate(parseInt(value.split('-')[1]));
                      return date.toISOString().split('T')[0];
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          
          {/* Category Trends */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Category Performance
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart
                  data={categoryTrends}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avg_growth" fill="#82ca9d" name="Growth %" />
                  <Bar dataKey="total_sales" fill="#8884d8" name="Total Sales" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          
          {/* Stock Distribution */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Stock Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={stockDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {stockDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          
          {/* Trending Products Table */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Trending Products Details
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Avg. Sales</TableCell>
                      <TableCell>Trend</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {trendingProductsData.length > 0 ? (
                      trendingProductsData.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>{product.name}</TableCell>
                          <TableCell>{product.category}</TableCell>
                          <TableCell>{product.avgSales ? product.avgSales.toFixed(2) : '0.00'} units/day</TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              {product.trend === 'up' ? (
                                <TrendingUp color="success" sx={{ mr: 1 }} />
                              ) : product.trend === 'down' ? (
                                <TrendingDown color="error" sx={{ mr: 1 }} />
                              ) : (
                                <TrendingUp color="info" sx={{ mr: 1 }} />
                              )}
                              {product.trendPercentage || 0}%
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center">No trending products data available</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
          
          {/* Summary Cards */}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: 'primary.light', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h6">Top Performer</Typography>
                    <Typography variant="h4">
                      {trendingProductsData.length > 0 ? trendingProductsData[0].name : 'N/A'}
                    </Typography>
                    <Typography variant="body2">
                      {trendingProductsData.length > 0 && trendingProductsData[0].avgSales ? 
                        `${trendingProductsData[0].avgSales.toFixed(2)} units/day` : 
                        '0.00 units/day'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: 'error.light', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h6">Low Stock Alert</Typography>
                    <Typography variant="h4">
                      {stockDistribution.length > 0 ? stockDistribution[1].value : 0}
                    </Typography>
                    <Typography variant="body2">
                      Products below reorder level
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: 'success.light', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h6">Best Category</Typography>
                    <Typography variant="h4">
                      {categoryTrends && categoryTrends.length > 0 ? 
                        [...categoryTrends].sort((a, b) => (b.avg_growth || 0) - (a.avg_growth || 0))[0].name : 'N/A'}
                    </Typography>
                    <Typography variant="body2">
                      {categoryTrends && categoryTrends.length > 0 ? 
                        `${[...categoryTrends].sort((a, b) => (b.avg_growth || 0) - (a.avg_growth || 0))[0].avg_growth || 0}% growth` : 
                        'No data yet'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: 'warning.light', color: 'white' }}>
                  <CardContent>
                    <Typography variant="h6">Inventory Health</Typography>
                    <Typography variant="h4">
                      {stockDistribution.length > 0 ? 
                        `${Math.round((stockDistribution[0].value / 
                          (stockDistribution[0].value + stockDistribution[1].value + stockDistribution[2].value)) * 100)}%` : '0%'}
                    </Typography>
                    <Typography variant="body2">
                      Products at healthy stock levels
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </div>
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<Download />}
          onClick={generatePDF}
          size="large"
          sx={{ px: 4 }}
        >
          Download Complete Report (PDF)
        </Button>
      </Box>
    </Box>
  );
};

export default TrendsPage;
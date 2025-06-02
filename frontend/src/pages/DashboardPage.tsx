import React, { useEffect, useState } from 'react';
import { inventoryService } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { useVoice } from '../contexts/VoiceContext';
import { Box, Paper, Typography, Grid, Card, CardContent, Chip, Button, TextField, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Search as SearchIcon, Refresh as RefreshIcon, Warning as WarningIcon, TrendingUp as TrendingUpIcon, Inventory as InventoryIcon, Schedule as ScheduleIcon, Mic as MicIcon, MicOff as MicOffIcon } from '@mui/icons-material';

interface Product {
  id: string;
  name: string;
  category: string;
  current_stock: number;
  reorder_level: number;
  purchase_price: number;
  selling_price: number;
  lead_time: number;
  sku?: string;
  historical_sales: Record<string, number>;
  pred_demand?: number;
  restock_qty?: number;
  status?: string;
}

const COLORS = ['#1E88E5', '#43A047', '#FB8C00', '#E53935', '#5E35B1', '#00ACC1'];

const DashboardPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { startListening, stopListening, isListening, transcript, response } = useVoice();
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [showFastMovingModal, setShowFastMovingModal] = useState(false);
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [showUpcomingRestocksModal, setShowUpcomingRestocksModal] = useState(false);
  const [showTotalStockValueModal, setShowTotalStockValueModal] = useState(false);
  const [salesData, setSalesData] = useState<Array<{month: string, sales: number}>>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await inventoryService.getAllProducts();
        // Add some mock data for the UI elements we need to display
        const enhancedData = data.map((product: Product) => ({
          ...product,
          sku: product.id.toUpperCase(),
          pred_demand: Math.floor(Math.random() * 200) + 50,
          restock_qty: Math.floor(Math.random() * 50) + 10,
          status: product.current_stock === 0 ? 'OUT OF STOCK' : 
                 product.current_stock <= product.reorder_level ? 'LOW STOCK' : 'IN STOCK'
        }));
        setProducts(enhancedData);
        setLastUpdated(new Date());
        
        // Generate sales data only once when products are loaded
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const generatedSalesData = months.map(month => ({
          month,
          sales: Math.floor(Math.random() * 500000) + 300000
        }));
        setSalesData(generatedSalesData);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Calculate key metrics
  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => p.current_stock <= p.reorder_level);
  const outOfStockProducts = products.filter(p => p.current_stock === 0);
  const fastMovingProducts = products
    .filter(p => p.historical_sales && Object.values(p.historical_sales).some(sales => sales > 10))
    .sort((a, b) => {
      const aMax = Math.max(...Object.values(a.historical_sales));
      const bMax = Math.max(...Object.values(b.historical_sales));
      return bMax - aMax;
    })
    .slice(0, 24);
  
  // Calculate total stock value
  const totalStockValue = products.reduce((sum, product) => {
    return sum + (product.current_stock * product.selling_price);
  }, 0);
  
  // Upcoming restocks (products that need to be restocked soon)
  const upcomingRestocks = lowStockProducts
    .filter(p => p.current_stock > 0) // Not completely out of stock yet
    .sort((a, b) => (a.current_stock / a.reorder_level) - (b.current_stock / b.reorder_level))
    .slice(0, 12);
  
  // Prepare data for category distribution chart
  const categoryData = Object.entries(
    products.reduce((acc, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));
  
  // Get unique categories for heatmap
  const uniqueCategories = [...new Set(products.map(p => p.category))];

  // Prepare data for stock level overview
  const stockLevelData = [
    {
      name: 'Stock Levels',
      healthy: products.filter(p => p.current_stock > p.reorder_level).length,
      low: products.filter(p => p.current_stock <= p.reorder_level && p.current_stock > 0).length,
      out: products.filter(p => p.current_stock === 0).length
    }
  ];
  
  // Function to get color for heatmap cells
  const getHeatmapColor = (category: string, index: number) => {
    // Get products in this category
    const categoryProducts = products.filter(p => p.category === category);
    if (categoryProducts.length === 0) return '#e0e0e0'; // Default gray for empty categories
    
    // Calculate stock status for this category
    const healthyStock = categoryProducts.filter(p => p.current_stock > p.reorder_level).length;
    const lowStock = categoryProducts.filter(p => p.current_stock <= p.reorder_level && p.current_stock > 0).length;
    const outOfStock = categoryProducts.filter(p => p.current_stock === 0).length;
    const total = categoryProducts.length;
    
    // Distribute colors based on stock status percentages
    const healthyPercentage = healthyStock / total;
    const lowPercentage = lowStock / total;
    const outPercentage = outOfStock / total;
    
    // Normalize index to 0-1 range
    const normalizedIndex = index / 10;
    
    if (normalizedIndex < outPercentage) {
      return '#f44336'; // Red for out of stock
    } else if (normalizedIndex < outPercentage + lowPercentage) {
      return '#ffeb3b'; // Yellow for low stock
    } else {
      return '#4caf50'; // Green for healthy stock
    }
  };
  
  // Sales data is now generated once in useEffect and stored in state
  
  // Function to handle restocking a product
  const handleRestock = async (productId: string) => {
    // Find the product
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    try {
      const restockQty = product.restock_qty || 20;
      const updatedStock = product.current_stock + restockQty;
      
      // Update the product in the database
      await inventoryService.updateProduct(product.id, {
        ...product,
        current_stock: updatedStock,
        status: updatedStock <= product.reorder_level ? 'LOW STOCK' : 'IN STOCK'
      });
      
      // Update the local state
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p.id === productId ? {
            ...p,
            current_stock: updatedStock,
            status: updatedStock <= p.reorder_level ? 'LOW STOCK' : 'IN STOCK'
          } : p
        )
      );
      
      // Close the modal if it's open
      setShowUpcomingRestocksModal(false);
      
      // Show success message
      alert(`Successfully restocked ${product.name} with ${restockQty} units`);
    } catch (error) {
      console.error('Error restocking product:', error);
      alert(`Failed to restock ${product.name}. Please try again.`);
    }
  };
  
  // Function to handle exporting data
  const handleExportData = () => {
    if (products.length === 0) {
      alert('No data to export');
      return;
    }
    
    // Create CSV content
    const headers = ['SKU', 'Name', 'Category', 'Current Stock', 'Reorder Level', 'Selling Price', 'Status'];
    const csvContent = [
      headers.join(','),
      ...products.map(product => [
        product.sku,
        `"${product.name}"`, // Wrap name in quotes to handle commas in names
        product.category,
        product.current_stock,
        product.reorder_level,
        product.selling_price,
        product.status
      ].join(','))
    ].join('\n');
    
    // Create a blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="flex justify-center items-center h-full">Loading...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <Box>
      {/* Dashboard Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" fontWeight="bold">
          Dashboard Overview
        </Typography>
        {/* Header right section removed as requested */}
      </Box>
      
      {/* Voice Assistant Transcript */}
      {(transcript || response) && (
        <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'background.default', borderRadius: 2 }}>
          {transcript && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="body2" fontWeight="bold" component="span">You said: </Typography>
              <Typography variant="body2" component="span">{transcript}</Typography>
            </Box>
          )}
          {response && (
            <Box>
              <Typography variant="body2" fontWeight="bold" component="span">Assistant: </Typography>
              <Typography variant="body2" component="span">{response}</Typography>
            </Box>
          )}
        </Paper>
      )}
      
      {/* Key Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              borderRadius: 2, 
              border: '1px solid', 
              borderColor: 'divider',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.02)' }
            }}
            onClick={() => setShowTotalStockValueModal(true)}
          >
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Total Stock Value</Typography>
            <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              ${totalStockValue.toLocaleString()}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Chip
                label="Click to view details"
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              borderRadius: 2, 
              border: '1px solid', 
              borderColor: 'divider',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.02)' }
            }}
            onClick={() => setShowFastMovingModal(true)}
          >
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Fast-Moving Products</Typography>
            <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 1 }}>
              {fastMovingProducts.length} Items
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Chip
                label="Click to view details"
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>
          </Paper>
          
          {/* Fast Moving Products Modal */}
          <Dialog open={showFastMovingModal} onClose={() => setShowFastMovingModal(false)} maxWidth="md" fullWidth>
            <DialogTitle>Fast-Moving Products</DialogTitle>
            <DialogContent>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Current Stock</TableCell>
                      <TableCell>Monthly Sales</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fastMovingProducts.map((product) => {
                      const maxSales = Math.max(...Object.values(product.historical_sales));
                      return (
                        <TableRow key={product.id} hover>
                          <TableCell>{product.name}</TableCell>
                          <TableCell>{product.category}</TableCell>
                          <TableCell>{product.current_stock} units</TableCell>
                          <TableCell>{maxSales} units/month</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowFastMovingModal(false)}>Close</Button>
            </DialogActions>
          </Dialog>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              borderRadius: 2, 
              border: '1px solid', 
              borderColor: 'divider',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.02)' }
            }}
            onClick={() => setShowLowStockModal(true)}
          >
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Low-Stock Warnings</Typography>
            <Typography variant="h4" component="div" fontWeight="bold" color="error" sx={{ mb: 1 }}>
              {lowStockProducts.length} Items
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Chip
                label="Click to view details"
                size="small"
                color="error"
                variant="outlined"
              />
            </Box>
          </Paper>
          
          {/* Low Stock Modal */}
          <Dialog open={showLowStockModal} onClose={() => setShowLowStockModal(false)} maxWidth="md" fullWidth>
            <DialogTitle>Low Stock Products</DialogTitle>
            <DialogContent>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Current Stock</TableCell>
                      <TableCell>Reorder Level</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lowStockProducts.map((product) => (
                      <TableRow key={product.id} hover>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell>{product.current_stock} units</TableCell>
                        <TableCell>{product.reorder_level} units</TableCell>
                        <TableCell>
                          <Chip
                            label={product.status}
                            size="small"
                            color={product.current_stock === 0 ? 'error' : 'warning'}
                            sx={{ fontWeight: 'bold' }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Button 
                            size="small" 
                            variant="outlined" 
                            color="primary"
                            onClick={() => {
                              handleRestock(product.id);
                              setShowLowStockModal(false);
                            }}
                          >
                            RESTOCK
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowLowStockModal(false)}>Close</Button>
            </DialogActions>
          </Dialog>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              borderRadius: 2, 
              border: '1px solid', 
              borderColor: 'divider',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.02)' }
            }}
            onClick={() => setShowUpcomingRestocksModal(true)}
          >
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Upcoming Restocks</Typography>
            <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 1 }}>
              {upcomingRestocks.length} Items
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Chip
                label="Click to view details"
                size="small"
                color="info"
                variant="outlined"
              />
            </Box>
          </Paper>
          
          {/* Upcoming Restocks Modal */}
          <Dialog open={showUpcomingRestocksModal} onClose={() => setShowUpcomingRestocksModal(false)} maxWidth="md" fullWidth>
            <DialogTitle>Upcoming Restocks</DialogTitle>
            <DialogContent>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Current Stock</TableCell>
                      <TableCell>Reorder Level</TableCell>
                      <TableCell>Restock Quantity</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {upcomingRestocks.map((product) => (
                      <TableRow key={product.id} hover>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell>{product.current_stock} units</TableCell>
                        <TableCell>{product.reorder_level} units</TableCell>
                        <TableCell>{product.restock_qty || 20} units</TableCell>
                        <TableCell align="center">
                          <Button 
                            size="small" 
                            variant="outlined" 
                            color="primary"
                            onClick={() => {
                              handleRestock(product.id);
                              setShowUpcomingRestocksModal(false);
                            }}
                          >
                            RESTOCK NOW
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowUpcomingRestocksModal(false)}>Close</Button>
            </DialogActions>
          </Dialog>
        </Grid>
      </Grid>
      
      {/* Sales Trends and Inventory Heatmap */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" component="h2">Sales Trends</Typography>
              <Typography variant="body2" color="text.secondary">Last 12 months</Typography>
            </Box>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sales" fill="#4169e1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" component="h2">Inventory Heatmap</Typography>
              <Typography variant="body2" color="text.secondary">By category</Typography>
            </Box>
            <Box sx={{ height: 300, display: 'flex', flexDirection: 'column' }}>
              <Grid container spacing={1} sx={{ flexGrow: 1 }}>
                {uniqueCategories.length > 0 ? uniqueCategories.map(category => (
                  <Grid item xs={12} key={category}>
                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                      <Typography variant="body2" sx={{ width: 100 }}>{category}</Typography>
                      <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
                        {Array.from({ length: 10 }).map((_, index) => (
                          <Box 
                            key={index} 
                            sx={{ 
                              flexGrow: 1, 
                              height: 30, 
                              bgcolor: getHeatmapColor(category, index),
                              borderRadius: 1
                            }} 
                          />
                        ))}
                      </Box>
                    </Box>
                  </Grid>
                )) : (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                      No category data available
                    </Typography>
                  </Grid>
                )}
              </Grid>
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 16, height: 16, bgcolor: '#4caf50', borderRadius: 1, mr: 1 }} />
                  <Typography variant="caption">Sufficient Stock</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 16, height: 16, bgcolor: '#ffeb3b', borderRadius: 1, mr: 1 }} />
                  <Typography variant="caption">Low Stock</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 16, height: 16, bgcolor: '#f44336', borderRadius: 1, mr: 1 }} />
                  <Typography variant="caption">Critical/Out</Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Total Stock Value Modal */}
      <Dialog open={showTotalStockValueModal} onClose={() => setShowTotalStockValueModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>Total Stock Value Details</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" component="div">
              Total Value: <strong>${totalStockValue.toLocaleString()}</strong>
            </Typography>
            <Chip
              label="12.4% from last month"
              size="small"
              color="success"
              icon={<TrendingUpIcon />}
              variant="outlined"
            />
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Category</TableCell>
                  <TableCell>Number of Products</TableCell>
                  <TableCell>Total Stock</TableCell>
                  <TableCell align="right">Stock Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {uniqueCategories.map(category => {
                  const categoryProducts = products.filter(p => p.category === category);
                  const totalStock = categoryProducts.reduce((sum, p) => sum + p.current_stock, 0);
                  const stockValue = categoryProducts.reduce((sum, p) => sum + (p.current_stock * p.selling_price), 0);
                  
                  return (
                    <TableRow key={category}>
                      <TableCell>{category}</TableCell>
                      <TableCell>{categoryProducts.length}</TableCell>
                      <TableCell>{totalStock} units</TableCell>
                      <TableCell align="right">${stockValue.toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow sx={{ '& td': { fontWeight: 'bold', bgcolor: 'rgba(0, 0, 0, 0.04)' } }}>
                  <TableCell>Total</TableCell>
                  <TableCell>{products.length}</TableCell>
                  <TableCell>{products.reduce((sum, p) => sum + p.current_stock, 0)} units</TableCell>
                  <TableCell align="right">${totalStockValue.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>Stock Value Distribution</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={uniqueCategories.map(category => {
                    const categoryProducts = products.filter(p => p.category === category);
                    const value = categoryProducts.reduce((sum, p) => sum + (p.current_stock * p.selling_price), 0);
                    return { name: category, value };
                  })}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {uniqueCategories.map((category, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Stock Value']} />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTotalStockValueModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Inventory Management Table */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2">Inventory Management</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {/* Search box removed as requested */}
            <Button 
              variant="contained" 
              color="primary" 
              sx={{ px: 3 }}
              onClick={handleExportData}
            >
              Export Data
            </Button>
          </Box>
        </Box>
        
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Current Stock</TableCell>
                <TableCell>Pred. Demand</TableCell>
                <TableCell>Restock Qty</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.slice(0, 5).map((product) => (
                <TableRow key={product.id} hover>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.sku}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>{product.current_stock} units</TableCell>
                  <TableCell>{product.pred_demand} units/month</TableCell>
                  <TableCell>{product.restock_qty} units (+30%)</TableCell>
                  <TableCell>
                    <Chip
                      label={product.status}
                      size="small"
                      color={
                        product.status === 'OUT OF STOCK' ? 'error' : 
                        product.status === 'LOW STOCK' ? 'warning' : 'success'
                      }
                      sx={{ fontWeight: 'bold' }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Button 
                      size="small" 
                      variant="outlined" 
                      color="primary"
                      onClick={() => handleRestock(product.id)}
                    >
                      RESTOCK
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default DashboardPage;
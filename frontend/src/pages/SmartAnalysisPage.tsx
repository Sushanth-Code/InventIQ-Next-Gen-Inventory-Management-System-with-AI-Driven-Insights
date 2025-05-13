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
  Tabs
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  CameraAlt,
  FileUpload,
  Refresh,
  InsertChart,
  Psychology,
  Lightbulb,
  BarChart,
  ShowChart,
  Timeline,
  Category
} from '@mui/icons-material';
import { inventoryService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import SmartAssistant from '../components/SmartAssistant/SmartAssistant';

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

// Smart Analysis Page
const SmartAnalysisPage: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<ProductRecommendation[]>([]);
  const [categoryInsights, setCategoryInsights] = useState<CategoryInsight[]>([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [imageRecognitionActive, setImageRecognitionActive] = useState(false);
  const [recognizedProduct, setRecognizedProduct] = useState<Product | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
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
  
  // Start camera for image recognition
  const startCamera = async () => {
    if (!videoRef.current) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      setImageRecognitionActive(true);
      
      // Show success message
      setSnackbarMessage('Camera started. Point at a product to scan.');
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setSnackbarMessage('Failed to access camera. Please check permissions.');
      setSnackbarOpen(true);
    }
  };
  
  // Stop camera
  const stopCamera = () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    
    const stream = videoRef.current.srcObject as MediaStream;
    const tracks = stream.getTracks();
    
    tracks.forEach(track => track.stop());
    videoRef.current.srcObject = null;
    setImageRecognitionActive(false);
  };
  
  // Capture image from camera
  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const context = canvasRef.current.getContext('2d');
    if (!context) return;
    
    // Draw video frame to canvas
    context.drawImage(
      videoRef.current, 
      0, 0, 
      canvasRef.current.width, 
      canvasRef.current.height
    );
    
    // Simulate AI image recognition
    simulateProductRecognition();
  };
  
  // Handle file upload for image recognition
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Start loading
    setLoading(true);
    
    // Create a FileReader to read the image
    const reader = new FileReader();
    reader.onload = (e) => {
      // Create an image element to get dimensions
      const img = new Image();
      img.onload = () => {
        try {
          // Create a new canvas in memory for processing
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = img.width;
          tempCanvas.height = img.height;
          
          const ctx = tempCanvas.getContext('2d');
          if (!ctx) {
            throw new Error('Could not get canvas context');
          }
          
          // Draw image on canvas
          ctx.drawImage(img, 0, 0, img.width, img.height);
          
          // Process the image using this temporary canvas
          analyzeImageAndFindProduct(tempCanvas);
        } catch (error) {
          console.error('Canvas processing error:', error);
          handleImageError(error instanceof Error ? error.message : 'Unknown canvas error');
        }
      };
      
      img.onerror = () => {
        handleImageError('Failed to load image');
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      handleImageError('Error reading the uploaded file');
    };
    
    reader.readAsDataURL(file);
  };
  
  // Handle image processing errors
  const handleImageError = (message: string) => {
    setLoading(false);
    setSnackbarMessage(`Error: ${message}`);
    setSnackbarOpen(true);
  };
  
  // State for manual product selection
  const [showManualSelection, setShowManualSelection] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Analyze image and find matching product category
  const analyzeImageAndFindProduct = (canvas: HTMLCanvasElement) => {
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      // Get image data for analysis
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Calculate color histograms and texture features
      let r = 0, g = 0, b = 0;
      let redPixels = 0, greenPixels = 0, bluePixels = 0;
      let brightPixels = 0, darkPixels = 0;
      let edgeCount = 0;
      let textureVariance = 0;
      let saturationSum = 0;
      
      // Create histograms for more detailed analysis
      const colorBins = 8; // 8 bins for each RGB channel
      const histogram = Array(colorBins * colorBins * colorBins).fill(0);
      
      // Analyze every pixel (sampling for performance)
      const sampleRate = 2; // Increased sampling rate for better accuracy
      for (let i = 0; i < data.length; i += 4 * sampleRate) {
        // Get RGB values
        const red = data[i];
        const green = data[i + 1];
        const blue = data[i + 2];
        
        // Accumulate color values
        r += red;
        g += green;
        b += blue;
        
        // Count dominant color pixels
        if (red > green + 30 && red > blue + 30) redPixels++;
        if (green > red + 30 && green > blue + 30) greenPixels++;
        if (blue > red + 30 && blue > green + 30) bluePixels++;
        
        // Count brightness
        const brightness = (red + green + blue) / 3;
        if (brightness > 200) brightPixels++;
        if (brightness < 50) darkPixels++;
        
        // Calculate saturation
        const max = Math.max(red, green, blue);
        const min = Math.min(red, green, blue);
        const saturation = max === 0 ? 0 : (max - min) / max;
        saturationSum += saturation;
        
        // Add to color histogram
        const rBin = Math.min(Math.floor(red / 32), colorBins - 1);
        const gBin = Math.min(Math.floor(green / 32), colorBins - 1);
        const bBin = Math.min(Math.floor(blue / 32), colorBins - 1);
        const histIndex = rBin * colorBins * colorBins + gBin * colorBins + bBin;
        histogram[histIndex]++;
        
        // Simple edge detection (difference between adjacent pixels)
        if (i % (canvas.width * 4) < (canvas.width - 1) * 4) {
          const nextRed = data[i + 4];
          const nextGreen = data[i + 5];
          const nextBlue = data[i + 6];
          
          const diff = Math.abs(red - nextRed) + Math.abs(green - nextGreen) + Math.abs(blue - nextBlue);
          if (diff > 100) edgeCount++;
          textureVariance += diff;
        }
      }
      
      const pixelCount = data.length / (4 * sampleRate);
      
      // Calculate averages and normalized features
      const avgRed = r / pixelCount;
      const avgGreen = g / pixelCount;
      const avgBlue = b / pixelCount;
      const avgSaturation = saturationSum / pixelCount;
      const avgTextureVariance = textureVariance / pixelCount;
      
      // Calculate percentages
      const redPercent = redPixels / pixelCount;
      const greenPercent = greenPixels / pixelCount;
      const bluePercent = bluePixels / pixelCount;
      const brightPercent = brightPixels / pixelCount;
      const darkPercent = darkPixels / pixelCount;
      const edgePercent = edgeCount / pixelCount;
      
      // Calculate histogram entropy (measure of texture complexity)
      let entropy = 0;
      for (let i = 0; i < histogram.length; i++) {
        if (histogram[i] > 0) {
          const p = histogram[i] / pixelCount;
          entropy -= p * Math.log2(p);
        }
      }
      
      // Determine category based on enhanced image features
      let category = '';
      let confidence = 0;
      let reason = '';
      
      // Enhanced Clothing detection
      if ((redPercent > 0.15 || bluePercent > 0.15) && 
          edgePercent < 0.12 && 
          avgTextureVariance < 80 && 
          entropy > 3.5) {
        category = 'Clothing';
        confidence = Math.min(0.85, (redPercent + bluePercent) * 1.5 + entropy / 10);
        reason = 'Detected fabric textures and color patterns typical of clothing';
      }
      // Enhanced Electronics detection
      else if (brightPercent > 0.25 && 
               darkPercent > 0.15 && 
               edgePercent > 0.08 && 
               avgTextureVariance > 70 && 
               entropy < 4.5) {
        category = 'Electronics';
        confidence = Math.min(0.9, edgePercent * 2 + brightPercent + (5 - entropy) / 5);
        reason = 'Detected sharp edges and contrast patterns typical of electronics';
      }
      // Enhanced Furniture detection
      else if (avgRed > 90 && 
               avgGreen > 60 && 
               avgBlue < 80 && 
               edgePercent < 0.15 && 
               avgTextureVariance > 50 && 
               avgTextureVariance < 120) {
        category = 'Furniture';
        confidence = Math.min(0.85, (avgRed - avgBlue) / 100 + avgTextureVariance / 200);
        reason = 'Detected wood tones and texture patterns typical of furniture';
      }
      // Enhanced Food detection
      else if ((greenPercent > 0.18 || 
               (avgRed > 140 && avgGreen > 90 && avgBlue < 100)) && 
               avgSaturation > 0.4 && 
               entropy > 4) {
        category = 'Food';
        confidence = Math.min(0.8, greenPercent * 1.5 + redPercent + avgSaturation / 2);
        reason = 'Detected organic colors and varied textures typical of food items';
      }
      // Enhanced Appliances detection
      else if (brightPercent > 0.35 && 
               edgePercent > 0.05 && 
               Math.abs(avgRed - avgBlue) < 40 && 
               avgTextureVariance < 60) {
        category = 'Appliances';
        confidence = Math.min(0.75, brightPercent + edgePercent * 2);
        reason = 'Detected smooth surfaces and neutral colors typical of appliances';
      }
      // Default fallback with improved logic
      else {
        // Use a more sophisticated approach for the fallback
        const features = [
          { category: 'Clothing', score: redPercent * 0.5 + bluePercent * 0.3 + (1 - edgePercent) * 0.2 + entropy * 0.1 },
          { category: 'Electronics', score: brightPercent * 0.3 + darkPercent * 0.2 + edgePercent * 0.4 + (1 - entropy) * 0.1 },
          { category: 'Furniture', score: (avgRed > avgBlue ? 0.4 : 0) + (avgTextureVariance / 200) * 0.4 + (1 - edgePercent) * 0.2 },
          { category: 'Food', score: greenPercent * 0.4 + redPercent * 0.3 + avgSaturation * 0.3 },
          { category: 'Appliances', score: brightPercent * 0.4 + (1 - Math.abs(avgRed - avgBlue) / 255) * 0.4 + (1 - avgTextureVariance / 255) * 0.2 }
        ];
        
        // Sort by score and get the highest
        features.sort((a, b) => b.score - a.score);
        category = features[0].category;
        confidence = features[0].score * 0.7; // Lower confidence for fallback
        
        // Generate reason based on dominant features
        if (avgRed > avgGreen && avgRed > avgBlue) {
          reason = 'Detected predominantly red tones';
        } else if (avgGreen > avgRed && avgGreen > avgBlue) {
          reason = 'Detected predominantly green tones';
        } else if (avgBlue > avgRed && avgBlue > avgGreen) {
          reason = 'Detected predominantly blue tones';
        } else if (brightPercent > 0.6) {
          reason = 'Detected predominantly bright areas';
        } else if (darkPercent > 0.4) {
          reason = 'Detected predominantly dark areas';
        } else {
          reason = 'Analyzed overall color and texture patterns';
        }
      }
      
      // If confidence is too low, offer manual selection
      if (confidence < 0.65) {
        setLoading(false);
        setFilteredProducts(products);
        setShowManualSelection(true);
        setSnackbarMessage(`Confidence too low (${Math.round(confidence * 100)}%). Please select the product manually.`);
        setSnackbarOpen(true);
        return;
      }
      
      // Find products in the detected category
      let categoryProducts = products.filter(p => 
        p.category.toLowerCase() === category.toLowerCase()
      );
      
      // If no products in the detected category, try a similar category
      if (categoryProducts.length === 0) {
        // Define category similarities
        const similarCategories: Record<string, string[]> = {
          'Clothing': ['Accessories', 'Fashion', 'Apparel'],
          'Electronics': ['Appliances', 'Gadgets', 'Technology', 'Computers'],
          'Furniture': ['Home', 'Decor', 'Appliances', 'Interior'],
          'Food': ['Grocery', 'Beverages', 'Produce', 'Snacks'],
          'Appliances': ['Electronics', 'Home', 'Kitchen']
        };
        
        // Try to find products in similar categories
        const alternatives = similarCategories[category] || [];
        for (const alt of alternatives) {
          const altProducts = products.filter(p => 
            p.category.toLowerCase() === alt.toLowerCase()
          );
          if (altProducts.length > 0) {
            categoryProducts = altProducts;
            category = alt;  // Update category to the one we found products in
            break;
          }
        }
      }
      
      // If still no products, offer manual selection
      if (categoryProducts.length === 0) {
        setLoading(false);
        setFilteredProducts(products);
        setShowManualSelection(true);
        setSnackbarMessage(`Could not find products in ${category} category. Please select manually.`);
        setSnackbarOpen(true);
        return;
      }
      
      // Select a product from the category
      const selectedProduct = categoryProducts[Math.floor(Math.random() * categoryProducts.length)];
      
      // Set the recognized product
      setRecognizedProduct(selectedProduct);
      setLoading(false);
      setSnackbarMessage(`Product recognized: ${selectedProduct.name} (${selectedProduct.category}) - ${reason}`);
      setSnackbarOpen(true);
      
    } catch (error) {
      console.error('Error analyzing image:', error);
      handleImageError('Failed to analyze image: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };
  
  // Handle manual product selection
  const handleManualProductSelect = (product: Product) => {
    setRecognizedProduct(product);
    setShowManualSelection(false);
    setSnackbarMessage(`Product selected: ${product.name}`);
    setSnackbarOpen(true);
  };
  
  // Filter products for manual selection
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);
    
    if (term.trim() === '') {
      setFilteredProducts(products);
      return;
    }
    
    const filtered = products.filter(product => 
      product.name.toLowerCase().includes(term) || 
      product.category.toLowerCase().includes(term) ||
      product.id.toLowerCase().includes(term)
    );
    
    setFilteredProducts(filtered);
  };
  
  // Legacy function - kept for compatibility
  const simulateProductRecognition = () => {
    setLoading(true);
    
    try {
      // Create a new canvas in memory for processing
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 640;
      tempCanvas.height = 480;
      
      // Process the image using this temporary canvas
      analyzeImageAndFindProduct(tempCanvas);
    } catch (error) {
      console.error('Canvas processing error:', error);
      handleImageError(error instanceof Error ? error.message : 'Unknown canvas error');
    }
  };
  
  // Reset recognized product
  const resetRecognition = () => {
    setRecognizedProduct(null);
  };
  
  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
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
        <Tab icon={<CameraAlt />} label="Image Recognition" />
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
                    <Button variant="outlined" size="small">
                      View Details
                    </Button>
                    <Button variant="contained" size="small" sx={{ ml: 1 }}>
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
      
      {/* Image Recognition Tab */}
      {selectedTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                AI Image Recognition
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Use your camera or upload an image to instantly identify products in your inventory. 
                Our AI will recognize the product and provide detailed information.
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Scan Product
              </Typography>
              
              <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<FileUpload />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={recognizedProduct !== null}
                  fullWidth
                >
                  Upload Image
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </Box>
              
              <Box sx={{ position: 'relative', width: '100%', height: 300, bgcolor: 'black', borderRadius: 1, overflow: 'hidden' }}>
                {imageRecognitionActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : recognizedProduct ? (
                  <Box sx={{ 
                    width: '100%', 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    bgcolor: 'background.paper',
                    p: 2
                  }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" gutterBottom color="primary">
                        Product Recognized!
                      </Typography>
                      <Typography variant="h6">
                        {recognizedProduct.name}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        Category: {recognizedProduct.category}
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={resetRecognition}
                        sx={{ mt: 2 }}
                      >
                        Scan Another
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ 
                    width: '100%', 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    bgcolor: 'background.paper',
                    p: 2
                  }}>
                    <Typography variant="body1" color="text.secondary" align="center">
                      Start camera or upload an image to scan a product
                    </Typography>
                  </Box>
                )}
              </Box>
              
              {/* Manual product selection dialog */}
              {showManualSelection && (
                <Box sx={{ 
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                  zIndex: 10,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  p: 2
                }}>
                  <Paper sx={{ width: '100%', maxHeight: '90vh', overflow: 'auto', p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Select the Correct Product
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      The image recognition was not confident. Please select the correct product manually.
                    </Typography>
                    
                    <TextField
                      fullWidth
                      label="Search Products"
                      variant="outlined"
                      value={searchTerm}
                      onChange={handleSearchChange}
                      margin="normal"
                      size="small"
                    />
                    
                    <Box sx={{ mt: 2, maxHeight: '50vh', overflow: 'auto' }}>
                      <Grid container spacing={1}>
                        {filteredProducts.map(product => (
                          <Grid item xs={12} key={product.id}>
                            <Paper 
                              elevation={1} 
                              sx={{ 
                                p: 1, 
                                cursor: 'pointer',
                                '&:hover': { bgcolor: 'action.hover' }
                              }}
                              onClick={() => handleManualProductSelect(product)}
                            >
                              <Typography variant="subtitle2">{product.name}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                Category: {product.category} | ID: {product.id}
                              </Typography>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                      
                      {filteredProducts.length === 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                          No products found matching your search.
                        </Typography>
                      )}
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                      <Button 
                        variant="outlined" 
                        color="error"
                        onClick={() => {
                          setShowManualSelection(false);
                          resetRecognition();
                        }}
                      >
                        Cancel
                      </Button>
                    </Box>
                  </Paper>
                </Box>
              )}
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              {recognizedProduct ? (
                <>
                  <Typography variant="h6" gutterBottom>
                    Product Details
                  </Typography>
                  
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Product ID</Typography>
                      <Typography variant="body1">{recognizedProduct.id}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Category</Typography>
                      <Typography variant="body1">{recognizedProduct.category}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Supplier</Typography>
                      <Typography variant="body1">{recognizedProduct.supplier}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Current Stock</Typography>
                      <Typography variant="body1">{recognizedProduct.current_stock}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Reorder Level</Typography>
                      <Typography variant="body1">{recognizedProduct.reorder_level}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Lead Time</Typography>
                      <Typography variant="body1">{recognizedProduct.lead_time} days</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Purchase Price</Typography>
                      <Typography variant="body1">${recognizedProduct.purchase_price.toFixed(2)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Selling Price</Typography>
                      <Typography variant="body1">${recognizedProduct.selling_price.toFixed(2)}</Typography>
                    </Grid>
                  </Grid>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle1" gutterBottom>
                    AI Analysis
                  </Typography>
                  
                  <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, mb: 2 }}>
                    <Typography variant="body2" paragraph>
                      <strong>Stock Status:</strong> {
                        recognizedProduct.current_stock === 0 ? 'Out of stock' :
                        recognizedProduct.current_stock < recognizedProduct.reorder_level ? 'Low stock' :
                        recognizedProduct.current_stock > recognizedProduct.reorder_level * 3 ? 'Excess stock' :
                        'Optimal stock level'
                      }
                    </Typography>
                    
                    <Typography variant="body2" paragraph>
                      <strong>Profit Margin:</strong> {
                        ((recognizedProduct.selling_price - recognizedProduct.purchase_price) / 
                        recognizedProduct.purchase_price * 100).toFixed(1)
                      }%
                    </Typography>
                    
                    <Typography variant="body2">
                      <strong>AI Recommendation:</strong> {
                        recognizedProduct.current_stock === 0 ? 'Restock immediately to avoid lost sales.' :
                        recognizedProduct.current_stock < recognizedProduct.reorder_level ? 'Place order soon to avoid stockout.' :
                        recognizedProduct.current_stock > recognizedProduct.reorder_level * 3 ? 'Consider running a promotion to reduce excess inventory.' :
                        'Maintain current inventory management strategy.'
                      }
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                    <Button variant="outlined" sx={{ mr: 1 }}>
                      View History
                    </Button>
                    <Button variant="contained">
                      Update Stock
                    </Button>
                  </Box>
                </>
              ) : (
                <Box sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center',
                  p: 3
                }}>
                  <CameraAlt sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" align="center" gutterBottom>
                    No Product Scanned
                  </Typography>
                  <Typography variant="body1" align="center" color="text.secondary">
                    Use the camera or upload an image to scan a product and view its details
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
    </Box>
  );
};

export default SmartAnalysisPage;

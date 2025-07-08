import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryService } from '../services/api';
import { Box, Button, TextField, MenuItem, Select, FormControl, InputLabel, Typography, Paper, Grid, Snackbar, Alert, CircularProgress } from '@mui/material';
import { ArrowBack, Save, Add } from '@mui/icons-material';

const AddProductPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    category: '',
    supplier: '',
    current_stock: 0,
    reorder_level: 0,
    purchase_price: 0,
    selling_price: 0,
    lead_time: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  // Fetch existing categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const products = await inventoryService.getAllProducts();
        const uniqueCategories = Array.from(new Set(products.map((p: any) => p.category))) as string[];
        setCategories(uniqueCategories);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
        // Use default categories if API fails
        setCategories(['Electronics', 'Clothing', 'Food', 'Toys', 'Books', 'Furniture', 'Automotive', 'Office Supplies']);
      }
    };

    fetchCategories();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('price') || name.includes('stock') || name.includes('level') || name.includes('time')
        ? parseFloat(value) || 0
        : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // If ID is provided, check if it's already in use
      if (formData.id) {
        try {
          const products = await inventoryService.getAllProducts();
          const existingProduct = products.find((p: any) => p.id === formData.id || p.product_id === formData.id);
          
          if (existingProduct) {
            throw new Error(`Product ID '${formData.id}' already exists. Product IDs must be unique.`);
          }
        } catch (err: any) {
          if (err.message.includes('already exists')) {
            throw err;
          }
          // If error is not related to duplicate ID, continue with submission
        }
      } else {
        // Generate a unique ID if not provided
        try {
          const products = await inventoryService.getAllProducts();
          
          // Find the highest numeric product ID
          let highestId = 0;
          products.forEach((p: any) => {
            const id = p.id || p.product_id;
            if (id && id.startsWith('P')) {
              const numericPart = parseInt(id.substring(1), 10);
              if (!isNaN(numericPart) && numericPart > highestId) {
                highestId = numericPart;
              }
            }
          });
          
          // Create next ID in sequence
          formData.id = `P${String(highestId + 1).padStart(4, '0')}`;
        } catch (err) {
          // If error fetching products, use timestamp-based ID as fallback
          const timestamp = new Date().getTime();
          const randomNum = Math.floor(Math.random() * 1000);
          formData.id = `P${timestamp}${randomNum}`;
        }
      }

      await inventoryService.addProduct(formData);
      setSuccess(true);
      
      // Reset form after successful submission
      setTimeout(() => {
        navigate('/inventory');
      }, 1500);
    } catch (err: any) {
      console.error('Error adding product:', err);
      setError(err.message || err.response?.data?.message || 'Failed to add product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h1" fontWeight="bold">
            Add New Product
          </Typography>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/inventory')}
          >
            Back to Inventory
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Product added successfully! Redirecting to inventory...
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Product ID (optional)"
                name="id"
                value={formData.id}
                onChange={handleChange}
                helperText="Leave blank to auto-generate"
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Product Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              {!showCustomCategory ? (
                <FormControl fullWidth required>
                  <InputLabel id="category-label">Category</InputLabel>
                  <Select
                    labelId="category-label"
                    name="category"
                    value={formData.category}
                    onChange={(e) => {
                      if (e.target.value === 'other') {
                        setShowCustomCategory(true);
                        setFormData(prev => ({ ...prev, category: '' }));
                      } else {
                        setFormData(prev => ({ ...prev, category: e.target.value }));
                      }
                    }}
                    label="Category"
                  >
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                    <MenuItem value="other">
                      <em>Other (Add New)</em>
                    </MenuItem>
                  </Select>
                </FormControl>
              ) : (
                <Box sx={{ width: '100%' }}>
                  <FormControl fullWidth required>
                    <TextField
                      fullWidth
                      label="New Category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      onBlur={() => {
                        if (!formData.category) {
                          setShowCustomCategory(false);
                        }
                      }}
                      required
                      variant="outlined"
                      autoFocus
                      sx={{ mt: 0 }}
                    />
                  </FormControl>
                </Box>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Supplier"
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                required
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Current Stock"
                name="current_stock"
                type="number"
                value={formData.current_stock}
                onChange={handleChange}
                required
                inputProps={{ min: 0 }}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Reorder Level"
                name="reorder_level"
                type="number"
                value={formData.reorder_level}
                onChange={handleChange}
                required
                inputProps={{ min: 0 }}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Purchase Price"
                name="purchase_price"
                type="number"
                value={formData.purchase_price}
                onChange={handleChange}
                required
                inputProps={{ min: 0, step: 0.01 }}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Selling Price"
                name="selling_price"
                type="number"
                value={formData.selling_price}
                onChange={handleChange}
                required
                inputProps={{ min: 0, step: 0.01 }}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Lead Time (days)"
                name="lead_time"
                type="number"
                value={formData.lead_time}
                onChange={handleChange}
                required
                inputProps={{ min: 0 }}
                variant="outlined"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Save />}
              size="large"
            >
              {loading ? 'Adding...' : 'Add Product'}
            </Button>
          </Box>
        </form>
      </Paper>

      <Snackbar open={success} autoHideDuration={3000}>
        <Alert severity="success" sx={{ width: '100%' }}>
          Product added successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AddProductPage; 
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography
} from '@mui/material';

interface SaleDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
  maxQuantity: number;
  productName: string;
}

const SaleDialog: React.FC<SaleDialogProps> = ({
  open,
  onClose,
  onConfirm,
  maxQuantity,
  productName
}) => {
  const [quantity, setQuantity] = useState<string>('1');
  const [error, setError] = useState<string>('');

  const handleConfirm = () => {
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid quantity');
      return;
    }
    if (qty > maxQuantity) {
      setError(`Maximum available quantity is ${maxQuantity}`);
      return;
    }
    onConfirm(qty);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Record Sale - {productName}</DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          Available Quantity: {maxQuantity}
        </Typography>
        <TextField
          autoFocus
          margin="dense"
          label="Quantity"
          type="number"
          fullWidth
          value={quantity}
          onChange={(e) => {
            setQuantity(e.target.value);
            setError('');
          }}
          error={!!error}
          helperText={error}
          inputProps={{
            min: 1,
            max: maxQuantity
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
        <Button onClick={handleConfirm} color="primary" variant="contained">
          Confirm Sale
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SaleDialog;

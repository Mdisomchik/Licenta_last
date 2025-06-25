import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Box,
} from '@mui/material';
import { Delete, Edit } from '@mui/icons-material';

const LabelManager = ({ open, onClose, labels, onAddLabel, onDeleteLabel, onUpdateLabel, onDeleteAllLabels }) => {
  const [newLabel, setNewLabel] = useState('');
  const [editingLabelId, setEditingLabelId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const handleAddLabel = () => {
    if (newLabel.trim()) {
      onAddLabel(newLabel.trim());
      setNewLabel('');
    }
  };

  const handleEditLabel = (label) => {
    setEditingLabelId(label.id);
    setEditValue(label.name);
  };

  const handleUpdateLabel = () => {
    if (editValue.trim()) {
      const oldLabel = labels.find(l => l.id === editingLabelId);
      onUpdateLabel(oldLabel, editValue.trim());
      setEditingLabelId(null);
      setEditValue('');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: '#1976d2', color: '#fff', fontWeight: 700 }}>Manage Labels</DialogTitle>
      <DialogContent sx={{ bgcolor: '#23272f', color: '#fff' }}>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label="New Label"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddLabel()}
            sx={{ input: { color: '#fff' }, label: { color: '#90caf9' }, bgcolor: '#181a1b', borderRadius: 1 }}
            InputLabelProps={{ style: { color: '#90caf9' } }}
          />
          <Button
            variant="contained"
            onClick={handleAddLabel}
            sx={{ mt: 1, mr: 2, bgcolor: '#1976d2', color: '#fff', '&:hover': { bgcolor: '#1565c0' } }}
          >
            Add Label
          </Button>
          {labels.filter(l => l.type === 'user').length > 0 && (
            <Button
              variant="outlined"
              color="error"
              onClick={onDeleteAllLabels}
              sx={{ mt: 1, borderColor: '#f44336', color: '#f44336' }}
            >
              Delete All Labels
            </Button>
          )}
        </Box>
        <List>
          {labels.map((label) => (
            <ListItem key={label.id} sx={{ color: '#fff' }}>
              {editingLabelId === label.id ? (
                <TextField
                  fullWidth
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleUpdateLabel()}
                  sx={{ input: { color: '#fff' }, bgcolor: '#181a1b', borderRadius: 1 }}
                />
              ) : (
                <ListItemText primary={label.name} />
              )}
              <ListItemSecondaryAction>
                {editingLabelId === label.id ? (
                  <Button onClick={handleUpdateLabel} sx={{ color: '#1976d2' }}>Save</Button>
                ) : (
                  <>
                    <IconButton edge="end" onClick={() => handleEditLabel(label)} sx={{ color: '#90caf9' }}>
                      <Edit />
                    </IconButton>
                    <IconButton edge="end" onClick={() => onDeleteLabel(label.id)} sx={{ color: '#f44336' }}>
                      <Delete />
                    </IconButton>
                  </>
                )}
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions sx={{ bgcolor: '#23272f' }}>
        <Button onClick={onClose} sx={{ color: '#90caf9' }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default LabelManager; 
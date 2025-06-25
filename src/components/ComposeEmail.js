import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
} from '@mui/material';
import { Send, Close } from '@mui/icons-material';

const ComposeEmail = ({ open, onClose, onSend, prefill }) => {
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    body: '',
  });

  useEffect(() => {
    if (open && prefill) {
      setEmailData({
        to: prefill.to || '',
        subject: prefill.subject || '',
        body: prefill.body || '',
      });
    } else if (!open) {
      setEmailData({ to: '', subject: '', body: '' });
    }
  }, [open, prefill]);

  const handleChange = (field) => (event) => {
    setEmailData({
      ...emailData,
      [field]: event.target.value,
    });
  };

  const handleSend = () => {
    onSend(emailData);
    setEmailData({ to: '', subject: '', body: '' });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          New Message
          <Button onClick={onClose} color="inherit">
            <Close />
          </Button>
        </Box>
      </DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="To"
          value={emailData.to}
          onChange={handleChange('to')}
          margin="normal"
          variant="outlined"
        />
        <TextField
          fullWidth
          label="Subject"
          value={emailData.subject}
          onChange={handleChange('subject')}
          margin="normal"
          variant="outlined"
        />
        <TextField
          fullWidth
          label="Message"
          value={emailData.body}
          onChange={handleChange('body')}
          margin="normal"
          variant="outlined"
          multiline
          rows={10}
        />
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Send />}
          onClick={handleSend}
          disabled={!emailData.to || !emailData.subject || !emailData.body}
        >
          Send
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ComposeEmail; 
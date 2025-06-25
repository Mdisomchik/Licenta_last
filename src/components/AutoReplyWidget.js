import React, { useState } from 'react';
import WidgetCard from './WidgetCard';
import { Switch, TextField, Button, Typography, Box, useTheme } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';

export default function AutoReplyWidget({ onHide }) {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('Thank you for your email. I am currently unavailable and will reply as soon as possible.');
  const [savedMessage, setSavedMessage] = useState(message);
  const theme = useTheme();

  const handleSave = () => {
    setSavedMessage(message);
  };

  return (
    <WidgetCard
      title={<span style={{ fontFamily: theme.typography.fontFamily }}>Auto Reply</span>}
      icon={<EmailIcon sx={{ color: '#fff', mr: 1 }} />}
      onHide={onHide}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle2" sx={{ flex: 1, color: '#fff', fontFamily: theme.typography.fontFamily }}>
          Auto-Reply Status:
        </Typography>
        <Switch checked={enabled} onChange={e => setEnabled(e.target.checked)} color="primary" />
        <Typography variant="body2" sx={{ color: enabled ? '#4caf50' : '#f44336', ml: 1, fontFamily: theme.typography.fontFamily }}>
          {enabled ? 'Enabled' : 'Disabled'}
        </Typography>
      </Box>
      <TextField
        label="Auto-Reply Message"
        multiline
        minRows={3}
        fullWidth
        value={message}
        onChange={e => setMessage(e.target.value)}
        sx={{ mb: 2, bgcolor: '#232b3b', borderRadius: 2, input: { color: '#F4F4F5', fontFamily: theme.typography.fontFamily }, textarea: { color: '#F4F4F5', fontFamily: theme.typography.fontFamily } }}
      />
      <Button variant="contained" color="primary" onClick={handleSave} disabled={message === savedMessage} sx={{ fontFamily: theme.typography.fontFamily }}>
        Save Message
      </Button>
      <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#bbb', fontFamily: theme.typography.fontFamily }}>
        Current message: {savedMessage}
      </Typography>
    </WidgetCard>
  );
}

 
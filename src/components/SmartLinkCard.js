import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardMedia, Typography, Box, CircularProgress } from '@mui/material';

// You can get a free API key from https://www.linkpreview.net/ or use microlink.io
const LINK_PREVIEW_API = 'https://api.linkpreview.net/?key=123456&q='; // Replace with your API key

const SmartLinkCard = ({ url }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(LINK_PREVIEW_API + encodeURIComponent(url))
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        setError('Could not fetch preview');
        setLoading(false);
      });
  }, [url]);

  if (loading) return <Box sx={{ p: 2, textAlign: 'center' }}><CircularProgress size={24} /></Box>;
  if (error || !data || !data.title) return null;

  return (
    <Card sx={{ display: 'flex', mb: 2, maxWidth: 500, bgcolor: '#23272f', color: '#fff' }}>
      {data.image && (
        <CardMedia
          component="img"
          sx={{ width: 120, objectFit: 'cover' }}
          image={data.image}
          alt={data.title}
        />
      )}
      <CardContent sx={{ flex: 1 }}>
        <Typography variant="subtitle1" sx={{ color: '#90caf9', fontWeight: 600 }}>
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#90caf9', textDecoration: 'none' }}>{data.title}</a>
        </Typography>
        {data.description && (
          <Typography variant="body2" sx={{ color: '#b0b8c1', mt: 1 }}>{data.description}</Typography>
        )}
        <Typography variant="caption" sx={{ color: '#b0b8c1', mt: 1 }}>{url}</Typography>
      </CardContent>
    </Card>
  );
};

export default SmartLinkCard; 
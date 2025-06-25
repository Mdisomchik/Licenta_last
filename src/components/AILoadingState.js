import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { SmartToy } from '@mui/icons-material';

const AILoadingState = ({ message = 'AI is thinking...' }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        gap: 2,
        bgcolor: 'rgba(0, 0, 0, 0.04)',
        borderRadius: 2,
        minHeight: 200
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <CircularProgress
          size={60}
          thickness={4}
          sx={{
            color: 'primary.main',
            animation: 'spin 2s linear infinite',
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' }
            }
          }}
        />
        <SmartToy
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'primary.main',
            fontSize: 24
          }}
        />
      </Box>
      <Typography
        variant="body1"
        color="textSecondary"
        sx={{
          textAlign: 'center',
          maxWidth: 200,
          animation: 'pulse 1.5s ease-in-out infinite',
          '@keyframes pulse': {
            '0%': { opacity: 0.6 },
            '50%': { opacity: 1 },
            '100%': { opacity: 0.6 }
          }
        }}
      >
        {message}
      </Typography>
    </Box>
  );
};

export default AILoadingState; 
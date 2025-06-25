import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Refresh } from '@mui/icons-material';

class AIErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('AI Feature Error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box 
          sx={{ 
            p: 2, 
            bgcolor: '#ffebee', 
            borderRadius: 1,
            border: '1px solid #ef5350',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}
        >
          <Typography color="error" variant="subtitle1">
            AI feature temporarily unavailable
          </Typography>
          <Typography color="error" variant="body2">
            {this.state.error?.message || 'An unexpected error occurred'}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Refresh />}
            onClick={this.handleRetry}
            size="small"
          >
            Retry
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

export default AIErrorBoundary; 
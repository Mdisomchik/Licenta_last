import React, { useState } from 'react';
import { Paper, Box, Typography, IconButton, Tooltip } from '@mui/material';
import { VisibilityOff, ExpandLess, ExpandMore } from '@mui/icons-material';

export default function WidgetCard({ title, icon, onHide, children, ...props }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <Paper
      sx={{
        borderRadius: 4,
        background: 'rgba(34, 39, 54, 0.7)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)',
        backdropFilter: 'blur(12px)',
        border: '1.5px solid #2196f3',
        mb: 2,
        overflow: 'hidden',
        ...props.sx,
      }}
    >
      <Box sx={{
        display: 'flex', alignItems: 'center', flexDirection: 'row', px: 2, py: 1.2,
        bgcolor: '#1976d2',
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        boxShadow: '0 2px 8px #0002',
        minHeight: 44,
        position: 'relative',
      }} className="widget-header">
        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, justifyContent: 'center' }}>
          {icon}
          <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#fff', ml: 1, letterSpacing: 0.5, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</Typography>
        </Box>
      </Box>
      {!collapsed && <Box sx={{ p: 2, overflow: 'auto', textOverflow: 'ellipsis' }}>{children}</Box>}
      {/* Footer with collapse/expand and hide buttons */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', px: 1.5, py: 0.5, bgcolor: 'rgba(34, 39, 54, 0.12)', borderTop: '1px solid #2196f3' }}>
        <Tooltip title={collapsed ? 'Expand' : 'Collapse'}>
          <IconButton size="small" onClick={() => setCollapsed(v => !v)} sx={{ color: '#2196f3', mx: 0.5 }}>
            {collapsed ? <ExpandMore /> : <ExpandLess />}
          </IconButton>
        </Tooltip>
        {onHide && (
          <Tooltip title="Hide">
            <IconButton size="small" onClick={onHide} sx={{ color: '#f44336', mx: 0.5 }}>
              <VisibilityOff />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Paper>
  );
} 
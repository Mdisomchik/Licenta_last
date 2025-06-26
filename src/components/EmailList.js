import React, { useState, useEffect, useRef } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Box,
  Typography,
  Chip,
  Menu,
  MenuItem,
  Divider,
  Button,
  Select,
  InputLabel,
  FormControl,
  Avatar,
  Card,
  CardContent,
  Paper,
  Checkbox,
  Stack,
} from '@mui/material';
import {
  Star,
  StarBorder,
  Label,
  Delete,
  Archive,
  MarkEmailRead,
  MarkEmailUnread,
  Report,
  Person,
  Flag,
} from '@mui/icons-material';
import Tooltip from '@mui/material/Tooltip';
import Fade from '@mui/material/Fade';
import Badge from '@mui/material/Badge';
import Skeleton from '@mui/material/Skeleton';
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add';
import Popover from '@mui/material/Popover';
import dayjs from 'dayjs';

const EmailList = ({
  emails,
  threads = null,
  onEmailSelect,
  onLabelAdd,
  onRemoveLabel,
  onEmailDelete,
  onEmailArchive,
  onStarEmail,
  onExtractJson,
  labels = [],
  selectedEmail,
  onMarkReadUnread,
  onTogglePriority,
  largeSubject = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLabel, setFilterLabel] = useState('');
  const [labelAnchorEl, setLabelAnchorEl] = useState(null);
  const [expandedThreads, setExpandedThreads] = useState({});
  const [selectedEmailIds, setSelectedEmailIds] = useState([]);
  const [draggedLabel, setDraggedLabel] = useState(null);
  const [dragOverEmailId, setDragOverEmailId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const listRef = useRef();
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [hoveredSender, setHoveredSender] = useState(null);
  const [lastClickedIndex, setLastClickedIndex] = useState(null);

  // Bulk select logic
  const allIds = emails.map(e => e.id);
  const allSelected = selectedEmailIds.length > 0 && selectedEmailIds.length === allIds.length;
  const someSelected = selectedEmailIds.length > 0 && selectedEmailIds.length < allIds.length;
  const handleSelectAll = (e) => {
    setSelectedEmailIds(e.target.checked ? allIds : []);
  };
  const handleSelectOne = (id) => {
    setSelectedEmailIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  // Bulk actions
  const handleBulkDelete = () => {
    selectedEmailIds.forEach(id => {
      const email = emails.find(e => e.id === id);
      if (email) onEmailDelete(email);
    });
    setSelectedEmailIds([]);
  };
  const handleBulkArchive = () => {
    selectedEmailIds.forEach(id => {
      const email = emails.find(e => e.id === id);
      if (email) onEmailArchive(email);
    });
    setSelectedEmailIds([]);
  };

  const handleMenuClick = (event, email) => {
    setLabelAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setLabelAnchorEl(null);
  };

  const handleLabelSelect = (labelId) => {
    if (selectedEmail) {
      onLabelAdd(selectedEmail, labelId);
    }
    handleMenuClose();
  };

  const filteredEmails = emails.filter(email => {
    const matchesSearch =
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.from.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLabel = !filterLabel || email.labels?.includes(filterLabel);
    return matchesSearch && matchesLabel;
  });

  // If threads prop is provided, use it for threaded view
  const threadList = threads
    ? Object.entries(threads)
        .map(([threadId, threadEmails]) => {
          // Only show threads that have at least one email in filteredEmails
          const visibleEmails = threadEmails.filter(e => filteredEmails.some(f => f.id === e.id));
          return visibleEmails.length > 0 ? { threadId, emails: threadEmails } : null;
        })
        .filter(Boolean)
    : null;

  // Helper to assign a color to each label
  const labelColors = [
    '#2196f3', '#FFC107', '#4caf50', '#f44336', '#9c27b0', '#00bcd4', '#ff9800', '#607d8b', '#e91e63', '#8bc34a', '#3f51b5', '#795548',
  ];
  function getLabelColor(label) {
    let hash = 0;
    for (let i = 0; i < label.length; i++) hash = label.charCodeAt(i) + ((hash << 5) - hash);
    return labelColors[Math.abs(hash) % labelColors.length];
  }

  // Helper to get initials from email or name
  function getInitials(from) {
    if (!from) return '?';
    // Try to extract name from 'Name <email>'
    const match = from.match(/^([^<]+)</);
    const name = match ? match[1].trim() : from.split('@')[0];
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  // Helper to get a preview snippet from the email body
  function getSnippet(body) {
    if (!body) return '';
    // Create a temporary div to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = body;
    // Get the text content, which strips all HTML tags
    const text = (tempDiv.textContent || tempDiv.innerText || '').replace(/\s+/g, ' ').trim();
    return text.length > 120 ? text.slice(0, 120) + '…' : text;
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      if (!document.activeElement || !listRef.current || !listRef.current.contains(document.activeElement)) return;
      const idx = filteredEmails.findIndex(e => selectedEmail && e.id === selectedEmail.id);
      if (e.key === 'j') {
        // Down
        if (idx < filteredEmails.length - 1) onEmailSelect(filteredEmails[idx + 1]);
      } else if (e.key === 'k') {
        // Up
        if (idx > 0) onEmailSelect(filteredEmails[idx - 1]);
      } else if (e.key === 'x') {
        // Select/deselect
        if (selectedEmail) handleSelectOne(selectedEmail.id);
      } else if (e.key === 'e') {
        // Archive
        if (selectedEmail) onEmailArchive(selectedEmail);
      } else if (e.key === '#') {
        // Delete
        if (selectedEmail) onEmailDelete(selectedEmail);
      } else if (e.key === 'u') {
        // Mark as unread
        if (selectedEmail && onMarkReadUnread) onMarkReadUnread(selectedEmail, true);
      } else if (e.key === 'Enter') {
        // Open
        if (selectedEmail) onEmailSelect(selectedEmail);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredEmails, selectedEmail]);

  // Multi-select with Shift+Click
  const handleRowClick = (email, idx, e) => {
    if (e.shiftKey && lastClickedIndex !== null) {
      const start = Math.min(lastClickedIndex, idx);
      const end = Math.max(lastClickedIndex, idx);
      const ids = filteredEmails.slice(start, end + 1).map(e => e.id);
      setSelectedEmailIds(prev => Array.from(new Set([...prev, ...ids])));
    } else {
      setLastClickedIndex(idx);
      onEmailSelect(email);
    }
  };

  // Add category color map for chips
  const categoryColors = {
    Work: '#1976d2',
    Finance: '#388e3c',
    Promotions: '#fbc02d',
    Personal: '#8e24aa',
    Meetings: '#0288d1',
    Other: '#757575',
  };

  return (
    <Box
      sx={{
        background: theme => theme.palette.mode === 'dark' ? '#232b3b' : '#fff',
        borderRight: '2px solid #263043',
        boxShadow: '2px 0 12px 0 #0002',
        borderRadius: 0,
        height: 'calc(100vh - 64px)',
        overflowY: 'auto',
        p: 0,
        position: 'relative',
        '::-webkit-scrollbar': {
          width: 8,
          background: 'transparent',
        },
        '::-webkit-scrollbar-thumb': {
          background: '#263043',
          borderRadius: 4,
        },
      }}
    >
      {/* Bulk action bar */}
      {selectedEmailIds.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, px: 2, py: 1, bgcolor: '#232b3b', borderRadius: 2, boxShadow: '0 2px 8px #0002' }}>
          <Typography sx={{ fontWeight: 600, color: '#90caf9' }}>{selectedEmailIds.length} selected</Typography>
          <IconButton onClick={handleBulkArchive}><Archive /></IconButton>
          <IconButton onClick={handleBulkDelete}><Delete /></IconButton>
          <Box sx={{ ml: 'auto' }}>
            <IconButton onClick={() => setSelectedEmailIds([])}><Typography variant="caption" sx={{ color: '#90caf9' }}>Clear</Typography></IconButton>
          </Box>
        </Box>
      )}
      {/* Select all checkbox */}
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 0.5 }}>
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected}
          onChange={handleSelectAll}
          sx={{ mr: 1 }}
        />
        <Typography variant="caption" sx={{ color: '#A1A1AA', fontWeight: 600 }}>Select All</Typography>
        <Box sx={{ flex: 1 }} />
        <input
          type="text"
          placeholder="Search emails..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            background: '#232b3b',
            color: '#F4F4F5',
            border: 'none',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 15,
            width: 220,
            outline: 'none',
            marginLeft: 12,
          }}
        />
      </Box>
      <List ref={listRef} sx={{ p: 0 }}>
        {filteredEmails.map((email) => {
          const isSelected = selectedEmail && selectedEmail.id === email.id;
          const isUnread = email.unread;
          return (
            <Paper
              key={email.id}
              sx={{
                mb: 1,
                p: largeSubject ? 2.2 : 1.5,
                borderRadius: 0,
                boxShadow: isSelected ? '0 0 0 2px #2196f3' : 'none',
                background: isSelected ? '#232b3b' : isUnread ? '#232b3b' : 'transparent',
                borderLeft: isSelected ? '4px solid #2196f3' : '4px solid transparent',
                borderRight: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                minHeight: largeSubject ? 72 : 56,
                transition: 'background 0.15s',
                '&:hover': {
                  background: '#232b3b',
                },
              }}
              onClick={() => onEmailSelect(email)}
            >
              {/* Avatar */}
              <Box sx={{ mr: 1, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ width: largeSubject ? 48 : 36, height: largeSubject ? 48 : 36, borderRadius: '50%', bgcolor: '#263043', color: '#90caf9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: largeSubject ? 20 : 16 }}>
                  {getInitials(email.from) || <Person fontSize="small" />}
                </Box>
              </Box>
              <Checkbox
                checked={selectedEmailIds.includes(email.id)}
                onClick={e => { e.stopPropagation(); handleSelectOne(email.id); }}
                sx={{ mr: 1, flexShrink: 0 }}
              />
              {/* Subject + sender + date */}
                <Typography
                variant={largeSubject ? 'h6' : 'subtitle1'}
                  sx={{
                    fontWeight: isUnread ? 900 : 700,
                    color: '#F4F4F5',
                  fontSize: largeSubject ? 16 : 14,
                    minWidth: 60,
                  maxWidth: largeSubject ? 520 : 220,
                    flexShrink: 1,
                  flexGrow: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  letterSpacing: largeSubject ? 0.1 : 0,
                  lineHeight: 1.3,
                  }}
                >
                  {email.subject}
                </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#A1A1AA',
                  fontWeight: 500,
                  minWidth: 60,
                  maxWidth: 120,
                  flexShrink: 1,
                  flexGrow: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  mr: 2,
                }}
              >
                {email.from}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: '#A1A1AA',
                  minWidth: 80,
                  maxWidth: 120,
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  ml: 'auto',
                  flexShrink: 0,
                }}
              >
                {(() => {
                  if (!email.date) return '';
                  const dateObj = new Date(email.date);
                  const now = new Date();
                  const isToday = dateObj.toDateString() === now.toDateString();
                  if (isToday) {
                    // Show HH:mm
                    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                  } else {
                    // Show DD MMM
                    return dayjs(dateObj).format('D MMM');
                  }
                })()}
              </Typography>
            </Paper>
          );
        })}
      </List>
    </Box>
  );
};

export default EmailList; 
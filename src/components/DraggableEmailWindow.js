import React, { useState } from 'react';
import { Paper, Typography, IconButton, Box, Chip, Divider, Avatar, Button, Select, MenuItem, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DOMPurify from 'dompurify';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CircularProgress from '@mui/material/CircularProgress';
import { Flag, Star, StarBorder, Archive, Delete, Report, MarkEmailRead, MarkEmailUnread } from '@mui/icons-material';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';

// Helper to strip HTML tags
function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

const allowedTags = [
  'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span', 'div', 'u', 'blockquote', 'hr', 'pre', 'code',
];
const allowedAttributes = {
  a: ['href', 'target', 'rel'],
  span: ['style'],
  div: ['style'],
};

const DraggableEmailWindow = ({ open, onClose, email, handleSummarize, summarizing, summary, threadEmails = [], onSmartReply, smartReplies = [], smartRepliesLoading = false, onSummarizeThread, threadSummarizing, threadSummary, onSummarizeAttachment, attachmentSummaries = {}, tone = 'Friendly', onToneChange, summaryDetail = 'short', onSummaryDetailChange, onReplyBasedOnSummary, handleRegenerateSmartReplies, handleCopy, copyFeedback, onTogglePriority, onStarEmail, onEmailArchive, onEmailDelete, onExtractJson, onMarkReadUnread }) => {
  const [llmReplyLoading, setLlmReplyLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  if (!open || !email) return null;
  // Use threadEmails if provided and has more than one email, else fallback to single email
  const emailsToShow = threadEmails && threadEmails.length > 1 ? threadEmails : [email];

  const handleGenerateLLMReply = async () => {
    if (!email || !email.body) return;
    setLlmReplyLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/llm-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: email.body }),
      });
      const data = await response.json();
      if (data && data.reply) {
        if (onSmartReply) onSmartReply(data.reply);
      }
    } catch (e) {
      // Optionally show error
    }
    setLlmReplyLoading(false);
  };

  const handleAction = (action, fn) => {
    if (fn) fn(email);
    let message = '';
    switch (action) {
      case 'priority': message = email.priority ? 'Priority removed' : 'Marked as priority'; break;
      case 'star': message = email.starred ? 'Star removed' : 'Email starred'; break;
      case 'archive': message = 'Email archived'; break;
      case 'delete': message = 'Email deleted'; break;
      case 'spam': message = 'Marked as spam'; break;
      case 'readunread': message = email.unread ? 'Marked as read' : 'Marked as unread'; break;
      case 'close': message = 'Closed email details'; break;
      default: message = 'Action performed';
    }
    setSnackbar({ open: true, message, severity: 'info' });
  };

  return (
    <Box sx={{ height: '100%', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', p: 4, boxSizing: 'border-box', overflowY: 'auto' }}>
      <Paper
        elevation={8}
        sx={{
          width: '100%',
          maxWidth: 700,
          minWidth: 360,
          borderRadius: 4,
          background: '#23262F',
          color: '#F4F4F5',
          boxShadow: '0 8px 32px 0 rgba(0,0,0,0.10)',
          display: 'flex',
          flexDirection: 'column',
          p: 0,
        }}
      >
        {/* Header (for the first email in thread) */}
        <Box sx={{ px: 4, pt: 4, pb: 2, position: 'relative' }}>
          {/* Action icons toolbar at the top right */}
          <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: 1, zIndex: 2 }}>
            <Tooltip title={email.priority ? 'Unmark as Priority' : 'Mark as Priority'} placement="top">
              <IconButton size="small" onClick={() => handleAction('priority', onTogglePriority)} color={email.priority ? 'error' : 'default'}>
                <Flag style={{ color: email.priority ? '#e53935' : '#A1A1AA' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={email.starred ? 'Unstar' : 'Star'} placement="top">
              <IconButton size="small" onClick={() => handleAction('star', onStarEmail)} color={email.starred ? 'warning' : 'default'}>
                {email.starred ? <Star /> : <StarBorder />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Archive" placement="top">
              <IconButton size="small" onClick={() => handleAction('archive', onEmailArchive)} color="primary">
                <Archive />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete" placement="top">
              <IconButton size="small" onClick={() => handleAction('delete', onEmailDelete)} color="error">
                <Delete />
              </IconButton>
            </Tooltip>
            <Tooltip title="Mark as spam" placement="top">
              <IconButton size="small" onClick={() => handleAction('spam', onExtractJson)} color="secondary">
                <Report />
              </IconButton>
            </Tooltip>
            <Tooltip title={email.unread ? 'Mark as Read' : 'Mark as Unread'} placement="top">
              <IconButton size="small" onClick={() => handleAction('readunread', onMarkReadUnread)} color="info">
                {email.unread ? <MarkEmailRead /> : <MarkEmailUnread />}
              </IconButton>
            </Tooltip>
            <IconButton size="large" sx={{ color: '#2196f3' }} onClick={() => { handleAction('close'); onClose(); }}><CloseIcon /></IconButton>
          </Box>
          {/* Subject fills width below buttons */}
          <Typography variant="h5" sx={{ fontWeight: 800, fontSize: 22, color: '#F4F4F5', mb: 1, whiteSpace: 'normal', overflow: 'visible', textOverflow: 'unset', wordBreak: 'break-word', textAlign: 'left', pr: 1, pt: 2 }}>
            {emailsToShow[0].subject}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: '#2196f3', color: '#fff', fontWeight: 700, width: 36, height: 36, mr: 1 }}>
              {emailsToShow[0].from ? emailsToShow[0].from[0].toUpperCase() : '?'}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#F4F4F5', fontSize: 15, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emailsToShow[0].from}</Typography>
              <Typography variant="caption" sx={{ color: '#A1A1AA', fontSize: 12 }}>{emailsToShow[0].date}</Typography>
            </Box>
          </Box>
        </Box>
        <Divider sx={{ my: 1, bgcolor: '#22242A' }} />
        {/* Threaded messages */}
        <Box sx={{ px: 0, pb: 0, pt: 0, flex: 1, overflowY: 'auto' }}>
          {emailsToShow.map((msg, idx) => (
            <Box key={msg.id} sx={{ px: 4, pt: idx === 0 ? 0 : 2, pb: 2, mb: idx < emailsToShow.length - 1 ? 2 : 0, borderLeft: idx > 0 ? '2px solid #263043' : 'none', background: idx > 0 ? '#232b3b' : 'none', borderRadius: 2 }}>
              {emailsToShow.length > 1 && idx > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Avatar sx={{ bgcolor: '#1976d2', color: '#fff', fontWeight: 700, width: 32, height: 32, mr: 1 }}>
                    {msg.from ? msg.from[0].toUpperCase() : '?'}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#90caf9', fontSize: 15, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.from}</Typography>
                    <Typography variant="caption" sx={{ color: '#A1A1AA', fontSize: 13 }}>{msg.date}</Typography>
                  </Box>
                </Box>
              )}
              <div
                style={{ wordBreak: 'break-word', fontFamily: 'inherit', color: '#F4F4F5', fontSize: 17 }}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(msg.body || '', {
                    USE_PROFILES: { html: true },
                    ALLOWED_ATTR: ['style', 'class', 'id', 'src', 'href', 'alt', 'title', 'width', 'height', 'align', 'valign', 'border', 'cellpadding', 'cellspacing', 'bgcolor'],
                    ALLOWED_TAGS: false,
                    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
                    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'onblur', 'oninput', 'onchange'],
                  })
                }}
              />
              {/* Inline image and attachment previews for each message */}
              {msg.attachments && msg.attachments.length > 0 && (
                <Box sx={{ pt: 1 }}>
                  <Typography variant="caption" sx={{ color: '#90caf9', mb: 1, fontWeight: 600 }}>Attachments:</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {msg.attachments.map((att, i) => {
                      const isImage = att.mimeType && att.mimeType.startsWith('image/');
                      const isSummarizable = att.mimeType === 'application/pdf' || att.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                      let src = '';
                      if (isImage && att.data) {
                        src = `data:${att.mimeType};base64,${att.data}`;
                      }
                      return (
                        <Box key={i} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 100, maxWidth: 180 }}>
                          {isImage && src ? (
                            <a href={src} target="_blank" rel="noopener noreferrer">
                              <img src={src} alt={att.filename} style={{ maxWidth: 120, maxHeight: 90, borderRadius: 6, marginBottom: 4, boxShadow: '0 2px 8px #0003' }} />
                            </a>
                          ) : (
                            <a href={att.data ? `data:${att.mimeType};base64,${att.data}` : '#'} download={att.filename} style={{ textDecoration: 'none', color: '#90caf9' }}>
                              <InsertDriveFileIcon sx={{ fontSize: 40, color: '#90caf9' }} />
                            </a>
                          )}
                          <Typography variant="caption" sx={{ color: '#e3e8ee', textAlign: 'center', wordBreak: 'break-all', maxWidth: 120 }}>
                            {att.filename}
                          </Typography>
                          {isSummarizable && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="secondary"
                              sx={{ mt: 1, fontWeight: 600, borderRadius: 2, textTransform: 'none' }}
                              onClick={() => onSummarizeAttachment && onSummarizeAttachment(att)}
                              disabled={attachmentSummaries[att.attachmentId]?.loading}
                            >
                              {attachmentSummaries[att.attachmentId]?.loading ? 'Summarizing...' : 'Summarize'}
                            </Button>
                          )}
                          {attachmentSummaries[att.attachmentId]?.summary && (
                            <Box sx={{ mt: 1, p: 1.5, bgcolor: '#232b3b', borderRadius: 2, border: '1.5px solid #42a5f5', boxShadow: '0 2px 8px #0002', maxWidth: 180 }}>
                              <Typography variant="body2" sx={{ color: '#fff', fontSize: 14, whiteSpace: 'pre-line' }}>{attachmentSummaries[att.attachmentId].summary}</Typography>
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}
            </Box>
          ))}
        </Box>
        {/* Summarize Button */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, mb: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleSummarize}
            disabled={summarizing}
            sx={{ px: 3, py: 0.5, fontWeight: 700, borderRadius: 2, minWidth: 120 }}
          >
            {summarizing ? 'Summarizing...' : 'Summarize'}
          </Button>
        </Box>
        {/* Thread Summarization */}
        {threadEmails && threadEmails.length > 1 && (
          <Box sx={{ mt: 2, mb: 2 }}>
            <Button
              variant="contained"
              color="secondary"
              onClick={onSummarizeThread}
              disabled={threadSummarizing}
              sx={{ fontWeight: 700, borderRadius: 3, textTransform: 'none', mb: 1 }}
            >
              {threadSummarizing ? 'Summarizing Thread...' : 'Summarize Thread'}
            </Button>
            {threadSummary && (
              <Box sx={{ mt: 2, p: 2, bgcolor: '#232b3b', borderRadius: 2, border: '1.5px solid #FFC107', boxShadow: '0 2px 8px #0002' }}>
                <Typography variant="subtitle2" sx={{ color: '#FFC107', mb: 1, fontWeight: 600 }}>Thread Summary:</Typography>
                <Typography sx={{ fontWeight: 400, fontSize: 16, color: '#fff', lineHeight: 1.7, whiteSpace: 'pre-line', wordBreak: 'break-word', fontFamily: 'inherit' }}>
                  {threadSummary}
                </Typography>
              </Box>
            )}
          </Box>
        )}
        {/* Summary Detail Toggle and Summary */}
        {summary && (
          <Box sx={{
            mt: 1,
            p: 2.5,
            bgcolor: '#1a253a',
            borderRadius: 2,
            border: '1.5px solid #42a5f5',
            boxShadow: '0 2px 8px #0002',
            fontWeight: 400,
            fontSize: 17,
            color: '#eaf6ff',
            lineHeight: 1.8,
            whiteSpace: 'pre-line',
            wordBreak: 'break-word',
            fontFamily: 'inherit',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Typography sx={{ fontWeight: 400, fontSize: 17, color: '#eaf6ff', lineHeight: 1.8, whiteSpace: 'pre-line', wordBreak: 'break-word', fontFamily: 'inherit', textAlign: 'center' }}>
              {summary}
            </Typography>
          </Box>
        )}
        {summarizing && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
            <CircularProgress size={22} color="primary" />
            <Typography variant="body2" sx={{ color: '#90caf9' }}>Summarizing...</Typography>
          </Box>
        )}
      </Paper>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }} elevation={6} variant="filled">
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
};

export default DraggableEmailWindow; 
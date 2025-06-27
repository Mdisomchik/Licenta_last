import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  Paper,
  Chip,
  Switch,
  Tooltip,
  useTheme,
  CssBaseline,
  createTheme,
  ThemeProvider,
  TextField,
  Avatar,
  Checkbox,
  Fab,
  Snackbar,
  Alert as MuiAlert,
} from '@mui/material';
import {
  Inbox,
  Send,
  Star,
  StarBorder,
  Delete,
  Archive,
  Label,
  Add,
  Report,
  Brightness4,
  Brightness7,
  InsertDriveFile,
  MailOutline,
  SmartToy,
  Close,
  VisibilityOff,
  Flag,
  GitHub,
  WbSunny,
  Spellcheck,
  AutoAwesome,
} from '@mui/icons-material';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import axios from 'axios';
import EmailList from './components/EmailList';
import LabelManager from './components/LabelManager';
import GridLayout from 'react-grid-layout';
import { Rnd } from 'react-rnd';
import DOMPurify from 'dompurify';
import SmartLinkCard from './components/SmartLinkCard';
import Sentiment from 'sentiment';
import DraggableEmailWindow from './components/DraggableEmailWindow';
import SplitPane from 'react-split-pane';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Responsive, WidthProvider } from 'react-grid-layout';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import WidgetCard from './components/WidgetCard';
import CryptoJS from 'crypto-js';
import EmojiNatureIcon from '@mui/icons-material/EmojiNature'; // Carrot-like icon
import AutoReplyWidget from './components/AutoReplyWidget';
import debounce from 'lodash.debounce';
import ComposeEmail from './components/ComposeEmail';
import { diffWords } from 'diff';
import AIErrorBoundary from './components/ErrorBoundary';
import AILoadingState from './components/AILoadingState';
import aiService from './services/aiService';

const ResponsiveGridLayout = WidthProvider(Responsive);

function linkify(text) {
  if (!text) return '';
  // Regex to match URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  // Split by URLs and map
  return text.split(urlRegex).map((part, i) => {
    if (part.match(urlRegex)) {
      return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#90caf9', wordBreak: 'break-all' }}>{part}</a>;
    }
    // Preserve line breaks
    return part.split(/(\n)/g).map((line, j) =>
      line === '\n' ? <br key={j} /> : line
    );
  });
}

// Helper to extract URLs from text
function extractUrls(text) {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return Array.from(new Set((text.match(urlRegex) || [])));
}

// Helper to get all attachments from a thread
function getThreadAttachments(selectedEmail, emails) {
  if (!selectedEmail || !selectedEmail.threadId) return selectedEmail?.attachments || [];
  // Get all emails in the same thread
  const threadEmails = emails.filter(e => e.threadId === selectedEmail.threadId);
  return threadEmails.flatMap(e => e.attachments || []);
}

// Add this helper function
function stripHtml(html) {
  if (!html) return '';
  // Remove <style> and <script> blocks
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  // Remove all HTML tags
  html = html.replace(/<[^>]+>/g, '');
  // Remove leftover curly braces, CSS, and extra whitespace
  html = html.replace(/\{[^}]*\}/g, '');
  html = html.replace(/\s{2,}/g, ' ');
  // Remove lines that look like CSS
  html = html.split('\n').filter(line => !line.trim().match(/^[\.#@a-zA-Z0-9\-\_, ]+\{.*\}$/)).join('\n');
  // Remove leading/trailing whitespace
  return html.trim();
}

// --- Smart Categorization Helper ---
async function categorizeEmailAI(email) {
  try {
    const response = await fetch('http://localhost:5001/api/categorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: email.subject, body: email.body }),
    });
    const data = await response.json();
    if (data && data.category) return data.category;
  } catch (e) {}
  // fallback to old categorizeEmail
  return categorizeEmail(email);
}

function categorizeEmail(email) {
  const subject = (email.subject || '').toLowerCase();
  const from = (email.from || '').toLowerCase();
  const body = (email.body || '').toLowerCase();
  if (from.includes('bank') || subject.includes('invoice') || subject.includes('payment')) return 'Finance';
  if (from.includes('linkedin') || subject.includes('job') || subject.includes('career')) return 'Work';
  if (from.includes('newsletter') || subject.includes('promo') || subject.includes('sale')) return 'Promotions';
  if (from.includes('family') || from.includes('mom') || from.includes('dad') || subject.includes('birthday')) return 'Personal';
  if (subject.includes('meeting') || subject.includes('calendar')) return 'Meetings';
  return 'Other';
}

const App = () => {
  const [accessToken, setAccessToken] = useState(null);
  const [emails, setEmails] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composePrefill, setComposePrefill] = useState({ to: '', subject: '', body: '' });
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [labels, setLabels] = useState([]);
  const [labelManagerOpen, setLabelManagerOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('Inbox');
  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  const [jsonData, setJsonData] = useState(null);
  const [jsonError, setJsonError] = useState('');
  const [darkMode, setDarkMode] = useState(() => {
    // Persist theme in localStorage
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });
  const [settingsAnchorEl, setSettingsAnchorEl] = useState(null);
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [allLoaded, setAllLoaded] = useState(false);
  const [summary, setSummary] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [emailWindowOpen, setEmailWindowOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantQuery, setAssistantQuery] = useState('');
  const [assistantResults, setAssistantResults] = useState([]);
  const [showSentimentWidget, setShowSentimentWidget] = useState(true);
  const [showAttachments, setShowAttachments] = useState(true);
  const [showTodo, setShowTodo] = useState(true);
  const [showContacts, setShowContacts] = useState(true);
  const [showAI, setShowAI] = useState(true);
  const [showAIReply, setShowAIReply] = useState(true);
  const [showAICorrection, setShowAICorrection] = useState(true);
  const [showMenuAnchor, setShowMenuAnchor] = useState(null);
  const [importantContacts, setImportantContacts] = useState([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [attachmentModal, setAttachmentModal] = useState({ open: false, type: '', src: '', filename: '', index: 0 });
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [smartReplies, setSmartReplies] = useState([]);
  const [smartRepliesLoading, setSmartRepliesLoading] = useState(false);
  const [threadSummary, setThreadSummary] = useState('');
  const [threadSummarizing, setThreadSummarizing] = useState(false);
  const [attachmentSummaries, setAttachmentSummaries] = useState({});
  const [showSummaryWidget, setShowSummaryWidget] = useState(true);
  const theme = useMemo(() => createTheme({
    typography: {
      fontFamily: [
        'Inter', 'Roboto', 'Segoe UI', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', 'sans-serif'
      ].join(','),
    },
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: { main: darkMode ? '#fff' : '#1976d2' },
      secondary: { main: darkMode ? '#888' : '#222' },
      background: {
        default: darkMode ? '#111' : '#f7f9fb',
        paper: darkMode ? '#181818' : '#fff',
      },
      text: {
        primary: darkMode ? '#fff' : '#23262F',
        secondary: darkMode ? '#bbb' : '#444',
      },
      divider: darkMode ? '#222' : '#e0e0e0',
    },
    shape: { borderRadius: 14 },
    components: {
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none', backgroundColor: darkMode ? '#181818' : '#fff', boxShadow: darkMode ? '0 8px 32px 0 rgba(31, 38, 135, 0.18)' : '0 2px 12px 0 #e0e0e0', backdropFilter: 'blur(12px)' } } },
      MuiChip: {
        styleOverrides: {
          root: {
            background: darkMode ? 'rgba(34, 39, 54, 0.7)' : '#f5f5f5',
            color: darkMode ? '#fff' : '#1976d2',
            borderColor: darkMode ? '#fff' : '#1976d2',
            fontWeight: 600,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          containedPrimary: {
            background: darkMode ? '#222' : '#1976d2',
            color: darkMode ? '#fff' : '#fff',
            '&:hover': { background: darkMode ? '#444' : '#1565c0' },
          },
          containedSecondary: {
            backgroundColor: darkMode ? '#888' : '#e3e8ee',
            color: darkMode ? '#fff' : '#23262F',
            '&:hover': { backgroundColor: darkMode ? '#aaa' : '#cfd8dc' },
          },
        },
      },
    },
  }), [darkMode]);
  const sentiment = new Sentiment();
  const sentimentResult = selectedEmail ? sentiment.analyze(selectedEmail.body || '') : null;
  let sentimentLabel = '';
  let sentimentColor = '';
  if (sentimentResult) {
    if (sentimentResult.score > 1) {
      sentimentLabel = 'Positive';
      sentimentColor = '#4caf50';
    } else if (sentimentResult.score < -1) {
      sentimentLabel = 'Negative';
      sentimentColor = '#f44336';
    } else {
      sentimentLabel = 'Neutral';
      sentimentColor = '#ff9800';
    }
  }

  const googleLogin = useGoogleLogin({
    clientId: '106794135380-9j6ahfrekahtdoom51rlcq44ltd7empk.apps.googleusercontent.com',
    scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify',
    onSuccess: (tokenResponse) => {
      setAccessToken(tokenResponse.access_token);
    },
    onError: (error) => {
      console.error('Google Login Failed:', error);
      setError('Google login failed.');
    },
  });

  const fetchEmails = async (pageToken = null, append = false) => {
    if (accessToken) {
      setLoading(true);
      try {
        const response = await axios.get('https://www.googleapis.com/gmail/v1/users/me/messages', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
          maxResults: 50,
          pageToken: pageToken || undefined,
          },
        });
        const emailDetailsPromises = response.data.messages.map(async (message) => {
          const emailDetailsResponse = await axios.get(
            `https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
              params: { format: 'full' },
            }
          );
        const { body, attachments } = getEmailBodyAndAttachments(emailDetailsResponse.data.payload);
        const fetchedAttachments = await Promise.all(
          (attachments || []).map(async (att) => {
            const attRes = await axios.get(
              `https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}/attachments/${att.attachmentId}`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            return {
              ...att,
              data: attRes.data.data, // base64url encoded
            };
          })
        );
          const emailObj = {
            id: emailDetailsResponse.data.id,
          threadId: emailDetailsResponse.data.threadId,
            from: emailDetailsResponse.data.payload.headers.find(header => header.name === 'From')?.value,
            subject: emailDetailsResponse.data.payload.headers.find(header => header.name === 'Subject')?.value || '(No Subject)',
            date: emailDetailsResponse.data.payload.headers.find(header => header.name === 'Date')?.value,
            starred: emailDetailsResponse.data.labelIds?.includes('STARRED') || false,
            body: body,
          attachments: fetchedAttachments,
          labels: emailDetailsResponse.data.labelIds || [],
          };
          // Assign category using AI
          emailObj.category = await categorizeEmailAI(emailObj);
          // Ensure priority property exists (preserve if already present)
          emailObj.priority = false;
          return emailObj;
        });
        const details = await Promise.all(emailDetailsPromises);
      setEmails(prev => append ? [...prev, ...details] : details);
      setNextPageToken(response.data.nextPageToken || null);
      setAllLoaded(!response.data.nextPageToken);
        setError(null);
      } catch (err) {
        console.error('Error fetching emails:', err);
        setError('Failed to fetch emails.');
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchEmails();
    // eslint-disable-next-line
  }, [accessToken]);

  useEffect(() => {
    const fetchLabels = async () => {
      if (accessToken) {
        try {
          const response = await axios.get('https://www.googleapis.com/gmail/v1/users/me/labels', {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          setLabels(response.data.labels.filter(label => label.type === 'user' || label.type === 'system'));
        } catch (err) {
          console.error('Error fetching labels:', err);
          setError('Failed to fetch labels.');
        }
      }
    };

    fetchLabels();
  }, [accessToken]);

  useEffect(() => {
    if (emails.length > 0 && !selectedEmail) {
      setSelectedEmail(emails[0]);
      setEmailWindowOpen(true);
    }
  }, [emails, selectedEmail]);

  useEffect(() => {
    document.body.classList.toggle('light-theme', !darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handleSendEmail = async (emailData) => {
    try {
      const message = [
        'Content-Type: text/plain; charset="UTF-8"\n',
        'MIME-Version: 1.0\n',
        `To: ${emailData.to}\n`,
        `Subject: ${emailData.subject}\n\n`,
        emailData.body,
      ].join('');

      const encodedMessage = btoa(message).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      await axios.post(
        'https://www.googleapis.com/gmail/v1/users/me/messages/send',
        { raw: encodedMessage },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    } catch (err) {
      console.error('Error sending email:', err);
      setError('Failed to send email.');
    }
  };

  const handleAddLabel = async (labelName) => {
    try {
      const response = await axios.post(
        'https://www.googleapis.com/gmail/v1/users/me/labels',
        {
          name: labelName,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show',
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      setLabels([...labels, response.data]);
    } catch (err) {
      console.error('Error creating label:', err);
      setError('Failed to create label.');
    }
  };

  const handleDeleteLabel = async (labelId) => {
    try {
      await axios.delete(
        `https://www.googleapis.com/gmail/v1/users/me/labels/${labelId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      setLabels(labels.filter(label => label.id !== labelId));
    } catch (err) {
      console.error('Error deleting label:', err);
      setError('Failed to delete label.');
    }
  };

  const handleUpdateLabel = async (oldLabel, newName) => {
    try {
      const response = await axios.patch(
        `https://www.googleapis.com/gmail/v1/users/me/labels/${oldLabel.id}`,
        {
          name: newName,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      setLabels(labels.map(label => 
        label.id === oldLabel.id ? response.data : label
      ));
    } catch (err) {
      console.error('Error updating label:', err);
      setError('Failed to update label.');
    }
  };

  const handleStarEmail = (email) => {
    setEmails(prev =>
      prev.map(e =>
        e.id === email.id ? { ...e, starred: !e.starred } : e
      )
    );
  };

  const handleAddLabelToEmail = async (email, labelId) => {
    try {
      await axios.post(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${email.id}/modify`,
        {
          addLabelIds: [labelId],
          removeLabelIds: [],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      setEmails(emails.map(e => 
        e.id === email.id && !e.labels.includes(labelId)
          ? { ...e, labels: [...e.labels, labelId] }
          : e
      ));
    } catch (err) {
      console.error('Error adding label to email:', err);
      setError('Failed to add label to email.');
    }
  };

  const handleRemoveLabelFromEmail = async (email, labelId) => {
    try {
      await axios.post(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${email.id}/modify`,
        {
          addLabelIds: [],
          removeLabelIds: [labelId],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      setEmails(emails.map(e => 
        e.id === email.id
          ? { ...e, labels: e.labels.filter(l => l !== labelId) }
          : e
      ));
    } catch (err) {
      console.error('Error removing label from email:', err);
      setError('Failed to remove label from email.');
    }
  };

  const handleEmailDelete = async (email) => {
    try {
      await axios.post(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${email.id}/modify`,
        {
          addLabelIds: ['TRASH'],
          removeLabelIds: [],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      setEmails(emails.map(e =>
        e.id === email.id
          ? { ...e, labels: [...(e.labels.filter(l => l !== 'INBOX')), 'TRASH'] }
          : e
      ));
      showNotification('Email moved to Trash', 'success');
    } catch (err) {
      console.error('Error deleting email:', err);
      setError('Failed to delete email.');
      showNotification('Failed to delete email', 'error');
    }
  };

  const handleEmailArchive = async (email) => {
    try {
      await axios.post(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${email.id}/modify`,
        {
          removeLabelIds: ['INBOX'],
          addLabelIds: [],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      setEmails(emails.map(e =>
        e.id === email.id
          ? { ...e, labels: e.labels.filter(l => l !== 'INBOX') }
          : e
      ));
    } catch (err) {
      console.error('Error archiving email:', err);
      setError('Failed to archive email.');
    }
  };

  const categoryList = [
    { text: 'Work', color: '#1976d2' },
    { text: 'Finance', color: '#388e3c' },
    { text: 'Promotions', color: '#fbc02d' },
    { text: 'Personal', color: '#8e24aa' },
    { text: 'Meetings', color: '#0288d1' },
    { text: 'Other', color: '#757575' },
  ];

  const menuItems = [
    { text: 'Inbox', icon: <Inbox /> },
    { text: 'Sent', icon: <Send /> },
    { text: 'Starred', icon: <Star /> },
    { text: 'Priority', icon: <Flag style={{ color: '#e53935' }} /> },
    { text: 'Marked', icon: <Star style={{ color: '#fbc02d', marginRight: 2 }} /> },
    { text: 'Archive', icon: <Archive /> },
    { text: 'Trash', icon: <Delete /> },
    { text: 'Spam', icon: <Report /> },
    // Add category filters
    ...categoryList.map(cat => ({
      text: cat.text,
      icon: <Label style={{ color: cat.color }} />
    })),
  ];

  const getFilteredEmails = () => {
    if (labels.some(l => l.id === selectedTab)) {
      return emails.filter(email => email.labels?.includes(selectedTab));
    }
    switch (selectedTab) {
      case 'Inbox':
        return emails.filter(email => email.labels?.includes('INBOX'));
      case 'Sent':
        return emails.filter(email => email.labels?.includes('SENT'));
      case 'Starred':
        return emails.filter(email => email.starred);
      case 'Priority':
        return emails.filter(email => email.priority);
      case 'Marked':
        return emails.filter(email => email.starred || email.priority);
      case 'Archive':
        return emails.filter(email => !email.labels?.includes('INBOX') && !email.labels?.includes('SENT') && !email.labels?.includes('TRASH') && !email.labels?.includes('SPAM'));
      case 'Trash':
        return emails.filter(email => email.labels?.includes('TRASH'));
      case 'Spam':
        return emails.filter(email => email.labels?.includes('SPAM'));
      // Category filters
      case 'Work':
      case 'Finance':
      case 'Promotions':
      case 'Personal':
      case 'Meetings':
      case 'Other':
        return emails.filter(email => email.category === selectedTab);
      default:
        return emails;
    }
  };

  const handleExtractJson = async (emailText) => {
    // Simple JSON extraction without AI
    try {
      const jsonData = {
        sender: emailText.from,
        recipient: 'me',
        subject: emailText.subject,
        date: emailText.date,
        summary: emailText.body || '',
        action_items: [],
        sentiment: 'neutral'
      };
      setJsonData(jsonData);
      setJsonModalOpen(true);
    } catch (err) {
      setJsonError('Failed to process email data');
      setJsonModalOpen(true);
    }
  };

  // Summarization function using local Flask API
  const summarizeWithLocalAPI = async (text, detail = 'short') => {
    try {
      const response = await fetch('http://localhost:5000/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, detail }),
      });
      const data = await response.json();
      return data.summary || data.error || 'No summary available.';
    } catch (e) {
      return 'Failed to connect to local AI server.';
    }
  };

  const handleSummarize = async () => {
    if (!selectedEmail) return;
    setSummarizing(true);
    setSummary('');
    let plainText = stripHtml(selectedEmail.body);
    if (!plainText || plainText.trim().length < 30) {
      setSummary('Email is too short to summarize.');
      setSummarizing(false);
      return;
    }
    if (plainText.length > 2000) {
      plainText = plainText.slice(0, 2000);
    }
    const summaryText = await summarizeWithLocalAPI(plainText, summaryDetail);
    setSummary(summaryText);
    setSummarizing(false);
  };

  const handleDeleteAllLabels = async () => {
    // Only delete user and category labels, not system labels
    const userLabels = labels.filter(l => l.type === 'user' || l.type === 'category');
    for (const label of userLabels) {
      await handleDeleteLabel(label.id);
    }
    // Refetch labels after deletion
    if (accessToken) {
      try {
        const response = await axios.get('https://www.googleapis.com/gmail/v1/users/me/labels', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        setLabels(response.data.labels.filter(label => label.type === 'user' || label.type === 'system' || label.type === 'category'));
      } catch (err) {
        setError('Failed to fetch labels.');
      }
    }
  };

  // Add handlers for theme toggle, settings, and profile
  const handleThemeToggle = () => setDarkMode((prev) => !prev);
  const handleSettingsClick = (event) => setSettingsAnchorEl(event.currentTarget);
  const handleSettingsClose = () => setSettingsAnchorEl(null);
  const handleProfileClick = (event) => setProfileAnchorEl(event.currentTarget);
  const handleProfileClose = () => setProfileAnchorEl(null);

  // Group emails by threadId for the email list
  function groupEmailsByThread(emails) {
    const threads = {};
    emails.forEach(email => {
      if (!threads[email.threadId]) threads[email.threadId] = [];
      threads[email.threadId].push(email);
    });
    // Sort each thread by date (newest last)
    Object.values(threads).forEach(thread => thread.sort((a, b) => new Date(a.date) - new Date(b.date)));
    return threads;
  }

  const allAttachments = getThreadAttachments(selectedEmail, emails);

  // Get the current filtered email list (flat, not threads)
  const filteredEmails = useMemo(() => getFilteredEmails(), [emails, selectedTab, labels]);
  const currentEmailIndex = selectedEmail ? filteredEmails.findIndex(e => e.id === selectedEmail.id) : -1;
  const handlePrevEmail = () => {
    if (currentEmailIndex > 0) setSelectedEmail(filteredEmails[currentEmailIndex - 1]);
  };
  const handleNextEmail = () => {
    if (currentEmailIndex < filteredEmails.length - 1) setSelectedEmail(filteredEmails[currentEmailIndex + 1]);
  };

  // When an email is selected, open the window
  const handleEmailSelect = (email) => {
    setSelectedEmail(email);
    setEmailWindowOpen(true);
  };

  const handleMarkAsSpam = async (email) => {
    try {
      await axios.post(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${email.id}/modify`,
        {
          addLabelIds: ['SPAM'],
          removeLabelIds: [],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      setEmails(emails.map(e =>
        e.id === email.id
          ? { ...e, labels: [...(e.labels.filter(l => l !== 'INBOX')), 'SPAM'] }
          : e
      ));
    } catch (err) {
      setError('Failed to mark email as spam.');
    }
  };

  const handleAssistantOpen = () => setAssistantOpen(true);
  const handleAssistantClose = () => setAssistantOpen(false);

  const handleAssistantSearch = async () => {
    setAiLoading(prev => ({ ...prev, assistant: true }));
    try {
      const result = await aiService.assistantSearch(assistantQuery, emails);
      if (result.emails && Array.isArray(result.emails)) {
        setAssistantResults(result.emails.map(email => ({
          id: email.id,
          subject: email.subject,
          snippet: email.snippet
        })));
      } else {
        setAssistantResults([{ 
          id: 'ai', 
          subject: 'AI Result', 
          snippet: result.result || 'No results found.' 
        }]);
      }
    } catch (e) {
      setAssistantResults([{ 
        id: 'ai', 
        subject: 'Error', 
        snippet: e.message || 'Failed to connect to AI server.' 
      }]);
    } finally {
      setAiLoading(prev => ({ ...prev, assistant: false }));
    }
  };

  const handleMarkReadUnread = (email, unread) => {
    setEmails(prev =>
      prev.map(e =>
        e.id === email.id ? { ...e, unread } : e
      )
    );
  };

  // Helper: get sentiment counts for all emails
  const getSentimentCounts = () => {
    let positive = 0, neutral = 0, negative = 0;
    emails.forEach(e => {
      const s = sentiment.analyze(e.body || '');
      if (s.score > 1) positive++;
      else if (s.score < -1) negative++;
      else neutral++;
    });
    return [
      { name: 'Positive', value: positive },
      { name: 'Neutral', value: neutral },
      { name: 'Negative', value: negative },
    ];
  };
  const recentAttachments = emails
    .flatMap(e => (e.attachments || []).map(att => ({ ...att, email: e })))
    .slice(-6)
    .reverse();

  // To-Do List state with persistence
  function loadTodos() {
    try {
      const data = localStorage.getItem('todoList');
      if (!data) return [];
      // Decrypt
      const bytes = CryptoJS.AES.decrypt(data, 'your-strong-secret-key');
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return decrypted ? JSON.parse(decrypted) : [];
    } catch {
      return [];
    }
  }
  const [todoList, setTodoList] = useState(loadTodos());
  useEffect(() => {
    // Encrypt before saving
    const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(todoList), 'your-strong-secret-key').toString();
    localStorage.setItem('todoList', ciphertext);
  }, [todoList]);

  const [newTask, setNewTask] = useState('');

  function handleAddTask(e) {
    e.preventDefault();
    const task = newTask.trim();
    if (!task) return;
    setTodoList([...todoList, { text: task, completed: false }]);
    setNewTask('');
  }
  function handleToggleTask(idx) {
    setTodoList(todoList.map((t, i) => i === idx ? { ...t, completed: !t.completed } : t));
  }
  function handleDeleteTask(idx) {
    setTodoList(todoList.filter((_, i) => i !== idx));
    showNotification('Task deleted', 'success');
  }
  function handleClearCompleted() {
    setTodoList(todoList.filter(t => !t.completed));
  }

  const gridLayouts = {
    lg: [
      { i: 'emaillist', x: 0, y: 0, w: 5, h: 10, minW: 4, minH: 8, isResizable: true, static: false }, // Increased width from 3 to 5
      { i: 'emaildetails', x: 5, y: 0, w: 5, h: 10, minW: 3, minH: 8, isResizable: true, static: false }, // Adjusted to fit
      { i: 'attachments', x: 10, y: 0, w: 2, h: 4, isResizable: true, static: false },
      { i: 'contacts', x: 10, y: 4, w: 2, h: 4, isResizable: true, static: false },
      { i: 'todo', x: 10, y: 8, w: 2, h: 4, minW: 2, minH: 3, isResizable: true, static: false },
      { i: 'summary', x: 0, y: 10, w: 2, h: 4, isResizable: true, static: false },
      { i: 'ai', x: 2, y: 14, w: 2, h: 4, isResizable: true, static: false },
      { i: 'ai-reply', x: 4, y: 14, w: 2, h: 4, minW: 2, minH: 4 },
      { i: 'ai-correction', x: 6, y: 14, w: 2, h: 4, minW: 2, minH: 4 }
    ]
  };

  const imageAttachments = recentAttachments.filter(att => att.mimeType && att.mimeType.startsWith('image/'));
  const pdfAttachments = recentAttachments.filter(att => att.mimeType === 'application/pdf');

  function handleAttachmentClick(att, idx) {
    if (att.mimeType && att.mimeType.startsWith('image/')) {
      setAttachmentModal({ open: true, type: 'image', src: `data:${att.mimeType};base64,${att.data}`, filename: att.filename, index: idx });
    } else if (att.mimeType === 'application/pdf') {
      setAttachmentModal({ open: true, type: 'pdf', src: `data:${att.mimeType};base64,${att.data}`, filename: att.filename, index: idx });
    }
  }
  function handleAttachmentModalClose() {
    setAttachmentModal({ open: false, type: '', src: '', filename: '', index: 0 });
  }
  function handlePrevImage() {
    const prevIdx = (attachmentModal.index - 1 + imageAttachments.length) % imageAttachments.length;
    const att = imageAttachments[prevIdx];
    setAttachmentModal({ open: true, type: 'image', src: `data:${att.mimeType};base64,${att.data}`, filename: att.filename, index: prevIdx });
  }
  function handleNextImage() {
    const nextIdx = (attachmentModal.index + 1) % imageAttachments.length;
    const att = imageAttachments[nextIdx];
    setAttachmentModal({ open: true, type: 'image', src: `data:${att.mimeType};base64,${att.data}`, filename: att.filename, index: nextIdx });
  }
  function formatFileSize(size) {
    if (!size) return '';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Add a function to toggle priority
  function handleTogglePriority(email) {
    setEmails(prev => prev.map(e => e.id === email.id ? { ...e, priority: !e.priority } : e));
  }

  // Helper to show notification
  const showNotification = (message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  };

  // Show notification for general errors
  useEffect(() => {
    if (error) {
      showNotification(error, 'error');
    }
    // eslint-disable-next-line
  }, [error]);

  const handleSmartReply = (replyText) => {
    if (!selectedEmail) return;
    setComposePrefill({
      to: selectedEmail.from || '',
      subject: selectedEmail.subject ? 'Re: ' + selectedEmail.subject : '',
      body: replyText,
    });
    setComposeOpen(true);
  };

  const [smartReplyTone, setSmartReplyTone] = useState('Friendly');

  const smartReplyCache = useRef({});
  const [copyFeedback, setCopyFeedback] = useState('');

  // Debounced smart reply fetch
  const fetchSmartReplies = async (emailId, tone) => {
    const key = `${emailId}_${tone}`;
    if (smartReplyCache.current[key]) {
      setSmartReplies(smartReplyCache.current[key]);
      return;
    }
    setSmartRepliesLoading(true);
    setSmartReplies([]);
    try {
      const response = await fetch('http://localhost:5000/api/smart-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: selectedEmail.body, tone }),
      });
      const data = await response.json();
      if (data && Array.isArray(data.replies)) {
        smartReplyCache.current[key] = data.replies;
        setSmartReplies(data.replies);
      } else {
        setSmartReplies([]);
      }
    } catch {
      setSmartReplies([]);
    }
    setSmartRepliesLoading(false);
  };

  const debouncedFetchSmartReplies = useMemo(() => debounce(fetchSmartReplies, 400), [selectedEmail]);

  const handleToneChange = (tone) => {
    setSmartReplyTone(tone);
    if (selectedEmail) debouncedFetchSmartReplies(selectedEmail.id, tone);
  };

  const handleRegenerateSmartReplies = () => {
    if (selectedEmail) {
      const key = `${selectedEmail.id}_${smartReplyTone}`;
      delete smartReplyCache.current[key];
      fetchSmartReplies(selectedEmail.id, smartReplyTone);
    }
  };

  // Debounced AI Assistant search
  const debouncedAssistantSearch = useMemo(() => debounce(handleAssistantSearch, 400), [assistantQuery, emails]);

  // Copy feedback
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback('Copied!');
    setTimeout(() => setCopyFeedback(''), 1500);
  };

  // Sidebar open/collapse state
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Only show system folders in the sidebar
  const systemMenuItems = [
    { text: 'Inbox', icon: <Inbox /> },
    { text: 'Sent', icon: <Send /> },
    { text: 'Starred', icon: <Star /> },
    { text: 'Priority', icon: <Flag style={{ color: '#e53935' }} /> },
    { text: 'Marked', icon: <Star style={{ color: '#fbc02d', marginRight: 2 }} /> },
    { text: 'Archive', icon: <Archive /> },
    { text: 'Trash', icon: <Delete /> },
    { text: 'Spam', icon: <Report /> },
  ];

  // Helper to highlight search terms
  function highlightText(text, term) {
    if (!term) return text;
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.split(regex).map((part, i) =>
      regex.test(part) ? <span key={i} style={{ background: '#ffe082', color: '#23262F', borderRadius: 2 }}>{part}</span> : part
    );
  }

  const SESSION_TIMEOUT_MINUTES = 15;
  const SESSION_TIMEOUT_MS = SESSION_TIMEOUT_MINUTES * 60 * 1000;
  let sessionTimeoutId = null;

  // Function to clear sensitive data and log out
  function handleSessionTimeout() {
    setAccessToken(null);
    setEmails([]);
    setImportantContacts([]);
    setNotification({ open: true, message: 'Session expired due to inactivity.', severity: 'warning' });
    // Optionally, redirect to login or show a lock screen
  }

  // Reset session timer on user activity
  function resetSessionTimer() {
    if (sessionTimeoutId) clearTimeout(sessionTimeoutId);
    sessionTimeoutId = setTimeout(handleSessionTimeout, SESSION_TIMEOUT_MS);
  }

  useEffect(() => {
    // Listen for user activity
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetSessionTimer));
    resetSessionTimer();
    return () => {
      events.forEach(event => window.removeEventListener(event, resetSessionTimer));
      if (sessionTimeoutId) clearTimeout(sessionTimeoutId);
    };
  }, []);

  // Adaugă aceste declarații la începutul componentei App, după declarațiile de state existente
  const [summaryDetail, setSummaryDetail] = useState('short');
  const [threadEmails, setThreadEmails] = useState([]);

  // Adaugă funcția stripHtmlTags
  const stripHtmlTags = (html) => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Adaugă funcția handleSummarizeThread
  const handleSummarizeThread = async (emails) => {
    if (!emails || emails.length === 0) return;
    setSmartRepliesLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/summarize-thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          emails: emails.map(email => ({
            subject: email.subject,
            body: stripHtmlTags(email.body),
            date: email.date
          }))
        }),
      });
      const data = await response.json();
      if (data && data.summary) {
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error summarizing thread:', error);
    }
    setSmartRepliesLoading(false);
  };

  // Adaugă funcția handleSummarizeAttachment
  const handleSummarizeAttachment = async (attachment) => {
    if (!attachment) return;
    setSmartRepliesLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/summarize-attachment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          attachment: {
            name: attachment.name,
            type: attachment.type,
            content: attachment.content
          }
        }),
      });
      const data = await response.json();
      if (data && data.summary) {
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error summarizing attachment:', error);
    }
    setSmartRepliesLoading(false);
  };

  // Add state for AI reply preview and modal
  const [aiReplyPreview, setAiReplyPreview] = useState('');
  const [aiReplyModalOpen, setAiReplyModalOpen] = useState(false);

  // Add state for AI Reply Correction widget
  const [aiCorrectionInput, setAiCorrectionInput] = useState('');
  const [aiCorrectionResult, setAiCorrectionResult] = useState('');
  const [aiCorrectionLoading, setAiCorrectionLoading] = useState(false);
  const [aiCorrectionTone, setAiCorrectionTone] = useState('Friendly');

  const handleAICorrectReply = async () => {
    setAiLoading(prev => ({ ...prev, correction: true }));
    setAiCorrectionResult('');
    
    try {
      const result = await aiService.correctReply(aiCorrectionInput, aiCorrectionTone);
      if (result && result.corrected) {
        setAiCorrectionResult(result.corrected);
      } else {
        throw new Error('Failed to correct reply');
      }
    } catch (e) {
      showNotification(e.message || 'Error correcting reply.', 'error');
    } finally {
      setAiLoading(prev => ({ ...prev, correction: false }));
    }
  };

  const [smartReplyLoading, setSmartReplyLoading] = useState(false);
  const [smartReplyResult, setSmartReplyResult] = useState('');
  const handleGenerateSmartReply = async () => {
    if (!selectedEmail) {
      showNotification('Please select an email first.', 'warning');
      return;
    }
    
    setAiLoading(prev => ({ ...prev, smartReply: true }));
    setSmartReplyResult('');
    
    try {
      const result = await aiService.smartReply(selectedEmail.body, 'Friendly');
      if (result && result.replies && result.replies.length > 0) {
        setSmartReplyResult(result.replies[0]);
      } else {
        throw new Error('No reply generated');
      }
    } catch (e) {
      console.error('Smart reply error:', e);
      showNotification(e.message || 'Error generating smart reply.', 'error');
    } finally {
      setAiLoading(prev => ({ ...prev, smartReply: false }));
    }
};

  // Add consolidated AI loading state
  const [aiLoading, setAiLoading] = useState({
    smartReply: false,
    correction: false,
    assistant: false
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: 'flex',
          height: '100vh',
          background: darkMode ? '#111' : '#fff',
        }}
      >
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, background: '#23262F', color: '#F4F4F5', boxShadow: '0 2px 8px 0 #0001', borderBottom: '1px solid #22242A', height: 64, justifyContent: 'center' }}>
          <Toolbar sx={{ minHeight: 64, px: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 0, mr: 3 }}>
              <EmojiNatureIcon sx={{ color: '#FFC107', fontSize: 32, mr: 1 }} />
              <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 900, color: '#e3e8ee', letterSpacing: 1, fontSize: 24 }}>
                PRIVATE AREA
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                placeholder="Search mail..."
                sx={{
                  bgcolor: '#20232A',
                  borderRadius: 4,
                  maxWidth: 480,
                  boxShadow: '0 1px 4px 0 #0001',
                  input: { color: '#F4F4F5', fontSize: 16, fontWeight: 500 },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { border: 'none' },
                  },
                }}
              />
            </Box>
            {!accessToken && (
            <Button
              variant="contained"
                onClick={googleLogin}
                sx={{ ml: 2, bgcolor: '#1976d2', color: '#fff', fontWeight: 700, borderRadius: 3, boxShadow: '0 2px 8px 0 #1976d211', textTransform: 'none', fontSize: 16, px: 3, py: 1.2, '&:hover': { bgcolor: '#1565c0' } }}
            >
                Sign in with Google
            </Button>
          )}
            <Tooltip title="Toggle Theme" placement="bottom"><IconButton color="inherit" sx={{ ml: 1 }} onClick={handleThemeToggle}>{darkMode ? <Brightness7 /> : <Brightness4 />}</IconButton></Tooltip>
            <Tooltip title="AI Search" placement="bottom"><IconButton color="inherit" sx={{ ml: 1 }} onClick={handleAssistantOpen}><SmartToy /></IconButton></Tooltip>
            <Tooltip title="GitHub Repository" placement="bottom"><IconButton color="inherit" sx={{ ml: 1 }} href="https://github.com/maximvoisan/mail-filter-app" target="_blank"><GitHub /></IconButton></Tooltip>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: sidebarOpen ? 72 : 0,
          flexShrink: 0,
          transition: 'width 0.2s',
          '& .MuiDrawer-paper': {
            width: sidebarOpen ? 72 : 0,
            background: 'rgba(34,39,54,0.85)',
            backdropFilter: 'blur(8px)',
            borderRight: 'none',
            boxShadow: '2px 0 12px 0 #0001',
            marginTop: '64px',
            color: '#F4F4F5',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pt: 2,
            transition: 'width 0.2s',
            overflowX: 'hidden',
          },
        }}
      >
        <List sx={{ pt: 0 }}>
          {systemMenuItems.map((item) => (
            <Tooltip title={item.text} placement="right" arrow key={item.text}>
              <ListItem
                button
                selected={selectedTab === item.text}
                onClick={() => setSelectedTab(item.text)}
                sx={{
                  justifyContent: 'center',
                  my: 1,
                  borderRadius: 2,
                  background: selectedTab === item.text ? 'linear-gradient(90deg, #2196f3 0%, #9c27b0 100%)' : 'none',
                  color: selectedTab === item.text ? '#fff' : '#90caf9',
                  transition: 'background 0.2s, color 0.2s',
                  minWidth: 0,
                  p: 0,
                  width: 48,
                  height: 48,
                  mx: 'auto',
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 0, justifyContent: 'center' }}>{item.icon}</ListItemIcon>
              </ListItem>
            </Tooltip>
          ))}
        </List>
        {/* Sidebar toggle button */}
        <Box sx={{ flexGrow: 1 }} />
        <Box sx={{ mb: 2 }}>
          <Tooltip title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'} placement="right">
            <IconButton onClick={() => setSidebarOpen(v => !v)} sx={{ color: '#90caf9', background: '#23262F', borderRadius: '50%', boxShadow: '0 2px 8px #0002' }}>
              {sidebarOpen ? '<' : '>'}
            </IconButton>
          </Tooltip>
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
            mt: '64px',
            backgroundColor: '#181A20',
            minHeight: '100vh',
            position: 'relative',
            overflow: 'auto',
            p: 4,
        }}
      >
          <ResponsiveGridLayout
            className="layout"
            layouts={gridLayouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 10, md: 8, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={50}
            isDraggable={true}
            isResizable={true}
            margin={[24, 32]}
            useCSSTransforms={true}
            draggableHandle=".widget-header"
            compactType="vertical"
            style={{ minHeight: 600 }}
          >
            <div key="emaillist" data-grid={{ x: 0, y: 0, w: 5, h: 10, minW: 4, minH: 8, isResizable: true, static: false }}>
              <Paper sx={{ borderRadius: 0, boxShadow: 'none', border: 'none', p: 0, height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0, margin: '0 0 16px 0', overflow: 'hidden' }}>
              <EmailList
                emails={filteredEmails}
                  onEmailSelect={handleEmailSelect}
                onStarEmail={handleStarEmail}
                  onEmailArchive={handleEmailArchive}
                  onEmailDelete={handleEmailDelete}
                  onMarkReadUnread={handleMarkReadUnread}
                  onExtractJson={handleMarkAsSpam}
                  selectedEmail={selectedEmail}
                  onTogglePriority={handleTogglePriority}
                  largeSubject={true}
              />
                {!allLoaded && (
                  <Box sx={{ textAlign: 'center', mt: 2 }}>
                    <Button variant="outlined" onClick={() => fetchEmails(nextPageToken, true)} disabled={loading}>
                      {loading ? 'Loading...' : 'Load More'}
                    </Button>
                  </Box>
                )}
            </Paper>
                </div>
            <div key="emaildetails" data-grid={{ x: 5, y: 0, w: 5, h: 10, minW: 3, minH: 8, isResizable: true, static: false }}>
              <Paper sx={{ borderRadius: 0, boxShadow: 'none', border: 'none', p: 0, height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0, margin: '0 0 16px 0', overflow: 'hidden' }}>
                {emailWindowOpen && selectedEmail && (
                  <DraggableEmailWindow
                    open={emailWindowOpen}
                    onClose={() => setEmailWindowOpen(false)}
                    email={selectedEmail}
                    handleSummarize={handleSummarize}
                    summarizing={summarizing}
                    summary={summary}
                    onSmartReply={handleSmartReply}
                    smartReplies={smartReplies}
                    smartRepliesLoading={smartRepliesLoading}
                    threadEmails={threadEmails}
                    onSummarizeThread={handleSummarizeThread}
                    threadSummarizing={threadSummarizing}
                    threadSummary={threadSummary}
                    onSummarizeAttachment={handleSummarizeAttachment}
                    attachmentSummaries={attachmentSummaries}
                    tone={smartReplyTone}
                    onToneChange={handleToneChange}
                    summaryDetail={summaryDetail}
                    onSummaryDetailChange={setSummaryDetail}
                    onReplyBasedOnSummary={handleSmartReply}
                    onTogglePriority={handleTogglePriority}
                    onStarEmail={handleStarEmail}
                    onEmailArchive={handleEmailArchive}
                    onEmailDelete={handleEmailDelete}
                    onExtractJson={handleMarkAsSpam}
                    onMarkReadUnread={handleMarkReadUnread}
                  />
                )}
              </Paper>
            </div>
            {showAttachments && (
              <div key="attachments" data-grid={{ x: 10, y: 0, w: 2, h: 4, isResizable: true, static: false }}>
                <WidgetCard
                  title={<Typography variant="h6" sx={{ fontWeight: 900, fontSize: 22, letterSpacing: 0.5, color: '#fff' }}>Recent Attachments</Typography>}
                  icon={<InsertDriveFileIcon sx={{ color: '#fff', mr: 1 }} />}
                  onHide={() => setShowAttachments(false)}
                >
                  <Box sx={{ p: 2, flex: 1, minHeight: 0, overflowY: 'auto', bgcolor: '#232b3b', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      {recentAttachments.length === 0 && <Typography color="textSecondary">No attachments</Typography>}
                      {recentAttachments.map((att, i) => {
                        const dataUrl = att.data ? `data:${att.mimeType};base64,${att.data}` : undefined;
                        const isImage = att.mimeType && att.mimeType.startsWith('image/');
                        const isPDF = att.mimeType === 'application/pdf';
                        return (
                          <Box key={i} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80 }}>
                            {dataUrl ? (
                              <a
                                href={dataUrl}
                                target={isImage ? '_blank' : undefined}
                                rel={isImage ? 'noopener noreferrer' : undefined}
                                download={!isImage ? att.filename : undefined}
                                style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
                                onClick={e => { e.preventDefault(); handleAttachmentClick(att, isImage ? imageAttachments.findIndex(a => a === att) : i); }}
                              >
                                {isImage ? (
                                  <img src={dataUrl} alt={att.filename} style={{ maxWidth: 60, maxHeight: 60, borderRadius: 4, marginBottom: 4, boxShadow: '0 2px 8px #0003', transition: 'box-shadow 0.2s' }} />
                                ) : isPDF ? (
                                  <InsertDriveFileIcon sx={{ fontSize: 40, color: '#90caf9', mb: 1 }} />
                                ) : (
                                  <InsertDriveFileIcon sx={{ fontSize: 40, color: '#90caf9', mb: 1 }} />
                                )}
                              </a>
                            ) : (
                              isImage ? (
                                <img src={dataUrl} alt={att.filename} style={{ maxWidth: 60, maxHeight: 60, borderRadius: 4, marginBottom: 4, boxShadow: '0 2px 8px #0003' }} />
                              ) : (
                                <InsertDriveFileIcon sx={{ fontSize: 40, color: '#90caf9', mb: 1 }} />
                              )
                            )}
                            <Typography variant="caption" sx={{ color: '#e3e8ee', textAlign: 'center', wordBreak: 'break-all', maxWidth: 80 }}>
                              {att.filename}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#90caf9', fontSize: 11 }}>
                              {att.mimeType && att.mimeType.split('/').pop().toUpperCase()} {att.size ? `· ${formatFileSize(att.size)}` : ''}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                </WidgetCard>
              </div>
            )}
            {showTodo && (
              <div key="todo" data-grid={{ x: 10, y: 8, w: 2, h: 4, minW: 2, minH: 3, isResizable: true, static: false }}>
                <WidgetCard
                  title={<Typography variant="h6" sx={{ fontWeight: 900, fontSize: 22, letterSpacing: 0.5, color: '#fff' }}>To-Do List</Typography>}
                  icon={<InsertDriveFileIcon sx={{ color: '#fff', mr: 1 }} />}
                  onHide={() => setShowTodo(false)}
                >
                  <Box sx={{ p: 2, flex: 1, minHeight: 0, overflowY: 'auto', bgcolor: '#232b3b', display: 'flex', flexDirection: 'column' }}>
                    <Box component="form" onSubmit={handleAddTask} sx={{ display: 'flex', mb: 2 }}>
                      <TextField
                        value={newTask}
                        onChange={e => setNewTask(e.target.value)}
                        size="small"
                        placeholder="Add a task..."
                        sx={{ flex: 1, mr: 1, bgcolor: '#20232A', borderRadius: 2, input: { color: '#F4F4F5' } }}
                      />
                      <Button type="submit" variant="contained" color="primary">Add</Button>
                    </Box>
                    <List sx={{ p: 0, flex: 1, minHeight: 0, overflowY: 'auto' }}>
                      {todoList.length === 0 && <Typography color="textSecondary">No tasks</Typography>}
                      {todoList.map((task, i) => (
                        <ListItem key={i} sx={{ color: '#e3e8ee', py: 0.5, px: 0, display: 'flex', alignItems: 'center' }}
                          secondaryAction={
                            <IconButton edge="end" color="error" size="small" onClick={() => handleDeleteTask(i)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          }
                        >
                          <Checkbox
                            checked={task.completed}
                            onChange={() => handleToggleTask(i)}
                            sx={{ color: '#2196f3', mr: 1 }}
                          />
                          <ListItemText
                            primary={
                              <span style={{ textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? '#888' : undefined }}>
                                {task.text}
                              </span>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                    {todoList.some(t => t.completed) && (
                      <Button onClick={handleClearCompleted} color="secondary" variant="outlined" size="small" sx={{ mt: 1 }}>
                        Clear Completed
                      </Button>
                    )}
                  </Box>
                </WidgetCard>
              </div>
            )}
            {showSummaryWidget && (
              <div key="summary" data-grid={{ x: 0, y: 10, w: 2, h: 4, isResizable: true, static: false }}>
                <WidgetCard
                  title="Summary"
                  icon={<SmartToy sx={{ color: '#fff', mr: 1 }} />}
                  onHide={() => setShowSummaryWidget(false)}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, p: 2 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleSummarize}
                      disabled={summarizing}
                      sx={{ width: '100%', fontWeight: 700, borderRadius: 3, textTransform: 'none', mb: 1 }}
                      startIcon={summarizing ? <CircularProgress size={20} color="inherit" /> : null}
                    >
                      {summarizing ? 'Summarizing...' : 'Summarize'}
                    </Button>
                    {summary && (
                      <Typography variant="body1" sx={{ color: '#fff', mt: 2, whiteSpace: 'pre-line', textAlign: 'center', border: '1px solid #2196f3', borderRadius: 2, p: 1, bgcolor: '#232b3b' }}>{summary}</Typography>
                    )}
                  </Box>
                </WidgetCard>
              </div>
            )}
            {showContacts && (
              <div key="contacts" data-grid={{ x: 10, y: 4, w: 2, h: 4, isResizable: true, static: false }}>
                <WidgetCard
                  title={<Typography variant="h6" sx={{ fontWeight: 900, fontSize: 22, letterSpacing: 0.5, color: '#fff' }}>Important Contacts</Typography>}
                  icon={<InsertDriveFileIcon sx={{ color: '#fff', mr: 1 }} />}
                  onHide={() => setShowContacts(false)}
                >
                  <Box sx={{ p: 2, flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <Box component="form" onSubmit={e => { e.preventDefault(); if (newContactName.trim() && newContactEmail.trim()) { setImportantContacts([...importantContacts, { name: newContactName.trim(), email: newContactEmail.trim(), count: 0 }]); setNewContactName(''); setNewContactEmail(''); } }} sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <TextField
                        value={newContactName}
                        onChange={e => setNewContactName(e.target.value)}
                        size="small"
                        placeholder="Name"
                        sx={{ flex: 1, bgcolor: '#20232A', borderRadius: 2, input: { color: '#F4F4F5' } }}
                      />
                      <TextField
                        value={newContactEmail}
                        onChange={e => setNewContactEmail(e.target.value)}
                        size="small"
                        placeholder="Email"
                        sx={{ flex: 1, bgcolor: '#20232A', borderRadius: 2, input: { color: '#F4F4F5' } }}
                      />
                      <Button type="submit" variant="contained" color="primary">Add</Button>
                    </Box>
                    <List sx={{ p: 0, flex: 1, minHeight: 0, overflowY: 'auto' }}>
                      {importantContacts.length === 0 && <Typography color="textSecondary">No important contacts</Typography>}
                      {importantContacts.map((c, i) => (
                        <ListItem key={i} sx={{ color: '#e3e8ee', py: 0.5, px: 0 }}
                          secondaryAction={
                            <IconButton edge="end" color="error" size="small" onClick={() => setImportantContacts(importantContacts.filter((_, idx) => idx !== i))}>
                              <Delete fontSize="small" />
                            </IconButton>
                          }
                        >
                          <Avatar sx={{ bgcolor: '#2196f3', color: '#fff', fontWeight: 700, width: 32, height: 32, mr: 1 }}>
                            {c.name ? c.name[0] : (c.email[0] || '?')}
                          </Avatar>
                          <ListItemText primary={c.name || c.email} secondary={c.email} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                </WidgetCard>
              </div>
            )}
            {showAI && (
              <div key="ai" data-grid={{ x: 2, y: 14, w: 2, h: 4, isResizable: true, static: false }}>
                <AIErrorBoundary>
                  <WidgetCard
                    title={<Typography variant="h6" sx={{ fontWeight: 900, fontSize: 22, letterSpacing: 0.5, color: '#fff' }}>AI Search</Typography>}
                    onHide={() => setShowAI(false)}
                    icon={<SmartToy />}
                  >
                    <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <TextField
                        fullWidth
                        variant="outlined"
                        placeholder="Search emails with AI..."
                        value={assistantQuery}
                        onChange={e => setAssistantQuery(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && debouncedAssistantSearch()}
                        sx={{ mb: 2 }}
                      />
                      <Button onClick={debouncedAssistantSearch} variant="contained" color="primary" sx={{ fontWeight: 700 }}>Search</Button>
                      <Box sx={{ mt: 2, flex: 1, overflowY: 'auto' }}>
                        {aiLoading.assistant ? (
                          <AILoadingState message="Searching through your emails..." />
                        ) : (
                          assistantResults.length === 0 && assistantQuery ? (
                            <Typography sx={{ color: '#A1A1AA', mt: 2 }}>
                              No results found.<br />
                              <span style={{ color: '#FFC107' }}>Tip: Try different keywords or check your spelling.</span>
                            </Typography>
                          ) : (
                            assistantResults.map(email => (
                              <Paper
                                key={email.id}
                                sx={{ mb: 2, p: 2, bgcolor: '#23262F', borderRadius: 2, cursor: 'pointer', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 4px 24px #2196f388', bgcolor: '#2a2f3d' }, overflow: 'auto' }}
                                onClick={() => {
                                  const found = emails.find(e => e.id === email.id);
                                  if (found) {
                                    setSelectedEmail(found);
                                    setEmailWindowOpen(true);
                                  }
                                }}
                                aria-label={`Open email: ${email.subject}`}
                              >
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#90caf9', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{highlightText(email.subject, assistantQuery)}</Typography>
                                {email.from && <Typography variant="caption" sx={{ color: '#bbb', display: 'block' }}>From: {email.from}</Typography>}
                                {email.date && <Typography variant="caption" sx={{ color: '#bbb', display: 'block' }}>Date: {email.date}</Typography>}
                                <Typography variant="body2" sx={{ color: '#A1A1AA', mb: 1, whiteSpace: 'pre-line', textOverflow: 'ellipsis', overflow: 'auto' }}>{highlightText(stripHtmlTags(email.snippet), assistantQuery)}</Typography>
                                <Button size="small" variant="outlined" color="primary" sx={{ ml: 1, minWidth: 32, fontWeight: 700 }} aria-label="Copy snippet" onClick={e => { e.stopPropagation(); handleCopy(stripHtmlTags(email.snippet)); }}>Copy</Button>
                                {email.links && email.links.length > 0 && (
                                  <Box sx={{ mt: 1 }}>
                                    <Typography variant="caption" sx={{ color: '#FFC107', fontWeight: 600 }}>Links:</Typography>
                                    {email.links.map((link, i) => (
                                      <Typography key={i} variant="caption" sx={{ display: 'block', color: '#90caf9', wordBreak: 'break-all' }}>
                                        <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: '#90caf9' }}>{link}</a>
                                      </Typography>
                                    ))}
                                  </Box>
                                )}
                              </Paper>
                            ))
                          )
                        )}
                      </Box>
                    </Box>
                  </WidgetCard>
                </AIErrorBoundary>
              </div>
            )}
            {showAIReply && (
              <div key="ai-reply" data-grid={{ x: 4, y: 14, w: 2, h: 4, minW: 2, minH: 4 }}>
              <WidgetCard
                title={<Typography variant="h6" sx={{ fontWeight: 900, fontSize: 22, letterSpacing: 0.5, color: '#fff' }}>AI Reply</Typography>}
                  onHide={() => setShowAIReply(false)}
                icon={<AutoAwesome />}
              >
                  <Box sx={{ p: 2, textAlign: 'center', maxHeight: 340, overflowY: 'auto' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleGenerateSmartReply}
                    disabled={aiLoading.smartReply}
                    sx={{ mb: 2, fontWeight: 700 }}
                  >
                    {aiLoading.smartReply ? 'Generating...' : 'Generate AI Reply'}
                  </Button>
                  {aiLoading.smartReply ? (
                    <AILoadingState message="Generating a smart reply..." />
                  ) : smartReplyResult && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: '#232b3b', borderRadius: 2, border: '1.5px solid #42a5f5' }}>
                      <Typography variant="subtitle2" sx={{ color: '#90caf9', mb: 1, fontWeight: 600 }}>AI Reply:</Typography>
                      <Typography variant="body2" sx={{ color: '#fff', fontSize: 15, whiteSpace: 'pre-line' }}>{smartReplyResult}</Typography>
                      <Button
                        variant="outlined"
                        color="secondary"
                        sx={{ mt: 1 }}
                        onClick={() => {
                          setComposePrefill({
                            to: selectedEmail.from || '',
                            subject: selectedEmail.subject ? 'Re: ' + selectedEmail.subject : '',
                            body: smartReplyResult,
                          });
                          setComposeOpen(true);
                          showNotification('AI reply moved to compose window!', 'success');
                        }}
                      >
                        Use Reply
                      </Button>
                    </Box>
                  )}
                </Box>
              </WidgetCard>
            </div>
            )}
            {showAICorrection && (
              <div key="ai-correction" data-grid={{ x: 6, y: 14, w: 2, h: 4, minW: 2, minH: 4 }}>
              <AIErrorBoundary>
                <WidgetCard
                  title={<Typography variant="h6" sx={{ fontWeight: 900, fontSize: 22, letterSpacing: 0.5, color: '#fff' }}>AI Correction</Typography>}
                    onHide={() => setShowAICorrection(false)}
                  icon={<Spellcheck />}
                >
                  <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <TextField
                      label="Your Draft Reply"
                      value={aiCorrectionInput}
                      onChange={e => setAiCorrectionInput(e.target.value)}
                      multiline
                      minRows={4}
                      fullWidth
                      variant="outlined"
                    />
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" sx={{ color: '#90caf9', fontWeight: 600 }}>Tone:</Typography>
                      <Button 
                        size="small" 
                        variant={aiCorrectionTone === 'Friendly' ? 'contained' : 'outlined'} 
                        sx={{ ml: 1 }} 
                        onClick={() => setAiCorrectionTone('Friendly')}
                      >
                        Friendly
                      </Button>
                      <Button 
                        size="small" 
                        variant={aiCorrectionTone === 'Formal' ? 'contained' : 'outlined'} 
                        sx={{ ml: 1 }} 
                        onClick={() => setAiCorrectionTone('Formal')}
                      >
                        Formal
                      </Button>
                      <Button 
                        size="small" 
                        variant={aiCorrectionTone === 'Concise' ? 'contained' : 'outlined'} 
                        sx={{ ml: 1 }} 
                        onClick={() => setAiCorrectionTone('Concise')}
                      >
                        Concise
                      </Button>
                    </Box>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleAICorrectReply}
                      disabled={aiLoading.correction || !aiCorrectionInput.trim()}
                    >
                      {aiLoading.correction ? 'Correcting...' : 'Correct with AI'}
                    </Button>
                    {aiLoading.correction ? (
                      <AILoadingState message="Improving your reply..." />
                    ) : aiCorrectionResult && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: '#232b3b', borderRadius: 2, border: '1.5px solid #42a5f5' }}>
                        <Typography variant="subtitle2" sx={{ color: '#90caf9', mb: 1, fontWeight: 600 }}>Corrected Reply:</Typography>
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-line', color: '#fff', fontSize: 16 }}>
                          {aiCorrectionResult}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </WidgetCard>
              </AIErrorBoundary>
            </div>
            )}
          </ResponsiveGridLayout>
          {/* Floating show widgets button/menu */}
          {( !showAttachments || !showSummaryWidget || !showAI || !showTodo || !showContacts ) && (
            <Box sx={{ position: 'fixed', bottom: 32, left: 32, zIndex: 2000 }}> {/* Bottom left corner */}
              <Button variant="contained" color="primary" startIcon={<VisibilityIcon />} onClick={e => setShowMenuAnchor(e.currentTarget)}>
                Boxes
              </Button>
              <Menu anchorEl={showMenuAnchor} open={Boolean(showMenuAnchor)} onClose={() => setShowMenuAnchor(null)}>
                {!showAttachments && <MenuItem onClick={() => { setShowAttachments(true); setShowMenuAnchor(null); }}>Show Attachments</MenuItem>}
                {!showSummaryWidget && <MenuItem onClick={() => { setShowSummaryWidget(true); setShowMenuAnchor(null); }}>Show Summary</MenuItem>}
                {!showAI && <MenuItem onClick={() => { setShowAI(true); setShowMenuAnchor(null); }}>Show AI Search</MenuItem>}
                {!showTodo && <MenuItem onClick={() => { setShowTodo(true); setShowMenuAnchor(null); }}>Show To-Do List</MenuItem>}
                {!showContacts && <MenuItem onClick={() => { setShowContacts(true); setShowMenuAnchor(null); }}>Show Contacts</MenuItem>}
              </Menu>
            </Box>
          )}
      </Box>

      <LabelManager
        open={labelManagerOpen}
        onClose={() => setLabelManagerOpen(false)}
        labels={labels}
        onAddLabel={handleAddLabel}
        onDeleteLabel={handleDeleteLabel}
        onUpdateLabel={handleUpdateLabel}
          onDeleteAllLabels={handleDeleteAllLabels}
      />

      <Dialog open={jsonModalOpen} onClose={() => setJsonModalOpen(false)} maxWidth="md" fullWidth>
        {jsonError ? (
          <pre style={{ padding: 24, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {jsonError}
          </pre>
        ) : (
          <pre style={{ padding: 24, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {JSON.stringify(jsonData, null, 2)}
          </pre>
        )}
      </Dialog>

        {/* AI Search Modal/Panel */}
        <Drawer
          anchor="right"
          open={assistantOpen}
          onClose={handleAssistantClose}
          sx={{ '& .MuiDrawer-paper': {
            width: 400,
            bgcolor: '#1a1d24',
            color: '#fff',
            borderLeft: '1px solid #333'
          }}}
        >
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', borderBottom: '1px solid #333' }}>
            <Typography variant="h6" sx={{ flex: 1, fontWeight: 700 }}>AI Search</Typography>
            <IconButton onClick={handleAssistantClose} sx={{ color: '#fff' }}><Close /></IconButton>
          </Box>
          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder="Ask or search for keywords..."
              value={assistantQuery}
              onChange={e => setAssistantQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAssistantSearch(); }}
              sx={{ mb: 2, bgcolor: '#20232A', borderRadius: 2, input: { color: '#F4F4F5' } }}
              InputProps={{
                endAdornment: (
                  <Button 
                    onClick={handleAssistantSearch} 
                    disabled={aiLoading.assistant || !assistantQuery} 
                    variant="contained" 
                    size="small"
                  >
                    {aiLoading.assistant ? 'Searching...' : 'Search'}
                  </Button>
                )
              }}
            />
            {aiLoading.assistant ? (
              <AILoadingState message="Searching through your emails..." />
            ) : (
              assistantResults.length === 0 && assistantQuery ? (
                <Typography sx={{ color: '#A1A1AA', mt: 2 }}>No results found.</Typography>
              ) : (
                assistantResults.map(email => (
                  <Paper
                    key={email.id}
                    sx={{ mb: 2, p: 2, bgcolor: '#23262F', borderRadius: 2, cursor: 'pointer', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 4px 24px #2196f388', bgcolor: '#2a2f3d' }, overflow: 'auto' }}
                    onClick={() => {
                      const found = emails.find(e => e.id === email.id);
                      if (found) {
                        setSelectedEmail(found);
                        setEmailWindowOpen(true);
                      }
                    }}
                    aria-label={`Open email: ${email.subject}`}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#90caf9', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{highlightText(email.subject, assistantQuery)}</Typography>
                    {email.from && <Typography variant="caption" sx={{ color: '#bbb', display: 'block' }}>From: {email.from}</Typography>}
                    {email.date && <Typography variant="caption" sx={{ color: '#bbb', display: 'block' }}>Date: {email.date}</Typography>}
                    <Typography variant="body2" sx={{ color: '#A1A1AA', mb: 1, whiteSpace: 'pre-line', textOverflow: 'ellipsis', overflow: 'auto' }}>{highlightText(stripHtmlTags(email.snippet), assistantQuery)}</Typography>
                    <Button size="small" variant="outlined" color="primary" sx={{ ml: 1, minWidth: 32, fontWeight: 700 }} aria-label="Copy snippet" onClick={e => { e.stopPropagation(); handleCopy(stripHtmlTags(email.snippet)); }}>Copy</Button>
                    {email.links && email.links.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" sx={{ color: '#FFC107', fontWeight: 600 }}>Links:</Typography>
                        {email.links.map((link, i) => (
                          <Typography key={i} variant="caption" sx={{ display: 'block', color: '#90caf9', wordBreak: 'break-all' }}>
                            <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: '#90caf9' }}>{link}</a>
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Paper>
                ))
              )
            )}
          </Box>
        </Drawer>

        {/* Attachment Preview Modal */}
        <Dialog open={attachmentModal.open} onClose={handleAttachmentModalClose} maxWidth="md" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
            {attachmentModal.filename}
            <IconButton onClick={handleAttachmentModalClose}><Close /></IconButton>
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: '#181A20', minHeight: 400 }}>
            {attachmentModal.type === 'image' && (
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'center', minHeight: 400, position: 'relative', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                  <Tooltip title="Previous image"><IconButton onClick={handlePrevImage} sx={{ mr: 3, fontSize: 32, color: '#90caf9', background: '#23262F', borderRadius: '50%', '&:hover': { background: '#1976d2', color: '#fff' }, p: 2 }} aria-label="Previous image">{'<'}</IconButton></Tooltip>
                  <img
                    src={attachmentModal.src}
                    alt={attachmentModal.filename}
                    style={{
                      maxWidth: '80vw',
                      maxHeight: '70vh',
                      borderRadius: 12,
                      boxShadow: '0 4px 24px #0008',
                      margin: '0 24px',
                      display: 'block',
                    }}
                  />
                  <Tooltip title="Next image"><IconButton onClick={handleNextImage} sx={{ ml: 3, fontSize: 32, color: '#90caf9', background: '#23262F', borderRadius: '50%', '&:hover': { background: '#1976d2', color: '#fff' }, p: 2 }} aria-label="Next image">{'>'}</IconButton></Tooltip>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, gap: 2 }}>
                  <Typography variant="caption" sx={{ color: '#e3e8ee' }}>{attachmentModal.filename}</Typography>
                  <Typography variant="caption" sx={{ color: '#90caf9', fontSize: 11 }}>
                    {(() => {
                      const att = imageAttachments[attachmentModal.index];
                      if (!att || !att.size) return '';
                      if (att.size < 1024) return `${att.size} B`;
                      if (att.size < 1024 * 1024) return `${(att.size / 1024).toFixed(1)} KB`;
                      return `${(att.size / (1024 * 1024)).toFixed(1)} MB`;
                    })()}
                  </Typography>
                  <Tooltip title="Download image"><IconButton component="a" href={attachmentModal.src} download={attachmentModal.filename} sx={{ color: '#2196f3', ml: 1 }}><InsertDriveFile /></IconButton></Tooltip>
                </Box>
              </Box>
            )}
            {attachmentModal.type === 'pdf' && (
              <Box sx={{ width: '100%', height: 600 }}>
                <object data={attachmentModal.src} type="application/pdf" width="100%" height="100%">
                  <p>PDF preview not supported. <a href={attachmentModal.src} download={attachmentModal.filename}>Download PDF</a></p>
                </object>
              </Box>
            )}
          </DialogContent>
        </Dialog>

        <ComposeEmail
          open={composeOpen}
          onClose={() => setComposeOpen(false)}
          onSend={handleSendEmail}
          prefill={composePrefill}
        />

        {/* Floating Compose Button */}
        <Tooltip title="Compose Email" placement="left">
          <Fab
            color="primary"
            aria-label="compose"
            sx={{
              position: 'fixed',
              bottom: 32,
              right: 32,
              zIndex: 2000,
              boxShadow: '0 4px 24px #2196f388',
              background: 'linear-gradient(135deg, #2196f3 0%, #9c27b0 100%)',
            }}
            onClick={() => setComposeOpen(true)}
          >
            <Add />
          </Fab>
        </Tooltip>

        {/* Snackbar Notification */}
        <Snackbar
          open={notification.open}
          autoHideDuration={3500}
          onClose={() => setNotification({ ...notification, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <MuiAlert
            onClose={() => setNotification({ ...notification, open: false })}
            severity={notification.severity}
            sx={{ width: '100%' }}
            elevation={6}
            variant="filled"
          >
            {notification.message}
          </MuiAlert>
        </Snackbar>

        {/* AI Reply Preview Modal */}
        <Dialog open={aiReplyModalOpen} onClose={() => setAiReplyModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>AI Generated Reply</DialogTitle>
          <DialogContent>
            <TextField
              value={aiReplyPreview}
              onChange={e => setAiReplyPreview(e.target.value)}
              multiline
              minRows={6}
              fullWidth
              variant="outlined"
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button onClick={() => setAiReplyModalOpen(false)} color="secondary" variant="outlined">Cancel</Button>
              <Button onClick={() => {
                setComposePrefill({
                  to: selectedEmail.from || '',
                  subject: selectedEmail.subject ? 'Re: ' + selectedEmail.subject : '',
                  body: aiReplyPreview,
                });
                setComposeOpen(true);
                setAiReplyModalOpen(false);
                showNotification('AI reply moved to compose window!', 'success');
              }} color="primary" variant="contained">Use Reply</Button>
            </Box>
          </DialogContent>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
};

const AppWrapper = () => (
  <GoogleOAuthProvider clientId="106794135380-9j6ahfrekahtdoom51rlcq44ltd7empk.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
);

const Dashboard = ({
  emails,
  onEmailSelect,
  onLabelAdd,
  onEmailDelete,
  onEmailArchive,
  onStarEmail,
  onExtractJson,
  selectedEmail,
  labels,
  onAddLabel,
  onDeleteLabel,
  onUpdateLabel,
  composeOpen,
  setComposeOpen,
  labelManagerOpen,
  setLabelManagerOpen,
  onSend,
  onMarkReadUnread,
}) => {
  // Layout: [x, y, w, h]
  const layout = [
    { i: 'emailList', x: 0, y: 0, w: 4, h: 12 },
    { i: 'emailDetails', x: 4, y: 0, w: 8, h: 12 },
    { i: 'labels', x: 0, y: 12, w: 4, h: 6 },
    { i: 'compose', x: 4, y: 12, w: 8, h: 6 },
  ];

  return (
    <GridLayout
      className="layout"
      layout={layout}
      cols={12}
      rowHeight={30}
      width={1200}
      draggableHandle=".panel-header"
    >
      <div key="emailList" className="panel">
        <div className="panel-header">Email List</div>
        <EmailList
          emails={emails}
          onEmailSelect={onEmailSelect}
          onStarEmail={onStarEmail}
          onEmailArchive={onEmailArchive}
          onEmailDelete={onEmailDelete}
          onMarkReadUnread={onMarkReadUnread}
          onExtractJson={onExtractJson}
          selectedEmail={selectedEmail}
        />
      </div>
      <div key="emailDetails" className="panel">
        <div className="panel-header">Email Details</div>
        {selectedEmail ? (
          <div>
            <h3>{selectedEmail.subject}</h3>
            <p>From: {selectedEmail.from}</p>
            <p>Date: {selectedEmail.date}</p>
          </div>
        ) : (
          <Typography color="textSecondary">Select an email to view details</Typography>
        )}
      </div>
      <div key="labels" className="panel">
        <div className="panel-header">Labels</div>
        <LabelManager
          open={labelManagerOpen}
          onClose={() => setLabelManagerOpen(false)}
          labels={labels}
          onAddLabel={onAddLabel}
          onDeleteLabel={onDeleteLabel}
          onUpdateLabel={onUpdateLabel}
        />
      </div>
      <div key="compose" className="panel">
        <div className="panel-header">Compose Email</div>
        <ComposeEmail
          open={composeOpen}
          onClose={() => setComposeOpen(false)}
          onSend={onSend}
        />
      </div>
    </GridLayout>
  );
};

function getEmailBodyAndAttachments(payload, attachments = []) {
  let body = '';
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.filename && part.body && part.body.attachmentId) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType,
          attachmentId: part.body.attachmentId,
        });
      }
      const result = getEmailBodyAndAttachments(part, attachments);
      if (result.body) body = result.body;
    }
  }
  if (
    (payload.mimeType === 'text/plain' || payload.mimeType === 'text/html') &&
    payload.body &&
    payload.body.data
  ) {
    const b64 = payload.body.data.replace(/-/g, '+').replace(/_/g, '/');
    try {
      body = decodeURIComponent(
        atob(b64)
          .split('')
          .map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join('')
      );
    } catch (e) {
      body = atob(b64);
    }
  }
  return { body, attachments };
}

export default AppWrapper;
import axios from 'axios';

const API_URL = process.env.REACT_APP_AI_API_URL || 'http://localhost:5000';

// Cache implementation
class AICache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  set(key, value, ttl = 300000) { // 5 minutes default TTL
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  clear() {
    this.cache.clear();
  }
}

const aiCache = new AICache();

// API client with error handling
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  response => response,
  error => {
    const errorMessage = error.response?.data?.error || error.message;
    console.error('AI API Error:', errorMessage);
    throw new Error(errorMessage);
  }
);

export const aiService = {
  async smartReply(text, tone) {
    const cacheKey = `smart_reply_${text}_${tone}`;
    const cached = aiCache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiClient.post('/api/smart-reply', { text, tone });
      const result = response.data;
      aiCache.set(cacheKey, result);
      return result;
    } catch (error) {
      throw new Error(`Smart reply failed: ${error.message}`);
    }
  },

  async correctReply(text, tone) {
    const cacheKey = `correct_reply_${text}_${tone}`;
    const cached = aiCache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiClient.post('/api/correct-reply', { text, tone });
      const result = response.data;
      aiCache.set(cacheKey, result);
      return result;
    } catch (error) {
      throw new Error(`Reply correction failed: ${error.message}`);
    }
  },

  async assistantSearch(query, emails) {
    try {
      const response = await apiClient.post('/api/ai-assistant', {
        query,
        emails
      });
      return response.data;
    } catch (error) {
      throw new Error(`Assistant search failed: ${error.message}`);
    }
  },

  async checkHealth() {
    try {
      const response = await apiClient.get('/api/health');
      return response.data;
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  },

  async getMetrics() {
    try {
      const response = await apiClient.get('/api/metrics');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get metrics: ${error.message}`);
    }
  },

  clearCache() {
    aiCache.clear();
  }
};

export default aiService; 
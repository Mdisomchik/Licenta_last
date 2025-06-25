import axios from 'axios';

export const emailService = {
  async fetchEmails(accessToken, pageToken = null) {
    try {
      const response = await axios.get(`http://localhost:5001/api/emails${pageToken ? `?pageToken=${pageToken}` : ''}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching emails:', error);
      throw error;
    }
  },

  async sendEmail(accessToken, emailData) {
    try {
      const response = await axios.post('http://localhost:5001/api/send', emailData, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  },

  async deleteEmail(accessToken, emailId) {
    try {
      await axios.delete(`http://localhost:5001/api/emails/${emailId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
    } catch (error) {
      console.error('Error deleting email:', error);
      throw error;
    }
  },

  async archiveEmail(accessToken, emailId) {
    try {
      await axios.post(`http://localhost:5001/api/emails/${emailId}/archive`, {}, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
    } catch (error) {
      console.error('Error archiving email:', error);
      throw error;
    }
  }
};

export default emailService; 
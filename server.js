const express = require('express');
const cors = require('cors');
const { createTicket, isUserInServer } = require('./index');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Authentication middleware
const authenticateRequest = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const expectedSecret = process.env.DISCORD_BOT_SECRET;
  
  if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Discord bot server is running' });
});

// Check if user is in server
app.post('/check-user', authenticateRequest, async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }

    const inServer = await isUserInServer(userId);
    
    res.json({
      success: true,
      inServer,
      message: inServer ? 'User is in server' : 'User is not in server'
    });
  } catch (error) {
    console.error('Error checking user:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Create ticket endpoint
app.post('/create-ticket', authenticateRequest, async (req, res) => {
  try {
    const { userId, type, amount, description } = req.body;
    
    if (!userId || !type) {
      return res.status(400).json({ success: false, error: 'User ID and type required' });
    }

    const result = await createTicket(userId, type, amount, description);
    
    if (result.success) {
      res.json({
        success: true,
        message: `Ticket created successfully: ${result.channelName}`,
        data: {
          channelId: result.channelId,
          channelName: result.channelName
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Discord bot server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = app; 
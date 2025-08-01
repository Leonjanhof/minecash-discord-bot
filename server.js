const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { createTicket, isUserInServer } = require('./index');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for rate limiting (fixes X-Forwarded-For header issue)
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  }
});

// Apply rate limiting to all routes
app.use(limiter);

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Sanitize string inputs
  if (req.body.userId) {
    req.body.userId = req.body.userId.toString().trim();
  }
  if (req.body.type) {
    req.body.type = req.body.type.toString().trim().toLowerCase();
  }
  if (req.body.description) {
    req.body.description = req.body.description.toString().trim();
  }
  if (req.body.amount) {
    req.body.amount = parseFloat(req.body.amount) || null;
  }
  next();
};

// Authentication middleware
const authenticateRequest = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const expectedSecret = process.env.DISCORD_BOT_SECRET;
  
  if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
    console.log(`Unauthorized access attempt from IP: ${req.ip}`);
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Discord bot server is running' });
});

// Check if user is in server
app.post('/check-user', authenticateRequest, sanitizeInput, async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }

    // Validate user ID format (Discord IDs are 17-19 digits)
    if (!/^\d{17,19}$/.test(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID format' });
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
app.post('/create-ticket', authenticateRequest, sanitizeInput, async (req, res) => {
  try {
    const { userId, type, amount, description } = req.body;
    
    if (!userId || !type) {
      return res.status(400).json({ success: false, error: 'User ID and type required' });
    }

    // Validate user ID format
    if (!/^\d{17,19}$/.test(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID format' });
    }

    // Validate ticket type
    const validTypes = ['support', 'deposit', 'withdraw'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid ticket type' });
    }

    // Validate amount for deposit/withdraw tickets
    if ((type === 'deposit' || type === 'withdraw') && (!amount || amount < 50 || amount > 500)) {
      return res.status(400).json({ success: false, error: 'Amount must be between 50 and 500 GC' });
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

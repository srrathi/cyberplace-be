const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { setupSwagger } = require('./src/config/swagger');
const routes = require('./src/routes');
const { logger } = require('./src/utils/logger');
const { initializeDatabase } = require('./src/database/config');
const webSocketManager = require('./src/ws/config');
const messageService = require('./src/ws/ws');

const app = express();
const server = http.createServer(app);

// Security and performance middleware
app.use(helmet());
app.use(compression());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Setup Swagger documentation
setupSwagger(app);

// Routes
app.use('/api', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize server
async function startServer() {
  logger.info('Starting server...');
  try {
    // Initialize database connection
    await initializeDatabase();
    logger.info('Database connected successfully');

    // Initialize WebSocket

    // Initialize WebSocket
    webSocketManager.initialize(server);

    // Set up WebSocket event listeners for business logic
    webSocketManager.on('user_authenticated', ({ username, socket, userData }) => {
      logger.info(`Business logic: User ${username} authenticated`);
      // Add any business logic here
    });

    webSocketManager.on('user_disconnected', ({ username, reason }) => {
      logger.info(`Business logic: User ${username} disconnected (${reason})`);
      // Add any cleanup logic here
    });

    // ...rest of your server setup...

    // Make services available globally if needed
    global.webSocketManager = webSocketManager;
    global.messageService = messageService;

    logger.info('WebSocket initialized successfully');

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Swagger docs available at http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

startServer();
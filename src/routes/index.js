const express = require('express');
const memeRoutes = require('./memes.routes');
const authRoutes = require('./auth.routes');

const router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/memes', memeRoutes);

// API info endpoint
router.get('/', (req, res) => {
    res.json({
        message: 'Meme Platform API',
        version: '1.0.0',
        documentation: '/api-docs',
        endpoints: {
            memes: '/api/memes',
            websocket: 'ws://localhost:4001'
        }
    });
});

module.exports = router;

const jwt = require('jsonwebtoken');
const authService = require('../services/auth');
const { logger } = require('../utils/logger');

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                error: 'Access denied',
                message: 'No token provided'
            });
        }

        const decoded = authService.verifyToken(token);
        
        // Get user details
        const user = await authService.getUserProfile(decoded.id);
        if (!user) {
            return res.status(401).json({
                error: 'Access denied',
                message: 'Invalid token'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        logger.error('Authentication error:', error);
        return res.status(401).json({
            error: 'Access denied',
            message: 'Invalid or expired token'
        });
    }
};

const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = authService.verifyToken(token);
            const user = await authService.getUserProfile(decoded.id);
            req.user = user;
        }
        
        next();
    } catch (error) {
        // Continue without authentication if token is invalid
        next();
    }
};

module.exports = {
    authenticateToken,
    optionalAuth
};
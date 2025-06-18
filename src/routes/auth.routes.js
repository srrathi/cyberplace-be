const express = require('express');
const authService = require('../services/auth');
const { validate, schemas } = require('../utils/validations');
const { authenticateToken } = require('../middlewares/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error or user already exists
 *       500:
 *         description: Internal server error
 */
router.post('/register', validate(schemas.registerUser), async (req, res) => {
    try {
        const result = await authService.registerUser(req.validatedData);
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: result
        });
    } catch (error) {
        logger.error('Error registering user:', error);
        
        if (error.message.includes('already exists') || error.message.includes('already taken')) {
            return res.status(400).json({
                error: 'Registration failed',
                message: error.message
            });
        }
        
        res.status(500).json({
            error: 'Failed to register user',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 */
router.post('/login', validate(schemas.loginUser), async (req, res) => {
    try {
        const result = await authService.loginUser(req.validatedData);
        res.json({
            success: true,
            message: 'Login successful',
            data: result
        });
    } catch (error) {
        logger.error('Error logging in user:', error);
        
        if (error.message.includes('Invalid email or password')) {
            return res.status(400).json({
                error: 'Login failed',
                message: 'Invalid email or password'
            });
        }
        
        res.status(500).json({
            error: 'Failed to login',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Profile retrieved successfully',
            data: req.user
        });
    } catch (error) {
        logger.error('Error getting profile:', error);
        res.status(500).json({
            error: 'Failed to get profile',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/auth/verify:
 *   post:
 *     summary: Verify JWT token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Invalid or expired token
 */
router.post('/verify', authenticateToken, async (req, res) => {
    res.json({
        success: true,
        message: 'Token is valid',
        data: {
            user: req.user,
            tokenValid: true
        }
    });
});

module.exports = router;
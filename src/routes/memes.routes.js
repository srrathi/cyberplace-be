const express = require('express');
const memeService = require('../services/memes');
const { validate, schemas } = require('../utils/validations');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /api/memes:
 *   post:
 *     summary: Create a new meme
 *     tags: [Memes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMemeRequest'
 *     responses:
 *       201:
 *         description: Meme created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Meme'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 */
router.post('/', validate(schemas.createMeme), async (req, res) => {
    try {
        const meme = await memeService.createMeme(req.validatedData);
        res.status(201).json({
            success: true,
            message: 'Meme created successfully',
            data: meme
        });
    } catch (error) {
        logger.error('Error creating meme:', error);
        res.status(500).json({
            error: 'Failed to create meme',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/memes/user/{username}:
 *   get:
 *     summary: Get all memes for a specific user
 *     tags: [Memes]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Username to fetch memes for
 *     responses:
 *       200:
 *         description: User memes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Meme'
 *       500:
 *         description: Internal server error
 */
router.get('/user/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const memes = await memeService.getMemesForUser(username);
        res.json({
            success: true,
            message: 'User memes retrieved successfully',
            data: memes
        });
    } catch (error) {
        logger.error('Error fetching user memes:', error);
        res.status(500).json({
            error: 'Failed to fetch user memes',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/memes/bid:
 *   post:
 *     summary: Place a bid on a meme
 *     tags: [Memes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BidRequest'
 *     responses:
 *       200:
 *         description: Bid placed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         transaction_id:
 *                           type: string
 *                         success:
 *                           type: boolean
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/bid', validate(schemas.bidOnMeme), async (req, res) => {
    try {
        const result = await memeService.bidOnMeme(req.validatedData);
        res.json({
            success: true,
            message: 'Bid placed successfully',
            data: result
        });
    } catch (error) {
        logger.error('Error placing bid:', error);
        res.status(500).json({
            error: 'Failed to place bid',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/memes/vote:
 *   post:
 *     summary: Vote on a meme (upvote or downvote)
 *     tags: [Memes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VoteRequest'
 *     responses:
 *       200:
 *         description: Vote placed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/vote', validate(schemas.voteOnMeme), async (req, res) => {
    try {
        const result = await memeService.voteOnMeme(req.validatedData);
        res.json({
            success: true,
            message: 'Vote placed successfully',
            data: result
        });
    } catch (error) {
        logger.error('Error voting on meme:', error);
        res.status(500).json({
            error: 'Failed to vote on meme',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/memes/leaderboard:
 *   post:
 *     summary: Get memes leaderboard with pagination and filtering
 *     tags: [Memes]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LeaderboardRequest'
 *     responses:
 *       200:
 *         description: Leaderboard retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         memes:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Meme'
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             page:
 *                               type: integer
 *                             pageSize:
 *                               type: integer
 *                             total:
 *                               type: integer
 *                             totalPages:
 *                               type: integer
 *       500:
 *         description: Internal server error
 */
router.post('/leaderboard', validate(schemas.getLeaderboard), async (req, res) => {
    try {
        const result = await memeService.getLeaderboard(req.validatedData);
        res.json({
            success: true,
            message: 'Leaderboard retrieved successfully',
            data: result
        });
    } catch (error) {
        logger.error('Error fetching leaderboard:', error);
        res.status(500).json({
            error: 'Failed to fetch leaderboard',
            message: error.message
        });
    }
});

module.exports = router;
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Meme Platform API',
            version: '1.0.0',
            description: 'A comprehensive API for meme platform with WebSocket support',
        },
        servers: [
            {
                url: process.env.API_URL || 'http://localhost:4001',
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        email: { type: 'string', format: 'email' },
                        username: { type: 'string' },
                        name: { type: 'string' },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' }
                    }
                },
                RegisterRequest: {
                    type: 'object',
                    required: ['email', 'username', 'name', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email', maxLength: 255 },
                        username: { type: 'string', minLength: 3, maxLength: 50 },
                        name: { type: 'string', minLength: 2, maxLength: 100 },
                        password: { type: 'string', minLength: 8, maxLength: 128 }
                    }
                },
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email' },
                        password: { type: 'string' }
                    }
                },
                AuthResponse: {
                    type: 'object',
                    properties: {
                        user: { $ref: '#/components/schemas/User' },
                        token: { type: 'string' },
                        expiresIn: { type: 'string' }
                    }
                },
                // ...existing schemas...
                Meme: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        text: { type: 'string' },
                        image_url: { type: 'string', format: 'uri' },
                        meta: { type: 'object' },
                        caption: { type: 'string' },
                        vibe_description: { type: 'string' },
                        upvote_count: { type: 'integer' },
                        downvote_count: { type: 'integer' },
                        total_bid_amount: { type: 'number' },
                        username: { type: 'string' },
                        is_active: { type: 'boolean' },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' },
                        top_bidder: {
                            type: 'object',
                            properties: {
                                username: { type: 'string' },
                                bid_amount: { type: 'number' },
                                transaction_id: { type: 'string' }
                            }
                        }
                    }
                },
                CreateMemeRequest: {
                    type: 'object',
                    required: ['text', 'image_url', 'tags', 'username'],
                    properties: {
                        text: { type: 'string', maxLength: 1000 },
                        image_url: { type: 'string', format: 'uri' },
                        tags: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10 },
                        username: { type: 'string', maxLength: 50 }
                    }
                },
                BidRequest: {
                    type: 'object',
                    required: ['meme_id', 'username', 'bid_amount'],
                    properties: {
                        meme_id: { type: 'integer', minimum: 1 },
                        username: { type: 'string', maxLength: 50 },
                        bid_amount: { type: 'number', minimum: 0.01 }
                    }
                },
                VoteRequest: {
                    type: 'object',
                    required: ['meme_id', 'username', 'voted'],
                    properties: {
                        meme_id: { type: 'integer', minimum: 1 },
                        username: { type: 'string', maxLength: 50 },
                        voted: { type: 'integer', enum: [0, 1] }
                    }
                },
                LeaderboardRequest: {
                    type: 'object',
                    properties: {
                        page: { type: 'integer', minimum: 1, default: 1 },
                        pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
                        sortBy: { type: 'string', enum: ['upvote_count', 'downvote_count', 'total_bid_amount', 'created_at'], default: 'upvote_count' },
                        sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
                        filters: {
                            type: 'object',
                            properties: {
                                username: { type: 'string' },
                                minUpvotes: { type: 'integer', minimum: 0 },
                                minBidAmount: { type: 'number', minimum: 0 }
                            }
                        }
                    }
                },
                ApiResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: { type: 'object' }
                    }
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        message: { type: 'string' },
                        details: { type: 'array', items: { type: 'object' } }
                    }
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ]
    },
    apis: ['./src/routes/*.js'], // Path to the API files
};

const specs = swaggerJsdoc(options);

const setupSwagger = (app) => {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'Meme Platform API Documentation'
    }));
};

module.exports = { setupSwagger };
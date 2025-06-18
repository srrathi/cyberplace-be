const { z } = require('zod');

const schemas = {
    registerUser: z.object({
        email: z.string().email('Invalid email format').max(255),
        username: z.string().min(3, 'Username must be at least 3 characters').max(50).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
        name: z.string().min(2, 'Name must be at least 2 characters').max(100),
        password: z.string().min(8, 'Password must be at least 8 characters').max(128)
    }),

    loginUser: z.object({
        email: z.string().email('Invalid email format'),
        password: z.string().min(1, 'Password is required')
    }),

    createMeme: z.object({
        text: z.string().min(1).max(1000),
        image_url: z.string().url(),
        tags: z.array(z.string()).min(1).max(10),
        username: z.string().min(1).max(50)
    }),

    bidOnMeme: z.object({
        meme_id: z.number().int().positive(),
        username: z.string().min(1).max(50),
        bid_amount: z.number().positive()
    }),

    voteOnMeme: z.object({
        meme_id: z.number().int().positive(),
        username: z.string().min(1).max(50),
        voted: z.number().int().min(0).max(1) // 0 for down, 1 for up
    }),

    getLeaderboard: z.object({
        page: z.number().int().min(1).optional().default(1),
        pageSize: z.number().int().min(1).max(100).optional().default(20),
        sortBy: z.enum(['upvote_count', 'downvote_count', 'total_bid_amount', 'created_at']).optional().default('upvote_count'),
        sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
        filters: z.object({
            username: z.string().optional(),
            minUpvotes: z.number().int().min(0).optional(),
            minBidAmount: z.number().min(0).optional()
        }).optional().default({})
    }),

    getUserMemes: z.object({
        username: z.string().min(1).max(50)
    })
};

// Validation middleware
const validate = (schema) => {
    return (req, res, next) => {
        try {
            const data = req.method === 'GET' ? req.query : req.body;
            const validated = schema.parse(data);
            req.validatedData = validated;
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                });
            }
            next(error);
        }
    };
};

module.exports = {
    schemas,
    validate
};

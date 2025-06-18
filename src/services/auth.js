const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { DatabaseService } = require('../database/db');
const { logger } = require('../utils/logger');

class AuthService extends DatabaseService {
    constructor() {
        super();
        this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
        this.tokenExpiry = '30d'; // 30 days
    }

    async hashPassword(password) {
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
    }

    async comparePassword(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    }

    generateToken(payload) {
        return jwt.sign(payload, this.jwtSecret, { expiresIn: this.tokenExpiry });
    }

    verifyToken(token) {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }

    async registerUser(userData) {
        try {
            const { email, username, name, password } = userData;

            // Check if user already exists
            const existingUser = await this.findUserByEmailOrUsername(email, username);
            if (existingUser) {
                if (existingUser.email === email) {
                    throw new Error('User with this email already exists');
                }
                if (existingUser.username === username) {
                    throw new Error('Username is already taken');
                }
            }

            // Hash password
            const hashedPassword = await this.hashPassword(password);

            // Create user
            const newUser = await this.create('users', {
                email,
                username,
                name,
                password: hashedPassword,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

            // Generate JWT token
            const token = this.generateToken({
                id: newUser.id,
                email: newUser.email,
                username: newUser.username
            });

            // Remove password from response
            const { password: _, ...userResponse } = newUser;

            logger.info(`New user registered: ${username} (${email})`);
            
            return {
                user: userResponse,
                token,
                expiresIn: this.tokenExpiry
            };
        } catch (error) {
            logger.error('Error registering user:', error);
            throw error;
        }
    }

    async loginUser(credentials) {
        try {
            const { email, password } = credentials;

            // Find user by email
            const user = await this.findUserByEmail(email);
            if (!user) {
                throw new Error('Invalid email or password');
            }

            // Compare password
            const isPasswordValid = await this.comparePassword(password, user.password);
            if (!isPasswordValid) {
                throw new Error('Invalid email or password');
            }

            // Generate JWT token
            const token = this.generateToken({
                id: user.id,
                email: user.email,
                username: user.username
            });

            // Remove password from response
            const { password: _, ...userResponse } = user;

            logger.info(`User logged in: ${user.username} (${user.email})`);
            
            return {
                user: userResponse,
                token,
                expiresIn: this.tokenExpiry
            };
        } catch (error) {
            logger.error('Error logging in user:', error);
            throw error;
        }
    }

    async findUserByEmail(email) {
        try {
            const users = await this.findMany('users', { email });
            return users.length > 0 ? users[0] : null;
        } catch (error) {
            logger.error('Error finding user by email:', error);
            throw error;
        }
    }

    async findUserByUsername(username) {
        try {
            const users = await this.findMany('users', { username });
            return users.length > 0 ? users[0] : null;
        } catch (error) {
            logger.error('Error finding user by username:', error);
            throw error;
        }
    }

    async findUserByEmailOrUsername(email, username) {
        try {
            const client = this.client();
            const { data, error } = await client
                .from('users')
                .select('*')
                .or(`email.eq.${email},username.eq.${username}`)
                .limit(1);
                
            if (error) throw error;
            return data.length > 0 ? data[0] : null;
        } catch (error) {
            logger.error('Error finding user by email or username:', error);
            throw error;
        }
    }

    async getUserProfile(userId) {
        try {
            const user = await this.findById('users', userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Remove password from response
            const { password: _, ...userResponse } = user;
            return userResponse;
        } catch (error) {
            logger.error('Error getting user profile:', error);
            throw error;
        }
    }
}

module.exports = new AuthService();
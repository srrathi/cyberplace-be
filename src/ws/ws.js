const webSocketManager = require('./config');
const { logger } = require('../utils/logger');

class MessageService {
    constructor() {
        this.wsManager = webSocketManager;
    }

    // Send message to specific user
    async sendToUser(username, event, data) {
        try {
            const userInfo = this.wsManager.getUserInfo(username);
            if (!userInfo) {
                logger.warn(`User ${username} not connected`);
                return false;
            }

            const io = this.wsManager.getIO();
            const message = this.formatMessage(data);

            io.to(userInfo.socketId).emit(event, message);

            logger.info(`Message sent to user ${username}: ${event}`);
            return true;
        } catch (error) {
            logger.error(`Error sending message to user ${username}:`, error);
            return false;
        }
    }

    // Send message to multiple users
    async sendToUsers(usernames, event, data) {
        try {
            const results = await Promise.all(
                usernames.map(username => this.sendToUser(username, event, data))
            );
            return results.filter(Boolean).length;
        } catch (error) {
            logger.error('Error sending message to multiple users:', error);
            return 0;
        }
    }

    // Broadcast message to all connected users
    async broadcast(event, data) {
        try {
            const io = this.wsManager.getIO();
            const message = this.formatMessage(data);

            io.emit(event, message);

            const metrics = this.wsManager.getConnectionMetrics();
            logger.info(`Broadcast message sent: ${event}`, {
                event,
                connectedUsers: metrics.currentConnections,
                message
            });

            return true;
        } catch (error) {
            logger.error(`Error broadcasting message:`, error);
            return false;
        }
    }

    // Send message to room
    async sendToRoom(room, event, data) {
        try {
            const io = this.wsManager.getIO();
            const message = this.formatMessage(data);

            io.to(room).emit(event, message);

            const roomUsers = this.wsManager.getRoomUsers(room);
            logger.info(`Message sent to room ${room}: ${event}`, {
                room,
                userCount: roomUsers.length,
                event
            });

            return true;
        } catch (error) {
            logger.error(`Error sending message to room ${room}:`, error);
            return false;
        }
    }

    // Format message with timestamp and metadata
    formatMessage(data) {
        return {
            ...data,
            timestamp: new Date().toISOString(),
            serverId: process.env.SERVER_ID || 'server-1'
        };
    }

    // Specialized business logic methods
    async broadcastBidUpdate(username, amount, memeId, newTotalAmount, memeName) {
        return this.broadcast('bid_update', {
            type: 'BID_PLACED',
            data: {
                message: `User ${username} bid ${amount} credits to ${memeName}!`,
                username,
                amount,
                memeId,
                action: 'bid_placed',
                newBidAmount: newTotalAmount
            }
        });
    }

    // Update Leaderboard
    async updateLeaderboard() {
        return this.broadcast('leaderboard_update', {
            type: 'LEADERBOARD_UPDATE',
            data: {
                message: 'Leaderboard updated!',
                action: 'leaderboard_updated'
            }
        });
    }

    async broadcastVoteUpdate(memeId, voteType, username, newCount, memeName, upvotes, downvotes) {
        return this.broadcast('vote_update', {
            type: 'VOTE_UPDATE',
            data: {
                memeId,
                voteType,
                username,
                newCount,
                action: 'vote_cast',
                message: `User ${username} ${voteType}d meme ${memeName}!`,
                memeName,
                upvotes,
                downvotes
            }
        });
    }

    async broadcastMemeHighlight(memeId, upvoteCount) {
        return this.broadcast('meme_highlight', {
            type: 'MEME_TRENDING',
            data: {
                message: `Meme upvotes now at ${upvoteCount}!`,
                memeId,
                upvoteCount,
                action: 'meme_trending'
            }
        });
    }

    async broadcastNewMeme(memeData) {
        return this.broadcast('new_meme', {
            type: 'NEW_MEME',
            data: {
                message: `New meme posted by ${memeData.username}!`,
                meme: memeData,
                action: 'meme_created'
            }
        });
    }

    // User-specific notifications
    async notifyUser(username, notification) {
        return this.sendToUser(username, 'notification', {
            type: 'NOTIFICATION',
            data: {
                ...notification,
                action: 'user_notification'
            }
        });
    }

    // System announcements
    async systemAnnouncement(message, level = 'info') {
        return this.broadcast('system_announcement', {
            type: 'SYSTEM_ANNOUNCEMENT',
            data: {
                message,
                level,
                action: 'system_message'
            }
        });
    }

    // Get service stats
    getStats() {
        return this.wsManager.getConnectionMetrics();
    }

    // Test methods
    async testBroadcast() {
        return this.broadcast('test_message', {
            type: 'TEST',
            data: {
                message: 'This is a test broadcast message',
                action: 'test'
            }
        });
    }

    async testUserMessage(username) {
        return this.sendToUser(username, 'test_message', {
            type: 'TEST',
            data: {
                message: `This is a test message for ${username}`,
                action: 'test'
            }
        });
    }
}

// Create singleton instance
const messageService = new MessageService();

module.exports = messageService;
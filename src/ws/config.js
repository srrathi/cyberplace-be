const { Server } = require('socket.io');
const { logger } = require('../utils/logger');
const EventEmitter = require('events');

class WebSocketManager extends EventEmitter {
    constructor() {
        super();
        this.io = null;
        this.connectedUsers = new Map(); // username -> { socketId, userData }
        this.userSockets = new Map(); // socketId -> username
        this.rooms = new Map(); // room -> Set of usernames
        this.isInitialized = false;
        this.connectionMetrics = {
            totalConnections: 0,
            currentConnections: 0,
            totalDisconnections: 0
        };
    }

    // Initialize WebSocket server
    initialize(server, options = {}) {
        if (this.isInitialized) {
            logger.warn('WebSocket already initialized');
            return this.io;
        }

        const defaultOptions = {
            cors: {
                origin: true, // Allow all origins
                methods: ["GET", "POST"],
                // credentials: true
            },
            transports: ['websocket', 'polling'],
            pingTimeout: 300000,
            pingInterval: 10000
        };

        this.io = new Server(server, { ...defaultOptions, ...options });
        this.setupEventHandlers();
        this.isInitialized = true;
        
        logger.info('WebSocket server initialized successfully');
        return this.io;
    }

    // Setup core event handlers
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            this.handleConnection(socket);
        });

        this.io.on('error', (error) => {
            logger.error('WebSocket server error:', error);
        });
    }

    // Handle new socket connections
    handleConnection(socket) {
        this.connectionMetrics.totalConnections++;
        this.connectionMetrics.currentConnections++;
        
        logger.info(`New WebSocket connection: ${socket.id}`);

        // Set up socket event handlers
        this.setupSocketHandlers(socket);

        // Emit connection event for external listeners
        this.emit('connection', socket);
    }

    // Setup individual socket event handlers
    setupSocketHandlers(socket) {
        // Authentication
        socket.on('authenticate', (data) => this.handleAuthentication(socket, data));
        
        // Heartbeat
        socket.on('ping', () => this.handlePing(socket));
        
        // Room management
        socket.on('join_room', (data) => this.handleJoinRoom(socket, data));
        socket.on('leave_room', (data) => this.handleLeaveRoom(socket, data));
        
        // Disconnection
        socket.on('disconnect', (reason) => this.handleDisconnection(socket, reason));
        
        // Error handling
        socket.on('error', (error) => this.handleSocketError(socket, error));
    }

    // Handle user authentication
    handleAuthentication(socket, data) {
        try {
            const { username, token, userData = {} } = data;
            
            if (!username) {
                socket.emit('authentication_error', { error: 'Username is required' });
                return;
            }

            // Remove user from previous socket if exists
            this.removeUserFromPreviousSocket(username);
            
            // Store user connection
            this.connectedUsers.set(username, {
                socketId: socket.id,
                userData: {
                    ...userData,
                    connectedAt: new Date().toISOString(),
                    lastSeen: new Date().toISOString()
                }
            });
            
            this.userSockets.set(socket.id, username);
            socket.username = username;
            
            // Join user to their personal room
            socket.join(`user_${username}`);
            
            logger.info(`User ${username} authenticated with socket ${socket.id}`);
            
            // Send authentication success
            socket.emit('authenticated', {
                success: true,
                message: 'Successfully authenticated',
                username,
                connectedUsers: this.connectedUsers.size
            });

            // Broadcast user online status
            this.broadcastUserStatus(username, 'online');
            
            // Emit authentication event
            this.emit('user_authenticated', { username, socket, userData });
            
        } catch (error) {
            logger.error('Authentication error:', error);
            socket.emit('authentication_error', { error: 'Authentication failed' });
        }
    }

    // Handle ping/heartbeat
    handlePing(socket) {
        socket.emit('pong', { 
            timestamp: new Date().toISOString(),
            serverTime: Date.now()
        });
        
        // Update last seen
        const username = this.userSockets.get(socket.id);
        if (username && this.connectedUsers.has(username)) {
            const userInfo = this.connectedUsers.get(username);
            userInfo.userData.lastSeen = new Date().toISOString();
        }
    }

    // Handle room joining
    handleJoinRoom(socket, { room, password }) {
        try {
            const username = socket.username;
            if (!username) {
                socket.emit('room_error', { error: 'Authentication required' });
                return;
            }

            socket.join(room);
            
            if (!this.rooms.has(room)) {
                this.rooms.set(room, new Set());
            }
            this.rooms.get(room).add(username);
            
            socket.emit('room_joined', { room, users: Array.from(this.rooms.get(room)) });
            socket.to(room).emit('user_joined_room', { room, username });
            
            logger.info(`User ${username} joined room ${room}`);
            this.emit('user_joined_room', { username, room, socket });
            
        } catch (error) {
            logger.error('Error joining room:', error);
            socket.emit('room_error', { error: 'Failed to join room' });
        }
    }

    // Handle room leaving
    handleLeaveRoom(socket, { room }) {
        try {
            const username = socket.username;
            if (!username) return;

            socket.leave(room);
            
            if (this.rooms.has(room)) {
                this.rooms.get(room).delete(username);
                if (this.rooms.get(room).size === 0) {
                    this.rooms.delete(room);
                }
            }
            
            socket.emit('room_left', { room });
            socket.to(room).emit('user_left_room', { room, username });
            
            logger.info(`User ${username} left room ${room}`);
            this.emit('user_left_room', { username, room, socket });
            
        } catch (error) {
            logger.error('Error leaving room:', error);
        }
    }

    // Handle disconnection
    handleDisconnection(socket, reason) {
        this.connectionMetrics.currentConnections--;
        this.connectionMetrics.totalDisconnections++;
        
        logger.info(`Socket ${socket.id} disconnected: ${reason}`);
        
        const username = this.userSockets.get(socket.id);
        if (username) {
            this.connectedUsers.delete(username);
            this.userSockets.delete(socket.id);
            
            // Remove from all rooms
            for (const [room, users] of this.rooms.entries()) {
                if (users.has(username)) {
                    users.delete(username);
                    socket.to(room).emit('user_left_room', { room, username });
                    if (users.size === 0) {
                        this.rooms.delete(room);
                    }
                }
            }
            
            // Broadcast user offline status
            this.broadcastUserStatus(username, 'offline');
            
            logger.info(`User ${username} disconnected`);
            this.emit('user_disconnected', { username, reason, socket });
        }
    }

    // Handle socket errors
    handleSocketError(socket, error) {
        logger.error(`Socket error for ${socket.id}:`, error);
        this.emit('socket_error', { socket, error });
    }

    // Remove user from previous socket connection
    removeUserFromPreviousSocket(username) {
        if (this.connectedUsers.has(username)) {
            const previousConnection = this.connectedUsers.get(username);
            const previousSocket = this.io.sockets.sockets.get(previousConnection.socketId);
            
            if (previousSocket) {
                previousSocket.disconnect(true);
                logger.info(`Disconnected previous socket for user ${username}`);
            }
            
            this.userSockets.delete(previousConnection.socketId);
        }
    }

    // Broadcast user status change
    broadcastUserStatus(username, status) {
        this.io.emit('user_status', {
            username,
            status,
            timestamp: new Date().toISOString()
        });
    }

    // Get IO instance
    getIO() {
        if (!this.isInitialized || !this.io) {
            throw new Error('WebSocket not initialized. Call initialize() first.');
        }
        return this.io;
    }

    // Connection state methods
    isUserOnline(username) {
        return this.connectedUsers.has(username);
    }

    getConnectedUsers() {
        return Array.from(this.connectedUsers.keys());
    }

    getConnectedUsersCount() {
        return this.connectedUsers.size;
    }

    getUserInfo(username) {
        return this.connectedUsers.get(username);
    }

    getConnectionMetrics() {
        return {
            ...this.connectionMetrics,
            currentConnections: this.connectedUsers.size,
            rooms: this.rooms.size,
            roomUsers: Array.from(this.rooms.entries()).map(([room, users]) => ({
                room,
                userCount: users.size
            }))
        };
    }

    // Room management
    getRoomUsers(room) {
        return this.rooms.has(room) ? Array.from(this.rooms.get(room)) : [];
    }

    getAllRooms() {
        return Array.from(this.rooms.keys());
    }
}

// Create singleton instance
const webSocketManager = new WebSocketManager();

module.exports = webSocketManager;
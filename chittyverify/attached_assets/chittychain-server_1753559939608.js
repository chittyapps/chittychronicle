#!/usr/bin/env node

/**
 * ChittyChain Evidence Ledger Server
 * Production-ready server with health checks, monitoring, and graceful shutdown
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Client } = require('pg');
const Redis = require('ioredis');
const path = require('path');
const fs = require('fs-extra');

// Import core modules
const { ChittyChain } = require('./src/core/ChittyChain');
const { SecurityManager } = require('./src/core/SecurityManager');
const { EvidenceLedger } = require('./src/core/EvidenceLedger');
const { MCPServer } = require('./chittychain-mcp-server');

// Environment configuration
const config = {
    port: process.env.PORT || 3000,
    mcpPort: process.env.MCP_PORT || 3001,
    apiPort: process.env.API_PORT || 8080,
    nodeEnv: process.env.NODE_ENV || 'production',
    databaseUrl: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL,
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    enableMetrics: process.env.ENABLE_METRICS === 'true',
    enableTracing: process.env.ENABLE_TRACING === 'true',
    logLevel: process.env.LOG_LEVEL || 'info',
    dataDir: process.env.DATA_DIR || './data',
    logDir: process.env.LOG_DIR || './logs'
};

// Initialize application
const app = express();
const server = createServer(app);

// Database and cache clients
let dbClient;
let redisClient;

// Core services
let blockchain;
let securityManager;
let evidenceLedger;
let mcpServer;

// Middleware setup
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

app.use(cors({
    origin: config.corsOrigin,
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', limiter);

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    });
    next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: config.nodeEnv,
            services: {}
        };

        // Check database
        try {
            await dbClient.query('SELECT 1');
            health.services.database = { status: 'healthy' };
        } catch (error) {
            health.services.database = { status: 'unhealthy', error: error.message };
            health.status = 'degraded';
        }

        // Check Redis
        try {
            await redisClient.ping();
            health.services.redis = { status: 'healthy' };
        } catch (error) {
            health.services.redis = { status: 'unhealthy', error: error.message };
            health.status = 'degraded';
        }

        // Check blockchain
        if (blockchain) {
            const chainStatus = blockchain.getStatus();
            health.services.blockchain = {
                status: chainStatus.isValid ? 'healthy' : 'unhealthy',
                height: chainStatus.height,
                lastBlock: chainStatus.lastBlockTime
            };
        }

        // Check MCP server
        if (mcpServer) {
            health.services.mcp = { status: 'healthy', port: config.mcpPort };
        }

        res.status(health.status === 'healthy' ? 200 : 503).json(health);
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
    if (!config.enableMetrics) {
        return res.status(404).send('Metrics not enabled');
    }

    try {
        const metrics = {
            timestamp: new Date().toISOString(),
            system: {
                memory: process.memoryUsage(),
                cpu: process.cpuUsage(),
                uptime: process.uptime()
            },
            blockchain: blockchain ? blockchain.getMetrics() : null,
            database: dbClient ? await getDatabaseMetrics() : null,
            cache: redisClient ? await getCacheMetrics() : null
        };

        res.json(metrics);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API Routes
app.use('/api/evidence', require('./routes/evidence'));
app.use('/api/facts', require('./routes/facts'));
app.use('/api/chain', require('./routes/chain'));
app.use('/api/custody', require('./routes/custody'));
app.use('/api/contradictions', require('./routes/contradictions'));
app.use('/api/audit', require('./routes/audit'));

// Static files (if any)
app.use(express.static(path.join(__dirname, 'public')));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    const statusCode = err.statusCode || 500;
    const message = config.nodeEnv === 'production' 
        ? 'Internal server error' 
        : err.message;
    
    res.status(statusCode).json({
        error: message,
        ...(config.nodeEnv !== 'production' && { stack: err.stack })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Database metrics helper
async function getDatabaseMetrics() {
    const result = await dbClient.query(`
        SELECT 
            (SELECT COUNT(*) FROM master_evidence) as total_evidence,
            (SELECT COUNT(*) FROM atomic_facts) as total_facts,
            (SELECT COUNT(*) FROM cases) as total_cases,
            (SELECT COUNT(*) FROM users) as total_users,
            (SELECT COUNT(*) FROM audit_trail WHERE timestamp > NOW() - INTERVAL '1 hour') as recent_audits
    `);
    
    return result.rows[0];
}

// Cache metrics helper
async function getCacheMetrics() {
    const info = await redisClient.info('stats');
    const dbSize = await redisClient.dbsize();
    
    return {
        connected_clients: parseInt(info.match(/connected_clients:(\d+)/)?.[1] || 0),
        total_keys: dbSize,
        hit_rate: info.match(/keyspace_hit_rate:([0-9.]+)/)?.[1] || '0'
    };
}

// Initialize services
async function initializeServices() {
    console.log('Initializing ChittyChain Evidence Ledger...');
    
    // Create directories
    await fs.ensureDir(config.dataDir);
    await fs.ensureDir(config.logDir);
    
    // Initialize database
    dbClient = new Client({
        connectionString: config.databaseUrl,
        ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await dbClient.connect();
    console.log('✅ Database connected');
    
    // Initialize Redis
    redisClient = new Redis(config.redisUrl, {
        retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
        }
    });
    
    await new Promise((resolve, reject) => {
        redisClient.once('ready', resolve);
        redisClient.once('error', reject);
    });
    
    console.log('✅ Redis connected');
    
    // Initialize blockchain
    blockchain = new ChittyChain({
        dataDir: path.join(config.dataDir, 'blockchain'),
        dbClient,
        redisClient
    });
    
    await blockchain.initialize();
    console.log('✅ Blockchain initialized');
    
    // Initialize security manager
    securityManager = new SecurityManager({
        jwtSecret: process.env.JWT_SECRET,
        sessionSecret: process.env.SESSION_SECRET,
        dbClient,
        redisClient
    });
    
    console.log('✅ Security manager initialized');
    
    // Initialize evidence ledger
    evidenceLedger = new EvidenceLedger({
        dbClient,
        blockchain,
        securityManager,
        redisClient
    });
    
    await evidenceLedger.initialize();
    console.log('✅ Evidence ledger initialized');
    
    // Initialize MCP server
    if (config.mcpPort) {
        mcpServer = new MCPServer({
            port: config.mcpPort,
            blockchain,
            evidenceLedger,
            dbClient
        });
        
        await mcpServer.start();
        console.log(`✅ MCP server started on port ${config.mcpPort}`);
    }
    
    // Attach services to app context
    app.locals.blockchain = blockchain;
    app.locals.evidenceLedger = evidenceLedger;
    app.locals.securityManager = securityManager;
    app.locals.dbClient = dbClient;
    app.locals.redisClient = redisClient;
}

// Graceful shutdown handler
async function gracefulShutdown(signal) {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    
    // Stop accepting new connections
    server.close(() => {
        console.log('HTTP server closed');
    });
    
    // Close MCP server
    if (mcpServer) {
        await mcpServer.stop();
        console.log('MCP server stopped');
    }
    
    // Save blockchain state
    if (blockchain) {
        await blockchain.saveState();
        console.log('Blockchain state saved');
    }
    
    // Close database connections
    if (dbClient) {
        await dbClient.end();
        console.log('Database connection closed');
    }
    
    // Close Redis connection
    if (redisClient) {
        redisClient.disconnect();
        console.log('Redis connection closed');
    }
    
    console.log('Graceful shutdown complete');
    process.exit(0);
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});

// Start server
async function startServer() {
    try {
        await initializeServices();
        
        server.listen(config.port, () => {
            console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║          ChittyChain Evidence Ledger v3.0                 ║
║                                                           ║
║  Legal-grade blockchain evidence management system        ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  API Server:     http://localhost:${config.port}              ║
║  MCP Server:     http://localhost:${config.mcpPort}              ║
║  Health Check:   http://localhost:${config.apiPort}/health       ║
║  Metrics:        http://localhost:${config.apiPort}/metrics      ║
║                                                           ║
║  Environment:    ${config.nodeEnv}                        ║
║  Log Level:      ${config.logLevel}                          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
            `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the application
startServer();
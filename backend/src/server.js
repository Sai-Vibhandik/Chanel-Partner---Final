import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env file
// Try multiple paths to handle different environments
const possiblePaths = [
  path.join(__dirname, '../.env'),
  path.join(__dirname, '../../.env'),
  '.env',
  '../.env'
];

let envLoaded = false;
for (const envPath of possiblePaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error && process.env.SMTP_HOST) {
    console.log('✅ .env loaded from:', envPath);
    console.log('   SMTP_HOST:', process.env.SMTP_HOST);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.log('⚠️ .env not found in any location, trying default');
  dotenv.config();
}

if (!process.env.SMTP_HOST) {
  console.log('⚠️ SMTP_HOST still not set after loading .env');
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import fileUpload from 'express-fileupload';
import mongoose from 'mongoose';
import os from 'os';
import http from 'http';
import { initializeSocket } from './socket.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import companyRoutes from './routes/company.routes.js';
import partnerRoutes from './routes/partner.routes.js';
import partnerCompanyRoutes from './routes/partnerCompany.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import teamRoutes from './routes/team.routes.js';
import propertyRoutes from './routes/property.routes.js';
import visitRoutes from './routes/visit.routes.js';
import commissionRoutes from './routes/commission.routes.js';
import agreementRoutes from './routes/agreement.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import officeRoutes from './routes/office.routes.js';
import availabilityRoutes from './routes/availability.routes.js';
import chatRoutes from './routes/chat.routes.js';
import loginLogRoutes from './routes/loginLog.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import emailLogRoutes from './routes/emailLog.routes.js';
import activityLogRoutes from './routes/activityLog.routes.js';
import landingPageRoutes from './routes/landingPage.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import planRoutes from './routes/plan.routes.js';
import legalRoutes from './routes/legal.routes.js';
import { verifyEmailConnection } from './services/email.service.js';
import { initializeDefaultPages } from './controllers/legal.controller.js';

// Import middleware
import { errorHandler, notFound } from './middlewares/error.middleware.js';

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.IO
initializeSocket(httpServer, process.env.FRONTEND_URL || 'http://localhost:5173');

// Trust proxy - needed to get real IP address behind reverse proxy
app.set('trust proxy', true);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// File upload middleware
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: os.tmpdir(),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 }
}));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/landing', landingPageRoutes);
app.use('/api/legal', legalRoutes); // Public routes - must be before /api wildcard routes
app.use('/api/payments', paymentRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/partner-company', partnerCompanyRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api', teamRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/agreements', agreementRoutes);
app.use('/api/notifications', notificationRoutes);
// Note: availabilityRoutes must be mounted BEFORE officeRoutes
// because officeRoutes has /:id which would catch /offices/availabilities
app.use('/api', availabilityRoutes);
app.use('/api/offices', officeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/login-logs', loginLogRoutes);
app.use('/api/email-logs', emailLogRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/activity-logs', activityLogRoutes);

// TODO: Add other routes as modules are implemented
// app.use('/api/platform', platformRoutes);
// app.use('/api/company', companyRoutes);
// app.use('/api/partner-manager', partnerManagerRoutes);
// app.use('/api/property-manager', propertyManagerRoutes);
// app.use('/api/finance-manager', financeManagerRoutes);
// app.use('/api/legal-manager', legalManagerRoutes);
// app.use('/api/operations-manager', operationsManagerRoutes);
// app.use('/api/partner', partnerRoutes);

// 404 handler
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use(errorHandler);

// Database connection and server start
const startServer = async () => {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Connected to MongoDB');

      // Initialize default legal pages
      await initializeDefaultPages();
    } else {
      console.log('⚠️ No MongoDB URI provided, running without database');
    }

    // Verify email service connection
    await verifyEmailConnection();

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔌 Socket.IO enabled`);
    });
  } catch (error) {
    console.error('❌ Server startup error:', error.message);
    process.exit(1);
  }
};

startServer();

export default app;
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { notFound } from './src/middlewares/notFound.js';
import { errorHandler } from './src/middlewares/errorHandler.js';
import authRoutes from './src/routes/auth.routes.js';
import userRoutes from './src/routes/users.routes.js';
import patientRoutes from './src/routes/patients.routes.js';
import doctorRoutes from './src/routes/doctors.routes.js';
import appointmentRoutes from './src/routes/appointments.routes.js';
import recordRoutes from './src/routes/records.routes.js';
import imagingRoutes from './src/routes/imaging.routes.js';
import serviceRoutes from './src/routes/services.routes.js';
import billingRoutes from './src/routes/billing.routes.js';
import statsRoutes from './src/routes/stats.routes.js';

dotenv.config();
const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*'}));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req,res)=> res.json({ok:true, ts: Date.now()}));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/imaging', imagingRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/stats', statsRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=> console.log(`API running on http://localhost:${PORT}`));

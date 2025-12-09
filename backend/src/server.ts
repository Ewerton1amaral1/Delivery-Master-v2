import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

import prisma from './lib/prisma';

app.get('/health', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: 'ok', db: 'connected', message: 'Delivery Master Backend is running' });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({ status: 'error', db: 'disconnected', message: 'Database connection failed' });
    }
});

app.get('/', (req, res) => {
    res.send('API Delivery Master is Online 🚀');
});

import productRoutes from './routes/product.routes';
import orderRoutes from './routes/order.routes';
import authRoutes from './routes/auth.routes';
import whatsappRoutes from './routes/whatsapp.routes';
import settingsRoutes from './routes/settings.routes';
import clientRoutes from './routes/client.routes';
import driverRoutes from './routes/driver.routes';
import employeeRoutes from './routes/employee.routes';
import supplyRoutes from './routes/supply.routes';
import reportRoutes from './routes/report.routes';

// Routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/supplies', supplyRoutes);
app.use('/api/reports', reportRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

export default app;

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Delivery Master Backend is running' });
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

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

export default app;

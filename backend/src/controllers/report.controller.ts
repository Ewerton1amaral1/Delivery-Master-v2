import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const today = new Date();
        const start = new Date(today);
        start.setHours(0, 0, 0, 0); // Start of day

        const end = new Date(today);
        end.setHours(23, 59, 59, 999); // End of day

        // 1. Today's Orders
        const todayOrders = await prisma.order.findMany({
            where: { createdAt: { gte: start, lte: end } }
        });

        const totalSales = todayOrders.reduce((acc, o) => acc + o.total, 0);
        const count = todayOrders.length;
        const ticket = count > 0 ? totalSales / count : 0;

        // 2. Pending Orders
        const pending = await prisma.order.count({ where: { status: 'PENDING' } });

        res.json({
            today: {
                totalSales,
                count,
                averageTicket: ticket
            },
            pendingCount: pending
        });

    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
};

export const getReportData = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;

        // Logic to return orders in range (Default: last 30 days)
        let start = new Date();
        if (startDate) {
            start = new Date(String(startDate));
        } else {
            // Subtract 30 days
            start.setDate(start.getDate() - 30);
            start.setHours(0, 0, 0, 0);
        }

        let end = new Date();
        if (endDate) {
            end = new Date(String(endDate));
            end.setHours(23, 59, 59, 999);
        }

        const orders = await prisma.order.findMany({
            where: { createdAt: { gte: start, lte: end } },
            orderBy: { createdAt: 'desc' }
        });

        res.json(orders);
    } catch (error) {
        console.error("Report Data Error:", error);
        res.status(500).json({ error: 'Failed to fetch report data' });
    }
};

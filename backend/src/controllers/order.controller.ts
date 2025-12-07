import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { OrderStatus, PaymentMethod } from '@prisma/client';

export const getOrders = async (req: Request, res: Response) => {
    try {
        const orders = await prisma.order.findMany({
            include: {
                items: true,
                client: true,
                driver: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
};

export const createOrder = async (req: Request, res: Response) => {
    try {
        const {
            clientId,
            clientName,
            clientPhone,
            deliveryAddress,
            subtotal,
            deliveryFee,
            discount,
            total,
            paymentMethod,
            changeFor,
            items // Array of OrderItem
        } = req.body;

        // Calculate sequential ID
        const lastOrder = await prisma.order.findFirst({ orderBy: { displayId: 'desc' } });
        const nextId = (lastOrder?.displayId || 0) + 1;

        const order = await prisma.order.create({
            data: {
                displayId: nextId,
                clientId,
                clientName,
                clientPhone,
                deliveryAddress,
                subtotal: Number(subtotal),
                deliveryFee: Number(deliveryFee),
                discount: Number(discount || 0),
                total: Number(total),
                paymentMethod: paymentMethod as PaymentMethod,
                changeFor: changeFor ? Number(changeFor) : null,
                items: {
                    create: items.map((item: any) => ({
                        productName: item.productName,
                        quantity: Number(item.quantity),
                        unitPrice: Number(item.unitPrice),
                        notes: item.notes,
                        isHalfHalf: item.isHalfHalf || false,
                        secondFlavorName: item.secondFlavorName,
                        extras: item.extras ? JSON.stringify(item.extras) : null,
                        productId: item.productId // Optional link
                    }))
                }
            },
            include: {
                items: true
            }
        });

        res.status(201).json(order);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create order' });
    }
};

import { whatsappService } from '../services/whatsapp.service';

export const updateOrderStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const order = await prisma.order.update({
            where: { id },
            data: { status: status as OrderStatus },
            include: {  // Include driver to get phone
                driver: true
            }
        });

        // NOTIFY DRIVER (Mock trigger on 'DELIVERING')
        // Assuming 'DELIVERING' is the status for "Out for Delivery"
        if (status === 'DELIVERING' && order.driver && order.driver.phone) {
            await whatsappService.sendDriverNotification(order.driver.phone, order);
        }

        res.json(order);
    } catch (error) {
        console.error("Order Update Error", error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
};

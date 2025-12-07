import { Request, Response } from 'express';
import { whatsappService } from '../services/whatsapp.service';
import prisma from '../lib/prisma';

export const getStatus = (req: Request, res: Response) => {
    res.json(whatsappService.getStatus());
};

export const getChats = async (req: Request, res: Response) => {
    try {
        const chats = await prisma.chat.findMany({
            include: { messages: { take: 1, orderBy: { timestamp: 'desc' } } },
            orderBy: { lastMessageAt: 'desc' }
        });
        res.json(chats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch chats' });
    }
};

export const getMessages = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const messages = await prisma.message.findMany({
            where: { chatId: id },
            orderBy: { timestamp: 'asc' }
        });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
};

export const sendMessage = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { message } = req.body;
        await whatsappService.sendMessage(id, message);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to send message' });
    }
};

import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { ProductCategory } from '@prisma/client';

export const getProducts = async (req: Request, res: Response) => {
    try {
        const storeId = (req.query.storeId as string) || (req as any).user?.storeId;

        if (!storeId) {
            // If no store specified, return empty or error? For now empty to avoid leaking
            res.json([]);
            return;
        }

        const products = await prisma.product.findMany({
            where: { storeId },
            orderBy: { category: 'asc' }
        });
        console.log(`[API] Listing Products for Store ${storeId}: Found ${products.length}`);
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
};

export const createProduct = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const storeId = req.user?.storeId;
        if (!storeId) {
            res.status(403).json({ error: 'Store context missing' });
            return;
        }

        const { name, description, price, category, imageUrl, stock, ingredients } = req.body;

        // Sanitize inputs
        const safeData = {
            name: name || 'Novo Produto',
            description: description || '',
            price: isNaN(Number(price)) ? 0 : Number(price),
            category: (Object.values(ProductCategory).includes(category) ? category : 'SNACK') as ProductCategory,
            imageUrl: imageUrl || 'https://placehold.co/200',
            stock: isNaN(Number(stock)) ? 0 : Number(stock),
            ingredients: JSON.stringify(ingredients || []),
            storeId: storeId
        };

        console.log('[API] Creating Product:', safeData);

        const product = await prisma.product.create({
            data: safeData
        });

        res.status(201).json(product);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create product' });
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = req.body;

        if (data.price) data.price = Number(data.price);
        if (data.stock) data.stock = Number(data.stock);
        if (data.ingredients) data.ingredients = JSON.stringify(data.ingredients);

        const product = await prisma.product.update({
            where: { id },
            data
        });

        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update product' });
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.product.delete({ where: { id } });
        res.json({ message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete product' });
    }
};

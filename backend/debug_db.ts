
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking database content...');
    try {
        const products = await prisma.product.findMany();
        console.log(`Found ${products.length} products:`);
        products.forEach(p => console.log(`- ${p.name} (Price: ${p.price}, Stock: ${p.stock})`));

        const settings = await prisma.storeSettings.findFirst();
        console.log('Store Settings:', settings);
    } catch (e) {
        console.error('Error connecting to DB:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

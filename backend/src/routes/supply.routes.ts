import { Router } from 'express';
import { getSupplies, createSupply, updateSupply, deleteSupply } from '../controllers/supply.controller';

const router = Router();

router.get('/', getSupplies);
router.post('/', createSupply);
router.put('/:id', updateSupply);
router.delete('/:id', deleteSupply);

export default router;

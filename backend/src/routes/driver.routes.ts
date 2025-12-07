import { Router } from 'express';
import { getDrivers, createDriver, updateDriver, deleteDriver } from '../controllers/driver.controller';

const router = Router();

router.get('/', getDrivers);
router.post('/', createDriver);
router.put('/:id', updateDriver);
router.delete('/:id', deleteDriver);

export default router;

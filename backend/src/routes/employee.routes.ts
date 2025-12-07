import { Router } from 'express';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, addAdvance } from '../controllers/employee.controller';

const router = Router();

router.get('/', getEmployees);
router.post('/', createEmployee);
router.put('/:id', updateEmployee);
router.delete('/:id', deleteEmployee);
router.post('/:id/advances', addAdvance);

export default router;

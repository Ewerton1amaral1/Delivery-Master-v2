import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// LIST
export const getEmployees = async (req: Request, res: Response) => {
    try {
        const employees = await prisma.employee.findMany({
            orderBy: { name: 'asc' },
            include: { advances: true }
        });
        res.json(employees);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
};

// CREATE
export const createEmployee = async (req: Request, res: Response) => {
    try {
        const { name, cpf, rg, phone, address, email, role, admissionDate, baseSalary, transportVoucherValue } = req.body;
        const employee = await prisma.employee.create({
            data: {
                name,
                cpf,
                rg,
                phone,
                address,
                email,
                role,
                admissionDate: new Date(admissionDate),
                baseSalary: parseFloat(baseSalary),
                transportVoucherValue: parseFloat(transportVoucherValue || 0),
                isActive: true
            }
        });
        res.status(201).json(employee);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create employee' });
    }
};

// UPDATE
export const updateEmployee = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, cpf, rg, phone, address, email, role, admissionDate, baseSalary, transportVoucherValue, isActive } = req.body;

        const employee = await prisma.employee.update({
            where: { id },
            data: {
                name,
                cpf,
                rg,
                phone,
                address,
                email,
                role,
                admissionDate: admissionDate ? new Date(admissionDate) : undefined,
                baseSalary: baseSalary ? parseFloat(baseSalary) : undefined,
                transportVoucherValue: transportVoucherValue !== undefined ? parseFloat(transportVoucherValue) : undefined,
                isActive
            }
        });
        res.json(employee);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update employee' });
    }
};

// DELETE
export const deleteEmployee = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.employeeAdvance.deleteMany({ where: { employeeId: id } }); // Cascade delete advances
        await prisma.employee.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete employee' });
    }
};

// ADVANCES (Vales)
export const addAdvance = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { amount, description } = req.body;
        const advance = await prisma.employeeAdvance.create({
            data: {
                employeeId: id,
                amount: parseFloat(amount),
                description
            }
        });
        res.json(advance);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add advance' });
    }
};

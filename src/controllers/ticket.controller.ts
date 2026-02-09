import { Request, Response } from 'express';
import db from '../models';
import { Op } from 'sequelize';
import { emailService } from '../services/email.service';
import { z } from 'zod';

const createTicketSchema = z.object({
    customer_name: z.string().min(1, "Customer name is required"),
    email: z.string().email("Invalid email address"),
    contact_number: z.string().min(10, "Contact number must be at least 10 digits"),
    address: z.string().optional(),
    zip_code: z.string().optional(),
    inquiry_type: z.enum(['General', 'Complaint', 'Suggestion', 'Technical', 'Inquiry', 'Tech Support', 'Billing']),
    note: z.string().min(1, "Note is required")
});

export const listTickets = async (req: Request, res: Response) => {
    try {
        const { status, priority, assignee } = req.query;
        const where: any = {};
        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (assignee) where.assigned_to = assignee;

        const tickets = await db.Ticket.findAll({
            where,
            include: [
                { model: db.Customer, as: 'customer' },
                { model: db.User, as: 'assignee', attributes: ['name', 'id'] }
            ],
            order: [['created_at', 'DESC']]
        });
        res.json(tickets);
    } catch (error) {
        res.status(500).json({ message: "Error fetching tickets", error });
    }
};

export const createTicket = async (req: Request, res: Response) => {
    try {
        const {
            customer_name,
            email,
            contact_number,
            address,
            zip_code,
            inquiry_type,
            note
        } = req.body;

        const validationResult = createTicketSchema.safeParse(req.body);

        if (!validationResult.success) {
            return res.status(400).json({
                message: "Validation Error",
                errors: validationResult.error.format()
            });
        }

        // 1. Find or Create Customer
        let customer = await (db.Customer as any).findOne({
            where: {
                [Op.or]: [
                    { email: email || '' },
                    { mobile: contact_number || '' }
                ]
            }
        });

        if (customer) {
            // Update existing customer details if provided
            await customer.update({
                name: customer_name,
                address: address || customer.address,
                zip_code: zip_code || customer.zip_code,
                email: email || customer.email,
                mobile: contact_number || customer.mobile
            });
        } else {
            // Create new customer
            customer = await (db.Customer as any).create({
                name: customer_name,
                email,
                mobile: contact_number,
                address,
                zip_code
            });
        }

        // 2. Create Ticket
        const ticket = await (db.Ticket as any).create({
            ticket_number: `TKT-${Date.now()}`, // Simple ID generation
            status: 'New',
            priority: 'Medium', // Default
            category: inquiry_type || 'General',
            description: note,
            customer_id: customer.id
        });

        // 3. Send Confirmation Email
        if (email) {
            await emailService.sendTicketConfirmation(email, ticket.ticket_number, customer.name);
        }

        res.status(201).json(ticket);
    } catch (error) {
        console.error("Error creating ticket:", error);
        res.status(500).json({ message: "Error creating ticket", error });
    }
};

export const updateTicket = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const ticketId = Number(id);
        await db.Ticket.update(req.body, { where: { id: ticketId } });
        const ticket = await db.Ticket.findByPk(ticketId);
        res.json(ticket);
    } catch (error) {
        res.status(500).json({ message: "Error updating ticket", error });
    }
};

export const getTicketDetails = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const ticket = await db.Ticket.findByPk(Number(id), {
            include: [
                { model: db.Customer, as: 'customer' },
                { model: db.TicketActivity, as: 'activities' }
            ]
        });
        if (!ticket) return res.status(404).json({ message: "Ticket not found" });
        res.json(ticket);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving ticket", error });
    }
};

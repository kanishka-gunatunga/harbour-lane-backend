import { Request, Response } from 'express';
import db from '../models';
import { Op } from 'sequelize';

const TicketFollowUp = db.TicketFollowUp;
const TicketReminder = db.TicketReminder;

// Create FollowUp
export const createFollowUp = async (req: Request, res: Response) => {
    try {
        const { ticketId } = req.params;
        const { activity, activity_date } = req.body;

        if (!ticketId || !activity || !activity_date) {
            res.status(400).send({ message: "Content can not be empty!" });
            return;
        }

        const followUp = await TicketFollowUp.create({
            ticket_id: parseInt(ticketId as string),
            activity,
            activity_date,
            created_by: (req as any).user?.id
        });

        res.status(201).send(followUp);
    } catch (err: any) {
        res.status(500).send({
            message: err.message || "Some error occurred while creating the FollowUp."
        });
    }
};

// Get FollowUps for a Ticket
export const getFollowUps = async (req: Request, res: Response) => {
    try {
        const { ticketId } = req.params;
        console.log("Fetching followups for ticket:", ticketId);

        if (!db.TicketFollowUp) console.error("TicketFollowUp model is undefined");
        if (!db.User) console.error("User model is undefined");

        const followUps = await TicketFollowUp.findAll({
            where: { ticket_id: ticketId },
            include: [{ model: db.User, as: 'creator', attributes: ['id', 'name', 'email'] }],
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(followUps);
    } catch (err: any) {
        console.error("Error in getFollowUps:", err);
        res.status(500).send({
            message: err.message || "Some error occurred while retrieving FollowUps."
        });
    }
};

// Create Reminder
export const createReminder = async (req: Request, res: Response) => {
    try {
        const { ticketId } = req.params;
        const { task_title, task_date, note } = req.body;

        if (!ticketId || !task_title || !task_date) {
            res.status(400).send({ message: "Content can not be empty!" });
            return;
        }

        const reminder = await TicketReminder.create({
            ticket_id: parseInt(ticketId as string),
            task_title,
            task_date,
            note,
            created_by: (req as any).user?.id
        });

        res.status(201).send(reminder);
    } catch (err: any) {
        res.status(500).send({
            message: err.message || "Some error occurred while creating the Reminder."
        });
    }
};

// Get Reminders for a Ticket
export const getReminders = async (req: Request, res: Response) => {
    try {
        const { ticketId } = req.params;
        console.log("Fetching reminders for ticket:", ticketId);

        const reminders = await TicketReminder.findAll({
            where: { ticket_id: ticketId },
            include: [{ model: db.User, as: 'creator', attributes: ['id', 'name', 'email'] }],
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(reminders);
    } catch (err: any) {
        console.error("Error in getReminders:", err);
        res.status(500).send({
            message: err.message || "Some error occurred while retrieving Reminders."
        });
    }
};
// Get All Upcoming Reminders
export const getAllUpcomingReminders = async (req: Request, res: Response) => {
    try {
        const { limit } = req.query;
        const reminders = await TicketReminder.findAll({
            where: {
                task_date: {
                    [Op.gte]: new Date() // Future or today
                }
            },
            include: [
                {
                    model: db.Ticket,
                    include: [{ model: db.Customer, as: 'customer' }]
                }
            ],
            order: [['task_date', 'ASC']],
            limit: limit ? parseInt(limit as string) : 10
        });
        res.status(200).send(reminders);
    } catch (err: any) {
        console.error("Error in getAllUpcomingReminders:", err);
        res.status(500).send({
            message: err.message || "Some error occurred while retrieving upcoming Reminders."
        });
    }
};
// Get Recent FollowUps (Global)
export const getRecentFollowUps = async (req: Request, res: Response) => {
    try {
        const { limit } = req.query;
        const followUps = await TicketFollowUp.findAll({
            include: [
                {
                    model: db.Ticket,
                    include: [{ model: db.Customer, as: 'customer' }]
                },
                { model: db.User, as: 'creator', attributes: ['id', 'name', 'email'] }
            ],
            order: [['created_at', 'DESC']],
            limit: limit ? parseInt(limit as string) : 5
        });
        res.status(200).send(followUps);
    } catch (err: any) {
        console.error("Error in getRecentFollowUps:", err);
        res.status(500).send({
            message: err.message || "Some error occurred while retrieving recent FollowUps."
        });
    }
};

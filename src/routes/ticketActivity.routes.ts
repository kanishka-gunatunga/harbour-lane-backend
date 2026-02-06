import { Router } from 'express';
import { createFollowUp, getFollowUps, createReminder, getReminders, getAllUpcomingReminders, getRecentFollowUps } from '../controllers/ticketActivity.controller';

const router = Router();

// FollowUps
router.post('/tickets/:ticketId/followups', createFollowUp);
router.get('/tickets/:ticketId/followups', getFollowUps);
router.get('/followups/recent', getRecentFollowUps);

// Reminders
router.post('/tickets/:ticketId/reminders', createReminder);
router.get('/tickets/:ticketId/reminders', getReminders);
router.get('/reminders/upcoming', getAllUpcomingReminders);

export default router;

import { Router } from 'express';
import { listTickets, createTicket, updateTicket, getTicketDetails } from '../controllers/ticket.controller';

const router = Router();

router.get('/', listTickets);
router.post('/', createTicket);
router.put('/:id', updateTicket);
router.get('/:id', getTicketDetails);

export default router;

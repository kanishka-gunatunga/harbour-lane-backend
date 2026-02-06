import { Router } from 'express';
import * as chatController from '../controllers/chat.controller';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for file uploads
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

router.post('/start', chatController.startChat);
router.post('/:chat_id/request-agent', chatController.requestAgent);
router.get('/queue', chatController.getQueue);
router.post('/:chat_id/assign', chatController.assignChat);
router.post('/:chat_id/close', chatController.closeChat);
router.get('/:chat_id/messages', chatController.getMessages);
router.get('/agent/:user_id/assigned', chatController.getAssignedChats);
router.post('/:chat_id/rate', chatController.rateAgent);
router.post('/upload', upload.single('file'), chatController.uploadFile);
router.post('/verify-customer', chatController.verifyCustomer);
router.post('/verify-otp', chatController.verifyOtp);
router.post('/:chat_id/upgrade', chatController.upgradeSession);

// Facebook Webhook
router.get('/webhook', chatController.handleFacebookWebhook);
router.post('/webhook', chatController.handleFacebookEvent);

export default router;

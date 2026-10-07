import express from 'express';
import { createWidget, getWidgetById } from '../controllers/widget.controller.js';

const router = express.Router();

router.post('/', createWidget);
router.get('/widget/:tenantId', getWidgetById);
router.get('/test', (req, res) => {
    res.send('Test route is working');
});

export default router;

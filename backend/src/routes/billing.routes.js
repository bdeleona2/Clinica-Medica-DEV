import { Router } from 'express'; import * as B from '../controllers/billing.controller.js';
const r = Router();
r.get('/invoices', B.invoices); r.get('/invoices/:id', B.invoice); r.get('/invoices/:id/items', B.items);
r.post('/invoices', B.create); export default r;
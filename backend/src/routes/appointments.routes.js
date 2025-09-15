// file: src/routes/appointments.routes.js
import { Router } from 'express';
import * as C from '../controllers/appointments.controller.js';

const r = Router();
r.get('/', C.list);
r.get('/:id', C.get);
r.post('/', C.create);
r.put('/:id', C.update);
r.delete('/:id', C.remove);
export default r;

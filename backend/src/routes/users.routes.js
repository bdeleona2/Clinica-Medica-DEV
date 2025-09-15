import { Router } from 'express'; import { makeCrud } from '../controllers/crud.controller.js'; import { Users } from '../models/users.model.js';
const r = Router(); const c = makeCrud(Users);
r.get('/', c.list); r.get('/:id', c.get); r.post('/', c.create); r.put('/:id', c.update); r.delete('/:id', c.remove);
export default r;
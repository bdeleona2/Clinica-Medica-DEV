import { Router } from 'express'; import { overview } from '../controllers/stats.controller.js';
const r = Router(); r.get('/overview', overview); export default r;
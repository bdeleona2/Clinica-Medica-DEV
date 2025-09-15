import { query } from '../models/base.js'; import { ok } from '../utils/respond.js';
export async function overview(req,res){
  const [p, d, a, today] = await Promise.all([
    query('SELECT COUNT(*) c FROM patients'),
    query('SELECT COUNT(*) c FROM doctors'),
    query('SELECT COUNT(*) c FROM appointments'),
    query('SELECT COUNT(*) c FROM appointments WHERE date=CURDATE()')
  ]);
  ok(res, { patients: p[0].c, doctors: d[0].c, appointments: a[0].c, today: today[0].c });
}
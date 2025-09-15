// backend/src/controllers/doctors.controller.js
import * as Doctors from '../models/doctors.model.js';

export async function list(req, res, next) {
  try {
    const rows = await Doctors.all();
    res.json({ ok: true, data: rows });
  } catch (e) { next(e); }
}

export async function get(req, res, next) {
  try {
    const row = await Doctors.findById(req.params.id);
    if (!row) return res.status(404).json({ ok: false, message: 'Not found' });
    res.json({ ok: true, data: row });
  } catch (e) { next(e); }
}

export async function create(req, res, next) {
  try {
    const row = await Doctors.create(req.body);
    res.status(201).json({ ok: true, data: row });
  } catch (e) { next(e); }
}

export async function update(req, res, next) {
  try {
    const row = await Doctors.update(req.params.id, req.body);
    res.json({ ok: true, data: row });
  } catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try {
    await Doctors.remove(req.params.id);
    res.status(204).end();
  } catch (e) { next(e); }
}

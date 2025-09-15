// file: src/controllers/appointments.controller.js
import * as Appointments from '../models/appointments.model.js';

export async function list(req, res, next) {
  try {
    const rows = await Appointments.all();
    res.json(rows);
  } catch (err) { next(err); }
}

export async function get(req, res, next) {
  try {
    const row = await Appointments.findById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Not found' });
    res.json(row);
  } catch (err) { next(err); }
}

export async function create(req, res, next) {
  try {
    const row = await Appointments.create(req.body);
    res.status(201).json(row);
  } catch (err) { next(err); }
}

export async function update(req, res, next) {
  try {
    const row = await Appointments.update(req.params.id, req.body);
    res.json(row);
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    await Appointments.remove(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
}

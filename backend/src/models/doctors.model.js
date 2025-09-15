// backend/src/models/doctors.model.js
import { query } from './base.js';

// LISTAR
export async function all() {
  return await query(`
    SELECT id, nombre, especialidad, correo, telefono, horario, estado
    FROM doctors
    ORDER BY id DESC
  `);
}

// OBTENER POR ID
export async function findById(id) {
  const rows = await query(`
    SELECT id, nombre, especialidad, correo, telefono, horario, estado
    FROM doctors
    WHERE id = ? LIMIT 1
  `, [id]);
  return rows[0] || null;
}

// CREAR
export async function create(data) {
  const {
    nombre,
    especialidad,
    correo = null,
    telefono = null,
    horario = null,
    estado = 'active'
  } = data;

  if (!nombre || !especialidad) {
    throw new Error('nombre y especialidad son obligatorios');
  }

  const res = await query(`
    INSERT INTO doctors (nombre, especialidad, correo, telefono, horario, estado)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [nombre, especialidad, correo, telefono, horario, estado]);

  return await findById(res.insertId);
}

// ACTUALIZAR
export async function update(id, data) {
  const {
    nombre,
    especialidad,
    correo = null,
    telefono = null,
    horario = null,
    estado = 'active'
  } = data;

  await query(`
    UPDATE doctors
    SET nombre=?, especialidad=?, correo=?, telefono=?, horario=?, estado=?
    WHERE id=? LIMIT 1
  `, [nombre, especialidad, correo, telefono, horario, estado, id]);

  return await findById(id);
}

// ELIMINAR
export async function remove(id) {
  await query(`DELETE FROM doctors WHERE id=? LIMIT 1`, [id]);
  return { ok: true };
}

// Export agrupado opcional (por si en algún lugar importas { Doctors })
export const Doctors = { all, findById, create, update, remove };
export default Doctors;

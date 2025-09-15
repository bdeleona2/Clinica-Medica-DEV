/// file: src/models/appointments.model.js
import { query } from './base.js';

// Cache de mapeo detectado
let APPT_COLS = null;

// Protege nombres con backticks (date/time son reservadas)
const q = (id) => `\`${String(id).replace(/`/g, '``')}\``;

// Elige la 1ª coincidencia que exista en la tabla
function pick(cols, candidates) {
  const lower = cols.map(c => c.Field.toLowerCase());
  return candidates.find(c => lower.includes(c.toLowerCase())) || null;
}

// Descubre columnas reales en BD (appointments/patients/doctors) y cachea
async function resolveCols() {
  if (APPT_COLS) return APPT_COLS;

  const [apptCols, pCols, dCols] = await Promise.all([
    query('SHOW COLUMNS FROM appointments'),
    query('SHOW COLUMNS FROM patients'),
    query('SHOW COLUMNS FROM doctors'),
  ]);

  const dateCol   = pick(apptCols, ['date','fecha','appointment_date','fecha_cita']);
  const timeCol   = pick(apptCols, ['time','hora','appointment_time','hora_cita']);
  const typeCol   = pick(apptCols, ['type','tipo','appointment_type','tipo_cita']);
  const statusCol = pick(apptCols, ['status','estado','state','estatus']);

  if (!dateCol || !timeCol || !typeCol || !statusCol) {
    const miss = [
      ['date', dateCol], ['time', timeCol], ['type', typeCol], ['status', statusCol]
    ].filter(([_, v]) => !v).map(([k]) => k).join(', ');
    throw new Error(`appointments: faltan columnas (${miss}). Revisa tu esquema.`);
  }

  const pNameCol = pick(pCols, ['nombre','name','full_name']) || 'id';
  const dNameCol = pick(dCols, ['nombre','name','full_name']) || 'id';
  const dSpecCol = pick(dCols, ['especialidad','specialty']); // opcional

  APPT_COLS = { dateCol, timeCol, typeCol, statusCol, pNameCol, dNameCol, dSpecCol };
  return APPT_COLS;
}

// Normaliza el payload que viene del frontend (es/en)
function normalizePayload(data = {}) {
  return {
    patient_id: data.patient_id ?? data.paciente_id ?? data.pacienteId ?? data.patientId,
    doctor_id:  data.doctor_id  ?? data.medico_id   ?? data.medicoId   ?? data.doctorId,
    date:   data.fecha ?? data.date,
    time:   data.hora  ?? data.time,
    type:   data.tipo  ?? data.type,
    status: data.estado?? data.status,
  };
}

export async function all() {
  const { dateCol, timeCol, typeCol, statusCol, pNameCol, dNameCol, dSpecCol } = await resolveCols();
  const sql = `
    SELECT
      a.id,
      a.patient_id,
      a.doctor_id,
      a.${q(dateCol)}   AS fecha,
      a.${q(timeCol)}   AS hora,
      a.${q(typeCol)}   AS tipo,
      a.${q(statusCol)} AS estado,
      p.${q(pNameCol)}  AS paciente,
      d.${q(dNameCol)}  AS doctor,
      ${dSpecCol ? `d.${q(dSpecCol)} AS especialidad` : `NULL AS especialidad`}
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    JOIN doctors  d ON d.id = a.doctor_id
    ORDER BY a.${q(dateCol)} DESC, a.${q(timeCol)} DESC
  `;
  return await query(sql);
}

export async function findById(id) {
  const { dateCol, timeCol, typeCol, statusCol, pNameCol, dNameCol, dSpecCol } = await resolveCols();
  const sql = `
    SELECT
      a.id,
      a.patient_id,
      a.doctor_id,
      a.${q(dateCol)}   AS fecha,
      a.${q(timeCol)}   AS hora,
      a.${q(typeCol)}   AS tipo,
      a.${q(statusCol)} AS estado,
      p.${q(pNameCol)}  AS paciente,
      d.${q(dNameCol)}  AS doctor,
      ${dSpecCol ? `d.${q(dSpecCol)} AS especialidad` : `NULL AS especialidad`}
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    JOIN doctors  d ON d.id = a.doctor_id
    WHERE a.id = ?
    LIMIT 1
  `;
  const rows = await query(sql, [id]);
  return rows[0] || null;
}

export async function create(data) {
  const cols = await resolveCols();
  const p = normalizePayload(data);
  const sql = `
    INSERT INTO appointments (patient_id, doctor_id, ${q(cols.dateCol)}, ${q(cols.timeCol)}, ${q(cols.typeCol)}, ${q(cols.statusCol)})
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const res = await query(sql, [p.patient_id, p.doctor_id, p.date, p.time, p.type, p.status]);
  return await findById(res.insertId);
}

export async function update(id, data) {
  const cols = await resolveCols();
  const p = normalizePayload(data);
  const sql = `
    UPDATE appointments
       SET patient_id = ?,
           doctor_id  = ?,
           ${q(cols.dateCol)}   = ?,
           ${q(cols.timeCol)}   = ?,
           ${q(cols.typeCol)}   = ?,
           ${q(cols.statusCol)} = ?
     WHERE id = ?
     LIMIT 1
  `;
  await query(sql, [p.patient_id, p.doctor_id, p.date, p.time, p.type, p.status, id]);
  return await findById(id);
}

export async function remove(id) {
  await query('DELETE FROM appointments WHERE id = ? LIMIT 1', [id]);
  return { ok: true };
}

import dotenv from 'dotenv'; 
dotenv.config();
import { pool } from './src/models/db.js';
import bcrypt from 'bcryptjs';

async function run(){
  await pool.query('SET FOREIGN_KEY_CHECKS = 0');
  const tables = ['invoice_items','invoices','appointments','medical_records','imaging_orders','services','patients','doctors','users'];
  for(const t of tables){ 
    await pool.query(`TRUNCATE TABLE ${t}`).catch(()=>{}); 
  }
  await pool.query('SET FOREIGN_KEY_CHECKS = 1');

  const pass = await bcrypt.hash('Clinica123*',10);

  // Usuarios base
  await pool.query('INSERT INTO users (name,email,password_hash,role) VALUES ?',[
    [['Admin','admin@clinica.com',pass,'admin'],
     ['Recepcion','recep@clinica.com',pass,'receptionist'],
     ['Caja','caja@clinica.com',pass,'cashier'],
     ['Imagen','imagen@clinica.com',pass,'imaging'],
     ['Director','director@clinica.com',pass,'director']]
  ]);

  // Doctores
  const [dr1] = await pool.query(
    'INSERT INTO doctors (name, specialty, phone, email) VALUES (?,?,?,?)',
    ['Dr. José Pérez','Cardiología','555-1111','j.perez@clinica.com']
  );
  const doctor1Id = dr1.insertId;

  const [dr2] = await pool.query(
    'INSERT INTO doctors (name, specialty, phone, email) VALUES (?,?,?,?)',
    ['Dra. María López','Pediatría','555-2222','m.lopez@clinica.com']
  );
  const doctor2Id = dr2.insertId;

  // Crear usuarios para doctores
  await pool.query('INSERT INTO users (name,email,password_hash,role) VALUES ?',[
    [['Dr. José Pérez','j.perez@clinica.com',pass,'doctor'],
     ['Dra. María López','m.lopez@clinica.com',pass,'doctor']]
  ]);

  // Pacientes
  const [p1] = await pool.query(
    'INSERT INTO patients (name, dpi, dob, phone, email) VALUES (?,?,?,?,?)',
    ['Engels Tiu','1234567890101','1999-05-12','555-3333','engels@example.com']
  );
  const pat1Id = p1.insertId;

  const [p2] = await pool.query(
    'INSERT INTO patients (name, dpi, dob, phone, email) VALUES (?,?,?,?,?)',
    ['Camila Gómez','2890012345678','2001-09-01','555-4444','camila@example.com']
  );
  const pat2Id = p2.insertId;

  // Crear usuarios para pacientes
  await pool.query('INSERT INTO users (name,email,password_hash,role) VALUES ?',[
    [['Engels Tiu','engels@example.com',pass,'patient'],
     ['Camila Gómez','camila@example.com',pass,'patient']]
  ]);

  // Servicios
  await pool.query('INSERT INTO services (name, category, price) VALUES ?',[
    [['Consulta General','Consultas',150.00],
     ['Electrocardiograma','Imagenología',350.00],
     ['Rayos X Tórax','Imagenología',280.00],
     ['Vacuna Influenza','Vacunas',90.00]]
  ]);

  // Citas
  await pool.query(
    "INSERT INTO appointments (patient_id, doctor_id, date, time, reason, status) VALUES (?, ?, CURDATE(), ?, ?, ?)",
    [pat1Id, doctor1Id, '09:30','Dolor de pecho','PROGRAMADA']
  );

  await pool.query(
    "INSERT INTO appointments (patient_id, doctor_id, date, time, reason, status) VALUES (?, ?, DATE_ADD(CURDATE(), INTERVAL 1 DAY), ?, ?, ?)",
    [pat2Id, doctor2Id, '11:00','Control pediátrico','PROGRAMADA']
  );

  console.log('✅ Seed data inserted (usuarios de prueba para todos los roles, doctores y pacientes).');
  await pool.end();
}

run().catch(e=>{ 
  console.error(e); 
  process.exit(1); 
});

import { query, buildCrud } from './base.js';
import bcrypt from 'bcryptjs';

export const Users = buildCrud('users');

export async function findByEmail(email){
  const rows = await query('SELECT * FROM users WHERE email=?', [email]);
  return rows[0] || null;
}

export async function createUser({name,email,password,role}){
  const password_hash = await bcrypt.hash(password, 10);
  const [result] = await (await import('./db.js')).pool.query('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)',[name,email,password_hash,role]);
  return { id: result.insertId, name,email,role };
}

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { findByEmail, createUser } from '../models/users.model.js';
import { ok, fail } from '../utils/respond.js';

export async function login(req,res){
  const { email, password } = req.body;
  const user = await findByEmail(email);
  if(!user) return fail(res,'Credenciales inválidas',401);
  const match = await bcrypt.compare(password, user.password_hash);
  if(!match) return fail(res,'Credenciales inválidas',401);
  const token = jwt.sign({ id:user.id, role:user.role, name:user.name }, process.env.JWT_SECRET, { expiresIn: '8h' });
  ok(res, { token, user: { id:user.id, name:user.name, email:user.email, role:user.role } });
}
export async function register(req,res){
  const { name, email, password, role } = req.body;
  const created = await createUser({name,email,password,role});
  ok(res, created, 201);
}

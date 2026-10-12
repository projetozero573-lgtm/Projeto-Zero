import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
const email = process.env.ADMIN_EMAIL?.toLowerCase(),
  password = process.env.ADMIN_PASSWORD;
if (!email || !password || password.length < 12)
  throw new Error('Configure ADMIN_EMAIL e ADMIN_PASSWORD (mínimo 12 caracteres).');
const r = db
  .prepare("UPDATE users SET password=? WHERE email=? AND role='admin'")
  .run(bcrypt.hashSync(password, 12), email);
if (!r.changes) throw new Error('Administrador não encontrado.');
console.log(
  'Senha do administrador atualizada. Sessões existentes expiram em até 12h; troque JWT_SECRET para invalidá-las imediatamente.',
);
db.close();

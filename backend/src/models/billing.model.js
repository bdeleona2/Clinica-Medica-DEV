import { query } from './base.js';
export async function allInvoices(){ return await query('SELECT * FROM invoices ORDER BY created_at DESC'); }
export async function getInvoice(id){ const rows = await query('SELECT * FROM invoices WHERE id=?',[id]); return rows[0]||null; }
export async function itemsByInvoice(invoice_id){ return await query('SELECT ii.*, s.name as service_name FROM invoice_items ii JOIN services s ON s.id=ii.service_id WHERE invoice_id=?',[invoice_id]); }
export async function createInvoice({patient_id, items}){
  const conn = await (await import('./db.js')).pool.getConnection();
  try{
    await conn.beginTransaction();
    const [res] = await conn.query('INSERT INTO invoices (patient_id, status, total) VALUES (?,?,?)',[patient_id,'PAGADA',0]);
    const invoice_id = res.insertId;
    let total = 0;
    for(const it of items){
      const [srows] = await conn.query('SELECT price FROM services WHERE id=?',[it.service_id]);
      const price = srows[0]?.price || it.price || 0;
      const qty = it.quantity || 1;
      total += price * qty;
      await conn.query('INSERT INTO invoice_items (invoice_id, service_id, quantity, price) VALUES (?,?,?,?)',[invoice_id, it.service_id, qty, price]);
    }
    await conn.query('UPDATE invoices SET total=? WHERE id=?',[total, invoice_id]);
    await conn.commit();
    return { id: invoice_id, patient_id, total, status:'PAGADA' };
  }catch(e){
    await conn.rollback();
    throw e;
  }finally{
    conn.release();
  }
}

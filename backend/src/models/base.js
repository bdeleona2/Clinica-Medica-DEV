import { pool } from './db.js';

export async function query(sql, params=[]) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

export function buildCrud(table, id='id'){
  return {
    async all(){ return await query(`SELECT * FROM ${table} ORDER BY ${id} DESC`); },
    async get(idVal){ const rows = await query(`SELECT * FROM ${table} WHERE ${id}=?`, [idVal]); return rows[0] || null; },
    async create(data){
      const [result] = await pool.query(`INSERT INTO ${table} SET ?`, data);
      return { ...data, [id]: result.insertId };
    },
    async update(idVal, data){
      await pool.query(`UPDATE ${table} SET ? WHERE ${id}=?`, [data, idVal]);
      return this.get(idVal);
    },
    async remove(idVal){
      await pool.query(`DELETE FROM ${table} WHERE ${id}=?`, [idVal]);
      return true;
    }
  };
}

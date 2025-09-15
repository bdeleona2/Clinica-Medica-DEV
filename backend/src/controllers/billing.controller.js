import * as B from '../models/billing.model.js'; import { ok } from '../utils/respond.js';
export const invoices = async(req,res)=> ok(res, await B.allInvoices());
export const invoice = async(req,res)=> ok(res, await B.getInvoice(Number(req.params.id)));
export const items = async(req,res)=> ok(res, await B.itemsByInvoice(Number(req.params.id)));
export const create = async(req,res)=> ok(res, await B.createInvoice(req.body), 201);
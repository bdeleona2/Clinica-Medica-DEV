import { ok } from '../utils/respond.js';
export const makeCrud = (model) => ({
  list: async(req,res)=> ok(res, await model.all?.() ?? await model.all()),
  get: async(req,res)=> ok(res, await model.get(Number(req.params.id))),
  create: async(req,res)=> ok(res, await model.create(req.body), 201),
  update: async(req,res)=> ok(res, await model.update(Number(req.params.id), req.body)),
  remove: async(req,res)=> ok(res, await model.remove(Number(req.params.id)))
});
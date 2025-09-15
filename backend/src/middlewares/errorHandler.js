export function errorHandler(err, req, res, next){ 
  console.error('[Error]', err);
  const status = err.status || 500;
  res.status(status).json({ ok:false, message: err.message || 'Internal Server Error'});
}
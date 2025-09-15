import jwt from 'jsonwebtoken';
export function auth(requiredRoles = []){
  return (req,res,next)=>{
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if(!token){
      if(requiredRoles.length===0) return next(); // optional
      return res.status(401).json({ok:false, message:'Token requerido'});
    }
    try{
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload;
      if(requiredRoles.length && !requiredRoles.includes(payload.role)){
        return res.status(403).json({ok:false, message:'Sin permisos'});
      }
      next();
    }catch(e){
      return res.status(401).json({ok:false, message:'Token inválido'});
    }
  }
}
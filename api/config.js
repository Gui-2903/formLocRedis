//nao estamos usando mais este aqruivos para pegar informações de configuração no env, usando o configsredis
export default function handler(req, res) {
  res.status(200).json({ 
    user: process.env.ADMIN_USER || "admin-",
    pass: process.env.ADMIN_PASS || "admin-",
    expiresIn: process.env.JWT_EXPIRATION_SECONDS || "3600",
    evento: process.env.EVENTO || "Evento" ,
    ID: process.env.ID || "ID",
    targetLat: process.env.TARGET_LAT || 0,
    targetLng: process.env.TARGET_LNG || 0,
    allowedRadius: process.env.ALLOWED_RADIUS_METERS || 0,
    palestras: process.env.PALESTRAS || {}
  });
}
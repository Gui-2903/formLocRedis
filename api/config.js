export default function handler(req, res) {
  res.status(200).json({ 
    evento: process.env.EVENTO || "Evento" ,
    ID: process.env.ID || "ID",
    targetLat: process.env.TARGET_LAT || 0,
    targetLng: process.env.TARGET_LNG || 0,
    allowedRadius: process.env.ALLOWED_RADIUS_METERS || 0
  });
}
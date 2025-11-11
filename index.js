const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const adblockApp = require("./adblock-app");

const app = express();
app.use(cors());
app.use(express.json());

// 📂 Servir archivos estáticos del frontend
const publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath));

// 🏠 Página principal
app.get("/", (req, res) => {
  const filePath = path.join(publicPath, "index.html");
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("❌ No se encontró el archivo index.html en /public");
  }
});

// 🌍 Endpoint de lista de sitios
app.get("/api/sites", (req, res) => {
  try {
    const filePath = path.join(__dirname, "sites.json");
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "No existe sites.json" });
    }
    const data = fs.readFileSync(filePath, "utf8");
    const sites = JSON.parse(data);
    res.json({ success: true, total: sites.length, sites });
  } catch (err) {
    console.error("❌ Error leyendo sites.json:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🧹 Proxy inteligente con AdBlock dinámico
app.use("/proxy", (req, res, next) => {
  // Permitir que se muestre dentro de iframes locales
  res.removeHeader("x-frame-options");
  res.removeHeader("content-security-policy");
  res.setHeader("X-Frame-Options", "ALLOWALL");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  adblockApp(req, res, next);
});

// ⚙️ Manejo global de errores
app.use((err, req, res, next) => {
  console.error("🔥 Error global:", err);
  res.status(500).json({ success: false, error: "Error interno del servidor" });
});

// 🚀 Iniciar servidor
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`✅ AnimeWatch Backend corriendo en http://localhost:${PORT}`);
  console.log("🧩 Proxy AdBlock listo en /proxy?target=https://sitio.com");
});
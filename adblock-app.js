const fetch = require("node-fetch");
const cheerio = require("cheerio");
const micromatch = require("micromatch");

// 🚫 Patrones comunes de publicidad y rastreo
const blockedPatterns = [
  "*doubleclick.net*",
  "*googlesyndication.com*",
  "*googletagmanager.com*",
  "*adservice.google*",
  "*taboola.com*",
  "*outbrain.com*",
  "*zedo.com*",
  "*adnxs.com*",
  "*scorecardresearch.com*",
  "*analytics*",
  "*promo*",
  "*banner*",
  "*sponsor*",
  "*affiliate*",
  "*tracking*",
  "*advertising*",
  "*facebook.net*",
  "*snapchat.com*",
  "*tiktok.com*"
];

function isBlocked(u) {
  return micromatch.isMatch(u, blockedPatterns);
}

async function adblockApp(req, res) {
  const target = req.query.target;
  if (!target) {
    return res
      .status(400)
      .send("❌ Falta el parámetro 'target'. Ejemplo: /proxy?target=https://tioanime.com");
  }

  try {
    // 🧠 Cabeceras más completas para evitar bloqueos tipo 'Forbidden'
    const response = await fetch(target, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.1 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        "Referer": "https://www.google.com/",
        "Connection": "keep-alive",
        "Cache-Control": "no-cache"
      }
    });

    if (!response.ok) {
      return res
        .status(response.status)
        .send(`⚠️ Error al acceder a ${target}: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      const buffer = await response.arrayBuffer();
      res.setHeader("Content-Type", contentType);
      return res.send(Buffer.from(buffer));
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 🧹 Limpieza profunda de scripts, iframes y ads
    $("script, iframe, ins, noscript").each((_, el) => {
      const src = $(el).attr("src") || "";
      if (isBlocked(src)) $(el).remove();
    });

    // 🧼 Eliminar elementos con IDs o clases relacionados con anuncios
    $("[id*='ad'], [class*='ad'], [class*='banner'], [class*='sponsor'], [class*='popup']").remove();

    // 🚫 Eliminar overlays y ventanas emergentes molestas
    $("div[style*='position: fixed'], div[style*='position: absolute']").each((_, el) => {
      const zIndex = $(el).css("z-index");
      if (zIndex && parseInt(zIndex) > 1000) $(el).remove();
    });

    // 🧩 Corrige rutas relativas (CSS, imágenes, enlaces)
    const baseUrl = new URL(target);
    $("head").prepend(`<base href="${baseUrl.origin}/">`);

    // 🧠 Eliminar restricciones de seguridad
    $("meta[http-equiv='X-Frame-Options']").remove();
    $("meta[http-equiv='Content-Security-Policy']").remove();

    // 🎨 Tema oscuro limpio y tipografía moderna
    $("head").append(`
      <style>
        * { box-sizing: border-box; }
        body {
          background-color: #0a0a0a !important;
          color: #e6e6e6 !important;
          font-family: "Inter", system-ui, sans-serif;
          margin: 0;
          padding: 0;
        }
        a { color: #58a6ff !important; text-decoration: none; }
        a:hover { text-decoration: underline; }
        header, footer, [id*="ad"], [class*="ad"], [class*="banner"], [class*="popup"] {
          display: none !important;
        }
        img, video { max-width: 100%; height: auto; border-radius: 8px; }
      </style>
    `);

    // ✅ Enviar contenido limpio
    const cleanedHtml = $.html();
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(cleanedHtml);

  } catch (err) {
    console.error("❌ Error procesando:", err);
    res.status(500).send("Error interno del proxy: " + err.message);
  }
}

module.exports = adblockApp;

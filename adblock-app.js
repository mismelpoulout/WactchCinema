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
    const response = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "Accept-Language": "es-ES,es;q=0.9",
        "Referer": target
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

    // 🧹 Limpieza profunda de anuncios y rastreadores
    $("script, iframe, ins, noscript").each((_, el) => {
      const src = $(el).attr("src") || "";
      if (isBlocked(src)) $(el).remove();
    });

    // Eliminar elementos típicos de anuncios por ID o clase
    $("[id*='ad'], [class*='ad'], [class*='banner'], [class*='sponsor'], [class*='popup']").remove();

    // 🚫 Eliminar ventanas emergentes o modales intrusivos
    $("div[style*='position: fixed'], div[style*='position: absolute']").each((_, el) => {
      const zIndex = $(el).css("z-index");
      if (zIndex && parseInt(zIndex) > 1000) $(el).remove();
    });

    // ⚙️ Corrige rutas relativas para que carguen correctamente
    const baseUrl = new URL(target);
    $("head").prepend(`<base href="${baseUrl.origin}/">`);

    // 🧠 Eliminar bloqueos por “x-frame-options”
    $("meta[http-equiv='X-Frame-Options']").remove();
    $("meta[http-equiv='Content-Security-Policy']").remove();

    // 🎨 Ajuste opcional de estilo (oscuro y limpio)
    $("head").append(`
      <style>
        body {
          background-color: #0a0a0a !important;
          color: #f0f0f0 !important;
          font-family: system-ui, sans-serif;
        }
        a { color: #58a6ff !important; }
        header, footer, [id*="ad"], [class*="ad"], [class*="banner"], [class*="popup"] {
          display: none !important;
        }
      </style>
    `);

    const cleanedHtml = $.html();
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(cleanedHtml);

  } catch (err) {
    console.error("❌ Error procesando:", err);
    res.status(500).send("Error interno del proxy: " + err.message);
  }
}

module.exports = adblockApp;
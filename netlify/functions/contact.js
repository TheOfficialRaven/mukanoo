import { Resend } from "resend";

const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 4.5 * 1024 * 1024; // ~4.5 MB / fájl (base64 előtt)

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8"
  };
}

function json(statusCode, body, origin) {
  return {
    statusCode,
    headers: corsHeaders(origin),
    body: JSON.stringify(body)
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanText(value, max) {
  return String(value || "").trim().slice(0, max || 5000);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function handler(event) {
  const origin = event.headers.origin || event.headers.Origin || "*";

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" }, origin);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = cleanText(process.env.CONTACT_TO, 200);
  const from = cleanText(process.env.CONTACT_FROM, 200) || "Mukanoo <onboarding@resend.dev>";

  if (!apiKey) {
    return json(500, { ok: false, error: "Hiányzó RESEND_API_KEY" }, origin);
  }
  if (!to) {
    return json(500, { ok: false, error: "Hiányzó CONTACT_TO" }, origin);
  }

  var payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return json(400, { ok: false, error: "Érvénytelen JSON" }, origin);
  }

  // Honeypot
  if (payload.honey || payload._honey) {
    return json(200, { ok: true }, origin);
  }

  var vezeleknev = cleanText(payload.Vezeteknev || payload.vezeleknev, 120);
  var keresztnev = cleanText(payload.Keresztnev || payload.keresztnev, 120);
  var email = cleanText(payload.email, 200).toLowerCase();
  var telefon = cleanText(payload.Telefonszam || payload.telefon, 60);
  var uzenet = cleanText(payload.Uzenet || payload.uzenet, 5000);
  var privacy = payload.privacy === true || payload.privacy === "Igen" || payload.privacy === "igen";

  if (!vezeleknev || !keresztnev || !email || !telefon || !uzenet || !privacy) {
    return json(400, { ok: false, error: "Hiányzó kötelező mező" }, origin);
  }
  if (!isEmail(email)) {
    return json(400, { ok: false, error: "Érvénytelen e-mail" }, origin);
  }

  var photos = Array.isArray(payload.photos) ? payload.photos.slice(0, MAX_PHOTOS) : [];
  var attachments = [];

  for (var i = 0; i < photos.length; i++) {
    var photo = photos[i] || {};
    var name = cleanText(photo.name || ("foto-" + (i + 1) + ".jpg"), 180);
    var contentType = cleanText(photo.type || "application/octet-stream", 100);
    var data = String(photo.data || "");

    // data URL vagy nyers base64
    var base64 = data;
    var match = data.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      contentType = match[1] || contentType;
      base64 = match[2];
    }
    if (!base64) continue;

    var approxBytes = Math.floor((base64.length * 3) / 4);
    if (approxBytes > MAX_PHOTO_BYTES) {
      return json(400, { ok: false, error: "Egy csatolt kép túl nagy (max ~4.5 MB)." }, origin);
    }

    attachments.push({
      filename: name,
      content: base64,
      contentType: contentType
    });
  }

  var fullName = vezeleknev + " " + keresztnev;
  var subject = "Mukanoo — új megkeresés (" + fullName + ")";
  var html =
    "<div style=\"font-family:Georgia,serif;line-height:1.5;color:#2c2825\">" +
    "<h2 style=\"margin:0 0 1rem;font-weight:500\">Új kapcsolatfelvétel</h2>" +
    "<p><strong>Név:</strong> " + escapeHtml(fullName) + "</p>" +
    "<p><strong>E-mail:</strong> " + escapeHtml(email) + "</p>" +
    "<p><strong>Telefon:</strong> " + escapeHtml(telefon) + "</p>" +
    "<p><strong>Üzenet:</strong></p>" +
    "<p style=\"white-space:pre-wrap\">" + escapeHtml(uzenet) + "</p>" +
    (attachments.length
      ? "<p><strong>Csatolmányok:</strong> " + attachments.length + " fájl</p>"
      : "") +
    "</div>";

  var text =
    "Új kapcsolatfelvétel\n\n" +
    "Név: " + fullName + "\n" +
    "E-mail: " + email + "\n" +
    "Telefon: " + telefon + "\n\n" +
    "Üzenet:\n" + uzenet + "\n";

  try {
    var resend = new Resend(apiKey);
    var result = await resend.emails.send({
      from: from,
      to: [to],
      replyTo: email,
      subject: subject,
      html: html,
      text: text,
      attachments: attachments.length ? attachments : undefined
    });

    if (result.error) {
      return json(502, {
        ok: false,
        error: result.error.message || "Resend hiba"
      }, origin);
    }

    return json(200, { ok: true, id: result.data && result.data.id }, origin);
  } catch (err) {
    return json(500, {
      ok: false,
      error: (err && err.message) || "Ismeretlen szerverhiba"
    }, origin);
  }
}

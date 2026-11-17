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

/** Mukanoo hangulatú, email-kliensbarát HTML */
function buildEmailHtml(data) {
  var name = escapeHtml(data.fullName);
  var email = escapeHtml(data.email);
  var phone = escapeHtml(data.telefon);
  var message = escapeHtml(data.uzenet).replace(/\n/g, "<br>");
  var attachmentNote = data.attachmentCount
    ? "<tr><td style=\"padding:14px 0 0;border-top:1px solid #e4dfd8;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.5;color:#5e5852\">" +
      "<span style=\"display:inline-block;font-family:Georgia,serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#9c3642\">Csatolmány</span><br>" +
      data.attachmentCount + " fénykép érkezett az üzenettel." +
      "</td></tr>"
    : "";

  return (
    "<!DOCTYPE html><html lang=\"hu\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\"></head>" +
    "<body style=\"margin:0;padding:0;background:#f7f4ef;\">" +
    "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"background:#f7f4ef;padding:32px 16px;\">" +
    "<tr><td align=\"center\">" +
    "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:560px;background:#fcfcfc;border:1px solid #e4dfd8;\">" +
    /* fejléc */
    "<tr><td style=\"padding:28px 32px 22px;background:#fcfcfc;border-bottom:1px solid #e4dfd8;text-align:center\">" +
    "<div style=\"font-family:Georgia,'Times New Roman',serif;font-size:13px;letter-spacing:0.22em;text-transform:uppercase;color:#b99758\">Mukanoo</div>" +
    "<div style=\"margin-top:10px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:500;letter-spacing:-0.02em;line-height:1.2;color:#2c2825\">Új megkeresés érkezett</div>" +
    "<div style=\"margin:12px auto 0;width:48px;height:1px;background:#9c3642\"></div>" +
    "</td></tr>" +
    /* bevezető */
    "<tr><td style=\"padding:24px 32px 8px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.55;color:#5e5852;font-style:italic\">" +
    "Egy új üzenet érkezett a kapcsolatfelvételi űrlapon keresztül." +
    "</td></tr>" +
    /* mezők */
    "<tr><td style=\"padding:8px 32px 28px\">" +
    "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\">" +
    row("Név", name) +
    row("E-mail", "<a href=\"mailto:" + email + "\" style=\"color:#6f5630;text-decoration:underline\">" + email + "</a>") +
    row("Telefon", "<a href=\"tel:" + phone.replace(/\s/g, "") + "\" style=\"color:#6f5630;text-decoration:underline\">" + phone + "</a>") +
    "<tr><td style=\"padding:18px 0 0\">" +
    "<div style=\"font-family:Georgia,'Times New Roman',serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#9c3642;margin-bottom:8px\">Üzenet</div>" +
    "<div style=\"padding:16px 18px;background:#f7f4ef;border-left:2px solid #b99758;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6;color:#2c2825\">" +
    message +
    "</div></td></tr>" +
    attachmentNote +
    "</table></td></tr>" +
    /* lábléc */
    "<tr><td style=\"padding:18px 32px 24px;background:#efece6;border-top:1px solid #e4dfd8;text-align:center\">" +
    "<div style=\"font-family:Georgia,'Times New Roman',serif;font-size:13px;line-height:1.5;color:#5e5852;font-style:italic\">„Az egyediség nem méret és kor kérdése.”</div>" +
    "<div style=\"margin-top:10px;font-family:Georgia,'Times New Roman',serif;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#b99758\">Mukanoo</div>" +
    "</td></tr>" +
    "</table>" +
    "<div style=\"max-width:560px;margin:14px auto 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.45;color:#8a8a8a;text-align:center\">" +
    "Ez az üzenet a Mukanoo weboldal kapcsolatfelvételi űrlapjáról érkezett.<br>A válasz a feladó e-mail címére megy (Reply)." +
    "</div>" +
    "</td></tr></table></body></html>"
  );
}

function row(label, valueHtml) {
  return (
    "<tr><td style=\"padding:12px 0;border-bottom:1px solid #e4dfd8\">" +
    "<div style=\"font-family:Georgia,'Times New Roman',serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#9c3642;margin-bottom:4px\">" +
    escapeHtml(label) +
    "</div>" +
    "<div style=\"font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.45;color:#2c2825\">" +
    valueHtml +
    "</div></td></tr>"
  );
}

function buildEmailText(data) {
  return (
    "Mukanoo — új megkeresés\n\n" +
    "Egy új üzenet érkezett a kapcsolatfelvételi űrlapon keresztül.\n\n" +
    "Név: " + data.fullName + "\n" +
    "E-mail: " + data.email + "\n" +
    "Telefon: " + data.telefon + "\n\n" +
    "Üzenet:\n" + data.uzenet + "\n" +
    (data.attachmentCount ? "\nCsatolmány: " + data.attachmentCount + " fénykép\n" : "") +
    "\n—\n„Az egyediség nem méret és kor kérdése.”\n"
  );
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
  var mailData = {
    fullName: fullName,
    email: email,
    telefon: telefon,
    uzenet: uzenet,
    attachmentCount: attachments.length
  };

  var subject = "Mukanoo — új megkeresés · " + fullName;
  var html = buildEmailHtml(mailData);
  var text = buildEmailText(mailData);

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

// Envía por email la respuesta que la banda escribe en el panel y la guarda en el historial.
// Solo pueden usarla usuarios que hayan iniciado sesión en el panel.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
const esc = (t: unknown) =>
  String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const URL_ = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND = Deno.env.get("RESEND_API_KEY");
    const FROM = Deno.env.get("FROM_EMAIL");
    if (!RESEND || !FROM) return json({ error: "Faltan los secretos RESEND_API_KEY / FROM_EMAIL en Supabase." }, 500);

    // 1) ¿quién llama? (debe ser alguien de la banda con sesión iniciada)
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await createClient(URL_, ANON).auth.getUser(token);
    if (!u?.user) return json({ error: "No autorizado. Vuelve a iniciar sesión en el panel." }, 401);

    // 2) datos de entrada
    const body = await req.json();
    const text = String(body?.message ?? "").trim();
    if (text.length < 2 || text.length > 8000) return json({ error: "El mensaje está vacío o es demasiado largo." }, 400);

    const db = createClient(URL_, SERVICE);
    const { data: inq, error: e1 } = await db.from("inquiries").select("*").eq("id", body?.inquiry_id).single();
    if (e1 || !inq) return json({ error: "No se encontró el mensaje original." }, 404);
    if (!inq.email) return json({ error: "Ese mensaje no tiene email al que responder." }, 400);

    // 3) a qué dirección responderá la persona (la de contacto de la banda)
    let replyTo = Deno.env.get("REPLY_TO") || "";
    if (!replyTo) {
      const { data: s } = await db.from("settings").select("value").eq("key", "contact_email").maybeSingle();
      replyTo = s?.value || "";
    }

    const when = new Date(inq.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" });
    const original = String(inq.message ?? "");
    const plain = `${text}\n\n—\nMax Estrella · Rock en directo desde Madrid\n\nEn respuesta a tu mensaje del ${when}:\n${original.split("\n").map((l) => "> " + l).join("\n")}`;
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1a1414;max-width:600px">
      <div style="white-space:pre-wrap">${esc(text)}</div>
      <hr style="border:none;border-top:2px solid #c4283d;margin:28px 0 14px">
      <p style="margin:0;font-weight:bold;letter-spacing:.06em">MAX ★ ESTRELLA</p>
      <p style="margin:2px 0 18px;color:#666;font-size:14px">Rock en directo desde Madrid</p>
      <p style="margin:0 0 6px;color:#888;font-size:13px">En respuesta a tu mensaje del ${esc(when)}:</p>
      <blockquote style="margin:0;padding:8px 14px;border-left:3px solid #ccc;color:#666;font-size:14px;white-space:pre-wrap">${esc(original)}</blockquote></div>`;

    // 4) envío
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM, to: [inq.email], subject: "Re: Tu solicitud de contratación · Max Estrella",
        text: plain, html, ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!r.ok) {
      const detail = await r.text();
      console.error("Resend:", r.status, detail);
      return json({ error: `El servicio de email rechazó el envío (${r.status}). ${detail.slice(0, 200)}` }, 502);
    }

    // 5) historial + estado
    await db.from("inquiry_replies").insert({ inquiry_id: inq.id, body: text, sent_by: u.user.email });
    await db.from("inquiries").update({ read: true, replied_at: new Date().toISOString() }).eq("id", inq.id);
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});

// Avisa por email a la banda cuando alguien envía el formulario de contratación.
// Se activa con un Database Webhook (tabla inquiries, evento INSERT).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const esc = (t: unknown) =>
  String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json();
    const r = payload?.record;
    if (!r) return new Response("sin datos", { status: 400 });

    const RESEND = Deno.env.get("RESEND_API_KEY");
    const FROM = Deno.env.get("FROM_EMAIL");
    if (!RESEND || !FROM) return new Response("faltan secretos", { status: 500 });

    // destinatarios: NOTIFY_EMAIL (varios separados por coma) o, si no existe, el email de contacto de Ajustes
    let to = (Deno.env.get("NOTIFY_EMAIL") || "").split(",").map((s: string) => s.trim()).filter(Boolean);
    if (!to.length) {
      const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: s } = await db.from("settings").select("value").eq("key", "contact_email").maybeSingle();
      if (s?.value) to = [s.value];
    }
    if (!to.length) return new Response("sin destinatario", { status: 500 });

    const admin = Deno.env.get("ADMIN_URL") || "";
    const row = (k: string, v: unknown) => v ? `<tr><td style="padding:4px 14px 4px 0;color:#888;font-size:13px;white-space:nowrap">${k}</td><td style="padding:4px 0">${esc(v)}</td></tr>` : "";
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#1a1414;max-width:600px">
      <p style="margin:0 0 4px;font-weight:bold;letter-spacing:.06em;color:#c4283d">MAX ★ ESTRELLA · NUEVO MENSAJE</p>
      <h2 style="margin:0 0 16px">${esc(r.name)} te ha escrito desde la web</h2>
      <table style="border-collapse:collapse;margin-bottom:16px">${row("Email", r.email)}${row("Tipo de evento", r.kind)}${row("Fecha y lugar", r.date_place)}</table>
      <div style="white-space:pre-wrap;background:#f6f1e4;border-left:4px solid #c4283d;padding:14px 16px">${esc(r.message || "(sin mensaje)")}</div>
      ${admin ? `<p style="margin:24px 0 0"><a href="${esc(admin)}" style="background:#c4283d;color:#fff;text-decoration:none;padding:12px 22px;display:inline-block;font-weight:bold">Abrir en el panel y responder</a></p>` : ""}
    </div>`;
    const text = `Nuevo mensaje de ${r.name} (${r.email})\n${r.kind || ""} ${r.date_place || ""}\n\n${r.message || ""}\n\n${admin ? "Responder desde el panel: " + admin : ""}`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM, to, subject: `Nuevo mensaje de contratación: ${String(r.name || "").slice(0, 60)}`,
        html, text, ...(r.email ? { reply_to: r.email } : {}),
      }),
    });
    if (!res.ok) { console.error("Resend:", res.status, await res.text()); return new Response("fallo email", { status: 502 }); }
    return new Response("ok");
  } catch (e) {
    console.error(e);
    return new Response("error", { status: 500 });
  }
});

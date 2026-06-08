import nodemailer from "nodemailer";

function transporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new Error("SMTP_HOST, SMTP_USER, SMTP_PASS must be set");
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
}

export const tools = [
  {
    name: "email_send_outbound_draft",
    description: "Send an outbound sales or outreach email via SMTP",
    inputSchema: {
      type: "object",
      required: ["to", "subject", "body"],
      properties: {
        to: { type: "string", description: "Recipient email address" },
        from: { type: "string", description: "Sender address — defaults to SMTP_USER" },
        subject: { type: "string" },
        body: { type: "string", description: "Plain-text email body" },
        html: { type: "string", description: "Optional HTML version of the body" },
        replyTo: { type: "string" },
        cc: { type: "string" },
      },
    },
    handler: async ({ to, subject, body, html, replyTo, cc, from }) => {
      const t = transporter();
      const info = await t.sendMail({
        from: from || process.env.SMTP_USER,
        to,
        cc,
        replyTo,
        subject,
        text: body,
        html,
      });
      return { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
    },
  },
  {
    name: "email_log_activity",
    description: "Log an email activity record (sent/received) — writes to stdout for downstream ingestion into CRM or data store",
    inputSchema: {
      type: "object",
      required: ["direction", "contact_email", "subject"],
      properties: {
        direction: { type: "string", enum: ["sent", "received"] },
        contact_email: { type: "string" },
        contact_name: { type: "string" },
        subject: { type: "string" },
        body_snippet: { type: "string", description: "First 300 chars of the email body" },
        timestamp: { type: "string", description: "ISO timestamp — defaults to now" },
        thread_id: { type: "string" },
        hubspot_contact_id: { type: "string", description: "If set, activity will be associated to this HubSpot contact" },
      },
    },
    handler: async ({ hubspot_contact_id, timestamp, ...activity }) => {
      const record = {
        ...activity,
        timestamp: timestamp || new Date().toISOString(),
        logged_at: new Date().toISOString(),
      };

      // If a HubSpot contact ID is supplied, log an engagement via HubSpot API
      if (hubspot_contact_id) {
        const token = process.env.HUBSPOT_API_KEY;
        if (token) {
          const { default: axios } = await import("axios");
          await axios.post(
            "https://api.hubapi.com/crm/v3/objects/emails",
            {
              properties: {
                hs_email_direction: activity.direction === "sent" ? "EMAIL" : "INCOMING_EMAIL",
                hs_email_subject: activity.subject,
                hs_email_text: activity.body_snippet || "",
                hs_timestamp: record.timestamp,
              },
              associations: [
                {
                  to: { id: hubspot_contact_id },
                  types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 9 }],
                },
              ],
            },
            { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
          );
          record.hubspot_logged = true;
        }
      }

      console.log(JSON.stringify({ event: "email_activity", ...record }));
      return record;
    },
  },
];

import axios from "axios";
import { demoId, isDemoMode } from "./demo.js";

function client() {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN not set");
  return axios.create({
    baseURL: "https://slack.com/api",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
}

export const tools = [
  {
    name: "slack_send_alert",
    description: "Send a plain-text alert message to a Slack channel",
    inputSchema: {
      type: "object",
      required: ["channel", "message"],
      properties: {
        channel: { type: "string", description: "Channel name or ID, e.g. #gtm-alerts" },
        message: { type: "string" },
        username: { type: "string", description: "Display name for the bot" },
      },
    },
    handler: async ({ channel, message, username = "GTM Bot" }) => {
      if (isDemoMode()) {
        return {
          demo: true,
          ts: "1780941600.000100",
          channel,
          username,
          message,
        };
      }

      const { data } = await client().post("/chat.postMessage", {
        channel,
        text: message,
        username,
      });
      if (!data.ok) throw new Error(`Slack error: ${data.error}`);
      return { ts: data.ts, channel: data.channel };
    },
  },
  {
    name: "slack_post_lead_notification",
    description: "Post a rich lead notification card to Slack with contact and company details",
    inputSchema: {
      type: "object",
      required: ["channel", "lead"],
      properties: {
        channel: { type: "string" },
        lead: {
          type: "object",
          description: "Lead details to display",
          properties: {
            name: { type: "string" },
            title: { type: "string" },
            company: { type: "string" },
            email: { type: "string" },
            linkedin_url: { type: "string" },
            source: { type: "string", description: "Where this lead came from" },
            score: { type: "number", description: "Lead score 0-100" },
            notes: { type: "string" },
          },
        },
      },
    },
    handler: async ({ channel, lead }) => {
      if (isDemoMode()) {
        return {
          demo: true,
          ts: "1780941600.000200",
          channel,
          notification_id: demoId("lead_notification"),
          lead: {
            name: lead.name || "Maya Patel",
            title: lead.title || "Head of Growth",
            company: lead.company || "Northstar Analytics",
            email: lead.email || "maya.patel@example.com",
            score: lead.score ?? 87,
          },
        };
      }

      const fields = [
        lead.title && { type: "mrkdwn", text: `*Title*\n${lead.title}` },
        lead.company && { type: "mrkdwn", text: `*Company*\n${lead.company}` },
        lead.email && { type: "mrkdwn", text: `*Email*\n${lead.email}` },
        lead.source && { type: "mrkdwn", text: `*Source*\n${lead.source}` },
        lead.score != null && { type: "mrkdwn", text: `*Score*\n${lead.score}/100` },
      ].filter(Boolean);

      const blocks = [
        {
          type: "header",
          text: { type: "plain_text", text: `New Lead: ${lead.name || "Unknown"}` },
        },
        fields.length > 0 && { type: "section", fields },
        lead.linkedin_url && {
          type: "section",
          text: { type: "mrkdwn", text: `<${lead.linkedin_url}|View LinkedIn Profile>` },
        },
        lead.notes && {
          type: "section",
          text: { type: "mrkdwn", text: `*Notes*\n${lead.notes}` },
        },
      ].filter(Boolean);

      const { data } = await client().post("/chat.postMessage", { channel, blocks });
      if (!data.ok) throw new Error(`Slack error: ${data.error}`);
      return { ts: data.ts, channel: data.channel };
    },
  },
];

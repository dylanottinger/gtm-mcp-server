import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const expectedTools = [
  "hubspot_create_contact",
  "hubspot_update_contact",
  "hubspot_create_deal",
  "hubspot_search_companies",
  "hubspot_get_activity_history",
  "clay_enrich_person",
  "clay_enrich_company",
  "clay_find_lookalikes",
  "apollo_prospect_search",
  "apollo_contact_lookup",
  "slack_send_alert",
  "slack_post_lead_notification",
  "email_send_outbound_draft",
  "email_log_activity",
];

const transport = new StdioClientTransport({
  command: "node",
  args: ["index.js"],
  env: { ...process.env, DEMO_MODE: "true" },
});

const client = new Client({ name: "gtm-mcp-smoke-test", version: "1.0.0" });

try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  const names = tools.map((tool) => tool.name);
  const missing = expectedTools.filter((name) => !names.includes(name));

  if (tools.length !== expectedTools.length || missing.length) {
    throw new Error(
      `Expected ${expectedTools.length} tools, found ${tools.length}. Missing: ${missing.join(", ") || "none"}`
    );
  }

  console.log(`Smoke test passed: ${tools.length} tools registered.`);

  const demoCalls = [
    ["hubspot_create_contact", { email: "maya.patel@example.com", firstname: "Maya", lastname: "Patel" }],
    ["hubspot_update_contact", { contactId: "contact_demo123", lifecyclestage: "salesqualifiedlead" }],
    ["hubspot_create_deal", { dealname: "Northstar pilot", pipeline: "default", dealstage: "appointmentscheduled" }],
    ["hubspot_search_companies", { query: "northstaranalytics.example", limit: 1 }],
    ["hubspot_get_activity_history", { contactId: "contact_demo123", limit: 3 }],
    ["clay_enrich_person", { email: "maya.patel@example.com" }],
    ["clay_enrich_company", { domain: "northstaranalytics.example" }],
    ["clay_find_lookalikes", { domain: "northstaranalytics.example", limit: 2 }],
    ["apollo_prospect_search", { person_titles: ["Head of Growth"], per_page: 1 }],
    ["apollo_contact_lookup", { email: "maya.patel@example.com" }],
    ["slack_send_alert", { channel: "#gtm-alerts", message: "Demo lead scored above threshold." }],
    [
      "slack_post_lead_notification",
      {
        channel: "#gtm-alerts",
        lead: { name: "Maya Patel", title: "Head of Growth", company: "Northstar Analytics", score: 87 },
      },
    ],
    ["email_send_outbound_draft", { to: "maya.patel@example.com", subject: "Quick idea", body: "Worth comparing notes?" }],
    [
      "email_log_activity",
      {
        direction: "sent",
        contact_email: "maya.patel@example.com",
        subject: "Quick idea",
        hubspot_contact_id: "contact_demo123",
      },
    ],
  ];

  for (const [name, args] of demoCalls) {
    const result = await client.callTool({ name, arguments: args });
    if (result.isError) {
      throw new Error(`Demo call failed for ${name}: ${JSON.stringify(result.content)}`);
    }
  }

  console.log(`Demo mode passed: ${demoCalls.length} tool calls returned mock payloads.`);
} finally {
  await client.close();
}

import axios from "axios";
import { demoId, demoTimestamp, isDemoMode } from "./demo.js";

const BASE = "https://api.hubapi.com";

function client() {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) throw new Error("HUBSPOT_ACCESS_TOKEN not set");
  return axios.create({
    baseURL: BASE,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
}

export const tools = [
  {
    name: "hubspot_create_contact",
    description: "Create a new contact in HubSpot",
    inputSchema: {
      type: "object",
      required: ["email"],
      properties: {
        email: { type: "string" },
        firstname: { type: "string" },
        lastname: { type: "string" },
        phone: { type: "string" },
        company: { type: "string" },
        jobtitle: { type: "string" },
      },
    },
    handler: async ({ email, ...rest }) => {
      if (isDemoMode()) {
        return {
          demo: true,
          id: demoId("contact"),
          properties: {
            email,
            firstname: rest.firstname || "Avery",
            lastname: rest.lastname || "Chen",
            company: rest.company || "Northstar Analytics",
            jobtitle: rest.jobtitle || "VP of Revenue",
            createdate: demoTimestamp(),
          },
        };
      }

      const { data } = await client().post("/crm/v3/objects/contacts", {
        properties: { email, ...rest },
      });
      return { id: data.id, properties: data.properties };
    },
  },
  {
    name: "hubspot_update_contact",
    description: "Update an existing HubSpot contact by contact ID",
    inputSchema: {
      type: "object",
      required: ["contactId"],
      properties: {
        contactId: { type: "string" },
        firstname: { type: "string" },
        lastname: { type: "string" },
        phone: { type: "string" },
        company: { type: "string" },
        jobtitle: { type: "string" },
        lifecyclestage: { type: "string" },
      },
    },
    handler: async ({ contactId, ...properties }) => {
      if (isDemoMode()) {
        return {
          demo: true,
          id: contactId,
          properties: {
            email: "avery.chen@example.com",
            firstname: "Avery",
            lastname: "Chen",
            lifecyclestage: "salesqualifiedlead",
            ...properties,
            lastmodifieddate: demoTimestamp(),
          },
        };
      }

      const { data } = await client().patch(`/crm/v3/objects/contacts/${contactId}`, { properties });
      return { id: data.id, properties: data.properties };
    },
  },
  {
    name: "hubspot_create_deal",
    description: "Create a new deal in HubSpot",
    inputSchema: {
      type: "object",
      required: ["dealname", "pipeline", "dealstage"],
      properties: {
        dealname: { type: "string" },
        pipeline: { type: "string" },
        dealstage: { type: "string" },
        amount: { type: "number" },
        closedate: { type: "string", description: "ISO date string" },
        hubspot_owner_id: { type: "string" },
        associatedContactId: { type: "string", description: "Contact ID to associate with deal" },
      },
    },
    handler: async ({ associatedContactId, ...properties }) => {
      if (isDemoMode()) {
        return {
          demo: true,
          id: demoId("deal"),
          associatedContactId: associatedContactId || null,
          properties: {
            dealname: properties.dealname,
            pipeline: properties.pipeline,
            dealstage: properties.dealstage,
            amount: properties.amount || 42000,
            closedate: properties.closedate || "2026-07-31",
            createdate: demoTimestamp(),
          },
        };
      }

      const { data } = await client().post("/crm/v3/objects/deals", { properties });
      if (associatedContactId) {
        await client().put(`/crm/v3/objects/deals/${data.id}/associations/contacts/${associatedContactId}/3`);
      }
      return { id: data.id, properties: data.properties };
    },
  },
  {
    name: "hubspot_search_companies",
    description: "Search HubSpot companies by name or domain",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string", description: "Company name or domain to search" },
        limit: { type: "number", default: 10 },
      },
    },
    handler: async ({ query, limit = 10 }) => {
      if (isDemoMode()) {
        return [
          {
            id: demoId("company"),
            name: query.includes(".") ? "Northstar Analytics" : query,
            domain: query.includes(".") ? query : "northstaranalytics.example",
            industry: "Computer Software",
            numberofemployees: "220",
            annualrevenue: "18000000",
          },
          {
            id: demoId("company"),
            name: "SignalForge",
            domain: "signalforge.example",
            industry: "Marketing Technology",
            numberofemployees: "95",
            annualrevenue: "7400000",
          },
        ].slice(0, limit);
      }

      const { data } = await client().post("/crm/v3/objects/companies/search", {
        query,
        limit,
        properties: ["name", "domain", "industry", "numberofemployees", "annualrevenue"],
      });
      return data.results.map((r) => ({ id: r.id, ...r.properties }));
    },
  },
  {
    name: "hubspot_get_activity_history",
    description: "Get activity history (emails, calls, notes) for a HubSpot contact",
    inputSchema: {
      type: "object",
      required: ["contactId"],
      properties: {
        contactId: { type: "string" },
        limit: { type: "number", default: 20 },
      },
    },
    handler: async ({ contactId, limit = 20 }) => {
      if (isDemoMode()) {
        const activity = [
          { id: demoId("email"), subject: "Intro follow-up", occurred_at: "2026-06-03T16:30:00.000Z" },
          { id: demoId("call"), outcome: "Connected", occurred_at: "2026-06-05T18:00:00.000Z" },
          { id: demoId("note"), body: "Interested in Clay + HubSpot workflow automation.", occurred_at: demoTimestamp() },
        ].slice(0, limit);

        return [
          { type: "emails", items: activity.filter((item) => item.id.startsWith("email_")) },
          { type: "calls", items: activity.filter((item) => item.id.startsWith("call_")) },
          { type: "notes", items: activity.filter((item) => item.id.startsWith("note_")) },
          { type: "meetings", items: [{ id: demoId("meeting"), title: "Discovery call", contactId }] },
        ];
      }

      const types = ["emails", "calls", "notes", "meetings"];
      const results = await Promise.all(
        types.map((t) =>
          client()
            .get(`/crm/v3/objects/contacts/${contactId}/associations/${t}`)
            .then((r) => ({ type: t, items: r.data.results }))
            .catch(() => ({ type: t, items: [] }))
        )
      );
      return results;
    },
  },
];

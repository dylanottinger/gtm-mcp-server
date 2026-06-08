import axios from "axios";

const BASE = "https://api.hubapi.com";

function client() {
  const token = process.env.HUBSPOT_API_KEY;
  if (!token) throw new Error("HUBSPOT_API_KEY not set");
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

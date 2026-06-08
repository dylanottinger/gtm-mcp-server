import axios from "axios";

function client() {
  const token = process.env.CLAY_API_KEY;
  if (!token) throw new Error("CLAY_API_KEY not set");
  return axios.create({
    baseURL: "https://api.clay.com/v1",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
}

export const tools = [
  {
    name: "clay_enrich_person",
    description: "Enrich a person record using Clay — returns job title, social profiles, contact info",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string" },
        linkedin_url: { type: "string" },
        first_name: { type: "string" },
        last_name: { type: "string" },
        company_name: { type: "string" },
      },
    },
    handler: async (input) => {
      const { data } = await client().post("/enrichment/person", input);
      return data;
    },
  },
  {
    name: "clay_enrich_company",
    description: "Enrich a company record using Clay — returns firmographics, tech stack, headcount",
    inputSchema: {
      type: "object",
      properties: {
        domain: { type: "string" },
        company_name: { type: "string" },
        linkedin_url: { type: "string" },
      },
    },
    handler: async (input) => {
      const { data } = await client().post("/enrichment/company", input);
      return data;
    },
  },
  {
    name: "clay_find_lookalikes",
    description: "Find lookalike companies similar to a given company domain",
    inputSchema: {
      type: "object",
      required: ["domain"],
      properties: {
        domain: { type: "string", description: "Seed company domain, e.g. acme.com" },
        limit: { type: "number", default: 10 },
        filters: {
          type: "object",
          description: "Optional filters: industry, headcount_range, region",
          properties: {
            industry: { type: "string" },
            headcount_min: { type: "number" },
            headcount_max: { type: "number" },
            region: { type: "string" },
          },
        },
      },
    },
    handler: async ({ domain, limit = 10, filters = {} }) => {
      const { data } = await client().post("/lookalikes", { domain, limit, filters });
      return data;
    },
  },
];

import axios from "axios";
import { demoId, isDemoMode } from "./demo.js";

function client() {
  const token = process.env.CLAY_API_KEY;
  if (!token) throw new Error("CLAY_API_KEY not set");
  return axios.create({
    baseURL: process.env.CLAY_BASE_URL || "https://api.clay.com/v1",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
}

function endpoint(envName, fallback) {
  return process.env[envName] || fallback;
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
      if (isDemoMode()) {
        return {
          demo: true,
          person: {
            id: demoId("clay_person"),
            email: input.email || "maya.patel@example.com",
            first_name: input.first_name || "Maya",
            last_name: input.last_name || "Patel",
            title: "Head of Growth",
            company_name: input.company_name || "Northstar Analytics",
            linkedin_url: input.linkedin_url || "https://linkedin.com/in/maya-patel-example",
            confidence: 0.92,
          },
          enrichment: {
            work_email_status: "verified",
            seniority: "head",
            department: "growth",
          },
        };
      }

      const { data } = await client().post(endpoint("CLAY_PERSON_ENRICHMENT_PATH", "/enrichment/person"), input);
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
      if (isDemoMode()) {
        return {
          demo: true,
          company: {
            id: demoId("clay_company"),
            name: input.company_name || "Northstar Analytics",
            domain: input.domain || "northstaranalytics.example",
            linkedin_url: input.linkedin_url || "https://linkedin.com/company/northstar-analytics-example",
            industry: "B2B SaaS",
            employee_count: 220,
            estimated_revenue: "$10M-$25M",
            technologies: ["HubSpot", "Salesforce", "Segment"],
          },
        };
      }

      const { data } = await client().post(endpoint("CLAY_COMPANY_ENRICHMENT_PATH", "/enrichment/company"), input);
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
      if (isDemoMode()) {
        return {
          demo: true,
          seed_domain: domain,
          filters,
          companies: [
            { name: "SignalForge", domain: "signalforge.example", similarity_score: 0.91, employee_count: 95 },
            { name: "PipelineOS", domain: "pipelineos.example", similarity_score: 0.87, employee_count: 180 },
            { name: "RevBeacon", domain: "revbeacon.example", similarity_score: 0.83, employee_count: 64 },
          ].slice(0, limit),
        };
      }

      const { data } = await client().post(endpoint("CLAY_LOOKALIKE_PATH", "/lookalikes"), { domain, limit, filters });
      return data;
    },
  },
];

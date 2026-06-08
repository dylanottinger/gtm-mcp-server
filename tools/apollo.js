import axios from "axios";
import { demoId, isDemoMode } from "./demo.js";

function client() {
  const token = process.env.APOLLO_API_KEY;
  if (!token) throw new Error("APOLLO_API_KEY not set");
  return axios.create({
    baseURL: "https://api.apollo.io/api/v1",
    headers: { "x-api-key": token, "Content-Type": "application/json" },
  });
}

export const tools = [
  {
    name: "apollo_prospect_search",
    description: "Search for prospects in Apollo by title, company size, industry, location, etc.",
    inputSchema: {
      type: "object",
      properties: {
        person_titles: {
          type: "array",
          items: { type: "string" },
          description: "Job titles to target, e.g. ['VP of Sales', 'Head of Growth']",
        },
        organization_industry_tag_ids: {
          type: "array",
          items: { type: "string" },
          description: "Apollo industry tag IDs",
        },
        organization_num_employees_ranges: {
          type: "array",
          items: { type: "string" },
          description: "Employee count ranges, e.g. ['1,10', '11,50', '51,200']",
        },
        person_locations: {
          type: "array",
          items: { type: "string" },
          description: "Cities or countries, e.g. ['San Francisco, CA', 'United States']",
        },
        q_organization_keyword_tags: {
          type: "array",
          items: { type: "string" },
          description: "Keywords that describe the target company",
        },
        page: { type: "number", default: 1 },
        per_page: { type: "number", default: 25 },
      },
    },
    handler: async ({ page = 1, per_page = 25, ...filters }) => {
      if (isDemoMode()) {
        return {
          demo: true,
          total: 3,
          page,
          people: [
            {
              id: demoId("apollo_person"),
              name: "Maya Patel",
              title: filters.person_titles?.[0] || "Head of Growth",
              email: "maya.patel@example.com",
              linkedin_url: "https://linkedin.com/in/maya-patel-example",
              organization: "Northstar Analytics",
              location: "San Francisco, CA",
            },
            {
              id: demoId("apollo_person"),
              name: "Jordan Lee",
              title: "VP Sales",
              email: "jordan.lee@example.com",
              linkedin_url: "https://linkedin.com/in/jordan-lee-example",
              organization: "SignalForge",
              location: "Austin, TX",
            },
          ].slice(0, per_page),
        };
      }

      const { data } = await client().post("/mixed_people/api_search", {
        ...filters,
        page,
        per_page,
      });
      return {
        total: data.pagination?.total_entries,
        page: data.pagination?.page,
        people: (data.people || []).map((p) => ({
          id: p.id,
          name: p.name,
          title: p.title,
          email: p.email,
          linkedin_url: p.linkedin_url,
          organization: p.organization?.name,
          location: p.city,
        })),
      };
    },
  },
  {
    name: "apollo_contact_lookup",
    description: "Look up a specific contact in Apollo by email or LinkedIn URL to get enriched data",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string" },
        linkedin_url: { type: "string" },
        first_name: { type: "string" },
        last_name: { type: "string" },
        organization_name: { type: "string" },
      },
    },
    handler: async (input) => {
      if (isDemoMode()) {
        return {
          demo: true,
          found: true,
          id: demoId("apollo_person"),
          name: [input.first_name || "Maya", input.last_name || "Patel"].join(" "),
          title: "Head of Growth",
          email: input.email || "maya.patel@example.com",
          phone: "+14155550148",
          linkedin_url: input.linkedin_url || "https://linkedin.com/in/maya-patel-example",
          organization: input.organization_name || "Northstar Analytics",
          seniority: "head",
          departments: ["marketing", "growth"],
          location: "San Francisco, CA",
        };
      }

      const { data } = await client().post("/people/match", input);
      const p = data.person;
      if (!p) return { found: false };
      return {
        found: true,
        id: p.id,
        name: p.name,
        title: p.title,
        email: p.email,
        phone: p.phone_numbers?.[0]?.sanitized_number,
        linkedin_url: p.linkedin_url,
        organization: p.organization?.name,
        seniority: p.seniority,
        departments: p.departments,
        location: p.city,
      };
    },
  },
];

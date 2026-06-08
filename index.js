import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { tools as hubspotTools } from "./tools/hubspot.js";
import { tools as clayTools } from "./tools/clay.js";
import { tools as apolloTools } from "./tools/apollo.js";
import { tools as slackTools } from "./tools/slack.js";
import { tools as emailTools } from "./tools/email.js";

const allTools = [
  ...hubspotTools,
  ...clayTools,
  ...apolloTools,
  ...slackTools,
  ...emailTools,
];

const server = new McpServer({
  name: "gtm-mcp-server",
  version: "1.0.0",
});

function schemaToZod(def = {}, isRequired = true) {
  let field;

  if (def.enum?.length) {
    field = z.enum(def.enum);
  } else if (def.type === "string") {
    field = z.string();
  } else if (def.type === "number" || def.type === "integer") {
    field = z.number();
  } else if (def.type === "boolean") {
    field = z.boolean();
  } else if (def.type === "array") {
    field = z.array(schemaToZod(def.items || {}, true));
  } else if (def.type === "object") {
    field = z.object(jsonSchemaToZod(def.properties || {}, def.required || [])).passthrough();
  } else {
    field = z.any();
  }

  if (def.description) field = field.describe(def.description);
  if (def.default !== undefined) field = field.default(def.default);
  if (!isRequired && def.default === undefined) field = field.optional();

  return field;
}

// Convert the tool files' small JSON Schema subset into a Zod shape for MCP SDK registration.
function jsonSchemaToZod(properties = {}, required = []) {
  return Object.fromEntries(
    Object.entries(properties).map(([key, def]) => [
      key,
      schemaToZod(def, required.includes(key)),
    ])
  );
}

for (const tool of allTools) {
  const shape = jsonSchemaToZod(
    tool.inputSchema?.properties,
    tool.inputSchema?.required
  );

  server.tool(tool.name, tool.description, shape, async (args) => {
    try {
      const result = await tool.handler(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  });
}

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`GTM MCP Server running — ${allTools.length} tools registered`);

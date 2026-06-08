# GTM MCP Server

A single [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that wires together the tools a Go-To-Market team actually uses — HubSpot, Clay, Apollo, Slack, and email — so any MCP-compatible AI client (Claude Desktop, Claude Code, Cursor, etc.) can prospect, enrich, update your CRM, and fire off notifications without leaving the conversation.

## Tools

### HubSpot (5 tools)
| Tool | What it does |
|------|-------------|
| `hubspot_create_contact` | Create a new contact with email, name, company, title |
| `hubspot_update_contact` | Update any property on an existing contact by ID |
| `hubspot_create_deal` | Create a deal and optionally associate it to a contact |
| `hubspot_search_companies` | Full-text search across company name and domain |
| `hubspot_get_activity_history` | Fetch emails, calls, notes, and meetings for a contact |

### Clay (3 tools)
| Tool | What it does |
|------|-------------|
| `clay_enrich_person` | Enrich a person by email or LinkedIn — returns title, socials, contact info |
| `clay_enrich_company` | Enrich a company by domain — returns firmographics, tech stack, headcount |
| `clay_find_lookalikes` | Find companies similar to a seed domain, with optional filters |

Clay workspaces can expose enrichment through Enterprise API access, webhooks, or automation-backed routes. The Clay client uses sensible default paths, and `.env.example` includes path overrides so the same MCP tool surface can point at the routes your workspace actually supports.

### Apollo (2 tools)
| Tool | What it does |
|------|-------------|
| `apollo_prospect_search` | Search Apollo's database by title, industry, headcount, location |
| `apollo_contact_lookup` | Match a contact by email or LinkedIn and return enriched data |

### Slack (2 tools)
| Tool | What it does |
|------|-------------|
| `slack_send_alert` | Post a plain-text alert to any channel |
| `slack_post_lead_notification` | Post a rich Block Kit card with lead details to a channel |

### Email (2 tools)
| Tool | What it does |
|------|-------------|
| `email_send_outbound_draft` | Send an outbound email via SMTP (plain text or HTML) |
| `email_log_activity` | Log a sent/received email — optionally writes an engagement to HubSpot |

---

## Demo mode

Most reviewers will not have HubSpot, Clay, Apollo, Slack, and SMTP credentials ready. Set `DEMO_MODE=true` and every tool returns realistic mock payloads without making external API calls.

```bash
DEMO_MODE=true npm test
```

Demo mode is safe for portfolio walkthroughs: create/update actions return plausible IDs and summaries, notifications return Slack-like timestamps, and outbound email returns a nodemailer-style delivery result.

## Setup

### 1. Clone and install

```bash
git clone https://github.com/your-username/gtm-mcp-server.git
cd gtm-mcp-server
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env
```

| Variable | Where to get it |
|----------|----------------|
| `DEMO_MODE` | Set to `true` to return mock data instead of calling vendor APIs |
| `HUBSPOT_ACCESS_TOKEN` | HubSpot → Settings → Integrations → Private Apps → Access token |
| `CLAY_API_KEY` | Clay → Settings → API |
| `CLAY_BASE_URL` | Optional Clay Enterprise API or webhook base URL |
| `CLAY_PERSON_ENRICHMENT_PATH` | Optional person enrichment path override |
| `CLAY_COMPANY_ENRICHMENT_PATH` | Optional company enrichment path override |
| `CLAY_LOOKALIKE_PATH` | Optional lookalike route override |
| `APOLLO_API_KEY` | Apollo → Settings → Integrations → API Keys |
| `SLACK_BOT_TOKEN` | [api.slack.com/apps](https://api.slack.com/apps) → OAuth & Permissions → Bot Token (`xoxb-…`) |
| `SMTP_HOST` | Your mail provider (e.g. `smtp.gmail.com`) |
| `SMTP_USER` | Your sending address |
| `SMTP_PASS` | App password (not your account password) |

> **Gmail note:** Enable 2FA and create an [App Password](https://myaccount.google.com/apppasswords) — regular passwords won't work with SMTP.

### 3. Connect to Claude Desktop

Add the following to your `claude_desktop_config.json`  
(macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "gtm": {
      "command": "node",
      "args": ["/absolute/path/to/gtm-mcp-server/index.js"],
      "env": {
        "DEMO_MODE": "false",
        "HUBSPOT_ACCESS_TOKEN": "your_private_app_access_token",
        "CLAY_API_KEY": "your_token",
        "CLAY_BASE_URL": "https://api.clay.com/v1",
        "APOLLO_API_KEY": "your_token",
        "SLACK_BOT_TOKEN": "xoxb-your-token",
        "SMTP_HOST": "smtp.gmail.com",
        "SMTP_PORT": "587",
        "SMTP_USER": "you@yourdomain.com",
        "SMTP_PASS": "your_app_password"
      }
    }
  }
}
```

Restart Claude Desktop. The 14 tools will appear automatically.

### 4. Connect to Claude Code

```bash
claude mcp add gtm node /absolute/path/to/gtm-mcp-server/index.js \
  -e HUBSPOT_ACCESS_TOKEN=your_private_app_access_token \
  -e SLACK_BOT_TOKEN=xoxb-your-token
  # add remaining env vars
```

---

## Project structure

```
gtm-mcp-server/
├── tools/
│   ├── hubspot.js   # CRM — contacts, deals, companies, activity
│   ├── clay.js      # Enrichment — person, company, lookalikes
│   ├── apollo.js    # Prospecting — search and contact lookup
│   ├── slack.js     # Notifications — alerts and lead cards
│   ├── email.js     # Email — outbound send and activity logging
│   └── demo.js      # Shared demo-mode helpers
├── index.js         # Registers all tools, starts MCP stdio server
├── .env.example     # Environment variable template
└── package.json
```

Each tool file exports an array of `{ name, description, inputSchema, handler }` objects. `index.js` flattens them into a single MCP server — adding a new integration means creating one file and one import.

---

## Development

```bash
# Verify the MCP server starts and registers all tools
npm test

# Verify demo-mode tool calls without credentials
DEMO_MODE=true npm test

# Run with file watching
npm run dev

# Run once
npm start
```

The server communicates over stdio (standard MCP transport), so normal logs must not write to stdout. Startup messages, errors, and structured activity logs are written to stderr.

---

## Security notes

- Credentials are read exclusively from environment variables — no secrets belong in the codebase.
- HubSpot uses private app access-token framing (`HUBSPOT_ACCESS_TOKEN`), not deprecated API-key naming.
- `.env` is gitignored. Only `.env.example` (with placeholder values) is committed.
- Input validation is handled by the MCP SDK's schema layer before any handler runs.
- Demo mode short-circuits all provider calls before credentials are read.
- SMTP uses nodemailer v8+ which patches known SMTP injection vulnerabilities.
- Tool responses intentionally return compact summaries instead of raw provider payloads where possible.

---

## License

MIT

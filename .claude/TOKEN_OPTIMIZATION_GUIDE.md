# SGXP Token Optimization Guide

## Overview
This guide implements strategies from Anthropic's "Code Execution with MCP" approach to reduce token usage by up to 98.7% for common development tasks.

## Installed MCP Servers

### 1. GitHub MCP (`github`)
**Purpose**: Issue tracking, PR management, repository information
**When to use**:
- Creating or viewing issues
- Managing pull requests
- Getting repository statistics

**Token savings**: ~3,000-5,000 tokens per issue/PR lookup (vs. navigating GitHub in browser and pasting info)

### 2. Astro MCP (`astro-mcp`)
**Purpose**: Runtime project information, routing, integrations, Vite config
**Server URL**: `http://localhost:4321/__mcp/sse` (when dev server is running)

**Available tools**:
- `get-astro-config` - Project settings and paths
- `list-astro-routes` - All routes with type filtering
- `get-astro-server-address` - Dev server details
- `list-astro-integrations` - Available integrations
- `get-astro-integration` - Integration metadata
- `search-astro-docs` - Documentation search
- `get-vite-config` - Vite configuration

**Token savings**: ~2,000-4,000 tokens per query (vs. reading config files and manually parsing)

### 3. Svelte Documentation MCP (`svelte-docs`)
**Purpose**: Up-to-date Svelte 5 and SvelteKit documentation
**Why critical**: AI models trained before Svelte 5 lack knowledge of runes and modern syntax

**Token savings**: ~1,500-3,000 tokens per doc lookup (vs. copy-pasting docs)

## Code Execution Pattern (98.7% Token Reduction)

### The Problem
Traditional approach: Tool definitions and intermediate results consume 150,000+ tokens
- All MCP tools load upfront into context
- Every tool result passes through the model
- Large datasets (database queries, API responses) bloat context

### The Solution
Write TypeScript code that uses MCP servers as APIs, keeping data in execution environment

### How to Apply This to SGXP

#### Example 1: Database Queries (via Payload CMS)
**Traditional approach** (high tokens):
```
1. Ask Claude to query Payload CMS API
2. Claude reads all sprite records (10,000+ tokens)
3. Claude filters in context
4. Returns 5 relevant sprites
```

**Code execution approach** (low tokens):
```typescript
// Ask Claude to write and execute this code
const response = await fetch('your-payload-cms-api/sprites?limit=1000');
const sprites = await response.json();

// Filter locally in execution environment
const recentSprites = sprites.docs
  .filter(s => s.createdAt > '2025-01-01')
  .slice(0, 5);

console.log(recentSprites); // Only this goes to Claude's context
```

**Token reduction**: 10,000 → 500 tokens (95% reduction)

#### Example 2: AWS S3 File Listings
**Code execution approach**:
```typescript
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const client = new S3Client({ region: 'us-east-1' });
const command = new ListObjectsV2Command({
  Bucket: 'sgxp-sprites',
  Prefix: 'user-uploads/'
});

const response = await client.send(command);

// Filter in execution environment
const recentUploads = response.Contents
  .filter(obj => obj.LastModified > new Date('2025-01-01'))
  .map(obj => ({ key: obj.Key, size: obj.Size }));

console.log(recentUploads); // Only summary to Claude
```

**Token reduction**: 50,000 → 1,000 tokens (98% reduction)

#### Example 3: Component Analysis
**Code execution approach**:
```typescript
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

// Get all Svelte components
const componentsDir = './src/components';
const files = await readdir(componentsDir);
const svelteFiles = files.filter(f => f.endsWith('.svelte'));

// Analyze components locally
const analysis = await Promise.all(
  svelteFiles.map(async (file) => {
    const content = await readFile(join(componentsDir, file), 'utf-8');
    return {
      name: file,
      hasScript: content.includes('<script'),
      hasRunes: /\$state|\$derived|\$effect/.test(content),
      linesOfCode: content.split('\n').length
    };
  })
);

// Only send summary to Claude
console.log(analysis);
```

**Token reduction**: 20,000 → 800 tokens (96% reduction)

## Progressive Tool Discovery

Instead of loading all tools upfront, explore tools on-demand:

**Before (loads everything)**:
```
All MCP servers + all tools loaded → 5,000 tokens baseline
```

**After (progressive)**:
```
1. Ask: "What Astro MCP tools are available?" → Explore filesystem
2. Use only: get-astro-routes → Load single tool definition
3. Execute and filter in code → Minimal tokens
```

**Token savings**: 4,500 tokens per session

## Practical Workflow Tips

### 1. Start Dev Server Before MCP Usage
Astro MCP requires the dev server running:
```bash
npm run dev
```
This enables `http://localhost:4321/__mcp/sse`

### 2. Use Specific Queries
**Bad** (high tokens):
```
"Look at all components and find issues"
```

**Good** (low tokens):
```
"Check LoginForm.svelte:15-30 for Svelte 5 runes compatibility"
```

**Token savings**: 15,000 → 500 tokens

### 3. Batch Related Operations in Code
**Bad** (sequential tool calls):
```
1. Call get-astro-routes
2. Call get-astro-config
3. Call list-astro-integrations
```
Each call: ~2,000 tokens = 6,000 total

**Good** (single code execution):
```typescript
const routes = await astroMcp.getRoutes();
const config = await astroMcp.getConfig();
const integrations = await astroMcp.listIntegrations();

// Process all locally, return summary
```
Total: ~800 tokens (87% reduction)

### 4. Keep Sensitive Data Out of Context
Payload CMS credentials, S3 keys, user data stay in execution environment:
```typescript
// This runs locally, credentials never go to Claude
const payloadToken = process.env.PAYLOAD_API_KEY;
const data = await fetch(payloadUrl, {
  headers: { Authorization: `Bearer ${payloadToken}` }
});

// Only send sanitized results to Claude
console.log({ count: data.totalDocs, success: true });
```

### 5. Leverage Memory Files
You've already created `.claude/CLAUDE.md` which saves ~1,000 tokens per session.

**Add more context**:
```bash
# Quick add during conversation
# API endpoints and routes
```
This stores it permanently in CLAUDE.md

## Measuring Success

### Use /cost Command
After each session:
```
/cost
```
Review token usage and compare to previous sessions

### Expected Baselines

**Before optimization**:
- Simple task: 15,000-25,000 tokens
- Medium task: 40,000-80,000 tokens
- Complex task: 100,000-200,000 tokens

**After optimization**:
- Simple task: 2,000-5,000 tokens (80-83% reduction)
- Medium task: 5,000-15,000 tokens (81-88% reduction)
- Complex task: 15,000-40,000 tokens (80-85% reduction)

### Target Costs
- **Before**: $100-200/month
- **After**: $20-50/month (75-80% reduction)

## MCP Server Status Check

Verify all servers are connected:
```
/mcp
```

Should show:
- ✓ github (http)
- ✓ svelte-docs (http)
- ✓ astro-mcp (sse, when dev server running)

## Troubleshooting

### Astro MCP Not Connecting
**Issue**: Server not found
**Fix**: Ensure dev server is running (`npm run dev`)

### Svelte Docs Outdated
**Issue**: Getting old Svelte 4 syntax
**Fix**: Check MCP connection with `/mcp`, re-add if needed

### High Token Usage Persists
**Issue**: Still using 50,000+ tokens
**Fix checklist**:
1. Are you using code execution pattern?
2. Is data being filtered locally?
3. Are queries specific, not broad?
4. Did you use /compact recently?

## Next Steps

1. **Test the setup**: Run `npm run dev`, then ask Claude to query Astro routes using astro-mcp
2. **Practice code execution**: Ask Claude to write filtering code instead of passing raw data
3. **Monitor costs**: Use `/cost` after each session to track improvement
4. **Add more memories**: Store common patterns in `.claude/CLAUDE.md`

## Advanced Optimization

### Create Reusable MCP Code Modules
Save frequently used patterns in `.claude/mcp-helpers/`:

**Example**: `.claude/mcp-helpers/sprite-queries.ts`
```typescript
export async function getRecentSprites(limit = 10) {
  const response = await fetch(`${process.env.PAYLOAD_URL}/api/sprites`);
  const data = await response.json();
  return data.docs.slice(0, limit);
}
```

Reference in prompts: "Use the getRecentSprites helper to fetch sprites"

**Token savings**: Reusing code modules saves 1,000-3,000 tokens per query

---

**Remember**: The goal is to keep intermediate data in the execution environment and only pass summaries/results to Claude's context. This is how you achieve 95-98% token reductions.

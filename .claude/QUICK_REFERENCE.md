# Token Optimization Quick Reference

## Daily Workflow Checklist

### Before Starting Development
- [ ] Run `npm run dev` (enables Astro MCP at localhost:4321)
- [ ] Check MCP status: `/mcp`
- [ ] Review session cost: `/cost`

### During Development

#### ✓ DO (Low Token Usage)
- ✓ Be specific: "Check LoginForm.svelte:25 for runes syntax"
- ✓ Write code that filters data locally
- ✓ Use MCP servers for documentation/config instead of reading files
- ✓ Store reusable context in `.claude/CLAUDE.md` using `#` shortcut
- ✓ Use `/compact` when context gets large

#### ✗ DON'T (High Token Usage)
- ✗ Broad queries: "Look at everything and find bugs"
- ✗ Pass large datasets through Claude's context
- ✗ Repeat project setup every conversation
- ✗ Read all files when you need one piece of info
- ✗ Let conversations run forever without `/compact`

### Code Execution Pattern Template

When working with large datasets, ask Claude to write code like this:

```typescript
// Fetch data
const data = await fetch('api-endpoint');
const items = await data.json();

// Filter/process locally (not in Claude's context)
const filtered = items
  .filter(/* your criteria */)
  .slice(0, 10);

// Only send summary to Claude
console.log(filtered);
```

### MCP Server Quick Commands

**Check connection status**:
```
/mcp
```

**Add new server**:
```bash
claude mcp add --transport http --scope project <name> <url>
```

**Remove server**:
```bash
claude mcp remove <name>
```

**List all servers**:
```bash
claude mcp list
```

### Installed Servers

1. **github** - Issue/PR management
2. **svelte-docs** - Svelte 5 documentation (use instead of guessing syntax!)
3. **astro-mcp** - Project routes, config, integrations (requires dev server)

### Cost Monitoring

**View session cost**:
```
/cost
```

**Target usage per task**:
- Simple edit: < 5,000 tokens
- Feature addition: < 15,000 tokens
- Major refactor: < 40,000 tokens

### Memory Management

**Add memory mid-conversation**:
```
# Your important context here
```
Then select which memory file to save to

**Memory files**:
- `.claude/CLAUDE.md` - Project context (already created)
- Create more as needed for specific domains

### Context Management

**When context is bloated**:
```
/compact
```

**Starting fresh task**:
```
/clear
```

### Svelte 5 Specific

**Always use MCP for Svelte 5 syntax** - AI models were trained before Svelte 5, so svelte-docs MCP is critical for:
- Runes (`$state`, `$derived`, `$effect`)
- Component syntax changes
- SvelteKit updates

**Bad**: "Create a Svelte component with reactive state"
(Claude might use old `let count = 0` syntax)

**Good**: "Use svelte-docs MCP to check Svelte 5 state management, then create a component"
(Claude uses current `let count = $state(0)` syntax)

### Expected Token Reductions

| Task Type | Before | After | Savings |
|-----------|--------|-------|---------|
| Doc lookup | 3,000 | 500 | 83% |
| Database query | 10,000 | 500 | 95% |
| File analysis | 20,000 | 800 | 96% |
| API integration | 50,000 | 1,000 | 98% |

### Troubleshooting

**"Astro MCP not found"**
→ Start dev server: `npm run dev`

**"Getting old Svelte 4 code"**
→ Specify: "Use svelte-docs MCP for Svelte 5 syntax"

**"Still using 50k+ tokens"**
→ Check: Are you using code execution pattern? Is data filtered locally?

### Monthly Cost Targets

- **Before optimization**: $100-200
- **After optimization**: $20-50
- **Reduction**: 75-80%

---

**Pro Tip**: The most impactful optimization is the code execution pattern - always ask yourself "Can this data be filtered before it reaches Claude's context?"

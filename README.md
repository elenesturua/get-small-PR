# GitHub PR Readiness Checker

This is an MCP server I built using the mcp-use SDK that helps you quickly check if a GitHub pull request is ready to merge. It pulls data from GitHub's API and shows it in a clean widget UI.

## What It Does

The main idea is simple: give it a GitHub PR, and it tells you if it's ready to merge or what's blocking it.

**The tool (fetch-github-pr)** grabs all the important information:

- How many approvals it has
- CI check status
- Whether there are merge conflicts
- How big the PR is (files changed, lines added/removed)
- Who needs to review it

**The widget (pr-readiness)** displays everything in a way that's easy to scan. You can see at a glance if a PR is good to go or what still needs to happen.

## Why I Built It This Way

I wanted to make something actually useful. When you're waiting on a PR, you usually have to click through multiple GitHub tabs to see approvals, checks, files changed, etc. This puts it all in one place.

The widget uses a traffic light system:

- READY (green) - All checks passed, has approvals, no conflicts
- PENDING (orange) - Waiting on approvals or checks
- BLOCKED (red) - Has conflicts or failing checks

I also added a "Next Actions" section that tells you exactly what needs to happen, like "Request 1 more approval" or "Fix 2 failing checks."

## Setup

```
cd my-mcp-server
npm install
npm run dev
```

Then open http://localhost:3000/inspector to test it out.

## Testing It

In the inspector, try the fetch-github-pr tool with any public GitHub PR:

```
{
  "owner": "mcp-use",
  "repo": "supabase",
  "prNumber": 99
}
```

It'll fetch the data and show it in the widget. You can test with your own PRs too.

## How It Works

1. You call fetch-github-pr with a repo and PR number
2. The server hits GitHub's API to get:
   - Basic PR info
   - Reviews and approvals
   - CI check runs
   - Changed files
3. It processes everything and figures out the status
4. Returns the data which automatically renders in the widget

No GitHub token needed for public repos, which is nice. For private repos you'd need to add one to .env.

## Design Decisions

**Progress bars:** I added visual progress bars for approvals and CI checks because they're way easier to read than just numbers. You can instantly see "oh, 2 out of 3 checks passed."

**Collapsible sections:** The details (which specific checks failed, which files changed) are hidden by default so the widget doesn't feel overwhelming. But you can expand them if you need more info.

**Theme support:** Works in both light and dark mode

## Tech Stack

- TypeScript
- React (for the widget)
- mcp-use SDK (Apps SDK widgets)
- Zod for validation
- GitHub REST API

## Widget Features

The widget shows:

**Top section:**

- Repo name and PR number
- PR title and author
- Big status badge
- Link to view the PR on GitHub

**Metrics grid (2x2):**

- Approvals with progress bar
- CI checks with progress bar
- Code changes (files, +lines, -lines)
- Merge status and whether it's a draft

**Next Actions:**
Only shows up if there's something you need to do. Lists 1-3 specific actions in priority order.

**Expandable details:**

- Failed/pending check names
- List of changed files
- Requested reviewers

## Notes

This was my first time using the MCP protocol and mcp-use. The documentation was pretty helpful though I had to experiment a bit to get the widget styling right.

I focused on making the UI really scannable since the whole point is to quickly assess PR readiness. Used inline styles instead of a CSS library to keep it simple and avoid dependencies.

The status logic prioritizes blockers (conflicts, failing checks) over pending states, which felt like the right call. If something is actively broken, that should show as BLOCKED rather than just PENDING.

## Project Structure

```
my-mcp-server/
├── index.ts                 # Server setup and tools
├── resources/
│   ├── pr-readiness.tsx     # The widget component
│   └── styles.css           # Shared styles
└── package.json
```

Pretty straightforward. The widget auto-registers as a tool since it's in the resources folder.

## Resources

- mcp-use docs: https://docs.mcp-use.com
- GitHub REST API: https://docs.github.com/en/rest

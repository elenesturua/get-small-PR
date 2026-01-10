import { MCPServer } from "mcp-use/server";
import { z } from "zod";

// Create MCP server instance
const server = new MCPServer({
  name: "my-mcp-server",
  version: "1.0.0",
  description: "My first MCP server with all features",
  baseUrl: process.env.MCP_URL || "http://localhost:3000", // Full base URL (e.g., https://myserver.com)
  // favicon: "favicon.ico", // Uncomment and add your favicon to public/ folder
});

/**
 * Define UI Widgets
 * All React components in the `resources/` folder
 * are automatically registered as MCP tools and resources.
 *
 * Just export widgetMetadata with description and Zod schema,
 * and mcp-use handles the rest!
 *
 * It will automatically add to your MCP server:
 * - server.tool('kanban-board')
 * - server.tool('display-weather')
 * - server.resource('ui://widget/kanban-board')
 * - server.resource('ui://widget/display-weather')
 *
 * Docs: https://docs.mcp-use.com/typescript/server/ui-widgets
 */

/*
 * Define MCP tools
 * Docs: https://docs.mcp-use.com/typescript/server/tools
 */
server.tool(
  {
    name: "fetch-weather",
    description: "Fetch the weather for a city",
    schema: z.object({
      city: z.string().describe("The city to fetch the weather for"),
    }),
  },
  async ({ city }) => {
    const response = await fetch(`https://wttr.in/${city}?format=j1`);
    const data: any = await response.json();
    const current = data.current_condition[0];
    return {
      content: [
        {
          type: "text",
          text: `The weather in ${city} is ${current.weatherDesc[0].value}. Temperature: ${current.temp_C}°C, Humidity: ${current.humidity}%`,
        },
      ],
    };
  }
);

server.tool(
  {
    name: "fetch-github-pr",
    description: "Fetch GitHub pull request data for readiness assessment",
    schema: z.object({
      owner: z.string().describe("The GitHub repository owner (username)"),
      repo: z.string().describe("The repository name"),
      prNumber: z.number().describe("The pull request number"),
    }),
  },
  async ({ owner, repo, prNumber }) => {
    try {
      const prResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`
      );
      const prData: any = await prResponse.json();

      const reviewsResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`
      );
      const reviews: any[] = reviewsResponse.ok ? await reviewsResponse.json() : [];

      const checksResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits/${prData.head.sha}/check-runs`
      );
      const checksData: any = checksResponse.ok ? await checksResponse.json() : { check_runs: [] };

      const commentsResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`
      );
      const comments: any[] = commentsResponse.ok ? await commentsResponse.json() : [];

      const approvals = reviews.filter((r) => r.state === "APPROVED").length;
      const requestedReviewers = prData.requested_reviewers?.length || 0;
      const checkRuns = checksData.check_runs || [];
      const passingChecks = checkRuns.filter(
        (c: any) => c.status === "completed" && c.conclusion === "success"
      ).length;
      const totalChecks = checkRuns.filter(
        (c: any) => c.status === "completed"
      ).length;
      const hasConflicts = prData.mergeable === false;

      let status: "ready" | "pending" | "not-ready" = "ready";
      const issues: string[] = [];

      if (hasConflicts) {
        status = "not-ready";
        issues.push("Resolve the existing merge conflicts before merging");
      }

      if (approvals < Math.max(1, requestedReviewers)) {
        status = status === "ready" ? "pending" : "not-ready";
        issues.push(`Needs ${Math.max(1, requestedReviewers) - approvals} more approval(s)`);
      }

      if (totalChecks > 0 && passingChecks < totalChecks) {
        status = status === "ready" ? "pending" : "not-ready";
        issues.push(`${totalChecks - passingChecks} check(s) failing`);
      }

      if (prData.draft) {
        status = "not-ready";
        issues.push("PR is still in draft");
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              prNumber,
              title: prData.title,
              status,
              approvals,
              requestedReviewers,
              commentsCount: comments.length,
              checkStatus: {
                passing: passingChecks,
                total: totalChecks,
              },
              author: prData.user.login,
              draft: prData.draft,
              hasConflicts,
              issues,
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching PR data: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

/*
 * Define MCP resources
 * Docs: https://docs.mcp-use.com/typescript/server/resources
 */
server.resource({
  name: "config",
  uri: "config://settings",
  mimeType: "application/json",
  description: "Server configuration",
  readCallback: async () => ({
    contents: [
      {
        uri: "config://settings",
        mimeType: "application/json",
        text: JSON.stringify({
          theme: "dark",
          language: "en",
        }),
      },
    ],
  }),
});

/*
 * Define MCP prompts
 * Docs: https://docs.mcp-use.com/typescript/server/prompts
 */
server.prompt(
  {
    name: "review-code",
    description: "Review code for best practices and potential issues",
    args: [{ name: "code", type: "string", required: true }],
  },
  async (params: Record<string, any>) => {
    const { code } = params;
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please review this code:\n\n${code}`,
          },
        },
      ],
    };
  }
);

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
console.log(`Server running on port ${PORT}`);
// Start the server
server.listen(PORT);

import { MCPServer } from "mcp-use/server";
import { z } from "zod";

// Create MCP server instance
const server = new MCPServer({
  name: "github-pr-readiness",
  version: "1.0.0",
  description: "GitHub PR readiness assessment with interactive UI widget",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
});

/**
 * Define UI Widgets
 * React components in the `resources/` folder are automatically registered as MCP tools and resources.
 *
 * Just export widgetMetadata with description and Zod schema, and mcp-use handles the rest!
 *
 * This server includes:
 * - server.tool('pr-readiness')
 * - server.resource('ui://widget/pr-readiness')
 *
 * Docs: https://docs.mcp-use.com/typescript/server/ui-widgets
 */

/*
 * Define MCP tools
 * Docs: https://docs.mcp-use.com/typescript/server/tools
 */
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

      // Fetch PR files to get top files
      const filesResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`
      );
      const filesData: any[] = filesResponse.ok ? await filesResponse.json() : [];

      const approvals = reviews.filter((r) => r.state === "APPROVED").length;
      const requestedReviewersList = prData.requested_reviewers?.map((r: any) => r.login) || [];
      const requiredApprovals = Math.max(1, prData.requested_reviewers?.length || 1);
      
      const checkRuns = checksData.check_runs || [];
      const checks = checkRuns.map((c: any) => ({
        name: c.name || c.conclusion || "Check",
        state: (c.conclusion === "success" ? "success" : 
               c.conclusion === "failure" ? "failure" : 
               c.conclusion === "cancelled" ? "error" : 
               "pending") as "success" | "failure" | "pending" | "error"
      }));

      const hasConflicts = prData.mergeable === false;
      const additions = prData.additions || 0;
      const deletions = prData.deletions || 0;
      const changedFilesCount = prData.changed_files || 0;
      const topFiles = filesData.slice(0, 5).map((f: any) => f.filename);

      // Calculate status
      let status: "ready" | "pending" | "not-ready" = "ready";
      const issues: string[] = [];

      if (hasConflicts) {
        status = "not-ready";
        issues.push("Resolve the existing merge conflicts before merging");
      }

      if (approvals < requiredApprovals) {
        status = status === "ready" ? "pending" : "not-ready";
        issues.push(`Needs ${requiredApprovals - approvals} more approval(s)`);
      }

      const failingChecks = checks.filter((c: { name: string; state: string }) => c.state === "failure" || c.state === "error");
      if (failingChecks.length > 0) {
        status = status === "ready" ? "pending" : "not-ready";
        issues.push(`${failingChecks.length} check(s) failing`);
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
              owner,
              repo,
              prNumber,
              title: prData.title,
              author: prData.user.login,
              prUrl: prData.html_url,
              status,
              approvals,
              requiredApprovals,
              requestedReviewers: requestedReviewersList,
              checks: checks.length > 0 ? checks : undefined,
              changedFilesCount,
              additions,
              deletions,
              topFiles: topFiles.length > 0 ? topFiles : undefined,
              draft: prData.draft || false,
              mergeable: prData.mergeable,
              updatedAt: prData.updated_at,
              issues: issues.length > 0 ? issues : undefined,
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

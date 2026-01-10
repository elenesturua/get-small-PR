import React from "react";
import { z } from "zod";
import { useWidget, type WidgetMetadata } from "mcp-use/react";
import "./styles.css";

/*
 * Apps SDK widget
 * Just export widgetMetadata with description and Zod schema, and mcp-use handles the rest!
 * See docs: https://docs.mcp-use.com/typescript/server/ui-widgets
 */

const propSchema = z.object({
  prNumber: z.number().describe("The pull request number"),
  title: z.string().describe("The PR title"),
  status: z
    .enum(["ready", "pending", "not-ready"])
    .describe("The readiness status"),
  approvals: z.number().optional().describe("Number of approvals"),
  requestedReviewers: z.number().optional().describe("Number of requested reviewers"),
  commentsCount: z.number().optional().describe("Number of comments"),
  checkStatus: z
    .object({
      passing: z.number(),
      total: z.number(),
    })
    .optional()
    .describe("CI/CD check status"),
  author: z.string().optional().describe("PR author"),
  draft: z.boolean().optional().describe("Whether PR is in draft"),
  hasConflicts: z.boolean().optional().describe("Whether PR has merge conflicts"),
  issues: z.array(z.string()).optional().describe("List of issues blocking merge"),
});

export const widgetMetadata: WidgetMetadata = {
  description: "Display GitHub pull request readiness status",
  props: propSchema,
};

type PRReadinessProps = z.infer<typeof propSchema>;

const PRReadinessWidget: React.FC = () => {
  // Use the useWidget hook to get props from OpenAI Apps SDK
  const { props, theme } = useWidget<PRReadinessProps>();

  console.log(props); // the widget props

  const {
    prNumber,
    title,
    status,
    approvals = 0,
    requestedReviewers = 0,
    commentsCount = 0,
    checkStatus,
    author,
    draft = false,
    hasConflicts = false,
    issues = [],
  } = props;

  const getStatusIcon = (statusType: string) => {
    switch (statusType?.toLowerCase()) {
      case "ready":
        return "✅";
      case "pending":
        return "⏳";
      case "not-ready":
        return "❌";
      default:
        return "❓";
    }
  };

  const getStatusColor = (statusType: string) => {
    switch (statusType?.toLowerCase()) {
      case "ready":
        return "from-green-400 to-green-600";
      case "pending":
        return "from-yellow-400 to-orange-500";
      case "not-ready":
        return "from-red-400 to-red-600";
      default:
        return "from-gray-400 to-gray-600";
    }
  };

  // Theme-aware styling
  const bgColor = theme === "dark" ? "bg-gray-900" : "bg-white";
  const textColor = theme === "dark" ? "text-gray-100" : "text-gray-800";
  const subtextColor = theme === "dark" ? "text-gray-400" : "text-gray-600";

  return (
    <div
      className={`max-w-sm mx-auto ${bgColor} rounded-xl shadow-lg overflow-hidden`}
    >
      <div
        className={`h-32 bg-gradient-to-br ${getStatusColor(status)} flex items-center justify-center`}
      >
        <div className="text-6xl">{getStatusIcon(status)}</div>
      </div>

      <div className="p-6">
        <div className="text-center">
          <h2 className={`text-2xl font-bold ${textColor} mb-2`}>
            PR #{prNumber}
          </h2>
          <p className={`text-lg font-medium ${subtextColor} mb-4`}>
            {title}
          </p>
          {author && (
            <p className={`text-sm ${subtextColor} mb-4`}>
              by {author}
            </p>
          )}
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="text-center">
              <span className={`text-3xl font-light ${textColor}`}>
                {approvals}/{requestedReviewers || 1}
              </span>
              <p className={`text-sm ${subtextColor}`}>Approvals</p>
            </div>
            <div className="text-center">
              <span className={`text-3xl font-light ${textColor}`}>
                {commentsCount}
              </span>
              <p className={`text-sm ${subtextColor}`}>Comments</p>
            </div>
            {checkStatus && (
              <div className="text-center">
                <span className={`text-3xl font-light ${textColor}`}>
                  {checkStatus.passing}/{checkStatus.total}
                </span>
                <p className={`text-sm ${subtextColor}`}>Checks</p>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className={`text-lg font-medium ${subtextColor} capitalize`}>
              {status === "ready"
                ? "Ready to merge"
                : status === "pending"
                ? "Pending review"
                : "Not ready"}
            </p>
            {(draft || hasConflicts || issues.length > 0) && (
              <p className={`text-sm ${subtextColor} mt-2`}>
                {draft && "Draft • "}
                {hasConflicts && "Conflicts • "}
                {issues.length > 0 && `${issues.length} issue(s)`}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PRReadinessWidget;


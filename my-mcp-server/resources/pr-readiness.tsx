import React, { useState } from "react";
import { z } from "zod";
import { useWidget, type WidgetMetadata } from "mcp-use/react";
import "./styles.css";

/*
 * Apps SDK widget - PR Readiness Dashboard
 * Displays GitHub Pull Request readiness with status, checks, and actionable insights
 */

const checkSchema = z.object({
  name: z.string(),
  state: z.enum(["success", "failure", "pending", "error"]),
});

const propSchema = z.object({
  owner: z.string().describe("Repository owner"),
  repo: z.string().describe("Repository name"),
  prNumber: z.number().describe("Pull request number"),
  title: z.string().describe("PR title"),
  author: z.string().optional().describe("PR author"),
  prUrl: z.string().optional().describe("PR URL"),
  status: z.enum(["ready", "pending", "not-ready"]).describe("Readiness status"),
  approvals: z.number().describe("Number of approvals"),
  requiredApprovals: z.number().describe("Required number of approvals"),
  requestedReviewers: z.array(z.string()).optional().describe("Requested reviewers"),
  checks: z.array(checkSchema).optional().describe("CI checks"),
  changedFilesCount: z.number().describe("Number of files changed"),
  additions: z.number().describe("Lines added"),
  deletions: z.number().describe("Lines deleted"),
  topFiles: z.array(z.string()).optional().describe("Top 5 changed files"),
  draft: z.boolean().optional().describe("Whether PR is draft"),
  mergeable: z.boolean().nullable().describe("Whether PR is mergeable"),
  updatedAt: z.string().describe("Last updated timestamp"),
  issues: z.array(z.string()).optional().describe("Blocking issues"),
});

export const widgetMetadata: WidgetMetadata = {
  description: "Display GitHub pull request readiness status",
  props: propSchema,
};

type PRReadinessProps = z.infer<typeof propSchema>;

const PRReadinessWidget: React.FC = () => {
  const { props, theme } = useWidget<PRReadinessProps>();

  const {
    owner,
    repo,
    prNumber,
    title,
    author,
    prUrl,
    status,
    approvals,
    requiredApprovals,
    requestedReviewers = [],
    checks = [],
    changedFilesCount,
    additions,
    deletions,
    topFiles = [],
    draft = false,
    mergeable,
    updatedAt,
    issues = [],
  } = props;

  const [expandedSections, setExpandedSections] = useState<{
    checks: boolean;
    files: boolean;
    reviews: boolean;
  }>({
    checks: false,
    files: false,
    reviews: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Status configuration
  const getStatusConfig = () => {
    switch (status) {
      case "ready":
        return {
          label: "READY",
          icon: "✓",
          color: "#10b981",
          bgColor: "#d1fae5",
          lightBg: "#ecfdf5",
          textColor: "#065f46",
        };
      case "pending":
        return {
          label: "PENDING",
          icon: "⏳",
          color: "#f59e0b",
          bgColor: "#fef3c7",
          lightBg: "#fffbeb",
          textColor: "#78350f",
        };
      case "not-ready":
        return {
          label: "BLOCKED",
          icon: "✕",
          color: "#ef4444",
          bgColor: "#fee2e2",
          lightBg: "#fef2f2",
          textColor: "#991b1b",
        };
    }
  };

  const statusConfig = getStatusConfig();

  // Calculate metrics
  const failingChecks = checks.filter((c) => c.state === "failure" || c.state === "error");
  const pendingChecks = checks.filter((c) => c.state === "pending");
  const passingChecks = checks.filter((c) => c.state === "success");

  // Generate next actions (combining blockers and actions)
  const getNextActions = (): string[] => {
    const actions: string[] = [];
    if (mergeable === false) {
      actions.push("Resolve the existing merge conflicts before merging");
    }
    if (draft) {
      actions.push("Mark the PR as ready for review");
    }
    if (failingChecks.length > 0) {
      actions.push(`Fix ${failingChecks.length} failing check${failingChecks.length > 1 ? "s" : ""}`);
    }
    if (approvals < requiredApprovals) {
      actions.push(`Request ${requiredApprovals - approvals} more approval${requiredApprovals - approvals > 1 ? "s" : ""}`);
    }
    if (pendingChecks.length > 0) {
      actions.push(`Wait for ${pendingChecks.length} pending check${pendingChecks.length > 1 ? "s" : ""}`);
    }
    return actions.slice(0, 3);
  };

  const nextActions = getNextActions();

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) return "just now";
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return dateString;
    }
  };

  // Theme-aware colors
  const isDark = theme === "dark";
  const bgColor = isDark ? "#111827" : "#ffffff";
  const textColor = isDark ? "#f9fafb" : "#111827";
  const subtextColor = isDark ? "#9ca3af" : "#6b7280";
  const borderColor = isDark ? "#374151" : "#e5e7eb";
  const cardBg = isDark ? "#1f2937" : "#f9fafb";

  const containerStyle: React.CSSProperties = {
    maxWidth: "600px",
    margin: "0 auto",
    backgroundColor: bgColor,
    borderRadius: "12px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    overflow: "hidden",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif',
    fontSize: "14px",
    lineHeight: "1.5",
  };

  // Progress bar component
  const ProgressBar = ({ value, max, color }: { value: number; max: number; color: string }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
      <div style={{ width: "100%", height: "6px", backgroundColor: isDark ? "#374151" : "#e5e7eb", borderRadius: "3px", overflow: "hidden" }}>
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            backgroundColor: color,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    );
  };

  return (
    <div style={containerStyle}>
      {/* Header with Status */}
      <div style={{ padding: "24px 24px 20px", borderBottom: `1px solid ${borderColor}` }}>
        {/* Repo + PR Number */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <div style={{ fontSize: "12px", color: subtextColor, fontWeight: "500", letterSpacing: "0.3px" }}>
            {owner}/{repo} #{prNumber}
          </div>
          {prUrl && (
            <a
              href={prUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: statusConfig.color,
                textDecoration: "none",
                fontSize: "13px",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              View PR →
            </a>
          )}
        </div>

        {/* Title */}
        <h2 style={{ margin: "0 0 6px 0", fontSize: "20px", fontWeight: "600", color: textColor, lineHeight: "1.3" }}>
          {title}
        </h2>

        {/* Author */}
        {author && (
          <div style={{ fontSize: "13px", color: subtextColor, marginBottom: "16px" }}>
            by <span style={{ fontWeight: "500" }}>{author}</span> · {formatDate(updatedAt)}
          </div>
        )}

        {/* Status Badge */}
        <div style={{ marginTop: "16px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              backgroundColor: statusConfig.bgColor,
              color: statusConfig.textColor,
              border: `2px solid ${statusConfig.color}`,
            }}
          >
            <span style={{ fontSize: "18px" }}>{statusConfig.icon}</span>
            {statusConfig.label}
          </div>
        </div>
      </div>

      {/* Next Actions */}
      {nextActions.length > 0 && (
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: `1px solid ${borderColor}`,
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: "600", color: textColor, marginBottom: "10px" }}>
            Next Actions
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {nextActions.map((action, idx) => (
              <div
                key={idx}
                style={{
                  fontSize: "13px",
                  color: subtextColor,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                  lineHeight: "1.4",
                }}
              >
                <span style={{ fontSize: "16px", lineHeight: "1" }}>•</span>
                <span>{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", borderBottom: `1px solid ${borderColor}` }}>
        {/* Approvals */}
        <div style={{ backgroundColor: cardBg, padding: "14px", borderRadius: "8px", border: `1px solid ${borderColor}` }}>
          <div style={{ fontSize: "12px", color: subtextColor, marginBottom: "6px", fontWeight: "500" }}>
            Approvals
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "8px" }}>
            <span style={{ fontSize: "24px", fontWeight: "700", color: textColor }}>{approvals}</span>
            <span style={{ fontSize: "16px", color: subtextColor }}>/ {requiredApprovals}</span>
          </div>
          <ProgressBar value={approvals} max={requiredApprovals} color={approvals >= requiredApprovals ? "#10b981" : "#f59e0b"} />
          {requestedReviewers.length > 0 && (
            <div style={{ fontSize: "11px", color: subtextColor, marginTop: "6px" }}>
              {requestedReviewers.length} reviewer{requestedReviewers.length > 1 ? "s" : ""} requested
            </div>
          )}
        </div>

        {/* CI Checks */}
        <div style={{ backgroundColor: cardBg, padding: "14px", borderRadius: "8px", border: `1px solid ${borderColor}` }}>
          <div style={{ fontSize: "12px", color: subtextColor, marginBottom: "6px", fontWeight: "500" }}>
            CI Checks
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "8px" }}>
            <span style={{ fontSize: "24px", fontWeight: "700", color: textColor }}>{passingChecks.length}</span>
            <span style={{ fontSize: "16px", color: subtextColor }}>/ {checks.length}</span>
          </div>
          <ProgressBar
            value={passingChecks.length}
            max={checks.length}
            color={failingChecks.length > 0 ? "#ef4444" : pendingChecks.length > 0 ? "#f59e0b" : "#10b981"}
          />
          {(failingChecks.length > 0 || pendingChecks.length > 0) && (
            <div style={{ fontSize: "11px", color: subtextColor, marginTop: "6px" }}>
              {failingChecks.length > 0 && <span style={{ color: "#ef4444" }}>{failingChecks.length} failing</span>}
              {failingChecks.length > 0 && pendingChecks.length > 0 && " · "}
              {pendingChecks.length > 0 && <span>{pendingChecks.length} pending</span>}
            </div>
          )}
        </div>

        {/* PR Size */}
        <div style={{ backgroundColor: cardBg, padding: "14px", borderRadius: "8px", border: `1px solid ${borderColor}` }}>
          <div style={{ fontSize: "12px", color: subtextColor, marginBottom: "6px", fontWeight: "500" }}>
            Changes
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "4px" }}>
            <span style={{ fontSize: "24px", fontWeight: "700", color: textColor }}>{changedFilesCount}</span>
            <span style={{ fontSize: "14px", color: subtextColor }}>files</span>
          </div>
          <div style={{ fontSize: "13px", display: "flex", gap: "12px", marginTop: "6px" }}>
            <span style={{ color: "#10b981", fontWeight: "600" }}>+{additions}</span>
            <span style={{ color: "#ef4444", fontWeight: "600" }}>−{deletions}</span>
          </div>
        </div>

        {/* Mergeable */}
        <div style={{ backgroundColor: cardBg, padding: "14px", borderRadius: "8px", border: `1px solid ${borderColor}` }}>
          <div style={{ fontSize: "12px", color: subtextColor, marginBottom: "6px", fontWeight: "500" }}>
            Status
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
              <span>{mergeable === true ? "✓" : mergeable === false ? "✕" : "○"}</span>
              <span style={{ color: textColor }}>
                {mergeable === true ? "Mergeable" : mergeable === false ? "Conflicts" : "Unknown"}
              </span>
            </div>
            {draft && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
                <span>📝</span>
                <span style={{ color: textColor }}>Draft</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible Details */}
      <div style={{ padding: "16px 24px" }}>
        {/* Checks Details */}
        {(failingChecks.length > 0 || pendingChecks.length > 0) && (
          <div style={{ marginBottom: "12px" }}>
            <button
              onClick={() => toggleSection("checks")}
              style={{
                background: "none",
                border: "none",
                color: textColor,
                cursor: "pointer",
                padding: "8px 0",
                fontSize: "13px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
              }}
            >
              <span style={{ color: subtextColor, fontSize: "10px" }}>{expandedSections.checks ? "▼" : "▶"}</span>
              <span>
                Check Details ({failingChecks.length + pendingChecks.length})
              </span>
            </button>
            {expandedSections.checks && (
              <div style={{ marginTop: "8px", marginLeft: "20px", fontSize: "12px" }}>
                {[...failingChecks, ...pendingChecks].map((check, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "6px 0",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: textColor,
                    }}
                  >
                    <span style={{ color: check.state === "failure" || check.state === "error" ? "#ef4444" : "#f59e0b" }}>
                      {check.state === "failure" || check.state === "error" ? "✕" : "○"}
                    </span>
                    <span style={{ fontFamily: "monospace", fontSize: "11px" }}>{check.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Files Details */}
        {topFiles.length > 0 && (
          <div style={{ marginBottom: "12px" }}>
            <button
              onClick={() => toggleSection("files")}
              style={{
                background: "none",
                border: "none",
                color: textColor,
                cursor: "pointer",
                padding: "8px 0",
                fontSize: "13px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
              }}
            >
              <span style={{ color: subtextColor, fontSize: "10px" }}>{expandedSections.files ? "▼" : "▶"}</span>
              <span>Files Changed ({changedFilesCount})</span>
            </button>
            {expandedSections.files && (
              <div style={{ marginTop: "8px", marginLeft: "20px", fontSize: "12px" }}>
                {topFiles.map((file, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "4px 0",
                      fontFamily: "monospace",
                      fontSize: "11px",
                      color: subtextColor,
                    }}
                  >
                    {file}
                  </div>
                ))}
                {changedFilesCount > topFiles.length && (
                  <div style={{ padding: "4px 0", color: subtextColor, fontStyle: "italic", fontSize: "11px" }}>
                    ... and {changedFilesCount - topFiles.length} more
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Reviews Details */}
        {requestedReviewers.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection("reviews")}
              style={{
                background: "none",
                border: "none",
                color: textColor,
                cursor: "pointer",
                padding: "8px 0",
                fontSize: "13px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
              }}
            >
              <span style={{ color: subtextColor, fontSize: "10px" }}>{expandedSections.reviews ? "▼" : "▶"}</span>
              <span>Reviewers ({requestedReviewers.length})</span>
            </button>
            {expandedSections.reviews && (
              <div style={{ marginTop: "8px", marginLeft: "20px", fontSize: "12px" }}>
                {requestedReviewers.map((reviewer, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "4px 0",
                      color: subtextColor,
                    }}
                  >
                    • {reviewer}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PRReadinessWidget;

/**
 * AIVS / PGB CIMA - Source Review Formatter
 * File: operational/source_review_formatter.js
 * ISO Timestamp: 2026-06-22T12:25:00+01:00
 *
 * Purpose:
 * - Provides one shared user-facing formatter for approved source review output.
 * - Hides raw retrieval internals from the main CIMA answer.
 * - Keeps file paths, chunk IDs, scores and matched terms out of the visible report.
 *
 * Change Log:
 * - v0.1.0: created shared approved-source review formatter.
 *
 * Control Notes:
 * - This formatter does not perform retrieval.
 * - This formatter does not alter source records.
 * - This formatter only controls visible source-review wording.
 */

const SOURCE_REVIEW_FORMATTER_BUILD_ISO = "2026-06-22T12:25:00+01:00";

function safeString(value = "") {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function cleanText(value = "") {
  return safeString(value)
    .replace(/\s+/g, " ")
    .trim();
}

function extractSourceUrl(item = {}) {
  const directUrl = safeString(item.source_url || item.url || "").trim();

  if (directUrl) {
    return directUrl;
  }

  const text = safeString(item.text || item.snippet || "");
  const match = text.match(/SOURCE_URL:\s*([^\s]+)/i);

  return match && match[1] ? match[1].trim() : "";
}

function extractIndexedSourceFile(item = {}) {
  const sourceFile = safeString(item.source_file || "").trim();

  if (sourceFile) {
    return sourceFile;
  }

  const text = safeString(item.text || item.snippet || "");
  const match = text.match(/SOURCE_FILE:\s*([^\n]+)/i);

  return match && match[1] ? match[1].trim() : "";
}

function buildReadableSourceLabel(item = {}) {
  const url = extractSourceUrl(item);
  const indexedFile = extractIndexedSourceFile(item);
  const title = cleanText(item.source_title || item.title || "");
  const combined = [url, indexedFile, title].join(" ").toLowerCase();

  if (title) {
    return title;
  }

  if (combined.includes("ukresilienceacademy") && combined.includes("jesip")) {
    return "UK Resilience Academy: JESIP Joint Doctrine";
  }

  if (combined.includes("jesip") && combined.includes("joint_doctrine")) {
    return "JESIP: Joint Doctrine Guide";
  }

  if (combined.includes("about_jesip")) {
    return "JESIP: About JESIP";
  }

  if (combined.includes("jesip_app")) {
    return "JESIP: JESIP App";
  }

  if (combined.includes("sitemap")) {
    return "General navigation or sitemap record";
  }

  if (combined.includes("npsa") && combined.includes("venues")) {
    return "NPSA: Venues and Public Spaces Guidance";
  }

  if (combined.includes("npsa")) {
    return "NPSA approved source record";
  }

  if (url) {
    return url;
  }

  if (indexedFile) {
    return indexedFile.split("/").pop();
  }

  return "Approved indexed source record";
}

function buildApprovedSourceReviewLines({
  results = [],
  sourceSupportStatus = "",
  externalSearchUsed = "No"
} = {}) {
  if (!Array.isArray(results) || results.length === 0) {
    return [
      "Approved source records returned: 0",
      "",
      "No approved indexed source records were supplied to this specialist agent.",
      "CIMA should not treat this response as source-supported until approved source material has been supplied and reviewed.",
      "",
      `External search used: ${externalSearchUsed}`,
      "Human review remains required before operational reliance."
    ];
  }

  const labels = [];

  results.slice(0, 5).forEach((item) => {
    const label = buildReadableSourceLabel(item);

    if (label && !labels.includes(label)) {
      labels.push(label);
    }
  });

  const lines = [
    `Approved source records returned: ${results.length}`,
    "",
    "CIMA found approved indexed source material for this answer. The response is source-supported for defensive command, incident-management, planning, training and audit context only.",
    "",
    "Sources identified:"
  ];

  labels.forEach((label) => {
    lines.push(`- ${label}`);
  });

  lines.push("");
  lines.push("Detailed file paths, chunk IDs, chunk indexes, retrieval scores and matched terms are retained for audit but are not shown in the main answer.");

  if (sourceSupportStatus) {
    lines.push("");
    lines.push(`Source support status: ${sourceSupportStatus}`);
  }

  lines.push(`External search used: ${externalSearchUsed}`);
  lines.push("Human review remains required before operational reliance.");

  return lines;
}

function getSourceReviewFormatterStatus() {
  return {
    ok: true,
    agent: "source_review_formatter",
    build_iso: SOURCE_REVIEW_FORMATTER_BUILD_ISO
  };
}

export {
  buildApprovedSourceReviewLines,
  getSourceReviewFormatterStatus
};

export default {
  buildApprovedSourceReviewLines,
  getSourceReviewFormatterStatus
};

/**
 * AIVS / PGB CIMA - Source Review Formatter
 * File: operational/source_review_formatter.js
 * ISO Timestamp: 2026-06-22T14:05:00+01:00
 *
 * Purpose:
 * - Provides one shared user-facing formatter for approved source review output.
 * - Shows useful source names and URLs.
 * - Hides raw retrieval internals from the main CIMA answer.
 * - Keeps file paths, chunk IDs, scores and matched terms out of the visible report.
 *
 * Change Log:
 * - v0.1.0: created shared approved-source review formatter.
 * - v0.1.1: simplified visible Approved Source Review wording.
 * - v0.1.2: restored source names and URLs while keeping technical retrieval metadata hidden.
 *
 * Control Notes:
 * - This formatter does not perform retrieval.
 * - This formatter does not alter source records.
 * - This formatter only controls visible source-review wording.
 */

const SOURCE_REVIEW_FORMATTER_BUILD_ISO = "2026-06-22T14:05:00+01:00";

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

function normaliseSourceKey(label = "", url = "") {
  return `${cleanText(label).toLowerCase()}|${cleanText(url).toLowerCase()}`;
}

function titleFromFileName(fileName = "") {
  const baseName = safeString(fileName)
    .split("/")
    .pop()
    .replace(/\.txt$/i, "")
    .replace(/\.md$/i, "")
    .replace(/\.html$/i, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!baseName) {
    return "";
  }

  return baseName
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      if (word.length <= 3) {
        return word.toUpperCase();
      }

      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
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

  if (combined.includes("npsa") && combined.includes("venues")) {
    return "NPSA: Venues and Public Spaces Guidance";
  }

  if (combined.includes("npsa")) {
    return "NPSA approved source record";
  }

  if (url) {
    return url;
  }

  const fileLabel = titleFromFileName(indexedFile);

  if (fileLabel) {
    return fileLabel;
  }

  return "Approved indexed source record";
}

function buildApprovedSourceReviewLines({
  results = []
} = {}) {
  if (!Array.isArray(results) || results.length === 0) {
    return [
      "Approved source records returned: 0",
      "",
      "No approved indexed source records were supplied to this specialist agent.",
      "",
      "Technical retrieval metadata is retained for audit but not shown in the main answer."
    ];
  }

  const sourceRows = [];
  const seen = new Set();

  results.slice(0, 8).forEach((item) => {
    const label = buildReadableSourceLabel(item);
    const url = extractSourceUrl(item);
    const key = normaliseSourceKey(label, url);

    if (!seen.has(key)) {
      seen.add(key);
      sourceRows.push({ label, url });
    }
  });

  const lines = [
    `Approved source records returned: ${results.length}`,
    "",
    "Sources used:"
  ];

  sourceRows.forEach((source) => {
    lines.push(`- ${source.label}`);

    if (source.url) {
      lines.push(`  ${source.url}`);
    }
  });

  lines.push("");
  lines.push("Technical retrieval metadata is retained for audit but not shown in the main answer.");

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

/**
 * AIVS / PGB CIMA - Training Synopsis Agent
 * File: training/training_synopsis_agent.js
 * ISO Timestamp: 2026-06-09T15:45:00Z
 *
 * Purpose:
 * - Builds a training synopsis from the latest CIMA question, answer and selected context.
 * - Kept separate from server.js so it can be tuned independently.
 *
 * Change Log:
 * - v0.1.0: created standalone Training Synopsis agent.
 *
 * ISO Control Notes:
 * - This agent must not send email.
 * - This agent must not write audit records directly.
 * - This agent must not perform uncontrolled source retrieval.
 * - This agent does not use FAISS until the controlled index is connected.
 * - All outputs remain draft training support only and require human review.
 */

const TRAINING_SYNOPSIS_AGENT_BUILD_ISO = "2026-06-09T15:45:00Z";

function safeString(value = "") {
  if (value === null || value === undefined || value === "") {
    return "Not supplied";
  }

  return String(value);
}

function trimText(value = "", maxLength = 1200) {
  const text = String(value || "")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength).trim() + "...";
}

function escapeHtml(value = "") {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function linesToHtml(lines = []) {
  return lines
    .map((line) => {
      if (!line) {
        return "";
      }

      if (line.startsWith("## ")) {
        return `<h3>${escapeHtml(line.replace(/^##\s+/, ""))}</h3>`;
      }

      return `<p>${escapeHtml(line)}</p>`;
    })
    .join("\n");
}

export function buildTrainingSynopsis({
  question = "",
  answer = "",
  context = {}
} = {}) {
  const cleanQuestion = trimText(question, 600);
  const cleanAnswer = trimText(answer, 1600);

  const lines = [];

  lines.push("## Training Synopsis");
  lines.push("This synopsis converts the latest CIMA response into a short training note for review, briefing or exercise preparation.");

  lines.push("");
  lines.push("## Scenario Context");
  lines.push(`- Mode: ${safeString(context.mode)}`);
  lines.push(`- Command level: ${safeString(context.level)}`);
  lines.push(`- Persona: ${safeString(context.persona)}`);
  lines.push(`- Requested output: ${safeString(context.output)}`);
  lines.push(`- Evidence from: ${safeString(context.evidence_from_year)}`);
  lines.push(`- Evidence to: ${safeString(context.evidence_to_year)}`);

  lines.push("");
  lines.push("## Training Focus");
  lines.push("- Clarify the facts before moving to action.");
  lines.push("- Separate known information from assumptions.");
  lines.push("- Identify risk, ownership and next review point.");
  lines.push("- Keep a clear audit trail of decisions.");
  lines.push("- Escalate where life safety, safeguarding or public confidence may be affected.");

  lines.push("");
  lines.push("## Source Question");
  lines.push(cleanQuestion || "No question supplied.");

  lines.push("");
  lines.push("## Source CIMA Answer Summary");
  lines.push(cleanAnswer || "No CIMA answer supplied.");

  lines.push("");
  lines.push("## Human Review");
  lines.push("This is a draft training synopsis. It must be reviewed by a responsible human before use in training, assurance or operational briefings.");

  const plainText = lines.join("\n");

  return {
    ok: true,
    training_synopsis_agent_build_iso: TRAINING_SYNOPSIS_AGENT_BUILD_ISO,
    type: "training_synopsis",
    plain_text: plainText,
    html: linesToHtml(lines)
  };
}

export function getTrainingSynopsisAgentStatus() {
  return {
    ok: true,
    agent: "training_synopsis_agent",
    training_synopsis_agent_build_iso: TRAINING_SYNOPSIS_AGENT_BUILD_ISO,
    mode: "demo-no-index"
  };
}

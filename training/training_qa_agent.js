/**
 * AIVS / PGB CIMA - Training Questions and Answers Agent
 * File: training/training_qa_agent.js
 * ISO Timestamp: 2026-06-09T18:05:00Z
 *
 * Purpose:
 * - Builds training questions with model answers from the latest CIMA question, answer and selected context.
 * - Kept separate from server.js so it can be tuned independently.
 *
 * Change Log:
 * - v0.1.0: created standalone Training Questions and Answers agent.
 *
 * ISO Control Notes:
 * - This agent must not send email.
 * - This agent must not write audit records directly.
 * - This agent must not perform uncontrolled source retrieval.
 * - This agent does not use FAISS until the controlled index is connected.
 * - All outputs remain draft training support only and require human review.
 */

const TRAINING_QA_AGENT_BUILD_ISO = "2026-06-09T18:05:00Z";

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

export function buildTrainingQa({
  question = "",
  answer = "",
  context = {}
} = {}) {
  const cleanQuestion = trimText(question, 600);
  const cleanAnswer = trimText(answer, 1200);

  const lines = [];

  lines.push("## Training Questions and Answers");
  lines.push("This output provides draft training questions with model answer points for review, briefing or exercise use.");

  lines.push("");
  lines.push("## Scenario Context");
  lines.push(`- Mode: ${safeString(context.mode)}`);
  lines.push(`- Command level: ${safeString(context.level)}`);
  lines.push(`- Persona: ${safeString(context.persona)}`);
  lines.push(`- Requested output: ${safeString(context.output)}`);
  lines.push(`- Evidence from: ${safeString(context.evidence_from_year)}`);
  lines.push(`- Evidence to: ${safeString(context.evidence_to_year)}`);

  lines.push("");
  lines.push("## Source Scenario");
  lines.push(cleanQuestion || "No question supplied.");

  lines.push("");
  lines.push("## Source CIMA Answer Summary");
  lines.push(cleanAnswer || "No CIMA answer supplied.");

  lines.push("");
  lines.push("## Q1. What facts should be confirmed first?");
  lines.push("Model answer: Confirm what happened, where it happened, who reported it, whether there is corroboration, who may be affected, and whether there is any immediate life-safety risk.");

  lines.push("");
  lines.push("## Q2. What assumptions could become unsafe?");
  lines.push("Model answer: It may be unsafe to assume the report is accurate, that the risk is escalating, that no one is affected, or that normal operations can continue without review.");

  lines.push("");
  lines.push("## Q3. Who should own the next decision?");
  lines.push("Model answer: The relevant command lead should appoint a named owner for the next action, confirm the review time, and ensure decisions are recorded.");

  lines.push("");
  lines.push("## Q4. What should be recorded?");
  lines.push("Model answer: Record the time, source of information, known facts, assumptions, risks, decision owner, decision taken, reason for the decision, and next review point.");

  lines.push("");
  lines.push("## Q5. When should escalation be considered?");
  lines.push("Model answer: Escalate if there is life-safety risk, safeguarding concern, public confidence risk, uncertainty that cannot be resolved quickly, external authority involvement, or a need for strategic direction.");

  lines.push("");
  lines.push("## Human Review");
  lines.push("These are draft training questions and model answer points. They must be reviewed by a responsible human before use in training, assurance or operational briefings.");

  const plainText = lines.join("\n");

  return {
    ok: true,
    training_qa_agent_build_iso: TRAINING_QA_AGENT_BUILD_ISO,
    type: "training_qa",
    plain_text: plainText,
    html: linesToHtml(lines)
  };
}

export function getTrainingQaAgentStatus() {
  return {
    ok: true,
    agent: "training_qa_agent",
    training_qa_agent_build_iso: TRAINING_QA_AGENT_BUILD_ISO,
    mode: "demo-no-index"
  };
}

/**
 * AIVS / PGB CIMA - Training Questions Agent
 * File: training/training_questions_agent.js
 * ISO Timestamp: 2026-06-09T16:45:00Z
 *
 * Purpose:
 * - Builds training questions from the latest CIMA question, answer and selected context.
 * - Kept separate from server.js so it can be tuned independently.
 *
 * Change Log:
 * - v0.1.0: created standalone Training Questions agent.
 *
 * ISO Control Notes:
 * - This agent must not send email.
 * - This agent must not write audit records directly.
 * - This agent must not perform uncontrolled source retrieval.
 * - This agent does not use FAISS until the controlled index is connected.
 * - All outputs remain draft training support only and require human review.
 */

const TRAINING_QUESTIONS_AGENT_BUILD_ISO = "2026-06-09T16:45:00Z";

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

      if (line.startsWith("- ")) {
        return `<p>${escapeHtml(line)}</p>`;
      }

      return `<p>${escapeHtml(line)}</p>`;
    })
    .join("\n");
}

export function buildTrainingQuestions({
  question = "",
  answer = "",
  context = {}
} = {}) {
  const cleanQuestion = trimText(question, 600);
  const cleanAnswer = trimText(answer, 1200);

  const lines = [];

  lines.push("## Training Questions");
  lines.push("These questions are designed for discussion, briefing or exercise use after reviewing the latest CIMA response.");

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
  lines.push("## Questions for Training Discussion");
  lines.push("- What facts would you confirm before taking action?");
  lines.push("- What assumptions might be unsafe if treated as confirmed?");
  lines.push("- Who should own the next decision or update?");
  lines.push("- What immediate risks to people, operations or reputation should be checked?");
  lines.push("- What should be recorded in the decision log?");
  lines.push("- What information would trigger escalation to a higher command level?");
  lines.push("- What would be the risk of over-reacting?");
  lines.push("- What would be the risk of under-reacting?");
  lines.push("- What source material, policy or local procedure should be checked before reliance?");
  lines.push("- What should be reviewed at the next update point?");

  lines.push("");
  lines.push("## Human Review");
  lines.push("These are draft training questions. They must be reviewed by a responsible human before use in training, assurance or operational briefings.");

  const plainText = lines.join("\n");

  return {
    ok: true,
    training_questions_agent_build_iso: TRAINING_QUESTIONS_AGENT_BUILD_ISO,
    type: "training_questions",
    plain_text: plainText,
    html: linesToHtml(lines)
  };
}

export function getTrainingQuestionsAgentStatus() {
  return {
    ok: true,
    agent: "training_questions_agent",
    training_questions_agent_build_iso: TRAINING_QUESTIONS_AGENT_BUILD_ISO,
    mode: "demo-no-index"
  };
}

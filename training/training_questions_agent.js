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
  const cleanQuestion = trimText(question, 700);

  const lines = [];

  lines.push("## Training Questions");
  lines.push(
    "These questions are designed for facilitated discussion, tabletop exercise preparation, briefing review and assurance learning. They are not operational instructions."
  );

  lines.push("");
  lines.push("## Scenario Brief");
  lines.push(cleanQuestion || "No scenario question was supplied.");

  lines.push("");
  lines.push("## Opening Understanding");
  lines.push("- What is the incident as currently understood?");
  lines.push("- What facts are confirmed, and what information is still uncertain?");
  lines.push("- Which reports may be incomplete, duplicated or unreliable?");
  lines.push("- What is the first fact the strategic lead must confirm?");
  lines.push("- What assumption would be most dangerous if treated as fact?");

  lines.push("");
  lines.push("## Command and Control");
  lines.push("- Who should own the first 30-minute operating picture?");
  lines.push("- Is a Gold, Silver or Bronze command structure required?");
  lines.push("- Who is responsible for safety, welfare, communications, security and partner liaison?");
  lines.push("- What decision needs to be made now, and what can wait until the next update?");
  lines.push("- How should conflicting instructions from different teams be prevented?");

  lines.push("");
  lines.push("## Risk and Safety");
  lines.push("- Who may be injured, missing, vulnerable, trapped or exposed to further risk?");
  lines.push("- What would make this incident escalate from serious to critical?");
  lines.push("- What is the risk of under-reacting?");
  lines.push("- What is the risk of over-reacting?");
  lines.push("- What safeguarding, medical, crowd movement or public order concerns need checking?");

  lines.push("");
  lines.push("## Coordination with Partners");
  lines.push("- Which external partners may need to be involved?");
  lines.push("- What information should be shared with emergency services, and by whom?");
  lines.push("- What information should be held back until verified?");
  lines.push("- How should the organisation maintain one version of the truth?");
  lines.push("- What should be prepared for the next multi-agency briefing?");

  lines.push("");
  lines.push("## Communications");
  lines.push("- What should staff be told immediately?");
  lines.push("- What should not be said externally until confirmed?");
  lines.push("- Who is authorised to issue a public, client-facing or media statement?");
  lines.push("- What holding statement might be needed if there is public concern?");
  lines.push("- How should uncertainty be communicated without creating alarm?");

  lines.push("");
  lines.push("## Decision Log and Assurance");
  lines.push("- What should be recorded in the decision log?");
  lines.push("- Who made each decision, and what information was available at the time?");
  lines.push("- What options were considered and rejected?");
  lines.push("- What is the next review point?");
  lines.push("- What local procedure, source material or policy should be checked before reliance?");

  lines.push("");
  lines.push("## Human Review");
  lines.push(
    "These are draft training questions. They must be reviewed by a responsible human before use in training, assurance or operational briefings."
  );

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

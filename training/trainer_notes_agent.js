/**
 * AIVS / PGB CIMA - Trainer Notes Agent
 * File: training/trainer_notes_agent.js
 * ISO Timestamp: 2026-06-10T06:25:00Z
 *
 * Purpose:
 * - Builds trainer notes from the latest CIMA question, answer and selected context.
 * - Supports exercise planning, facilitator preparation and human-led training review.
 *
 * Change Log:
 * - v0.1.0: created standalone Trainer Notes agent.
 *
 * ISO Control Notes:
 * - This agent must not send email.
 * - This agent must not write audit records directly.
 * - This agent must not perform uncontrolled source retrieval.
 * - This agent does not use FAISS until the controlled index is connected.
 * - All outputs remain draft training support only and require human review.
 */

const TRAINER_NOTES_AGENT_BUILD_ISO = "2026-06-10T06:25:00Z";

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

export function buildTrainerNotes({
  question = "",
  answer = "",
  context = {}
} = {}) {
  const cleanQuestion = trimText(question, 600);
  const cleanAnswer = trimText(answer, 1200);

  const lines = [];

  lines.push("## Trainer Notes");
  lines.push("These notes are for the trainer or facilitator. They support a human-led training discussion based on the latest CIMA scenario.");

  lines.push("");
  lines.push("## Scenario Context");
  lines.push(`- Mode: ${safeString(context.mode)}`);
  lines.push(`- Command level: ${safeString(context.level)}`);
  lines.push(`- Persona: ${safeString(context.persona)}`);
  lines.push(`- Requested output: ${safeString(context.output)}`);
  lines.push(`- Evidence from: ${safeString(context.evidence_from_year)}`);
  lines.push(`- Evidence to: ${safeString(context.evidence_to_year)}`);

  lines.push("");
  lines.push("## Scenario Used");
  lines.push(cleanQuestion || "No scenario question supplied.");

  lines.push("");
  lines.push("## CIMA Answer Used");
  lines.push(cleanAnswer || "No CIMA answer supplied.");

  lines.push("");
  lines.push("## Trainer Aim");
  lines.push("Use the scenario to test whether participants can separate facts from assumptions, identify immediate risk, appoint decision ownership, record decisions and escalate proportionately.");

  lines.push("");
  lines.push("## Key Teaching Points");
  lines.push("- Confirm what is known, what is assumed and what remains uncertain.");
  lines.push("- Avoid over-reacting where facts are incomplete.");
  lines.push("- Avoid under-reacting where life safety, safeguarding or public confidence may be affected.");
  lines.push("- Record the decision, the reason for the decision and the next review time.");
  lines.push("- Identify who owns the next action.");

  lines.push("");
  lines.push("## Suggested Trainer Prompts");
  lines.push("- What would you ask first?");
  lines.push("- What would make this incident escalate?");
  lines.push("- What would you record in the decision log?");
  lines.push("- Who needs to be informed now, and who can wait?");
  lines.push("- What would you avoid saying publicly until confirmed?");

  lines.push("");
  lines.push("## Common Pitfalls to Watch For");
  lines.push("- Treating unconfirmed reports as facts.");
  lines.push("- Failing to appoint a single action owner.");
  lines.push("- Recording the outcome but not the reason.");
  lines.push("- Escalating too late or escalating without a clear reason.");
  lines.push("- Forgetting the human review requirement.");

  lines.push("");
  lines.push("## Human Review");
  lines.push("These trainer notes are draft training support only. They must be reviewed by a responsible human before use in any exercise, assurance process or live operational training.");

  const plainText = lines.join("\n");

  return {
    ok: true,
    trainer_notes_agent_build_iso: TRAINER_NOTES_AGENT_BUILD_ISO,
    type: "trainer_notes",
    plain_text: plainText,
    html: linesToHtml(lines)
  };
}

export function getTrainerNotesAgentStatus() {
  return {
    ok: true,
    agent: "trainer_notes_agent",
    trainer_notes_agent_build_iso: TRAINER_NOTES_AGENT_BUILD_ISO,
    mode: "demo-no-index"
  };
}

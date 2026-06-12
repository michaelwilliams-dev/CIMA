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
  const cleanQuestion = trimText(question, 700);

  const lines = [];

  lines.push("## Exercise Purpose");
  lines.push(
    "This training synopsis turns the latest CIMA scenario into a structured learning note for briefing, rehearsal and review. It is designed to help trainees practise command judgement, fact-checking, risk assessment, partner coordination and decision logging."
  );

  lines.push("");
  lines.push("## Scenario Summary");
  lines.push(
    cleanQuestion || "No scenario question was supplied."
  );

  lines.push("");
  lines.push("## Learning Focus");
  lines.push("- Establish a single working picture before moving to action.");
  lines.push("- Separate confirmed facts from assumptions, rumours and incomplete reports.");
  lines.push("- Identify immediate risks to life safety, welfare, safeguarding and public confidence.");
  lines.push("- Confirm who has command responsibility and who owns each next action.");
  lines.push("- Coordinate with relevant partners, including emergency services where required.");
  lines.push("- Maintain a clear decision log that records what was decided, by whom, when and why.");

  lines.push("");
  lines.push("## Expected Trainee Response");
  lines.push(
    "A good trainee response should begin by slowing the situation down enough to establish control. The trainee should identify what is known, what is uncertain, who is at risk, who is leading the response and what decisions must be made in the first operating period."
  );
  lines.push("- Confirm the incident location, timing, current status and people affected.");
  lines.push("- Establish whether Gold, Silver or Bronze command arrangements are required.");
  lines.push("- Allocate owners for safety, welfare, communications, evidence capture and partner liaison.");
  lines.push("- Set a short review cycle so that new information can be assessed quickly.");
  lines.push("- Avoid issuing speculative messages before facts are confirmed.");

  lines.push("");
  lines.push("## Key Risks to Explore");
  lines.push("- Conflicting reports may cause the wrong priority to be chosen.");
  lines.push("- Injured, vulnerable or missing people may not be identified quickly enough.");
  lines.push("- Staff, security and emergency services may work from different versions of events.");
  lines.push("- Public messages may create confusion if they go beyond confirmed facts.");
  lines.push("- Poor records may make later review, assurance or investigation difficult.");

  lines.push("");
  lines.push("## Facilitator Questions");
  lines.push("- What is the first fact the strategic lead must confirm?");
  lines.push("- Who owns the first 30-minute operating picture?");
  lines.push("- What information is confirmed, and what is still only an assumption?");
  lines.push("- What would trigger escalation to emergency services or a higher command level?");
  lines.push("- What should be recorded in the decision log before the next briefing?");
  lines.push("- What should not be communicated externally until verified?");

  lines.push("");
  lines.push("## Governance and Human Review");
  lines.push(
    "This is a draft training synopsis. It is for learning, rehearsal and assurance preparation only. It must be reviewed by a responsible human before use in training, operational briefings or formal assurance work."
  );

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

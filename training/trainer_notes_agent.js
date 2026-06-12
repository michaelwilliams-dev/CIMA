/**
 * AIVS / PGB CIMA - Trainer Notes Agent
 * File: training/trainer_notes_agent.js
 * ISO Timestamp: 2026-06-12T16:10:00Z
 *
 * Purpose:
 * - Builds trainer notes from the latest CIMA question, answer and selected persona.
 * - Supports exercise planning, facilitator preparation and human-led training review.
 *
 * Change Log:
 * - v0.1.0: created standalone Trainer Notes agent.
 * - v0.2.0: removed Scenario Context and CIMA Answer Used from visible output.
 * - v0.2.0: retained Persona as the only visible context line.
 * - v0.2.0: rewrote trainer notes into cleaner training-report structure.
 *
 * ISO Control Notes:
 * - This agent must not send email.
 * - This agent must not write audit records directly.
 * - This agent must not perform uncontrolled source retrieval.
 * - This agent does not use FAISS until the controlled index is connected.
 * - All outputs remain draft training support only and require human review.
 */

const TRAINER_NOTES_AGENT_BUILD_ISO = "2026-06-12T16:10:00Z";

function safeString(value = "") {
  if (value === null || value === undefined || value === "") {
    return "N/A";
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
  const html = [];
  let inList = false;

  for (const line of lines) {
    if (!line) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      continue;
    }

    if (line.startsWith("## ")) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }

      html.push(`<h3>${escapeHtml(line.replace(/^##\s+/, ""))}</h3>`);
      continue;
    }

    if (line.startsWith("- ")) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }

      html.push(`<li>${escapeHtml(line.replace(/^-+\s*/, ""))}</li>`);
      continue;
    }

    if (inList) {
      html.push("</ul>");
      inList = false;
    }

    html.push(`<p>${escapeHtml(line)}</p>`);
  }

  if (inList) {
    html.push("</ul>");
  }

  return html.join("\n");
}

function normalisePersona(persona = "") {
  const clean = safeString(persona);

  if (!clean || clean === "Not supplied") {
    return "N/A";
  }

  return clean;
}

function buildScenarioLine(question = "", persona = "N/A") {
  const cleanQuestion = trimText(question, 500);
  const lowerQuestion = cleanQuestion.toLowerCase();
  const lowerPersona = persona.toLowerCase();

  if (
    lowerQuestion.includes("public venue") ||
    lowerQuestion.includes("crowd confusion") ||
    lowerQuestion.includes("possible injuries") ||
    lowerQuestion.includes("emergency services")
  ) {
    if (lowerPersona.includes("silver") || lowerPersona.includes("tactical")) {
      return "A serious incident has occurred at a public venue involving crowd confusion, possible injuries and conflicting reports. The Silver / Tactical Lead must establish a tactical operating picture, coordinate operational teams, manage immediate risk and brief Gold clearly.";
    }

    if (lowerPersona.includes("gold") || lowerPersona.includes("strategic")) {
      return "A serious incident has occurred at a public venue involving crowd confusion, possible injuries and conflicting reports. The Gold / Strategic Lead must establish command, set priorities, coordinate partners and prepare a clear strategic briefing.";
    }

    if (lowerPersona.includes("bronze") || lowerPersona.includes("operational")) {
      return "A serious incident has occurred at a public venue involving crowd confusion, possible injuries and conflicting reports. The Bronze / Operational Lead must stabilise the scene, coordinate immediate actions and report confirmed facts upwards.";
    }

    if (lowerPersona.includes("communications")) {
      return "A serious incident has occurred at a public venue involving crowd confusion, possible injuries and conflicting reports. The Communications Lead must support clear, accurate and controlled messaging while avoiding unconfirmed claims.";
    }

    if (lowerPersona.includes("safeguarding")) {
      return "A serious incident has occurred at a public venue involving crowd confusion, possible injuries and conflicting reports. The Safeguarding Lead must identify vulnerable people, immediate welfare risks and escalation requirements.";
    }

    if (lowerPersona.includes("loggist") || lowerPersona.includes("recorder")) {
      return "A serious incident has occurred at a public venue involving crowd confusion, possible injuries and conflicting reports. The Loggist / Decision Recorder must capture decisions, reasons, owners, timings and review points clearly.";
    }

    return "A serious incident has occurred at a public venue involving crowd confusion, possible injuries and conflicting reports. The participant must establish the facts, identify immediate risk, coordinate the response and prepare a clear briefing.";
  }

  if (!cleanQuestion) {
    return "No scenario question was supplied.";
  }

  const shortened = cleanQuestion
    .replace(/\s*What should[\s\S]*$/i, "")
    .replace(/\s*How should[\s\S]*$/i, "")
    .trim();

  return trimText(shortened || cleanQuestion, 360);
}

function buildTrainerAim(persona = "N/A") {
  const lowerPersona = persona.toLowerCase();

  if (lowerPersona.includes("silver") || lowerPersona.includes("tactical")) {
    return "Use this scenario to test whether participants can establish tactical control, separate confirmed facts from assumptions, coordinate operational teams, identify immediate risks and prepare a clear briefing for Gold.";
  }

  if (lowerPersona.includes("gold") || lowerPersona.includes("strategic")) {
    return "Use this scenario to test whether participants can establish strategic command, set priorities, identify major risks, coordinate with partners and give clear direction without relying on unconfirmed information.";
  }

  if (lowerPersona.includes("bronze") || lowerPersona.includes("operational")) {
    return "Use this scenario to test whether participants can stabilise immediate operations, report confirmed facts, manage urgent risks and escalate issues clearly to Silver.";
  }

  if (lowerPersona.includes("communications")) {
    return "Use this scenario to test whether participants can support clear communications, avoid premature statements, identify what can be confirmed and align messaging with command decisions.";
  }

  if (lowerPersona.includes("safeguarding")) {
    return "Use this scenario to test whether participants can identify vulnerable people, immediate welfare risks, safeguarding triggers and appropriate escalation routes.";
  }

  if (lowerPersona.includes("loggist") || lowerPersona.includes("recorder")) {
    return "Use this scenario to test whether participants can record decisions, reasons, owners, evidence gaps, timings and review points clearly under pressure.";
  }

  return "Use this scenario to test whether participants can separate facts from assumptions, identify immediate risk, appoint decision ownership, record decisions and escalate proportionately.";
}

function buildTeachingPoints(persona = "N/A") {
  const lowerPersona = persona.toLowerCase();

  const points = [
    "Separate confirmed facts, assumptions and unknowns.",
    "Identify immediate life-safety, safeguarding and public-confidence risks.",
    "Confirm who owns each urgent action.",
    "Record decisions, reasons and review times.",
    "Avoid treating early reports as settled facts."
  ];

  if (lowerPersona.includes("silver") || lowerPersona.includes("tactical")) {
    return [
      "Establish a single tactical operating picture.",
      "Coordinate Bronze, venue, security and emergency-service inputs.",
      ...points,
      "Prepare a concise briefing for Gold."
    ];
  }

  if (lowerPersona.includes("gold") || lowerPersona.includes("strategic")) {
    return [
      "Set strategic priorities early.",
      "Confirm what must be escalated to partner agencies.",
      ...points,
      "Avoid over-directing operational detail that belongs to Silver or Bronze."
    ];
  }

  if (lowerPersona.includes("communications")) {
    return [
      "Confirm what can safely be said and what remains unconfirmed.",
      "Align communications with command decisions.",
      ...points,
      "Avoid public statements that create false certainty."
    ];
  }

  return points;
}

function buildTrainerPrompts(persona = "N/A") {
  const lowerPersona = persona.toLowerCase();

  if (lowerPersona.includes("silver") || lowerPersona.includes("tactical")) {
    return [
      "What must Silver confirm first?",
      "Which reports are reliable and which are still unconfirmed?",
      "Which risks require immediate tactical action?",
      "What must be escalated to Gold now?",
      "What should be recorded in the decision log?"
    ];
  }

  if (lowerPersona.includes("gold") || lowerPersona.includes("strategic")) {
    return [
      "What is the strategic priority in the first 30 minutes?",
      "What information is not yet reliable enough for decision making?",
      "Which partners need to be engaged immediately?",
      "What direction should Gold give to Silver?",
      "What should not be said publicly yet?"
    ];
  }

  return [
    "What would you ask first?",
    "What information is confirmed and what is assumed?",
    "What would make this incident escalate?",
    "Who owns the next action?",
    "What would you record in the decision log?"
  ];
}

function buildPitfalls(persona = "N/A") {
  const lowerPersona = persona.toLowerCase();

  const common = [
    "Treating unconfirmed reports as facts.",
    "Failing to appoint a clear action owner.",
    "Recording the outcome but not the reason.",
    "Escalating too late or escalating without a clear reason.",
    "Forgetting the human review requirement."
  ];

  if (lowerPersona.includes("silver") || lowerPersona.includes("tactical")) {
    return [
      "Failing to establish tactical coordination.",
      "Giving Gold a vague or overloaded briefing.",
      ...common
    ];
  }

  if (lowerPersona.includes("gold") || lowerPersona.includes("strategic")) {
    return [
      "Trying to run operational detail from Gold level.",
      "Setting strategy before the known facts are stable.",
      ...common
    ];
  }

  return common;
}

export function buildTrainerNotes({
  question = "",
  answer = "",
  context = {}
} = {}) {
  const persona = normalisePersona(context.persona);
  const scenarioLine = buildScenarioLine(question, persona);

  /*
   * The CIMA answer is intentionally not printed in Trainer Notes.
   * It may be supplied to the route, but this agent keeps the visible output clean.
   */
  void answer;

  const lines = [];

  lines.push("## Trainer Notes");
  lines.push("These notes are for the trainer or facilitator. They support a human-led training discussion based on the latest CIMA scenario.");

  lines.push("");
  lines.push("## Persona");
  lines.push(persona);

  lines.push("");
  lines.push("## Training Scenario");
  lines.push(scenarioLine);

  lines.push("");
  lines.push("## Trainer Aim");
  lines.push(buildTrainerAim(persona));

  lines.push("");
  lines.push("## Key Teaching Points");
  for (const point of buildTeachingPoints(persona)) {
    lines.push(`- ${point}`);
  }

  lines.push("");
  lines.push("## Suggested Trainer Prompts");
  for (const prompt of buildTrainerPrompts(persona)) {
    lines.push(`- ${prompt}`);
  }

  lines.push("");
  lines.push("## Common Pitfalls to Watch For");
  for (const pitfall of buildPitfalls(persona)) {
    lines.push(`- ${pitfall}`);
  }

  lines.push("");
  lines.push("## Human Review");
  lines.push("These trainer notes are draft training support only. They must be reviewed by a responsible human before use in any exercise, assurance process or operational training.");

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

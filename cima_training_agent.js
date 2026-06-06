/*
  AIVS / PGB CIMA Training Output Agent
  File: cima_training_agent.js
  ISO Timestamp: 2026-06-06T12:00:00Z

  Change Log:
  - v0.1.0: created standalone training output agent
  - v0.1.0: builds training display output only
  - v0.1.0: does not send email
  - v0.1.0: does not create Word or PDF files
  - v0.1.0: intended to be called by server.js and displayed in index.html
*/

const TRAINING_AGENT_BUILD_ISO = "2026-06-06T12:00:00Z";

function safeText(value) {
  return String(value || "").trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normaliseContext(context = {}) {
  return {
    thread: safeText(context.thread) || "CIMA Training Session",
    mode: safeText(context.mode) || "N/A",
    level: safeText(context.level) || "N/A",
    persona: safeText(context.persona) || "N/A",
    output: safeText(context.output) || "Training output"
  };
}

function buildPlainTextTrainingOutput({
  question,
  answer,
  context,
  generatedAt
}) {
  return [
    "CIMA Training Output",
    "",
    "Generated at: " + generatedAt,
    "Build: " + TRAINING_AGENT_BUILD_ISO,
    "",
    "Training context",
    "Thread: " + context.thread,
    "Mode: " + context.mode,
    "Command level: " + context.level,
    "Persona: " + context.persona,
    "Requested output: " + context.output,
    "",
    "Training scenario",
    question || "No training scenario supplied.",
    "",
    "Training response",
    answer || "No training response supplied.",
    "",
    "Learning objectives",
    "1. Identify the operational facts that must be confirmed.",
    "2. Identify the risks, assumptions and uncertainty in the scenario.",
    "3. Decide what should be escalated for human review.",
    "4. Record a clear decision path and next action owner.",
    "",
    "Facilitator prompts",
    "1. What facts are known and what facts are assumed?",
    "2. What would change the risk rating?",
    "3. Who owns the next decision?",
    "4. What should be recorded for audit?",
    "",
    "Governance note",
    "This training output is for learning and exercise use only. It is not an operational instruction."
  ].join("\n");
}

function buildHtmlTrainingOutput({
  question,
  answer,
  context,
  generatedAt
}) {
  return [
    '<div class="cima-training-output">',
    "<h2>CIMA Training Output</h2>",
    "<p><strong>Generated at:</strong> " + escapeHtml(generatedAt) + "</p>",
    "<p><strong>Build:</strong> " + escapeHtml(TRAINING_AGENT_BUILD_ISO) + "</p>",

    "<h3>Training context</h3>",
    "<ul>",
    "<li><strong>Thread:</strong> " + escapeHtml(context.thread) + "</li>",
    "<li><strong>Mode:</strong> " + escapeHtml(context.mode) + "</li>",
    "<li><strong>Command level:</strong> " + escapeHtml(context.level) + "</li>",
    "<li><strong>Persona:</strong> " + escapeHtml(context.persona) + "</li>",
    "<li><strong>Requested output:</strong> " + escapeHtml(context.output) + "</li>",
    "</ul>",

    "<h3>Training scenario</h3>",
    "<p>" + escapeHtml(question || "No training scenario supplied.") + "</p>",

    "<h3>Training response</h3>",
    "<p>" + escapeHtml(answer || "No training response supplied.") + "</p>",

    "<h3>Learning objectives</h3>",
    "<ol>",
    "<li>Identify the operational facts that must be confirmed.</li>",
    "<li>Identify the risks, assumptions and uncertainty in the scenario.</li>",
    "<li>Decide what should be escalated for human review.</li>",
    "<li>Record a clear decision path and next action owner.</li>",
    "</ol>",

    "<h3>Facilitator prompts</h3>",
    "<ol>",
    "<li>What facts are known and what facts are assumed?</li>",
    "<li>What would change the risk rating?</li>",
    "<li>Who owns the next decision?</li>",
    "<li>What should be recorded for audit?</li>",
    "</ol>",

    "<h3>Governance note</h3>",
    "<p>This training output is for learning and exercise use only. It is not an operational instruction.</p>",
    "</div>"
  ].join("");
}

export function buildCimaTrainingOutput(payload = {}) {
  const generatedAt = new Date().toISOString();

  const context = normaliseContext(payload.context || {});
  const question = safeText(payload.question);
  const answer = safeText(payload.answer);

  const html = buildHtmlTrainingOutput({
    question,
    answer,
    context,
    generatedAt
  });

  const plainText = buildPlainTextTrainingOutput({
    question,
    answer,
    context,
    generatedAt
  });

  return {
    ok: true,
    agent: "cima_training_agent",
    build_iso: TRAINING_AGENT_BUILD_ISO,
    generated_at: generatedAt,
    context,
    html,
    plain_text: plainText
  };
}

export function getCimaTrainingAgentStatus() {
  return {
    ok: true,
    agent: "cima_training_agent",
    build_iso: TRAINING_AGENT_BUILD_ISO,
    purpose: "Builds CIMA training output for display. It does not send email or create Word/PDF files."
  };
}

export default {
  buildCimaTrainingOutput,
  getCimaTrainingAgentStatus
};

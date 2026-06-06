/*
  AIVS / PGB CIMA Training Output Agent
  File: cima_training_agent.js
  ISO Timestamp: 2026-06-06T12:20:00Z

  Change Log:
  - v0.1.0: created standalone training output agent
  - v0.1.0: builds training display output only
  - v0.1.0: does not send email
  - v0.1.0: does not create Word or PDF files
  - v0.1.0: intended to be called by server.js and displayed in index.html
  - v0.2.0: added training prompt builder for server-side OpenAI call
  - v0.2.0: added structured training prompt sections for scenario, learning objectives, facilitator prompts and governance
*/

const TRAINING_AGENT_BUILD_ISO = "2026-06-06T12:20:00Z";

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

export function buildCimaTrainingPrompt(payload = {}) {
  const context = normaliseContext(payload.context || {});
  const question = safeText(payload.question);

  return [
    "You are the AIVS / PGB CIMA Training Agent.",
    "",
    "Your task is to turn the user's scenario or question into a structured training output.",
    "",
    "This is for training, rehearsal, exercise and learning use only.",
    "It must not be written as a live operational instruction.",
    "It must reinforce human review, command judgement, safeguarding judgement and audit discipline.",
    "",
    "Training context:",
    "Thread: " + context.thread,
    "Mode: " + context.mode,
    "Command level: " + context.level,
    "Persona: " + context.persona,
    "Requested output: " + context.output,
    "",
    "User scenario or question:",
    question || "No training scenario supplied.",
    "",
    "Write the training output using these exact sections:",
    "",
    "1. Training scenario summary",
    "Summarise the scenario in plain English.",
    "",
    "2. Expected trainee response",
    "Explain what a good trainee response should cover.",
    "",
    "3. Key risks and uncertainty",
    "List the main risks, unknowns, assumptions and weak points.",
    "",
    "4. Human review and escalation triggers",
    "List what must be escalated to authorised human decision makers.",
    "",
    "5. Learning objectives",
    "Give clear learning objectives for the exercise.",
    "",
    "6. Facilitator prompts",
    "Give questions a trainer can ask the group.",
    "",
    "7. Governance and audit note",
    "Explain what should be recorded and why.",
    "",
    "Rules:",
    "- Use clear practical language.",
    "- Do not overstate certainty.",
    "- Do not invent facts.",
    "- Do not give live emergency instructions.",
    "- State that the output is for training use only.",
    "- Keep the answer structured and suitable for display in the CIMA Training tab."
  ].join("\n");
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
    "<div>" + escapeHtml(answer || "No training response supplied.").replaceAll("\n", "<br>") + "</div>",

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

  const trainingPrompt = buildCimaTrainingPrompt({
    question,
    context
  });

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
    training_prompt: trainingPrompt,
    html,
    plain_text: plainText
  };
}

export function getCimaTrainingAgentStatus() {
  return {
    ok: true,
    agent: "cima_training_agent",
    build_iso: TRAINING_AGENT_BUILD_ISO,
    purpose: "Builds CIMA training prompts and training display output. It does not send email or create Word/PDF files."
  };
}

export default {
  buildCimaTrainingPrompt,
  buildCimaTrainingOutput,
  getCimaTrainingAgentStatus
};

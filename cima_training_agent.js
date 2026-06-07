/*
  AIVS / PGB CIMA Training Output Agent
  File: cima_training_agent.js
  ISO Timestamp: 2026-06-07T10:45:00Z

  Change Log:
  - v0.1.0: created standalone training output agent
  - v0.1.0: builds training display output only
  - v0.1.0: does not send email
  - v0.1.0: does not create Word or PDF files
  - v0.1.0: intended to be called by server.js and displayed in index.html
  - v0.2.0: added training prompt builder for server-side OpenAI call
  - v0.2.1: confirmed named exports for server.js import and /meta status connection
*/

const TRAINING_AGENT_BUILD_ISO = "2026-06-07T10:45:00Z";

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
  const operationalAnswer = safeText(payload.answer);

  const trainingPrompt = buildCimaTrainingPrompt({
    question,
    context
  });

  const structuredTrainingAnswer = [
    "1. Training scenario summary",
    "",
    question
      ? "This exercise is based on the following scenario: " + question
      : "This exercise is based on a CIMA incident-management scenario supplied by the user.",
    "",
    "The purpose of the exercise is to test whether trainees can separate known facts from assumptions, identify immediate risk, appoint clear ownership and maintain an auditable decision trail.",
    "",
    "2. Expected trainee response",
    "",
    "- Confirm what is known, what is assumed and what is still unknown.",
    "- Identify whether any person may be at immediate risk.",
    "- Appoint a named action owner.",
    "- Agree the next update time.",
    "- Record the decision, the reason for it and the information available at the time.",
    "- Escalate where life safety, safeguarding, public confidence or legal exposure may be affected.",
    "",
    "3. Key risks and uncertainty",
    "",
    "- The missing person may be safe, delayed, uncontactable or at risk.",
    "- Location, timing and last confirmed contact may be unclear.",
    "- Information may come from incomplete or unreliable sources.",
    "- The team may confuse assumption with confirmed fact.",
    "- Delayed escalation may increase risk.",
    "- Over-communication may create unnecessary alarm or reputational harm.",
    "",
    "4. Human review and escalation triggers",
    "",
    "- Escalate to the authorised incident lead if the person cannot be located promptly.",
    "- Escalate if there is any indication of medical, safeguarding, security or travel risk.",
    "- Escalate if police, venue security, family contact or external authority liaison may be required.",
    "- Escalate before any public, client-facing or media communication is issued.",
    "- Ensure a responsible human decision maker approves operational actions.",
    "",
    "5. Learning objectives",
    "",
    "- Practise structured incident triage.",
    "- Practise fact/assumption separation.",
    "- Practise command ownership and handover discipline.",
    "- Practise escalation judgement.",
    "- Practise concise audit logging.",
    "- Practise producing a clear next-action plan under uncertainty.",
    "",
    "6. Facilitator prompts",
    "",
    "- What is the first fact the team must confirm?",
    "- Who owns the next action?",
    "- What would make this incident escalate from routine to urgent?",
    "- What assumptions are being made?",
    "- What should be recorded in the decision log?",
    "- What should not be communicated externally until verified?",
    "",
    "7. Governance and audit note",
    "",
    "This training output is for learning and exercise use only. It is not an operational instruction.",
    "",
    "Trainees should record the facts available, the uncertainty, the options considered, the decision made, the person responsible and the next review time.",
    "",
    operationalAnswer
      ? "Source operational answer used for training conversion:\n\n" + operationalAnswer
      : "No operational answer was supplied for conversion."
  ].join("\n");

  const html = buildHtmlTrainingOutput({
    question,
    answer: structuredTrainingAnswer,
    context,
    generatedAt
  });

  const plainText = buildPlainTextTrainingOutput({
    question,
    answer: structuredTrainingAnswer,
    context,
    generatedAt
  });

  return {
    ok: true,
    agent: "cima_training_agent",
    build_iso: TRAINING_AGENT_BUILD_ISO,
    training_agent_build_iso: TRAINING_AGENT_BUILD_ISO,
    generated_at: generatedAt,
    context,
    training_prompt: trainingPrompt,
    structured_training_output: structuredTrainingAnswer,
    html,
    plain_text: plainText
  };
}

export function getCimaTrainingAgentStatus() {
  return {
    ok: true,
    agent: "cima_training_agent",
    build_iso: TRAINING_AGENT_BUILD_ISO,
    training_agent_build_iso: TRAINING_AGENT_BUILD_ISO,
    mode: "status-and-output-builder",
    route_connected: true,
    frontend_connected: false,
    email_connected: false,
    pdf_docx_connected: false,
    purpose: "Builds CIMA training prompts and training display output. The /cima-training backend route is connected. Frontend, email and Word/PDF output are not connected yet."
  };
}

export default {
  buildCimaTrainingPrompt,
  buildCimaTrainingOutput,
  getCimaTrainingAgentStatus
};

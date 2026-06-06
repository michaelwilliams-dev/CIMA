// agents/training_agent.js
// ISO Timestamp: 2026-06-06T12:20:00Z
// Purpose: CIMA training display output agent for AIVS / PGB CIMA
// Change Log:
// - 2026-06-06T12:20:00Z: created standalone training output agent
// - 2026-06-06T12:20:00Z: builds HTML and plain text training output for display in index.html
// - 2026-06-06T12:20:00Z: no email sending, no Word/PDF generation, no Mailjet dependency

const TRAINING_AGENT_BUILD_ISO = "2026-06-06T12:20:00Z";

function escapeHtml(value = "") {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normaliseContext(context = {}) {
  if (!context || typeof context !== "object") {
    return {
      thread: "CIMA Training Session",
      mode: "N/A",
      level: "N/A",
      persona: "N/A",
      output: "Training output"
    };
  }

  return {
    thread: context.thread || "CIMA Training Session",
    mode: context.mode || "N/A",
    level: context.level || "N/A",
    persona: context.persona || "N/A",
    output: context.output || "Training output"
  };
}

function normaliseQuestion(value = "") {
  return String(value || "").trim();
}

function buildTrainingPlainText({
  question = "",
  context = {},
  generatedAt = new Date().toISOString()
}) {
  const cleanContext = normaliseContext(context);
  const cleanQuestion = normaliseQuestion(question);

  return [
    "CIMA Training Output",
    "",
    `Generated at: ${generatedAt}`,
    `Build: ${TRAINING_AGENT_BUILD_ISO}`,
    "",
    "Training context",
    `Thread: ${cleanContext.thread}`,
    `Mode: ${cleanContext.mode}`,
    `Command level: ${cleanContext.level}`,
    `Persona: ${cleanContext.persona}`,
    `Requested output: ${cleanContext.output}`,
    "",
    "Training question",
    cleanQuestion || "No training question supplied.",
    "",
    "Training purpose",
    "This output is designed for training and exercise use. It helps users practise structured incident thinking, decision discipline, escalation judgement and human review.",
    "",
    "Learning objectives",
    "- Identify the incident context clearly.",
    "- Separate confirmed facts from assumptions.",
    "- Consider immediate safety, welfare and safeguarding issues.",
    "- Decide whether the matter is operational, tactical or strategic.",
    "- Identify what must be escalated to a responsible human decision maker.",
    "- Record the decision, rationale and review point.",
    "",
    "Suggested training response",
    "- Clarify what has happened, when it happened and who is affected.",
    "- Identify any immediate life safety, welfare or safeguarding concern.",
    "- Confirm who owns the next action.",
    "- Decide whether the response requires Gold, Silver or Bronze level involvement.",
    "- Record what is known, what is uncertain and what needs checking.",
    "- Set a time for review and update.",
    "",
    "Trainer prompts",
    "- What facts are missing?",
    "- What assumptions could be dangerous?",
    "- Who needs to be told?",
    "- What would change the risk rating?",
    "- What evidence should be preserved?",
    "- What should not be said externally yet?",
    "",
    "Human review note",
    "This is training material only. It is not live incident advice and must not be used as the sole basis for operational action."
  ].join("\n");
}

function buildTrainingHtml({
  question = "",
  context = {},
  generatedAt = new Date().toISOString()
}) {
  const cleanContext = normaliseContext(context);
  const cleanQuestion = normaliseQuestion(question);

  return [
    '<div class="message agent">',
    "<strong>CIMA Training Agent</strong>",

    '<div style="margin-top:10px;">',
    "<h3>Training output</h3>",
    "<p>This is a training and exercise output. It is separate from the operational CIMA reply and should be used to practise decision-making, escalation and review.</p>",
    "</div>",

    '<div style="border:1px solid #D6CBBD;border-left:5px solid #DC9325;border-radius:14px;background:#FFFFFF;padding:12px;margin:12px 0;">',
    "<h3>Training context</h3>",
    `<p><strong>Generated at:</strong> ${escapeHtml(generatedAt)}</p>`,
    `<p><strong>Thread:</strong> ${escapeHtml(cleanContext.thread)}</p>`,
    `<p><strong>Mode:</strong> ${escapeHtml(cleanContext.mode)}</p>`,
    `<p><strong>Command level:</strong> ${escapeHtml(cleanContext.level)}</p>`,
    `<p><strong>Persona:</strong> ${escapeHtml(cleanContext.persona)}</p>`,
    `<p><strong>Requested output:</strong> ${escapeHtml(cleanContext.output)}</p>`,
    "</div>",

    '<div style="border:1px solid #D6CBBD;border-left:5px solid #DC9325;border-radius:14px;background:#FFFAF2;padding:12px;margin:12px 0;">',
    "<h3>Training question</h3>",
    `<p>${escapeHtml(cleanQuestion || "No training question supplied.")}</p>`,
    "</div>",

    "<h3>Learning objectives</h3>",
    "<ul>",
    "<li>Identify the incident context clearly.</li>",
    "<li>Separate confirmed facts from assumptions.</li>",
    "<li>Consider immediate safety, welfare and safeguarding issues.</li>",
    "<li>Decide whether the matter is operational, tactical or strategic.</li>",
    "<li>Identify what must be escalated to a responsible human decision maker.</li>",
    "<li>Record the decision, rationale and review point.</li>",
    "</ul>",

    "<h3>Suggested training response</h3>",
    "<ul>",
    "<li>Clarify what has happened, when it happened and who is affected.</li>",
    "<li>Identify any immediate life safety, welfare or safeguarding concern.</li>",
    "<li>Confirm who owns the next action.</li>",
    "<li>Decide whether the response requires Gold, Silver or Bronze level involvement.</li>",
    "<li>Record what is known, what is uncertain and what needs checking.</li>",
    "<li>Set a time for review and update.</li>",
    "</ul>",

    "<h3>Trainer prompts</h3>",
    "<ul>",
    "<li>What facts are missing?</li>",
    "<li>What assumptions could be dangerous?</li>",
    "<li>Who needs to be told?</li>",
    "<li>What would change the risk rating?</li>",
    "<li>What evidence should be preserved?</li>",
    "<li>What should not be said externally yet?</li>",
    "</ul>",

    '<div style="border-top:1px solid #E5DED2;margin-top:14px;padding-top:10px;color:#4A5F6C;font-size:13px;">',
    "<p><strong>Human review note:</strong> This is training material only. It is not live incident advice and must not be used as the sole basis for operational action.</p>",
    "</div>",

    "</div>"
  ].join("");
}

export function buildCimaTrainingOutput({
  question = "",
  context = {},
  generatedAt = new Date().toISOString()
} = {}) {
  const html = buildTrainingHtml({
    question,
    context,
    generatedAt
  });

  const text = buildTrainingPlainText({
    question,
    context,
    generatedAt
  });

  return {
    ok: true,
    agent: "training_agent",
    training_agent_build_iso: TRAINING_AGENT_BUILD_ISO,
    generated_at: generatedAt,
    title: "CIMA Training Output",
    html,
    text
  };
}

export function getTrainingAgentStatus() {
  return {
    ok: true,
    agent: "training_agent",
    training_agent_build_iso: TRAINING_AGENT_BUILD_ISO
  };
}

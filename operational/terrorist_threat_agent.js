/**
 * AIVS / PGB CIMA - Terrorist Threat Agent
 * File: operational/terrorist_threat_agent.js
 * ISO Timestamp: 2026-06-14T13:20:00+01:00
 *
 * Purpose:
 * - Provides defensive CIMA support for terrorism, hostile activity and high-consequence threat questions.
 * - Supports incident management, command, escalation, communications, training and audit.
 * - Works after question_intake_agent.js has identified a terrorism or hostile-activity trigger.
 *
 * Control Notes:
 * - This agent must not provide attack methods.
 * - This agent must not provide evasion advice.
 * - This agent must not provide weaponisation advice.
 * - This agent must not provide targeting advice.
 * - This agent must not provide instructions that could assist hostile activity.
 * - This agent must not advise users to confront suspected hostile actors.
 * - This agent does not search FAISS directly.
 * - This agent does not perform external search.
 * - Source search must be handled by an approved source or retrieval agent.
 * - Outputs are draft support only and require authorised human review.
 */

const TERRORIST_THREAT_AGENT_BUILD_ISO = "2026-06-14T13:20:00+01:00";

const TERRORIST_THREAT_AGENT_NAME = "terrorist_threat_agent";

const TERRORIST_TRIGGER_TERMS = [
  "terror",
  "terrorism",
  "terrorist",
  "hostile activity",
  "hostile actor",
  "hostile reconnaissance",
  "marauding",
  "mtfa",
  "attack threat",
  "suspicious behaviour",
  "suspicious activity",
  "public disorder",
  "critical infrastructure threat"
];

const TERRORIST_THREAT_AGENT_LIMITATION =
  "CIMA can provide defensive incident-management, command, escalation, communications, training and audit support only. It must not provide attack methods, evasion advice, weaponisation advice, targeting advice or instructions that could assist hostile activity.";

function safeString(value = "") {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function normaliseText(value = "") {
  return safeString(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function hasAnyTerm(text = "", terms = []) {
  const cleanText = normaliseText(text);

  return terms.some((term) => cleanText.includes(term));
}

function valueOrDefault(value = "", fallback = "Not supplied") {
  const text = safeString(value).trim();

  return text || fallback;
}

function buildTerroristThreatClarificationQuestions(input = {}) {
  const question = safeString(input.question || "");
  const context = input.context && typeof input.context === "object"
    ? input.context
    : {};

  const text = normaliseText([
    question,
    context.mode || "",
    context.level || "",
    context.persona || "",
    context.output || ""
  ].join(" "));

  const questions = [];

  if (
    !text.includes("live") &&
    !text.includes("exercise") &&
    !text.includes("training") &&
    !text.includes("planning") &&
    !text.includes("reported") &&
    !text.includes("confirmed") &&
    !text.includes("suspected") &&
    !text.includes("possible")
  ) {
    questions.push("Is this a live incident, an exercise, a training scenario or a planning question?");
  }

  if (
    !text.includes("venue") &&
    !text.includes("site") &&
    !text.includes("stadium") &&
    !text.includes("arena") &&
    !text.includes("public") &&
    !text.includes("office") &&
    !text.includes("transport") &&
    !text.includes("data centre") &&
    !text.includes("critical infrastructure")
  ) {
    questions.push("What type of location is involved?");
  }

  if (
    !text.includes("gold") &&
    !text.includes("silver") &&
    !text.includes("bronze") &&
    !text.includes("security") &&
    !text.includes("communications") &&
    !text.includes("trainer") &&
    !text.includes("loggist") &&
    !text.includes("safeguarding")
  ) {
    questions.push("Which role needs the answer: Gold, Silver, Bronze, security, communications, safeguarding, trainer or loggist?");
  }

  questions.push("What has actually been seen, heard, reported or confirmed?");
  questions.push("What is confirmed fact, what is only reported, and what is still unknown?");
  questions.push("Is there any immediate risk to life, crowd safety, public safety, safeguarding or critical services?");
  questions.push("Are people injured, trapped, missing, vulnerable or unable to leave safely?");
  questions.push("Have police, emergency services, venue security or command leads already been informed?");
  questions.push("Is the user asking for immediate actions, a command briefing, communications wording, a decision log or training material?");

  return questions;
}

function buildTerroristThreatSearchPlan(input = {}) {
  const context = input.context && typeof input.context === "object"
    ? input.context
    : {};

  return {
    approved_sources_first: true,
    external_search_allowed: false,
    external_search_note: "External search must not be used unless the user gives explicit permission after approved CIMA sources have been checked.",
    suggested_internal_search_terms: [
      "terrorism public venue incident management",
      "hostile activity command response",
      "marauding terrorist attack protective security",
      "hostile reconnaissance public venue",
      "Silver command terrorism incident",
      "public safety hostile activity",
      "communications hostile activity incident",
      valueOrDefault(context.persona, "Silver / Tactical Lead")
    ]
  };
}


function buildTerroristThreatResponse(input = {}) {
  const question = safeString(input.question || "");
  const context = input.context && typeof input.context === "object"
    ? input.context
    : {};

  const intake = input.intake && typeof input.intake === "object"
    ? input.intake
    : {};

  const knowledgeSearch = input.knowledgeSearch && typeof input.knowledgeSearch === "object"
    ? input.knowledgeSearch
    : null;

  const approvedSourceResults = knowledgeSearch && Array.isArray(knowledgeSearch.results)
    ? knowledgeSearch.results
    : [];

  const approvedSourceCount = approvedSourceResults.length;
  const firstApprovedSource = approvedSourceResults[0] || null;

  function extractSourceUrl(item = {}) {
    const directUrl = safeString(item.source_url || item.url || "").trim();

    if (directUrl) {
      return directUrl;
    }

    const text = safeString(item.text || item.snippet || "");
    const match = text.match(/SOURCE_URL:\s*([^\s]+)/i);

    return match && match[1] ? match[1].trim() : "";
  }

  function extractSourceLabel(item = {}) {
    const title = safeString(item.source_title || item.title || "").trim();

    if (title) {
      return title;
    }

    const sourceUrl = extractSourceUrl(item);

    if (sourceUrl) {
      return sourceUrl;
    }

    const sourceFile = safeString(item.source_file || "").trim();

    if (sourceFile) {
      return sourceFile.split("/").pop();
    }

    return "Not supplied";
  }

  const primarySource = firstApprovedSource
    ? extractSourceLabel(firstApprovedSource)
    : "None retained after specialist filtering";

  const sourceSupportStatus = !knowledgeSearch
    ? "No approved CIMA source search was supplied to this agent."
    : approvedSourceCount > 0
      ? "Source-supported for defensive command, control, incident management or training context only. Human review remains required."
      : "No relevant approved source was retained after specialist filtering. The answer remains provisional and should not be treated as source-supported.";

  const hasThreatTerm = hasAnyTerm(question, TERRORIST_TRIGGER_TERMS);

  const clarificationQuestions = buildTerroristThreatClarificationQuestions({
    question,
    context,
    intake
  });

  const searchPlan = buildTerroristThreatSearchPlan({
    question,
    context,
    intake
  });

  const sourceStatus = knowledgeSearch
    ? "Approved CIMA source search has been supplied to this agent for review."
    : "Approved CIMA source search has not yet been supplied to this agent.";

  const answer = [
    "## Terrorist Threat Agent",
    "",
    "This response is limited to defensive incident-management, command, escalation, communications, training and audit support.",
    "",
    "## Safety and Use Limitation",
    "",
    TERRORIST_THREAT_AGENT_LIMITATION,
    "",
    "## Situation Summary",
    "",
    `Question: ${valueOrDefault(question)}`,
    `Persona: ${valueOrDefault(context.persona)}`,
    `Mode: ${valueOrDefault(context.mode)}`,
    `Command level: ${valueOrDefault(context.command_level || context.commandLevel || context.level)}`,
    "",
    "## Initial Assessment",
    "",
    hasThreatTerm
      ? "A terrorism, hostile-activity or high-consequence threat term has been detected. CIMA should treat this as a specialist defensive-support question until clarified."
      : "No terrorism or hostile-activity term was detected in the supplied question. Review whether this agent has been called correctly.",
    "",
    "## Approved Source Review",
    "",
    `Approved sources reviewed: ${approvedSourceCount}`,
    `Primary source: ${primarySource}`,
    `Source support status: ${sourceSupportStatus}`,
    "External search used: No",
    "",
    "## Known Evidence",
    "",
    "- The user has raised a terrorism, hostile-activity or high-consequence threat concern or scenario.",
    "- The available facts must be separated from assumptions, reports and unknowns.",
    "- Any operational use of this output requires human review, local procedures and command judgement.",
    "",
    "## Information Gaps",
    "",
    ...clarificationQuestions.map((item) => `- ${item}`),
    "",
    "## Defensive Recommended Actions",
    "",
    "- Establish whether this is a live incident, an exercise, a training scenario or a planning question.",
    "- Confirm who has command responsibility and who is maintaining the decision log.",
    "- Confirm what is known, what is reported, what is suspected and what remains unknown.",
    "- Identify whether there is immediate risk to life, crowd safety, public safety, safeguarding or critical services.",
    "- Notify the appropriate venue, site, security, safeguarding, communications or command lead in line with local procedures.",
    "- Consider whether police or emergency services need to be informed under local procedures.",
    "- Maintain controlled internal communications and avoid speculation.",
    "- Preserve a timed decision log recording decisions, uncertainty, action owners and review points.",
    "",
    "## Escalation Requirements",
    "",
    "- Escalate to the responsible human command lead where hostile activity, terrorism, life-safety risk or public-safety risk is possible.",
    "- Escalate immediately where there are injuries, trapped people, missing people, vulnerable people or uncontrolled crowd movement.",
    "- Escalate if the situation may require evacuation, invacuation, lockdown, protected space use or public communications.",
    "- Escalate if there is possible hostile reconnaissance or a wider hostile activity pattern.",
    "- Escalate if staff, visitors, residents, public communications or critical operations may be affected.",
    "",
    "## Source Status",
    "",
    sourceStatus,
    "",
    "Approved CIMA sources should be searched before this output is treated as source-supported.",
    "External search is not authorised unless the user gives explicit permission after the approved source search is insufficient.",
    "",
    "## Suggested Approved-Source Search Plan",
    "",
    ...searchPlan.suggested_internal_search_terms.map((item) => `- ${item}`),
    "",
    "## Training Notes",
    "",
    "- This scenario should test whether users separate facts from assumptions.",
    "- It should test whether Gold, Silver and Bronze command roles are clear.",
    "- It should test whether the decision log records time, source, uncertainty, action owner and review point.",
    "- It should test whether communications remain controlled, factual and non-speculative.",
    "- It should test whether escalation thresholds are recognised without giving unsafe operational detail.",
    "",
    "## Audit Record",
    "",
    `Agent: ${TERRORIST_THREAT_AGENT_NAME}`,
    `Build ISO: ${TERRORIST_THREAT_AGENT_BUILD_ISO}`,
    "External search used: No",
    "FAISS searched directly by this agent: No",
    "Human review required: Yes"
  ].join("\n");

  return {
    ok: true,
    agent: TERRORIST_THREAT_AGENT_NAME,
    build_iso: TERRORIST_THREAT_AGENT_BUILD_ISO,
    response_path: "TERRORIST THREAT AGENT",
    path: "TERRORIST THREAT AGENT",
    rag: "AMBER",
    rag_status: "AMBER",
    hitl: "Required before operational reliance",
    confidence: "Provisional",
    source_mode: sourceStatus,
    safety_notice: TERRORIST_THREAT_AGENT_LIMITATION,
    clarification_questions: clarificationQuestions,
    search_plan: searchPlan,
    answer,
    sources: approvedSourceResults
  };
}
function getTerroristThreatAgentStatus() {
  return {
    ok: true,
    agent: TERRORIST_THREAT_AGENT_NAME,
    build_iso: TERRORIST_THREAT_AGENT_BUILD_ISO,
    direct_faiss_search: false,
    external_search: false,
    defensive_support_only: true,
    trigger_terms: TERRORIST_TRIGGER_TERMS
  };
}

export {
  buildTerroristThreatResponse,
  getTerroristThreatAgentStatus
};

export default {
  buildTerroristThreatResponse,
  getTerroristThreatAgentStatus
};

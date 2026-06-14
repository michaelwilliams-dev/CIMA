/**
 * AIVS / PGB CIMA - Drone Threat Agent
 * File: operational/drone_agent.js
 * ISO Timestamp: 2026-06-14T13:05:00+01:00
 *
 * Purpose:
 * - Provides defensive CIMA support for drone, UAV and unmanned aircraft questions.
 * - Supports incident management, command, escalation, communications, training and audit.
 * - Works after question_intake_agent.js has identified a drone-related trigger.
 *
 * Control Notes:
 * - This agent must not provide attack methods.
 * - This agent must not provide evasion advice.
 * - This agent must not provide weaponisation advice.
 * - This agent must not provide targeting advice.
 * - This agent must not provide counter-drone technical instructions.
 * - This agent must not advise untrained users to interfere with aircraft.
 * - This agent does not search FAISS directly.
 * - This agent does not perform external search.
 * - Source search must be handled by an approved source or retrieval agent.
 * - Outputs are draft support only and require authorised human review.
 */

const DRONE_AGENT_BUILD_ISO = "2026-06-14T13:05:00+01:00";

const DRONE_AGENT_NAME = "drone_agent";

const DRONE_TRIGGER_TERMS = [
  "drone",
  "drones",
  "uav",
  "uas",
  "unmanned aircraft",
  "quadcopter",
  "drone sighting",
  "hostile drone",
  "unknown drone"
];

const DRONE_AGENT_LIMITATION =
  "CIMA can provide defensive incident-management, command, escalation, communications, training and audit support only. It must not provide attack methods, evasion advice, weaponisation advice, targeting advice, counter-drone technical instructions or instructions that could assist hostile activity.";

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

function buildDroneClarificationQuestions(input = {}) {
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
    !text.includes("loggist")
  ) {
    questions.push("Which role needs the answer: Gold, Silver, Bronze, security, communications, trainer or loggist?");
  }

  questions.push("What has actually been seen or reported?");
  questions.push("Where was the drone seen in relation to the venue or site?");
  questions.push("Is the drone still present, moving away, circling, hovering or only previously reported?");
  questions.push("What is confirmed fact, what is only reported, and what is still unknown?");
  questions.push("Are there any immediate life-safety, crowd-safety, safeguarding or evacuation/invacuation concerns?");
  questions.push("Have police, site security, event control or command leads already been informed?");

  return questions;
}

function buildDroneSearchPlan(input = {}) {
  const context = input.context && typeof input.context === "object"
    ? input.context
    : {};

  return {
    approved_sources_first: true,
    external_search_allowed: false,
    external_search_note: "External search must not be used unless the user gives explicit permission after approved CIMA sources have been checked.",
    suggested_internal_search_terms: [
      "drone sighting venue response",
      "unmanned aircraft public venue",
      "hostile reconnaissance drone",
      "Silver command drone incident",
      "event control drone report",
      "public safety drone incident",
      valueOrDefault(context.persona, "Silver / Tactical Lead")
    ]
  };
}

function buildDroneResponse(input = {}) {
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

  const hasDroneTerm = hasAnyTerm(question, DRONE_TRIGGER_TERMS);

  const clarificationQuestions = buildDroneClarificationQuestions({
    question,
    context,
    intake
  });

  const searchPlan = buildDroneSearchPlan({
    question,
    context,
    intake
  });

  const sourceStatus = knowledgeSearch
    ? "Approved CIMA source search has been supplied to this agent for review."
    : "Approved CIMA source search has not yet been supplied to this agent.";

  const answer = [
    "## Drone Threat Agent",
    "",
    "This response is limited to defensive incident-management, command, escalation, communications, training and audit support.",
    "",
    "## Safety and Use Limitation",
    "",
    DRONE_AGENT_LIMITATION,
    "",
    "## Situation Summary",
    "",
    `Question: ${valueOrDefault(question)}`,
    `Persona: ${valueOrDefault(context.persona)}`,
    `Mode: ${valueOrDefault(context.mode)}`,
    `Command level: ${valueOrDefault(context.level)}`,
    "",
    "## Initial Assessment",
    "",
    hasDroneTerm
      ? "A drone or UAV-related term has been detected. CIMA should treat this as a specialist defensive-support question until clarified."
      : "No drone term was detected in the supplied question. Review whether this agent has been called correctly.",
    "",
    "## Known Evidence",
    "",
    "- The user has raised a drone or UAV-related concern or scenario.",
    "- The available facts must be separated from assumptions, reports and unknowns.",
    "- Any operational use of this output requires human review and local command judgement.",
    "",
    "## Information Gaps",
    "",
    ...clarificationQuestions.map((item) => `- ${item}`),
    "",
    "## Defensive Recommended Actions",
    "",
    "- Establish whether this is a live incident, an exercise, a training scenario or a planning question.",
    "- Confirm who has command responsibility and who is maintaining the decision log.",
    "- Record the time, location, description, direction of travel and current status of the reported drone sighting.",
    "- Preserve a clear distinction between confirmed facts, reported information and assumptions.",
    "- Notify the appropriate venue, site, security or command lead in line with local procedures.",
    "- Consider whether police or other competent authorities need to be informed under local procedures.",
    "- Avoid public speculation and use controlled, factual internal communications.",
    "- Maintain a timed log of decisions, updates, actions and responsible owners.",
    "",
    "## Escalation Requirements",
    "",
    "- Escalate to the responsible human command lead if the sighting is current, repeated, unexplained or close to a sensitive area.",
    "- Escalate if there are crowd-safety, life-safety, safeguarding, aviation-safety or critical-infrastructure concerns.",
    "- Escalate if the drone report may form part of hostile reconnaissance or a wider hostile activity scenario.",
    "- Escalate if staff, visitors or public communications may be affected.",
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
    "- It should test whether Gold, Silver and Bronze roles are clear.",
    "- It should test whether the decision log records time, source, uncertainty, owner and review point.",
    "- It should test whether communications remain controlled and factual.",
    "",
    "## Audit Record",
    "",
    `Agent: ${DRONE_AGENT_NAME}`,
    `Build ISO: ${DRONE_AGENT_BUILD_ISO}`,
    "External search used: No",
    "FAISS searched directly by this agent: No",
    "Human review required: Yes"
  ].join("\n");

  return {
    ok: true,
    agent: DRONE_AGENT_NAME,
    build_iso: DRONE_AGENT_BUILD_ISO,
    response_path: "DRONE THREAT AGENT",
    path: "DRONE THREAT AGENT",
    rag: "AMBER",
    rag_status: "AMBER",
    hitl: "Required before operational reliance",
    confidence: "Provisional",
    source_mode: sourceStatus,
    safety_notice: DRONE_AGENT_LIMITATION,
    clarification_questions: clarificationQuestions,
    search_plan: searchPlan,
    answer,
    sources: knowledgeSearch && Array.isArray(knowledgeSearch.results)
      ? knowledgeSearch.results
      : []
  };
}

function getDroneAgentStatus() {
  return {
    ok: true,
    agent: DRONE_AGENT_NAME,
    build_iso: DRONE_AGENT_BUILD_ISO,
    direct_faiss_search: false,
    external_search: false,
    defensive_support_only: true,
    trigger_terms: DRONE_TRIGGER_TERMS
  };
}

export {
  buildDroneResponse,
  getDroneAgentStatus
};

export default {
  buildDroneResponse,
  getDroneAgentStatus
};

/**
 * AIVS / PGB CIMA - Data Centre Agent
 * File: operational/data_centre_agent.js
 * ISO Timestamp: 2026-06-22T14:15:00+01:00
 *
 * Purpose:
 * - Provides defensive CIMA support for data centre, cloud facility and digital infrastructure questions.
 * - Supports incident management, command, escalation, continuity, communications, training and audit.
 * - Works after question_intake_agent.js or specialist routing has identified a data centre trigger.
 *
 * Change Log:
 * - v0.1.0: existing data centre specialist response agent.
 * - v0.1.1: corrected approved-source intake so the agent can read source records from multiple supplied payload fields.
 * - v0.1.1: removed misleading "specialist filtering" wording from source-review output.
 * - v0.1.1: moved Approved Source Review to the bottom immediately before Audit Record.
 * - v0.1.2: uses shared source_review_formatter.js for clean Approved Source Review output.
 * - v0.1.3: removed visible Source Status section; Approved Source Review now carries readable source evidence.
 *
 * Control Notes:
 * - This agent must not provide attack methods.
 * - This agent must not provide evasion advice.
 * - This agent must not provide sabotage advice.
 * - This agent must not provide cyber-offensive advice.
 * - This agent must not provide targeting advice.
 * - This agent must not provide instructions that could assist hostile activity.
 * - This agent must not advise users to confront suspected hostile actors.
 * - This agent does not search FAISS directly.
 * - This agent does not perform external search.
 * - Source search must be handled by an approved source or retrieval agent.
 * - Outputs are draft support only and require authorised human review.
 */

import {
  buildApprovedSourceReviewLines
} from "./source_review_formatter.js";

const DATA_CENTRE_AGENT_BUILD_ISO = "2026-06-22T14:15:00+01:00";

const DATA_CENTRE_AGENT_NAME = "data_centre_agent";

const DATA_CENTRE_TRIGGER_TERMS = [
  "data centre",
  "datacentre",
  "data center",
  "cloud facility",
  "server room",
  "server hall",
  "colocation",
  "colo",
  "hosting facility",
  "digital infrastructure",
  "critical digital infrastructure",
  "availability zone",
  "backup site",
  "disaster recovery site",
  "dr site",
  "network operations centre",
  "noc",
  "power failure",
  "cooling failure",
  "generator",
  "ups",
  "fire suppression",
  "physical security",
  "access control",
  "site outage",
  "service outage",
  "network outage",
  "cloud outage",
  "resilience",
  "business continuity"
];

const DATA_CENTRE_AGENT_LIMITATION =
  "CIMA can provide defensive incident-management, command, escalation, communications, continuity, training and audit support only. It must not provide attack methods, evasion advice, sabotage advice, cyber-offensive advice, targeting advice or instructions that could assist hostile activity.";

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

function buildDataCentreClarificationQuestions(input = {}) {
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
    !text.includes("data centre") &&
    !text.includes("datacentre") &&
    !text.includes("data center") &&
    !text.includes("server room") &&
    !text.includes("server hall") &&
    !text.includes("cloud") &&
    !text.includes("colocation") &&
    !text.includes("hosting") &&
    !text.includes("network") &&
    !text.includes("backup") &&
    !text.includes("disaster recovery")
  ) {
    questions.push("What type of data centre, cloud facility, server room or digital infrastructure is involved?");
  }

  if (
    !text.includes("gold") &&
    !text.includes("silver") &&
    !text.includes("bronze") &&
    !text.includes("security") &&
    !text.includes("communications") &&
    !text.includes("continuity") &&
    !text.includes("operations") &&
    !text.includes("facilities") &&
    !text.includes("it") &&
    !text.includes("loggist")
  ) {
    questions.push("Which role needs the answer: Gold, Silver, Bronze, operations, facilities, IT, security, continuity, communications or loggist?");
  }

  questions.push("What service, site, system, customer group or dependency is affected?");
  questions.push("What is confirmed fact, what is reported, and what is still unknown?");
  questions.push("Is there any immediate risk to life, staff safety, public safety, critical services or vulnerable people?");
  questions.push("Is the impact local, customer-specific, regional, national or cross-sector?");
  questions.push("Are power, cooling, network, access control, fire, security or supplier dependencies affected?");
  questions.push("Have site leads, facilities teams, IT operations, security, customers, regulators or command leads already been informed?");
  questions.push("Is the user asking for immediate actions, a command briefing, continuity actions, communications wording, a decision log or training material?");

  return questions;
}

function buildDataCentreSearchPlan(input = {}) {
  const context = input.context && typeof input.context === "object"
    ? input.context
    : {};

  return {
    approved_sources_first: true,
    external_search_allowed: false,
    external_search_note: "External search must not be used unless the user gives explicit permission after approved CIMA sources have been checked.",
    suggested_internal_search_terms: [
      "data centre incident management",
      "data centre resilience command response",
      "digital infrastructure continuity",
      "cloud outage business continuity",
      "critical digital infrastructure public safety",
      "Silver command data centre incident",
      "data centre communications incident",
      valueOrDefault(context.persona, "Silver / Tactical Lead")
    ]
  };
}

function getApprovedSourceResults(input = {}, knowledgeSearch = null) {
  if (knowledgeSearch && Array.isArray(knowledgeSearch.results)) {
    return knowledgeSearch.results;
  }

  if (Array.isArray(input.sources)) {
    return input.sources;
  }

  if (Array.isArray(input.approvedSources)) {
    return input.approvedSources;
  }

  if (Array.isArray(input.sourceRecords)) {
    return input.sourceRecords;
  }

  if (Array.isArray(input.retrievalResults)) {
    return input.retrievalResults;
  }

  return [];
}

function buildDataCentreResponse(input = {}) {
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

  const approvedSourceResults = getApprovedSourceResults(input, knowledgeSearch);
  const approvedSourceCount = approvedSourceResults.length;

  const approvedSourceReviewLines = buildApprovedSourceReviewLines({
    results: approvedSourceResults
  });

  const hasDataCentreTerm = hasAnyTerm(question, DATA_CENTRE_TRIGGER_TERMS);

  const questionLower = normaliseText(question);

  const isClearTrainingExercise =
    !questionLower.includes("live") &&
    (
      questionLower.includes("classroom") ||
      questionLower.includes("tabletop") ||
      questionLower.includes("exercise") ||
      questionLower.includes("training note") ||
      questionLower.includes("scenario") ||
      questionLower.includes("simulation") ||
      questionLower.includes("simulated")
    );

  const exerciseSetupChecks = [
    "Confirm the exercise is classroom, tabletop or training-only before delivery.",
    "Confirm the affected facility, service, audience, role level and learning objective.",
    "Confirm that the scenario is defensive and does not include attack methods, evasion advice, sabotage advice, cyber-offensive advice or targeting detail.",
    "Confirm the training focus: service continuity, escalation, logging, communications, welfare and human review.",
    "Confirm how participant decisions, assumptions and learning points will be recorded.",
    "Confirm who will review the training output before reuse or wider circulation."
  ];

  const clarificationQuestions = buildDataCentreClarificationQuestions({
    question,
    context,
    intake
  });

  const searchPlan = buildDataCentreSearchPlan({
    question,
    context,
    intake
  });

  const sourceStatus = knowledgeSearch || approvedSourceCount > 0
    ? "Approved CIMA source search or source records have been supplied to this agent for review."
    : "Approved CIMA source search has not yet been supplied to this agent.";

  const answer = [
    "## Data Centre Agent",
    "",
    "This response is limited to defensive incident-management, command, escalation, communications, continuity, training and audit support.",
    "",
    "## Safety and Use Limitation",
    "",
    DATA_CENTRE_AGENT_LIMITATION,
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
    hasDataCentreTerm
      ? isClearTrainingExercise
        ? "A data centre, cloud facility or digital infrastructure term has been detected. CIMA should treat this as a specialist defensive-support training question subject to human review."
        : "A data centre, cloud facility or digital infrastructure term has been detected. CIMA should treat this as a specialist defensive-support question until clarified."
      : "No data centre or digital infrastructure term was detected in the supplied question. Review whether this agent has been called correctly.",
    "",
    "## Known Evidence",
    "",
    "- The user has raised a data centre, cloud facility, server room or digital infrastructure concern or scenario.",
    "- The available facts must be separated from assumptions, reports and unknowns.",
    "- Any operational use of this output requires human review, local procedures and command judgement.",
    "",
    isClearTrainingExercise ? "## Exercise Setup Checks" : "## Information Gaps",
    "",
    ...(isClearTrainingExercise ? exerciseSetupChecks : clarificationQuestions).map((item) => `- ${item}`),
    "",
    "## Defensive Recommended Actions",
    "",
    "- Establish whether this is a live incident, an exercise, a training scenario or a planning question.",
    "- Confirm who has command responsibility and who is maintaining the decision log.",
    "- Confirm the affected facility, service, customer group, supplier, system or dependency.",
    "- Confirm what is known, what is reported, what is suspected and what remains unknown.",
    "- Identify whether there is immediate risk to life, staff safety, public safety, vulnerable people or essential services.",
    "- Identify whether the incident affects power, cooling, network connectivity, access control, fire systems, security, suppliers or customer services.",
    "- Identify whether the impact is local, customer-specific, regional, national or cross-sector.",
    "- Notify the appropriate site, operations, facilities, IT, security, continuity, communications or command lead in line with local procedures.",
    "- Consider whether emergency services, regulators, customers, suppliers or sector bodies need to be informed under local procedures.",
    "- Maintain controlled internal communications and avoid speculation.",
    "- Preserve a timed decision log recording decisions, uncertainty, action owners and review points.",
    "",
    "## Escalation Requirements",
    "",
    "- Escalate to the responsible human command lead where life safety, staff safety, public safety, essential services or critical digital infrastructure may be affected.",
    "- Escalate immediately where there are injuries, trapped people, missing people, fire, smoke, electrical risk, flooding or uncontrolled site access.",
    "- Escalate where disruption may affect power, cooling, communications, cloud services, customer systems, healthcare, transport, public services or other essential services.",
    "- Escalate where there is a suspected hostile, cyber, sabotage, insider, drone, terrorism or coordinated threat element.",
    "- Escalate if media interest, customer communications, political sensitivity or reputational exposure may arise.",
    "- Escalate if authority, ownership, dependency, supplier responsibility or command lead is unclear.",
    "",
    "## Suggested Approved-Source Search Plan",
    "",
    ...searchPlan.suggested_internal_search_terms.map((item) => `- ${item}`),
    "",
    "## Training Notes",
    "",
    "- This scenario should test whether users separate facts from assumptions.",
    "- It should test whether Gold, Silver and Bronze command roles are clear.",
    "- It should test whether service impact, dependencies and supplier responsibilities are identified.",
    "- It should test whether the decision log records time, source, uncertainty, action owner and review point.",
    "- It should test whether communications remain controlled, factual and non-speculative.",
    "- It should test whether escalation thresholds are recognised without giving unsafe operational detail.",
    "",
    "## Approved Source Review",
    "",
    ...approvedSourceReviewLines,
    "",
    "## Audit Record",
    "",
    `Agent: ${DATA_CENTRE_AGENT_NAME}`,
    `Build ISO: ${DATA_CENTRE_AGENT_BUILD_ISO}`,
    "External search used: No",
    "FAISS searched directly by this agent: No",
    "Human review required: Yes"
  ].join("\n");

  return {
    ok: true,
    agent: DATA_CENTRE_AGENT_NAME,
    build_iso: DATA_CENTRE_AGENT_BUILD_ISO,
    response_path: "DATA CENTRE AGENT",
    path: "DATA CENTRE AGENT",
    rag: "AMBER",
    rag_status: "AMBER",
    hitl: "Required before operational reliance",
    confidence: "Provisional",
    source_mode: sourceStatus,
    safety_notice: DATA_CENTRE_AGENT_LIMITATION,
    clarification_questions: clarificationQuestions,
    search_plan: searchPlan,
    answer,
    sources: approvedSourceResults
  };
}

function getDataCentreAgentStatus() {
  return {
    ok: true,
    agent: DATA_CENTRE_AGENT_NAME,
    build_iso: DATA_CENTRE_AGENT_BUILD_ISO,
    direct_faiss_search: false,
    external_search: false,
    defensive_support_only: true,
    trigger_terms: DATA_CENTRE_TRIGGER_TERMS
  };
}

export {
  buildDataCentreResponse,
  getDataCentreAgentStatus
};

export default {
  buildDataCentreResponse,
  getDataCentreAgentStatus
};

/**
 * AIVS / PGB CIMA - Critical Infrastructure Agent
 * File: operational/critical_infrastructure_agent.js
 * ISO Timestamp: 2026-06-22T14:35:00+01:00
 *
 * Purpose:
 * - Provides defensive CIMA support for critical infrastructure questions.
 * - Supports incident management, command, escalation, communications, continuity, training and audit.
 * - Works after question_intake_agent.js or specialist routing has identified a critical infrastructure trigger.
 *
 * Change Log:
 * - v0.1.0: existing critical infrastructure specialist response agent.
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
 * - This agent must not provide weaponisation advice.
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

const CRITICAL_INFRASTRUCTURE_AGENT_BUILD_ISO = "2026-06-22T14:35:00+01:00";

const CRITICAL_INFRASTRUCTURE_AGENT_NAME = "critical_infrastructure_agent";

const CRITICAL_INFRASTRUCTURE_TRIGGER_TERMS = [
  "critical infrastructure",
  "cni",
  "national infrastructure",
  "essential service",
  "essential services",
  "power station",
  "electricity",
  "substation",
  "water treatment",
  "water supply",
  "reservoir",
  "telecoms",
  "communications network",
  "data centre",
  "transport hub",
  "rail",
  "airport",
  "port",
  "fuel supply",
  "gas supply",
  "energy supply",
  "hospital infrastructure",
  "public utility",
  "utilities",
  "supply chain disruption",
  "service outage",
  "infrastructure threat"
];

const CRITICAL_INFRASTRUCTURE_AGENT_LIMITATION =
  "CIMA can provide defensive incident-management, command, escalation, communications, continuity, training and audit support only. It must not provide attack methods, evasion advice, sabotage advice, weaponisation advice, targeting advice or instructions that could assist hostile activity.";

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

function buildCriticalInfrastructureClarificationQuestions(input = {}) {
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
    !text.includes("power") &&
    !text.includes("water") &&
    !text.includes("energy") &&
    !text.includes("telecom") &&
    !text.includes("data centre") &&
    !text.includes("transport") &&
    !text.includes("rail") &&
    !text.includes("airport") &&
    !text.includes("port") &&
    !text.includes("hospital") &&
    !text.includes("utility") &&
    !text.includes("infrastructure")
  ) {
    questions.push("What type of critical infrastructure or essential service is involved?");
  }

  if (
    !text.includes("gold") &&
    !text.includes("silver") &&
    !text.includes("bronze") &&
    !text.includes("security") &&
    !text.includes("communications") &&
    !text.includes("continuity") &&
    !text.includes("operations") &&
    !text.includes("loggist")
  ) {
    questions.push("Which role needs the answer: Gold, Silver, Bronze, security, operations, continuity, communications or loggist?");
  }

  questions.push("What service, asset, site or system is affected?");
  questions.push("What is confirmed fact, what is reported, and what is still unknown?");
  questions.push("Is there any immediate risk to life, public safety, critical services or vulnerable people?");
  questions.push("Is the impact local, regional, national or cross-sector?");
  questions.push("Have emergency services, regulators, site leads, operators or command leads already been informed?");
  questions.push("Is the user asking for immediate actions, a command briefing, continuity actions, communications wording, a decision log or training material?");

  return questions;
}

function buildCriticalInfrastructureSearchPlan(input = {}) {
  const context = input.context && typeof input.context === "object"
    ? input.context
    : {};

  return {
    approved_sources_first: true,
    external_search_allowed: false,
    external_search_note: "External search must not be used unless the user gives explicit permission after approved CIMA sources have been checked.",
    suggested_internal_search_terms: [
      "critical infrastructure incident management",
      "CNI resilience command response",
      "essential services disruption",
      "critical infrastructure business continuity",
      "critical infrastructure public safety",
      "Silver command critical infrastructure incident",
      "infrastructure threat communications",
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

function buildCriticalInfrastructureResponse(input = {}) {
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

  const hasInfrastructureTerm = hasAnyTerm(question, CRITICAL_INFRASTRUCTURE_TRIGGER_TERMS);

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
    "Confirm the affected sector, site type, audience, role level and learning objective.",
    "Confirm that the scenario is defensive and does not include attack methods, evasion advice, sabotage advice, weaponisation advice or targeting detail.",
    "Confirm the training focus: service continuity, escalation, logging, communications, welfare and human review.",
    "Confirm how participant decisions, assumptions and learning points will be recorded.",
    "Confirm who will review the training output before reuse or wider circulation."
  ];

  const clarificationQuestions = buildCriticalInfrastructureClarificationQuestions({
    question,
    context,
    intake
  });

  const searchPlan = buildCriticalInfrastructureSearchPlan({
    question,
    context,
    intake
  });

  const sourceStatus = knowledgeSearch || approvedSourceCount > 0
    ? "Approved CIMA source search or source records have been supplied to this agent for review."
    : "Approved CIMA source search has not yet been supplied to this agent.";

  const answer = [
    "## Critical Infrastructure Agent",
    "",
    "This response is limited to defensive incident-management, command, escalation, communications, continuity, training and audit support.",
    "",
    "## Safety and Use Limitation",
    "",
    CRITICAL_INFRASTRUCTURE_AGENT_LIMITATION,
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
    hasInfrastructureTerm
      ? isClearTrainingExercise
        ? "A critical-infrastructure or essential-service term has been detected. CIMA should treat this as a specialist defensive-support training question subject to human review."
        : "A critical-infrastructure or essential-service term has been detected. CIMA should treat this as a specialist defensive-support question until clarified."
      : "No critical-infrastructure term was detected in the supplied question. Review whether this agent has been called correctly.",
    "",
    "## Known Evidence",
    "",
    "- The user has raised a critical-infrastructure, essential-service or continuity concern or scenario.",
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
    "- Confirm the affected service, asset, site, system, supplier or dependency.",
    "- Confirm what is known, what is reported, what is suspected and what remains unknown.",
    "- Identify whether there is immediate risk to life, public safety, vulnerable people or essential services.",
    "- Identify whether the impact is local, regional, national or cross-sector.",
    "- Notify the appropriate site, operator, security, safeguarding, continuity, communications or command lead in line with local procedures.",
    "- Consider whether emergency services, regulators, local resilience partners or sector bodies need to be informed under local procedures.",
    "- Maintain controlled internal communications and avoid speculation.",
    "- Preserve a timed decision log recording decisions, uncertainty, action owners and review points.",
    "",
    "## Escalation Requirements",
    "",
    "- Escalate to the responsible human command lead where life safety, public safety, essential services or national infrastructure may be affected.",
    "- Escalate immediately where there are injuries, trapped people, missing people, vulnerable people or uncontrolled public impact.",
    "- Escalate where disruption may affect power, water, transport, communications, healthcare, fuel, data services or other essential services.",
    "- Escalate where there is a suspected hostile, cyber, sabotage, insider, drone, terrorism or coordinated threat element.",
    "- Escalate if media interest, public communications, political sensitivity or reputational exposure may arise.",
    "- Escalate if authority, ownership, dependency, operator responsibility or command lead is unclear.",
    "",
    "## Suggested Approved-Source Search Plan",
    "",
    ...searchPlan.suggested_internal_search_terms.map((item) => `- ${item}`),
    "",
    "## Training Notes",
    "",
    "- This scenario should test whether users separate facts from assumptions.",
    "- It should test whether Gold, Silver and Bronze command roles are clear.",
    "- It should test whether service impact and dependencies are identified.",
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
    `Agent: ${CRITICAL_INFRASTRUCTURE_AGENT_NAME}`,
    `Build ISO: ${CRITICAL_INFRASTRUCTURE_AGENT_BUILD_ISO}`,
    "External search used: No",
    "FAISS searched directly by this agent: No",
    "Human review required: Yes"
  ].join("\n");

  return {
    ok: true,
    agent: CRITICAL_INFRASTRUCTURE_AGENT_NAME,
    build_iso: CRITICAL_INFRASTRUCTURE_AGENT_BUILD_ISO,
    response_path: "CRITICAL INFRASTRUCTURE AGENT",
    path: "CRITICAL INFRASTRUCTURE AGENT",
    rag: "AMBER",
    rag_status: "AMBER",
    hitl: "Required before operational reliance",
    confidence: "Provisional",
    source_mode: sourceStatus,
    safety_notice: CRITICAL_INFRASTRUCTURE_AGENT_LIMITATION,
    clarification_questions: clarificationQuestions,
    search_plan: searchPlan,
    answer,
    sources: approvedSourceResults
  };
}

function getCriticalInfrastructureAgentStatus() {
  return {
    ok: true,
    agent: CRITICAL_INFRASTRUCTURE_AGENT_NAME,
    build_iso: CRITICAL_INFRASTRUCTURE_AGENT_BUILD_ISO,
    direct_faiss_search: false,
    external_search: false,
    defensive_support_only: true,
    trigger_terms: CRITICAL_INFRASTRUCTURE_TRIGGER_TERMS
  };
}

export {
  buildCriticalInfrastructureResponse,
  getCriticalInfrastructureAgentStatus
};

export default {
  buildCriticalInfrastructureResponse,
  getCriticalInfrastructureAgentStatus
};

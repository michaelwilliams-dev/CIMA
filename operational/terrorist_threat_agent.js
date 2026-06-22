/**
 * AIVS / PGB CIMA - Terrorist Threat Agent
 * File: operational/terrorist_threat_agent.js
 * ISO Timestamp: 2026-06-22T14:25:00+01:00
 *
 * Purpose:
 * - Provides defensive CIMA support for terrorist-threat, hostile-actor and serious public-safety threat questions.
 * - Supports incident management, command, escalation, communications, public safety, welfare, training and audit.
 * - Works after question_intake_agent.js or specialist routing has identified a terrorist-threat trigger.
 *
 * Change Log:
 * - v0.1.0: created terrorist threat specialist response agent.
 * - v0.1.1: corrected approved-source intake so the agent can read source records from multiple supplied payload fields.
 * - v0.1.2: uses shared source_review_formatter.js for clean Approved Source Review output.
 * - v0.1.3: Approved Source Review now carries readable source evidence; visible Source Status text removed.
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

import {
  buildApprovedSourceReviewLines
} from "./source_review_formatter.js";

const TERRORIST_THREAT_AGENT_BUILD_ISO = "2026-06-22T14:25:00+01:00";

const TERRORIST_THREAT_AGENT_NAME = "terrorist_threat_agent";

const TERRORIST_THREAT_LIMITATION =
  "CIMA can provide defensive incident-management, command, escalation, communications, public-safety, welfare, training and audit support only. It must not provide attack methods, evasion advice, weaponisation advice, targeting advice or instructions that could assist hostile activity.";

const DEFAULT_CLARIFICATION_QUESTIONS = [
  "Is this a live incident, an exercise, a training scenario or a planning question?",
  "What exactly has been reported or observed?",
  "Where is the reported threat in relation to the site, venue, event, people or asset?",
  "What is confirmed fact, what is reported, and what is still unknown?",
  "Is there any immediate risk to life, public safety, crowd safety, staff safety or vulnerable people?",
  "Have police, emergency services, security, site leads or command leads already been informed?",
  "Which role needs the answer: Gold, Silver, Bronze, security, communications, welfare, loggist or another role?"
];

function safeString(value = "") {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function normaliseText(value = "") {
  return safeString(value)
    .replace(/\s+/g, " ")
    .trim();
}

function normaliseLower(value = "") {
  return normaliseText(value).toLowerCase();
}

function hasMeaningfulText(value = "") {
  return normaliseText(value).length > 0;
}

function joinLines(lines = []) {
  return lines
    .filter((line) => hasMeaningfulText(line))
    .join("\n");
}

function buildNumberedList(items = []) {
  return items
    .filter((item) => hasMeaningfulText(item))
    .map((item, index) => `${index + 1}. ${normaliseText(item)}`)
    .join("\n");
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

function buildTerroristThreatResponse(input = {}) {
  const question = normaliseText(input.question || input.message || input.text || "");
  const context = input.context && typeof input.context === "object"
    ? input.context
    : {};

  const intake = input.intake && typeof input.intake === "object"
    ? input.intake
    : {};

  const triggerDecision = input.triggerDecision || input.trigger_decision || intake.specialist_trigger || {};

  const knowledgeSearch = input.knowledgeSearch && typeof input.knowledgeSearch === "object"
    ? input.knowledgeSearch
    : null;

  const approvedSourceResults = getApprovedSourceResults(input, knowledgeSearch);
  const approvedSourceCount = approvedSourceResults.length;

  const questionLower = normaliseLower(question);

  const sourceStatus = knowledgeSearch || approvedSourceCount > 0
    ? "Approved CIMA source search or source records have been supplied to this agent for review."
    : "Approved CIMA source search has not yet been supplied to this agent.";

  const approvedSourceReviewLines = buildApprovedSourceReviewLines({
    results: approvedSourceResults
  });

  const isLiveIncident = Boolean(
    input.isLiveIncident ||
    input.live ||
    context.live_incident ||
    questionLower.includes("live") ||
    questionLower.includes("confirmed") ||
    questionLower.includes("current") ||
    questionLower.includes("active") ||
    questionLower.includes("immediate") ||
    questionLower.includes("emergency") ||
    questionLower.includes("ongoing") ||
    questionLower.includes("now")
  );

  const isClearTrainingExercise =
    !isLiveIncident &&
    (
      questionLower.includes("classroom") ||
      questionLower.includes("tabletop") ||
      questionLower.includes("exercise") ||
      questionLower.includes("training note") ||
      questionLower.includes("scenario") ||
      questionLower.includes("simulation") ||
      questionLower.includes("simulated")
    );

  const selectedMode = normaliseText(context.mode || input.mode || "Not supplied");
  const selectedPersona = normaliseText(context.persona || input.persona || "Not supplied");
  const selectedCommandLevel = normaliseText(context.command_level || context.commandLevel || input.command_level || "Not supplied");

  const clarificationQuestions =
    Array.isArray(triggerDecision.clarity_questions) && triggerDecision.clarity_questions.length > 0
      ? triggerDecision.clarity_questions
      : DEFAULT_CLARIFICATION_QUESTIONS;

  const exerciseSetupChecks = [
    "Confirm the exercise is classroom, tabletop or training-only before delivery.",
    "Confirm the audience, role level and learning objective.",
    "Confirm that the scenario is defensive and does not include attack methods, evasion advice, weaponisation advice, targeting detail or hostile-use instructions.",
    "Confirm the training focus: safety, escalation, logging, communications, welfare, public protection and human review.",
    "Confirm how participant decisions, assumptions and learning points will be recorded.",
    "Confirm who will review the training output before reuse or wider circulation."
  ];

  const immediatePriorities = [
    "Protect life and safety first.",
    "Do not confront, approach, challenge, follow or attempt to detain a suspected hostile actor.",
    "Escalate immediately through local emergency, security and command procedures where there may be risk to life or public safety.",
    "Move people away from obvious risk areas only if safe to do so and in line with local procedures.",
    "Establish a single command and communications route.",
    "Start a timed decision log recording facts, reports, assumptions, uncertainty, decisions, actions and owners."
  ];

  const commandActions = [
    "Confirm whether this is a live incident, recent report, intelligence concern, planning question or training scenario.",
    "Separate confirmed facts from unverified reports and assumptions.",
    "Confirm the affected location, people, service, route, venue area or asset.",
    "Identify whether there is immediate risk to life, public safety, crowd safety, staff safety, safeguarding or vulnerable people.",
    "Notify the appropriate police, emergency-service, site, venue, security, operations, communications or command lead through local procedures.",
    "Maintain controlled communications and avoid speculation.",
    "Agree review points and decision ownership for the next operational period."
  ];

  const informationToCapture = [
    "Time first reported and source of the report.",
    "Exact location or area affected.",
    "What was seen, heard, received or reported.",
    "What is confirmed, what is unconfirmed and what remains unknown.",
    "People, services, routes, venues or assets potentially affected.",
    "Actions already taken and who authorised them.",
    "Who has been informed and when.",
    "Any immediate welfare, medical, safeguarding or public-safety concerns."
  ];

  const communicationsGuidance = [
    "Use calm factual language.",
    "Separate confirmed facts from unconfirmed reports.",
    "Avoid naming motive, capability, identity or cause unless formally confirmed by the responsible authority.",
    "Tell staff who to report to, what action to take and what not to do.",
    "Do not circulate sensitive operational detail through public or informal channels.",
    "Prepare short internal holding lines for staff, command leads and communications teams where needed."
  ];

  const humanReviewFlags = [
    "Any immediate risk to life or public safety.",
    "Any suspected hostile, terrorist, weapon, explosive, vehicle, cyber, drone or coordinated element.",
    "Any need for evacuation, invacuation, lockdown, shelter, transport disruption or public communications.",
    "Any vulnerable people, missing people, trapped people, injured people or safeguarding concerns.",
    "Any media interest, public concern, reputational exposure or political sensitivity.",
    "Any unclear authority, unclear command lead or conflicting instruction."
  ];

  const liveIncidentLine = isLiveIncident
    ? "This appears to be a live or potentially live incident. Escalate through local emergency, security and command procedures immediately."
    : "This can be handled as a defensive planning, training or command-support prompt unless the user confirms it is live.";

  const responseText = joinLines([
    "CIMA Terrorist Threat Agent",
    "",
    "Safety and use limitation",
    TERRORIST_THREAT_LIMITATION,
    "",
    "Status",
    liveIncidentLine,
    "",
    "Selected context",
    `Mode: ${selectedMode}`,
    `Persona: ${selectedPersona}`,
    `Command level: ${selectedCommandLevel}`,
    "",
    "User question",
    question || "Not supplied",
    "",
    "Immediate priorities",
    buildNumberedList(immediatePriorities),
    "",
    "Command actions",
    buildNumberedList(commandActions),
    "",
    "Information to capture in the incident log",
    buildNumberedList(informationToCapture),
    "",
    "Communications guidance",
    buildNumberedList(communicationsGuidance),
    "",
    isClearTrainingExercise ? "Exercise setup checks" : "Clarifying questions",
    buildNumberedList(isClearTrainingExercise ? exerciseSetupChecks : clarificationQuestions),
    "",
    "Human review and escalation flags",
    buildNumberedList(humanReviewFlags),
    "",
    "Approved Source Review",
    approvedSourceReviewLines.join("\n"),
    "",
    "Audit record",
    `Agent: ${TERRORIST_THREAT_AGENT_NAME}`,
    `Build ISO: ${TERRORIST_THREAT_AGENT_BUILD_ISO}`,
    "External search used: No",
    "FAISS searched directly by this agent: No",
    "Human review required: Yes"
  ]);

  return {
    ok: true,
    agent: TERRORIST_THREAT_AGENT_NAME,
    build_iso: TERRORIST_THREAT_AGENT_BUILD_ISO,
    response_path: "TERRORIST THREAT AGENT",
    path: "TERRORIST THREAT AGENT",
    rag: isLiveIncident ? "RED" : "AMBER",
    rag_status: isLiveIncident ? "RED" : "AMBER",
    hitl: "Required before operational reliance",
    confidence: "Provisional",
    source_mode: sourceStatus,
    requires_human_review: true,
    requires_escalation_check: true,
    safety_notice: TERRORIST_THREAT_LIMITATION,
    clarity_questions: clarificationQuestions,
    clarification_questions: clarificationQuestions,
    search_plan: {
      approved_sources_first: true,
      external_search_allowed: false,
      external_search_note: "External search must not be used unless the user gives explicit permission after approved CIMA sources have been checked.",
      suggested_internal_search_terms: [
        "terrorist threat incident management",
        "public safety command response",
        "hostile actor emergency planning",
        "protective security incident management",
        "Silver command terrorist threat",
        "venue public safety terrorist threat"
      ]
    },
    answer: responseText,
    sources: approvedSourceResults
  };
}

function getTerroristThreatAgentStatus() {
  return {
    ok: true,
    agent: TERRORIST_THREAT_AGENT_NAME,
    build_iso: TERRORIST_THREAT_AGENT_BUILD_ISO,
    response_path: "TERRORIST THREAT AGENT",
    safety_notice: TERRORIST_THREAT_LIMITATION
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

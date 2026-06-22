/**
 * AIVS / PGB CIMA - Cyber Agent
 * File: operational/cyber_agent.js
 * ISO Timestamp: 2026-06-22T13:20:00+01:00
 *
 * Purpose:
 * - Provides defensive CIMA support for cyber incident, digital disruption and information-security questions.
 * - Supports incident management, command, escalation, continuity, communications, training and audit.
 * - Works after question_intake_agent.js or specialist routing has identified a cyber trigger.
 *
 * Change Log:
 * - v0.1.0: existing cyber specialist response agent.
 * - v0.1.1: corrected approved-source intake so the agent can read source records from multiple supplied payload fields.
 * - v0.1.1: removed misleading "specialist filtering" wording from source-review output.
 * - v0.1.1: moved Approved Source Review to the bottom immediately before Audit Record.
 * - v0.1.2: uses shared source_review_formatter.js for clean Approved Source Review output.
 *
 * Control Notes:
 * - This agent must not provide attack methods.
 * - This agent must not provide evasion advice.
 * - This agent must not provide exploit instructions.
 * - This agent must not provide malware instructions.
 * - This agent must not provide credential theft advice.
 * - This agent must not provide persistence, privilege escalation or lateral movement advice.
 * - This agent must not provide instructions that could assist hostile cyber activity.
 * - This agent must not advise users to confront suspected hostile actors.
 * - This agent does not search FAISS directly.
 * - This agent does not perform external search.
 * - Source search must be handled by an approved source or retrieval agent.
 * - Outputs are draft support only and require authorised human review.
 */

import {
  buildApprovedSourceReviewLines
} from "./source_review_formatter.js";

const CYBER_AGENT_BUILD_ISO = "2026-06-22T13:20:00+01:00";

const CYBER_AGENT_NAME = "cyber_agent";

const CYBER_TRIGGER_TERMS = [
  "cyber",
  "cyber incident",
  "cyber attack",
  "cyberattack",
  "ransomware",
  "malware",
  "phishing",
  "business email compromise",
  "bec",
  "credential theft",
  "data breach",
  "data leak",
  "system compromise",
  "network compromise",
  "unauthorised access",
  "unauthorized access",
  "account takeover",
  "ddos",
  "denial of service",
  "service outage",
  "cloud outage",
  "network outage",
  "security incident",
  "information security",
  "infosec",
  "soc",
  "security operations centre",
  "security operations center",
  "siem",
  "incident response",
  "containment",
  "isolate system",
  "compromised email",
  "compromised account",
  "suspicious login",
  "insider threat",
  "supplier compromise"
];

const CYBER_AGENT_LIMITATION =
  "CIMA can provide defensive cyber incident-management, command, escalation, communications, continuity, training and audit support only. It must not provide attack methods, exploit instructions, evasion advice, malware instructions, credential theft advice, persistence advice, privilege escalation advice, lateral movement advice or instructions that could assist hostile cyber activity.";

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

function buildCyberClarificationQuestions(input = {}) {
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
    !text.includes("ransomware") &&
    !text.includes("malware") &&
    !text.includes("phishing") &&
    !text.includes("data breach") &&
    !text.includes("data leak") &&
    !text.includes("account") &&
    !text.includes("network") &&
    !text.includes("cloud") &&
    !text.includes("ddos") &&
    !text.includes("email") &&
    !text.includes("supplier") &&
    !text.includes("system")
  ) {
    questions.push("What type of cyber issue is involved, for example ransomware, phishing, data breach, account compromise, network outage, cloud outage or supplier compromise?");
  }

  if (
    !text.includes("gold") &&
    !text.includes("silver") &&
    !text.includes("bronze") &&
    !text.includes("security") &&
    !text.includes("communications") &&
    !text.includes("continuity") &&
    !text.includes("operations") &&
    !text.includes("it") &&
    !text.includes("soc") &&
    !text.includes("loggist")
  ) {
    questions.push("Which role needs the answer: Gold, Silver, Bronze, IT, SOC, security, operations, continuity, communications or loggist?");
  }

  questions.push("What system, service, account, supplier, data set or business process is affected?");
  questions.push("What is confirmed fact, what is reported, and what is still unknown?");
  questions.push("Is there any immediate risk to life, public safety, critical services, personal data or vulnerable people?");
  questions.push("Is the impact local, customer-specific, organisation-wide, regional, national or cross-sector?");
  questions.push("Have IT, SOC, security, continuity, communications, legal, data-protection or command leads already been informed?");
  questions.push("Is the user asking for immediate actions, a command briefing, continuity actions, communications wording, a decision log or training material?");

  return questions;
}

function buildCyberSearchPlan(input = {}) {
  const context = input.context && typeof input.context === "object"
    ? input.context
    : {};

  return {
    approved_sources_first: true,
    external_search_allowed: false,
    external_search_note: "External search must not be used unless the user gives explicit permission after approved CIMA sources have been checked.",
    suggested_internal_search_terms: [
      "cyber incident management",
      "cyber incident command response",
      "ransomware business continuity",
      "data breach incident management",
      "phishing account compromise response",
      "Silver command cyber incident",
      "cyber incident communications",
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

function buildCyberResponse(input = {}) {
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

  const sourceSupportStatus = !knowledgeSearch && approvedSourceCount === 0
    ? "No approved CIMA source search or source records were supplied to this agent."
    : approvedSourceCount > 0
      ? "Source-supported for defensive cyber incident management, command, continuity or training context only. Human review remains required."
      : "No relevant approved source was supplied to this specialist agent. The answer remains provisional and should not be treated as source-supported.";

  const approvedSourceReviewLines = buildApprovedSourceReviewLines({
    results: approvedSourceResults,
    sourceSupportStatus,
    externalSearchUsed: "No"
  });

  const hasCyberTerm = hasAnyTerm(question, CYBER_TRIGGER_TERMS);

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
    "Confirm the affected system type, audience, role level and learning objective.",
    "Confirm that the scenario is defensive and does not include attack methods, exploit instructions, evasion advice, malware instructions, credential theft advice or other hostile cyber detail.",
    "Confirm the training focus: incident command, containment decisions, escalation, logging, communications, continuity and human review.",
    "Confirm how participant decisions, assumptions and learning points will be recorded.",
    "Confirm who will review the training output before reuse or wider circulation."
  ];

  const clarificationQuestions = buildCyberClarificationQuestions({
    question,
    context,
    intake
  });

  const searchPlan = buildCyberSearchPlan({
    question,
    context,
    intake
  });

  const sourceStatus = knowledgeSearch || approvedSourceCount > 0
    ? "Approved CIMA source search or source records have been supplied to this agent for review."
    : "Approved CIMA source search has not yet been supplied to this agent.";

  const answer = [
    "## Cyber Agent",
    "",
    "This response is limited to defensive cyber incident-management, command, escalation, communications, continuity, training and audit support.",
    "",
    "## Safety and Use Limitation",
    "",
    CYBER_AGENT_LIMITATION,
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
    hasCyberTerm
      ? isClearTrainingExercise
        ? "A cyber incident or digital disruption term has been detected. CIMA should treat this as a specialist defensive-support training question subject to human review."
        : "A cyber incident or digital disruption term has been detected. CIMA should treat this as a specialist defensive-support question until clarified."
      : "No cyber incident or digital disruption term was detected in the supplied question. Review whether this agent has been called correctly.",
    "",
    "## Known Evidence",
    "",
    "- The user has raised a cyber incident, digital disruption or information-security concern or scenario.",
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
    "- Confirm the affected system, account, service, supplier, data set, customer group or business process.",
    "- Confirm what is known, what is reported, what is suspected and what remains unknown.",
    "- Identify whether there is immediate risk to life, public safety, critical services, personal data, vulnerable people or operational continuity.",
    "- Notify the appropriate IT, SOC, security, continuity, communications, legal, data-protection or command lead in line with local procedures.",
    "- Consider whether customers, suppliers, regulators, insurers or sector bodies need to be informed under local procedures.",
    "- Maintain controlled internal communications and avoid speculation.",
    "- Preserve a timed decision log recording decisions, uncertainty, action owners and review points.",
    "- Avoid technical containment, restoration or public communications decisions without authorised human review.",
    "",
    "## Escalation Requirements",
    "",
    "- Escalate to the responsible human command lead where critical services, personal data, public safety, customers or essential operations may be affected.",
    "- Escalate immediately where there is suspected ransomware, data breach, active compromise, widespread outage, supplier compromise or critical-service disruption.",
    "- Escalate where disruption may affect healthcare, transport, public services, payment systems, communications, data centres or other essential services.",
    "- Escalate where there is a suspected hostile, insider, coordinated, criminal or state-linked threat element.",
    "- Escalate if media interest, customer communications, political sensitivity or reputational exposure may arise.",
    "- Escalate if authority, ownership, supplier responsibility, data-protection responsibility or command lead is unclear.",
    "",
    "## Source Status",
    "",
    sourceStatus,
    "",
    "Approved CIMA sources have been searched and supplied to this agent where available. Human review remains required before operational reliance.",
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
    "- It should test whether affected systems, data, services and dependencies are identified.",
    "- It should test whether the decision log records time, source, uncertainty, action owner and review point.",
    "- It should test whether communications remain controlled, factual and non-speculative.",
    "- It should test whether escalation thresholds are recognised without giving unsafe technical detail.",
    "",
    "## Approved Source Review",
    "",
    ...approvedSourceReviewLines,
    "",
    "## Audit Record",
    "",
    `Agent: ${CYBER_AGENT_NAME}`,
    `Build ISO: ${CYBER_AGENT_BUILD_ISO}`,
    "External search used: No",
    "FAISS searched directly by this agent: No",
    "Human review required: Yes"
  ].join("\n");

  return {
    ok: true,
    agent: CYBER_AGENT_NAME,
    build_iso: CYBER_AGENT_BUILD_ISO,
    response_path: "CYBER AGENT",
    path: "CYBER AGENT",
    rag: "AMBER",
    rag_status: "AMBER",
    hitl: "Required before operational reliance",
    confidence: "Provisional",
    source_mode: sourceStatus,
    safety_notice: CYBER_AGENT_LIMITATION,
    clarification_questions: clarificationQuestions,
    search_plan: searchPlan,
    answer,
    sources: approvedSourceResults
  };
}

function getCyberAgentStatus() {
  return {
    ok: true,
    agent: CYBER_AGENT_NAME,
    build_iso: CYBER_AGENT_BUILD_ISO,
    direct_faiss_search: false,
    external_search: false,
    defensive_support_only: true,
    trigger_terms: CYBER_TRIGGER_TERMS
  };
}

export {
  buildCyberResponse,
  getCyberAgentStatus
};

export default {
  buildCyberResponse,
  getCyberAgentStatus
};

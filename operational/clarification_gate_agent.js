/**
 * AIVS / PGB CIMA - Clarification Gate Agent
 * File: operational/clarification_gate_agent.js
 * ISO Timestamp: 2026-06-15T06:20:00+01:00
 *
 * Purpose:
 * - Checks whether an incoming CIMA question is clear enough to answer.
 * - If the question is vague, incomplete, high-risk, or operationally ambiguous,
 *   it returns a controlled CLARIFICATION_REQUIRED response.
 * - This agent must run before specialist operational guidance is given.
 *
 * Change Log:
 * - v0.1.0: created standalone clarification gate agent.
 *
 * ISO Control Notes:
 * - This agent does not send email.
 * - This agent does not write audit records directly.
 * - This agent does not perform external search.
 * - This agent does not provide operational guidance.
 * - This agent exists to prevent unsafe or premature operational answers.
 */

const CLARIFICATION_GATE_BUILD_ISO = "2026-06-15T06:20:00+01:00";

function safeString(value = "") {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function normaliseText(value = "") {
  return safeString(value)
    .replace(/\s+/g, " ")
    .trim();
}

function lowerText(value = "") {
  return normaliseText(value).toLowerCase();
}

function wordCount(value = "") {
  const text = normaliseText(value);

  if (!text) {
    return 0;
  }

  return text.split(/\s+/).filter(Boolean).length;
}

function containsAny(text = "", terms = []) {
  const haystack = lowerText(text);

  return terms.some((term) => haystack.includes(term));
}

const HIGH_RISK_TERMS = [
  "terror",
  "terrorist",
  "terrorism",
  "attack",
  "attacker",
  "bomb",
  "explosive",
  "weapon",
  "armed",
  "hostage",
  "knife",
  "gun",
  "shooting",
  "drone",
  "uav",
  "suspicious package",
  "lockdown",
  "evacuation",
  "casualty",
  "casualties",
  "medical emergency",
  "fire",
  "chemical",
  "hazmat",
  "riot",
  "public disorder",
  "protest",
  "ransomware",
  "cyber incident",
  "hostile",
  "threat",
  "incident"
];

const LIVE_MODE_TERMS = [
  "live",
  "real",
  "current",
  "active",
  "confirmed",
  "ongoing",
  "immediate",
  "now",
  "emergency",
  "in progress"
];

const NON_LIVE_MODE_TERMS = [
  "training",
  "exercise",
  "scenario",
  "planning",
  "plan",
  "tabletop",
  "simulation",
  "simulated",
  "draft",
  "policy",
  "procedure"
];

const COMMAND_TERMS = [
  "bronze",
  "silver",
  "gold",
  "strategic",
  "tactical",
  "operational",
  "commander",
  "command",
  "site lead",
  "security lead",
  "control room",
  "duty manager"
];

const VAGUE_REQUEST_TERMS = [
  "what do we do",
  "what should we do",
  "help",
  "urgent",
  "advise",
  "advice",
  "handle this",
  "deal with this",
  "problem",
  "issue",
  "situation"
];

const MIN_CLEAR_OPERATIONAL_WORDS = 20;

function getContextValue(context = {}, keys = []) {
  if (!context || typeof context !== "object") {
    return "";
  }

  for (const key of keys) {
    const value = safeString(context[key]);

    if (value) {
      return value;
    }
  }

  return "";
}

function assessClarificationNeed(input = {}) {
  const question = normaliseText(input.question || input.prompt || input.message || "");
  const context = input.context && typeof input.context === "object" ? input.context : {};

  const mode = getContextValue(context, ["mode", "incident_mode", "type"]);
  const persona = getContextValue(context, ["persona", "role"]);
  const commandLevel = getContextValue(context, ["command_level", "commandLevel", "level"]);
  const requestedOutput = getContextValue(context, ["requested_output", "requestedOutput", "output"]);

  const combinedText = [
    question,
    mode,
    persona,
    commandLevel,
    requestedOutput
  ].join(" ");

  const reasons = [];
  const clarificationQuestions = [];

  const words = wordCount(question);
  const isHighRisk = containsAny(question, HIGH_RISK_TERMS);
  const hasLiveMode = containsAny(combinedText, LIVE_MODE_TERMS);
  const hasNonLiveMode = containsAny(combinedText, NON_LIVE_MODE_TERMS);
  const hasAnyMode = Boolean(mode) || hasLiveMode || hasNonLiveMode;
  const hasCommandContext = Boolean(commandLevel) || Boolean(persona) || containsAny(combinedText, COMMAND_TERMS);
  const isVagueRequest = containsAny(question, VAGUE_REQUEST_TERMS);
  const hasSpecificIncidentType = isHighRisk || words >= 8;

   if (!question || words < 4) {
    reasons.push("The question is too short or lacks a clear request.");
    clarificationQuestions.push("Please state the incident, issue, or decision you want CIMA to support.");
  }

  if (question && words < MIN_CLEAR_OPERATIONAL_WORDS && (isHighRisk || isVagueRequest)) {
    reasons.push("The question is under the minimum clarity threshold for operational or high-risk CIMA guidance.");
    clarificationQuestions.push("Please provide more detail before CIMA gives operational guidance. Include what has happened, whether it is live or training, who is asking, the site or location involved, and what decision support is required.");
  }

  if (isHighRisk && !hasAnyMode) {
    reasons.push("The question appears high-risk, but it is unclear whether this is live, exercise, training, or planning.");
    clarificationQuestions.push("Is this a live incident, an exercise, a planning scenario, or a training request?");
  }

  if (isHighRisk && !hasCommandContext) {
    reasons.push("The command or user role is unclear for a high-risk question.");
    clarificationQuestions.push("Who is asking: Bronze, Silver, Gold, control room, site lead, security lead, or trainer?");
  }

  if (isHighRisk && hasLiveMode && hasNonLiveMode) {
    reasons.push("The question contains both live-incident and training/planning language.");
    clarificationQuestions.push("Please confirm whether this is a real live incident or only a training/planning scenario.");
  }

  if (isVagueRequest && !hasSpecificIncidentType) {
    reasons.push("The request is vague and does not identify the incident type clearly.");
    clarificationQuestions.push("What type of incident or risk are you referring to?");
  }

  if (isHighRisk && !containsAny(combinedText, ["site", "location", "venue", "building", "event", "area", "near", "outside", "inside"])) {
    reasons.push("The operating context or location is unclear.");
    clarificationQuestions.push("What site, venue, building, event, or operating area is involved?");
  }

  const uniqueQuestions = [...new Set(clarificationQuestions)];

  const clarificationRequired = reasons.length > 0;

  return {
    ok: true,
    agent: "clarification_gate_agent",
    build_iso: CLARIFICATION_GATE_BUILD_ISO,
    clarification_required: clarificationRequired,
    reasons,
    clarification_questions: uniqueQuestions,
    detected: {
      high_risk_question: isHighRisk,
      live_mode_language: hasLiveMode,
      non_live_mode_language: hasNonLiveMode,
      command_context_present: hasCommandContext,
      vague_request_language: isVagueRequest,
      word_count: words
    }
  };
}

function buildClarificationRequiredResponse(input = {}) {
  const assessment = assessClarificationNeed(input);

  if (!assessment.clarification_required) {
    return {
      ok: true,
      agent: "clarification_gate_agent",
      build_iso: CLARIFICATION_GATE_BUILD_ISO,
      clarification_required: false
    };
  }

  return {
    ok: true,
    build_iso: CLARIFICATION_GATE_BUILD_ISO,
    response_agent_build_iso: CLARIFICATION_GATE_BUILD_ISO,
    response_path: "CLARIFICATION_REQUIRED",
    path: "CLARIFICATION_REQUIRED",
    agent: "clarification_gate_agent",
    rag: "AMBER",
    rag_status: "AMBER",
    hitl: "Required before operational reliance",
    confidence: "low",
    source_mode: "No retrieval or operational guidance until minimum facts are supplied.",
    answer: [
      "CLARIFICATION REQUIRED",
      "",
      "The question is not clear enough for CIMA to provide operational guidance safely.",
      "",
      "Please answer the clarification questions below so the system can route the request correctly.",
      "",
      "CIMA can support defensive incident management, escalation, communications, logging, audit, training and command support. It must not provide unsafe operational detail or hostile-use guidance."
    ].join("\n"),
    clarification_questions: assessment.clarification_questions,
    clarification_reasons: assessment.reasons,
    search_plan: {
      approved_sources_first: true,
      external_search_allowed: false,
      external_search_note: "No external search should be used at clarification stage.",
      suggested_internal_search_terms: []
    },
    sources: [],
    detected: assessment.detected
  };
}

function getClarificationGateAgentStatus() {
  return {
    ok: true,
    agent: "clarification_gate_agent",
    build_iso: CLARIFICATION_GATE_BUILD_ISO,
    purpose: "Requests clarification where an incoming CIMA question is unclear, incomplete, high-risk or operationally ambiguous.",
    provides_operational_guidance: false,
    external_search: false,
    audit_direct_write: false
  };
}

export {
  CLARIFICATION_GATE_BUILD_ISO,
  assessClarificationNeed,
  buildClarificationRequiredResponse,
  getClarificationGateAgentStatus
};

export default {
  CLARIFICATION_GATE_BUILD_ISO,
  assessClarificationNeed,
  buildClarificationRequiredResponse,
  getClarificationGateAgentStatus
};

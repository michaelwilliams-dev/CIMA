/**
 * AIVS / PGB CIMA - Clarification Gate Agent
 * File: operational/clarification_gate_agent.js
 * ISO Timestamp: 2026-06-16T10:50:00+01:00
 *
 * Purpose:
 * - Checks whether an incoming CIMA question is clear enough to answer.
 * - If the question is vague, incomplete, high-risk, or operationally ambiguous,
 *   it returns a controlled CLARIFICATION_REQUIRED response.
 * - This agent must run before specialist operational guidance is given.
 *
 * Change Log:
 * - v0.1.0: created standalone clarification gate agent.
 * - v0.2.0: replaced single-word blocking with three-signal clarification scoring.
 *
 * ISO Control Notes:
 * - This agent does not send email.
 * - This agent does not write audit records directly.
 * - This agent does not perform external search.
 * - This agent does not provide operational guidance.
 * - This agent exists to prevent unsafe or premature operational answers.
 */

const CLARIFICATION_GATE_BUILD_ISO = "2026-06-16T10:50:00+01:00";

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

  return terms.some((term) => haystack.includes(lowerText(term)));
}

function hasMeaningfulValue(value = "") {
  const clean = lowerText(value);

  return Boolean(
    clean &&
    clean !== "n/a" &&
    clean !== "na" &&
    clean !== "none" &&
    clean !== "not supplied" &&
    clean !== "not set"
  );
}

const HARD_UNSAFE_TERMS = [
  "how do i disable",
  "how can i disable",
  "disable a drone",
  "disable the drone",
  "jam a drone",
  "jamming a drone",
  "shoot down",
  "bring down a drone",
  "capture a drone",
  "follow the drone",
  "track the operator",
  "weaponise",
  "weaponize",
  "make a bomb",
  "build a bomb",
  "avoid detection",
  "evade police",
  "bypass security",
  "attack method",
  "targeting advice"
];

const RISK_TERMS = [
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

const SPECIALIST_RISK_TERMS = [
  "terror",
  "terrorist",
  "terrorism",
  "bomb",
  "explosive",
  "weapon",
  "armed",
  "hostage",
  "shooting",
  "drone",
  "uav",
  "suspicious package",
  "chemical",
  "hazmat"
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
  "duty manager",
  "trainer",
  "communications lead",
  "safeguarding lead",
  "loggist"
];

const LOCATION_TERMS = [
  "site",
  "location",
  "venue",
  "building",
  "event",
  "area",
  "near",
  "outside",
  "inside",
  "gate",
  "stadium",
  "office",
  "school",
  "campus",
  "transport hub",
  "data centre",
  "airport",
  "car park"
];

const SAFE_REQUEST_TERMS = [
  "record",
  "log",
  "logging",
  "incident log",
  "incident report",
  "audit",
  "review",
  "debrief",
  "lessons learned",
  "escalation",
  "communications",
  "communication",
  "holding line",
  "briefing",
  "command support",
  "decision record",
  "training",
  "training note",
  "exercise",
  "tabletop",
  "plan",
  "planning",
  "policy",
  "procedure",
  "checklist",
  "defensive",
  "defensive incident management",
  "defensive incident-management",
  "human review",
  "source check"
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
const MIN_CLARIFICATION_SIGNALS = 3;

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

function addUniqueQuestion(questions = [], value = "") {
  if (!questions.includes(value)) {
    questions.push(value);
  }
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
  const clarificationSignals = [];

  const words = wordCount(question);

  const hasHardUnsafeLanguage = containsAny(question, HARD_UNSAFE_TERMS);
  const hasRiskLanguage = containsAny(question, RISK_TERMS);
  const hasSpecialistRiskLanguage = containsAny(question, SPECIALIST_RISK_TERMS);

  const hasLiveMode = containsAny(combinedText, LIVE_MODE_TERMS);
  const hasNonLiveMode = containsAny(combinedText, NON_LIVE_MODE_TERMS);
  const hasModeValue = hasMeaningfulValue(mode);
  const hasAnyMode = hasModeValue || hasLiveMode || hasNonLiveMode;

  const hasCommandContext =
    hasMeaningfulValue(commandLevel) ||
    hasMeaningfulValue(persona) ||
    containsAny(combinedText, COMMAND_TERMS);

  const hasLocationContext = containsAny(combinedText, LOCATION_TERMS);
  const hasSafeRequest = containsAny(combinedText, SAFE_REQUEST_TERMS);
  const isVagueRequest = containsAny(question, VAGUE_REQUEST_TERMS);

  const isClearSafeManagementRequest =
    hasCommandContext &&
    hasSafeRequest &&
    !hasHardUnsafeLanguage;

  const isClearNonLiveTrainingScenario =
    hasNonLiveMode &&
    hasSafeRequest &&
    (
      hasCommandContext ||
      containsAny(combinedText, ["classroom", "tabletop", "exercise", "training", "training note", "scenario", "simulation", "simulated"])
    ) &&
    !hasHardUnsafeLanguage;

  const isClearLiveSpecialistIncident =
    hasSpecialistRiskLanguage &&
    hasLiveMode &&
    hasCommandContext &&
    hasLocationContext &&
    hasSafeRequest &&
    !hasHardUnsafeLanguage;

  if (!question || words < 4) {
    reasons.push("The question is too short or lacks a clear request.");
    addUniqueQuestion(
      clarificationQuestions,
      "Please state the incident, issue, or decision you want CIMA to support."
    );
  }

  if (hasHardUnsafeLanguage) {
    reasons.push("The question appears to request unsafe operational detail rather than defensive CIMA support.");
    addUniqueQuestion(
      clarificationQuestions,
      "Please reframe the request as defensive incident management, escalation, communications, logging, audit, training or human-review support only."
    );
  }

  if (
    question &&
    !hasHardUnsafeLanguage &&
    !isClearSafeManagementRequest &&
    !isClearNonLiveTrainingScenario &&
    !isClearLiveSpecialistIncident
  ) {
    if (hasRiskLanguage && !hasAnyMode) {
      clarificationSignals.push("missing_status");
      addUniqueQuestion(
        clarificationQuestions,
        "Is this a live incident, an exercise, a planning scenario, or a training request?"
      );
    }

    if ((hasRiskLanguage || isVagueRequest) && !hasCommandContext) {
      clarificationSignals.push("missing_role");
      addUniqueQuestion(
        clarificationQuestions,
        "Who is asking: Bronze, Silver, Gold, control room, site lead, security lead, trainer, communications lead, safeguarding lead or loggist?"
      );
    }

    if (hasRiskLanguage && hasLiveMode && !hasLocationContext) {
      clarificationSignals.push("missing_location");
      addUniqueQuestion(
        clarificationQuestions,
        "What site, venue, building, event, operating area or location is involved?"
      );
    }

    if (isVagueRequest) {
      clarificationSignals.push("vague_request");
      addUniqueQuestion(
        clarificationQuestions,
        "What specific decision, record, communication, escalation, plan or review do you want CIMA to support?"
      );
    }

    if (
      hasRiskLanguage &&
      words < MIN_CLEAR_OPERATIONAL_WORDS &&
      !hasSafeRequest
    ) {
      clarificationSignals.push("insufficient_detail");
      addUniqueQuestion(
        clarificationQuestions,
        "Please provide more detail before CIMA gives operational guidance. Include what has happened, whether it is live or training, who is asking, the location involved, and what decision support is required."
      );
    }

    if (
      hasRiskLanguage &&
      hasLiveMode &&
      hasNonLiveMode
    ) {
      clarificationSignals.push("conflicting_status");
      addUniqueQuestion(
        clarificationQuestions,
        "Please confirm whether this is a real live incident or only a training, planning or exercise scenario."
      );
    }

    if (clarificationSignals.length >= MIN_CLARIFICATION_SIGNALS) {
      reasons.push("The question has several missing or ambiguous context signals and requires clarification before CIMA can route it safely.");
    }
  }

  const clarificationRequired = reasons.length > 0;

  return {
    ok: true,
    agent: "clarification_gate_agent",
    build_iso: CLARIFICATION_GATE_BUILD_ISO,
    clarification_required: clarificationRequired,
    reasons,
    clarification_questions: clarificationQuestions,
    detected: {
      high_risk_question: hasRiskLanguage,
      live_mode_language: hasLiveMode,
      non_live_mode_language: hasNonLiveMode,
      command_context_present: hasCommandContext,
      location_context_present: hasLocationContext,
      safe_request_language: hasSafeRequest,
      vague_request_language: isVagueRequest,
      hard_unsafe_language: hasHardUnsafeLanguage,
      specialist_risk_language: hasSpecialistRiskLanguage,
      clear_safe_management_request: isClearSafeManagementRequest,
      clear_non_live_training_scenario: isClearNonLiveTrainingScenario,
      clear_live_specialist_incident: isClearLiveSpecialistIncident,
      clarification_signal_count: clarificationSignals.length,
      clarification_signals: clarificationSignals,
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
    purpose: "Requests clarification only where a question is too short, unsafe, or has three or more missing context signals.",
    provides_operational_guidance: false,
    external_search: false,
    audit_direct_write: false,
    single_word_blocking: false,
    clarification_scoring: true
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

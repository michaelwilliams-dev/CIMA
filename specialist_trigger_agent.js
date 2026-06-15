/**
 * AIVS / PGB CIMA - Specialist Trigger Agent
 * File: specialist_trigger_agent.js
 * ISO Timestamp: 2026-06-14T06:35:00+01:00
 *
 * Purpose:
 * - Detects high-consequence CIMA trigger terms before the main response is built.
 * - Routes eligible questions toward specialist defensive-support agents.
 * - Keeps terrorist, drone, cyber, evacuation and major incident handling out of server.js.
 *
 * Change Log:
 * - v0.1.0: created standalone specialist trigger detection agent.
 *
 * ISO Control Notes:
 * - This agent does not answer the user's question.
 * - This agent does not perform retrieval.
 * - This agent does not call external services.
 * - This agent only classifies and recommends a specialist route.
 * - Specialist outputs must remain defensive, operational, audit-focused and human-reviewable.
 */

const SPECIALIST_TRIGGER_AGENT_BUILD_ISO = "2026-06-14T06:35:00+01:00";

const SAFETY_NOTICE =
  "CIMA can provide defensive incident-management, command, escalation, communications, training and audit support only. It must not provide attack methods, evasion advice, weaponisation advice, targeting advice or instructions that could assist hostile activity.";

const TRIGGER_CATEGORIES = [
  {
    category: "DRONE_THREAT",
    agent: "drone_threat_agent",
    confidence: "high",
    terms: [
      "drone",
      "drones",
      "uav",
      "uas",
      "unmanned aircraft",
      "hostile drone",
      "drone threat",
      "drone attack",
      "drone surveillance",
      "drone observation",
      "counter drone",
      "counter-drone"
    ],
    clarity_questions: [
      "What exactly has been observed?",
      "Where is the drone or suspected drone in relation to the site?",
      "Is the incident live, recent, or a training scenario?",
      "Have security teams, police, or command leads already been informed?"
    ]
  },
  {
    category: "TERRORIST_THREAT",
    agent: "terrorist_threat_agent",
    confidence: "high",
    terms: [
      "terrorist",
      "terrorism",
      "terror attack",
      "terrorist threat",
      "hostile actor",
      "hostile vehicle",
      "bomb threat",
      "suspicious package",
      "marauding attack",
      "active shooter",
      "active assailant"
    ],
    clarity_questions: [
      "What is the nature of the threat or concern?",
      "Is this a live incident, intelligence concern, exercise, or training scenario?",
      "What location, people, or assets may be affected?",
      "Have emergency services, security teams, or command leads already been informed?"
    ]
  },
  {
    category: "CYBER_ATTACK",
    agent: "cyber_threat_agent",
    confidence: "medium",
    terms: [
      "cyber attack",
      "cyberattack",
      "ransomware",
      "malware",
      "phishing",
      "system compromise",
      "data breach",
      "network attack",
      "ddos",
      "denial of service"
    ],
    clarity_questions: [
      "What system or service appears to be affected?",
      "When was the issue first detected?",
      "Is the incident live, contained, or under investigation?",
      "Have IT, security, legal, or command leads already been informed?"
    ]
  },
  {
    category: "EVACUATION_OR_LOCKDOWN",
    agent: "evacuation_lockdown_agent",
    confidence: "medium",
    terms: [
      "evacuation",
      "evacuate",
      "lockdown",
      "shelter in place",
      "invacuation",
      "cordon",
      "site closure",
      "building closure"
    ],
    clarity_questions: [
      "Is the issue live, planned, or part of an exercise?",
      "Which site, building, floor, or area is affected?",
      "Who is currently responsible for command decisions?",
      "Have emergency services or site safety leads already been informed?"
    ]
  },
  {
    category: "MAJOR_INCIDENT",
    agent: "major_incident_agent",
    confidence: "medium",
    terms: [
      "major incident",
      "mass casualty",
      "multiple casualties",
      "fatality",
      "serious injury",
      "civil unrest",
      "riot",
      "public disorder",
      "critical incident"
    ],
    clarity_questions: [
      "What has happened and when?",
      "How many people or sites may be affected?",
      "Is there an immediate threat to life or safety?",
      "Which command structure or escalation route is currently active?"
    ]
  },
  {
    category: "CHEMICAL_OR_HAZMAT",
    agent: "chemical_hazmat_agent",
    confidence: "medium",
    terms: [
      "chemical incident",
      "hazmat",
      "hazardous material",
      "toxic release",
      "gas leak",
      "biological incident",
      "radiological incident",
      "contamination"
    ],
    clarity_questions: [
      "What substance or hazard is suspected?",
      "Where is the affected area?",
      "Are people currently exposed or potentially exposed?",
      "Have emergency services, site safety leads, or specialist responders already been informed?"
    ]
  }
];

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

function escapeRegExp(value = "") {
  return safeString(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function termIsMatched(text = "", term = "") {
  const cleanText = normaliseText(text);
  const cleanTerm = normaliseText(term);

  if (!cleanText || !cleanTerm) {
    return false;
  }

  const hasLettersOrNumbers = /[a-z0-9]/i.test(cleanTerm);

  if (!hasLettersOrNumbers) {
    return false;
  }

  const pattern = new RegExp("(^|[^a-z0-9])" + escapeRegExp(cleanTerm) + "([^a-z0-9]|$)", "i");
  return pattern.test(cleanText);
}

function getMatchedTerms(text = "", terms = []) {
  return terms.filter((term) => termIsMatched(text, term));
}

function detectQuestionContext(input = {}) {
  const rawQuestion = safeString(input.question || input.message || input.text || "");
  const question = normaliseText(rawQuestion);
  const context = input.context || {};

  const persona = safeString(context.persona || input.persona || "");
  const commandLevel = safeString(
    context.command_level ||
    context.commandLevel ||
    context.level ||
    input.command_level ||
    input.commandLevel ||
    input.level ||
    ""
  );

  const isTrainingRequest =
    question.includes("training") ||
    question.includes("trainer") ||
    question.includes("classroom") ||
    question.includes("exercise") ||
    question.includes("tabletop") ||
    question.includes("scenario");

  const isLive =
    question.includes("live") ||
    question.includes("now") ||
    question.includes("immediate") ||
    question.includes("current") ||
    question.includes("ongoing");

  const isConfirmed =
    question.includes("confirmed") ||
    question.includes("verified") ||
    question.includes("known");

  const isSuspected =
    question.includes("suspected") ||
    question.includes("unconfirmed") ||
    question.includes("possible") ||
    question.includes("reported");

  const requestedOutput =
    question.includes("checklist") ? "checklist" :
    question.includes("briefing") ? "briefing note" :
    question.includes("training note") ? "training note" :
    question.includes("trainer notes") ? "trainer notes" :
    question.includes("questions and answers") || question.includes("q&a") ? "questions and answers" :
    question.includes("decision log") || question.includes("log") ? "decision log" :
    question.includes("holding statement") || question.includes("statement") ? "communications statement" :
    question.includes("report") ? "report" :
    "";

  const unsafeWording = [
    "attack",
    "tactical",
    "tactics",
    "counter drone",
    "counter-drone",
    "disable",
    "interfere",
    "jam",
    "jamming",
    "evade",
    "evasion",
    "target",
    "weapon",
    "weaponise",
    "weaponize"
  ].filter((term) => question.includes(term));

  return {
    rawQuestion,
    question,
    persona,
    commandLevel,
    isTrainingRequest,
    isLive,
    isConfirmed,
    isSuspected,
    requestedOutput,
    unsafeWording
  };
}

function buildDynamicClarityQuestions(input = {}, primaryMatch = {}) {
  const detected = detectQuestionContext(input);
  const category = safeString(primaryMatch.category || "");
  const matchedTerms = Array.isArray(primaryMatch.matched_terms) ? primaryMatch.matched_terms : [];

  const incidentLabel =
    category === "DRONE_THREAT" ? "drone-related incident" :
    category === "TERRORIST_THREAT" ? "terrorist or hostile-threat concern" :
    category === "CYBER_ATTACK" ? "cyber incident" :
    category === "EVACUATION_OR_LOCKDOWN" ? "evacuation, lockdown or site safety issue" :
    category === "MAJOR_INCIDENT" ? "major incident" :
    category === "CHEMICAL_OR_HAZMAT" ? "chemical or hazardous-material incident" :
    "incident";

  const questions = [];

  if (matchedTerms.length > 0) {
    questions.push(
      `You mentioned ${matchedTerms.join(", ")}. Is this best treated as a ${incidentLabel}, or is a different incident type intended?`
    );
  } else {
    questions.push(
      `What incident is this about? For example: drone sighting, terrorist threat, evacuation, cyber disruption, safeguarding concern, protest, fire, medical incident or major incident.`
    );
  }

  if (!detected.persona || detected.persona === "N/A") {
    questions.push(
      "Who is the audience for the response: Gold, Silver, Bronze, trainer, communications lead, safeguarding lead, loggist, site staff or another role?"
    );
  }

  if (!detected.isLive && !detected.isConfirmed && !detected.isSuspected) {
    questions.push(
      "Is this for a live incident, a confirmed incident, a suspected or unconfirmed incident, or a classroom/tabletop exercise?"
    );
  }

  if (!detected.requestedOutput) {
    questions.push(
      "What type of output do you want: training note, checklist, briefing note, trainer notes, decision log, communications statement, questions and answers, or post-incident review note?"
    );
  }

  if (detected.unsafeWording.length > 0) {
    questions.push(
      `Your wording includes ${detected.unsafeWording.join(", ")}. Should CIMA reframe this as defensive incident-management, escalation, communications, logging, audit and training support only?`
    );
  }

  if (category === "DRONE_THREAT") {
    questions.push(
      "For a drone-related scenario, should the focus be on observation reporting, confirmation checks, safety cordons, escalation, police liaison, communications, logging and human review?"
    );
  }

  if (category === "TERRORIST_THREAT") {
    questions.push(
      "For a terrorist or hostile-threat scenario, should the focus be on defensive command support, escalation, communications, welfare, logging, police liaison and human review?"
    );
  }

  return questions;
}

function buildSpecialistTriggerDecision(input = {}) {
  const question = normaliseText(input.question || input.message || input.text || "");
  const matches = [];

  for (const triggerCategory of TRIGGER_CATEGORIES) {
    const matchedTerms = getMatchedTerms(question, triggerCategory.terms);

    if (matchedTerms.length > 0) {
      matches.push({
        category: triggerCategory.category,
        agent: triggerCategory.agent,
        confidence: triggerCategory.confidence,
        matched_terms: matchedTerms,
        default_clarity_questions: triggerCategory.clarity_questions
      });
    }
  }

  if (matches.length === 0) {
    return {
      triggered: false,
      primary_category: "NONE",
      primary_agent: "NONE",
      confidence: "none",
      matches: [],
      clarification_required: false,
      clarification_context: detectQuestionContext(input),
      clarity_questions: [],
      safety_notice: SAFETY_NOTICE,
      trigger_agent_build_iso: SPECIALIST_TRIGGER_AGENT_BUILD_ISO
    };
  }

  const primaryMatch = matches[0];
  const dynamicClarityQuestions = buildDynamicClarityQuestions(input, primaryMatch);

  return {
    triggered: true,
    primary_category: primaryMatch.category,
    primary_agent: primaryMatch.agent,
    confidence: primaryMatch.confidence,
    matches,
    clarification_required: true,
    clarification_context: detectQuestionContext(input),
    clarity_questions: dynamicClarityQuestions,
    safety_notice: SAFETY_NOTICE,
    trigger_agent_build_iso: SPECIALIST_TRIGGER_AGENT_BUILD_ISO
  };
}

function getSpecialistTriggerAgentStatus() {
  return {
    ok: true,
    agent: "specialist_trigger_agent",
    build_iso: SPECIALIST_TRIGGER_AGENT_BUILD_ISO,
    categories: TRIGGER_CATEGORIES.map((item) => ({
      category: item.category,
      agent: item.agent,
      confidence: item.confidence,
      term_count: item.terms.length
    })),
    safety_notice: SAFETY_NOTICE
  };
}

export {
  buildSpecialistTriggerDecision,
  getSpecialistTriggerAgentStatus
};

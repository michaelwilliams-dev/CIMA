/**
 * AIVS / PGB CIMA - Question Intake Agent
 * File: operations/question_intake_agent.js
 * ISO Timestamp: 2026-06-14T10:25:00+01:00
 *
 * Purpose:
 * - Reviews the user's question before CIMA answers.
 * - Checks whether the question is clear enough to answer.
 * - Uses word count as the first simple clarity test.
 * - Detects vague or incomplete questions.
 * - Detects high-consequence trigger terms for later specialist routing.
 * - Returns clarification questions where more detail is required.
 *
 * Control Notes:
 * - This agent does not answer the incident question.
 * - This agent does not search FAISS.
 * - This agent does not perform external search.
 * - This agent does not provide operational threat guidance.
 * - It only decides whether the question is clear enough to continue.
 */

const QUESTION_INTAKE_AGENT_BUILD_ISO = "2026-06-14T10:25:00+01:00";

const MIN_WORDS_FOR_CLEAR_QUESTION = 12;
const VERY_SHORT_QUESTION_WORDS = 6;

const VAGUE_PHRASES = [
  "what should we do",
  "what do we do",
  "help",
  "urgent",
  "problem",
  "issue",
  "incident",
  "something happened",
  "not sure",
  "security issue",
  "threat",
  "risk",
  "danger",
  "attack",
  "drone",
  "terrorism"
];

const LOCATION_WORDS = [
  "venue",
  "site",
  "building",
  "stadium",
  "arena",
  "school",
  "hospital",
  "station",
  "event",
  "public place",
  "office",
  "campus",
  "data centre",
  "critical infrastructure"
];

const STATUS_WORDS = [
  "live",
  "exercise",
  "training",
  "planning",
  "reported",
  "confirmed",
  "suspected",
  "possible"
];

const ROLE_WORDS = [
  "gold",
  "silver",
  "bronze",
  "commander",
  "lead",
  "loggist",
  "trainer",
  "security",
  "communications",
  "safeguarding"
];

const SPECIALIST_TRIGGER_GROUPS = [
  {
    type: "Drone / UAV",
    agent: "drone_agent",
    words: [
      "drone",
      "drones",
      "uav",
      "uas",
      "unmanned aircraft",
      "quadcopter",
      "hostile drone",
      "drone sighting"
    ]
  },
  {
    type: "Terrorism / hostile activity",
    agent: "terrorist_threat_agent",
    words: [
      "terror",
      "terrorism",
      "terrorist",
      "terror attack",
      "terrorist threat",
      "hostile activity",
      "hostile actor",
      "hostile threat",
      "hostile-threat",
      "hostile threat exercise",
      "hostile-threat exercise",
      "hostile reconnaissance",
      "marauding",
      "mtfa",
      "attack",
      "suspicious behaviour"
    ]
  },
  {
    type: "Cyber",
    agent: "cyber_agent",
    words: [
      "cyber",
      "ransomware",
      "malware",
      "phishing",
      "data breach",
      "ddos",
      "network attack",
      "system compromise"
    ]
  },
  {
    type: "Critical infrastructure",
    agent: "critical_infrastructure_agent",
    words: [
      "critical infrastructure",
      "power grid",
      "electricity",
      "water supply",
      "telecoms",
      "transport network",
      "utilities"
    ]
  },
  {
    type: "Data centre",
    agent: "data_centre_agent",
    words: [
      "data centre",
      "datacentre",
      "server room",
      "cloud outage",
      "hosting outage",
      "render outage",
      "faiss outage"
    ]
  },
  
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

function countWords(value = "") {
  const text = normaliseText(value);

  if (!text) {
    return 0;
  }

  return text.split(" ").filter(Boolean).length;
}

function findMatchedTerms(text = "", terms = []) {
  const cleanText = normaliseText(text);

  return terms.filter((term) => cleanText.includes(term));
}

function detectSpecialistTrigger(question = "") {
  const text = normaliseText(question);

  for (const group of SPECIALIST_TRIGGER_GROUPS) {
    const matchedWords = findMatchedTerms(text, group.words);

    if (matchedWords.length > 0) {
      return {
        detected: true,
        type: group.type,
        agent: group.agent,
        matched_words: matchedWords
      };
    }
  }

  return {
    detected: false,
    type: "None",
    agent: null,
    matched_words: []
  };
}

function buildClarificationQuestions({
  wordCount,
  specialistTrigger,
  hasLocation,
  hasStatus,
  hasRole
}) {
  const questions = [];

  if (wordCount <= VERY_SHORT_QUESTION_WORDS) {
    questions.push("Please describe what has happened in one or two full sentences.");
  }

  if (!hasStatus) {
    questions.push("Is this a live incident, an exercise, a training scenario or a planning question?");
  }

  if (!hasLocation) {
    questions.push("What type of location is involved, for example venue, public place, office, stadium, transport hub, data centre or site?");
  }

  if (!hasRole) {
    questions.push("Which role needs the answer: Gold, Silver, Bronze, trainer, communications, safeguarding, security or loggist?");
  }

  if (specialistTrigger.detected) {
    questions.push("What is confirmed fact, what is only reported, and what is still unknown?");
    questions.push("Are there any immediate life-safety risks, injuries, trapped people, missing people or evacuation/invacuation decisions?");
    questions.push("Have emergency services, venue security, IT/security teams or command leads already been informed?");
  }

  if (!questions.length) {
    questions.push("Please provide any missing facts, assumptions, time, location, people affected and the decision you need CIMA to support.");
  }

  return questions;
}

function assessCimaQuestion(input = {}) {
  const question = safeString(input.question || input.text || "");
  const cleanQuestion = normaliseText(question);
  const wordCount = countWords(question);

  const context = input.context && typeof input.context === "object"
    ? input.context
    : {};

  const contextRoleText = [
    context.persona,
    context.role,
    context.command_level,
    context.commandLevel,
    context.level
  ].join(" ").toLowerCase();

  const specialistTrigger = detectSpecialistTrigger(question);

  const vagueMatches = findMatchedTerms(cleanQuestion, VAGUE_PHRASES);
  const locationMatches = findMatchedTerms(cleanQuestion, LOCATION_WORDS);
  const statusMatches = findMatchedTerms(cleanQuestion, STATUS_WORDS);

  const roleMatches = [
    ...new Set([
      ...findMatchedTerms(cleanQuestion, ROLE_WORDS),
      ...findMatchedTerms(contextRoleText, ROLE_WORDS)
    ])
  ];

  const hasLocation = locationMatches.length > 0;
  const hasStatus = statusMatches.length > 0;
  const hasRole = roleMatches.length > 0;

  const isClearNonLiveTrainingScenario =
    hasStatus &&
    (
      cleanQuestion.includes("classroom") ||
      cleanQuestion.includes("tabletop") ||
      cleanQuestion.includes("exercise") ||
      cleanQuestion.includes("training note") ||
      cleanQuestion.includes("scenario") ||
      cleanQuestion.includes("simulation") ||
      cleanQuestion.includes("simulated")
    ) &&
    (
      cleanQuestion.includes("defensive") ||
      cleanQuestion.includes("observation reporting") ||
      cleanQuestion.includes("logging") ||
      cleanQuestion.includes("communications") ||
      cleanQuestion.includes("escalation")
    );

  const effectiveHasLocation = hasLocation || isClearNonLiveTrainingScenario;

  const tooShort = wordCount < MIN_WORDS_FOR_CLEAR_QUESTION;
  const vague = vagueMatches.length > 0 && (!effectiveHasLocation || !hasStatus || !hasRole);

  const specialistQuestionHasMinimumDetail =
    specialistTrigger.detected &&
    !tooShort &&
    effectiveHasLocation &&
    hasStatus &&
    hasRole;

  const needsClarification =
    !cleanQuestion ||
    tooShort ||
    vague ||
    (specialistTrigger.detected && !specialistQuestionHasMinimumDetail);
  const clarificationQuestions = needsClarification
    ? buildClarificationQuestions({
        wordCount,
        specialistTrigger,
        hasLocation: effectiveHasLocation,
        hasStatus,
        hasRole
      })
    : [];

  return {
    ok: true,
    build_iso: QUESTION_INTAKE_AGENT_BUILD_ISO,
    agent: "question_intake_agent",
    question,
    word_count: wordCount,
    clear_enough_to_answer: !needsClarification,
    needs_clarification: needsClarification,
    reason: needsClarification
      ? "The question needs more detail before CIMA should produce a substantive answer."
      : "The question appears clear enough for CIMA to continue.",
    specialist_trigger: specialistTrigger,
    clarity_checks: {
      too_short: tooShort,
      vague,
      has_location: effectiveHasLocation,
      has_status: hasStatus,
      has_role: hasRole,
      vague_matches: vagueMatches,
      location_matches: locationMatches,
      status_matches: statusMatches,
      role_matches: roleMatches
    },
    clarification_questions: clarificationQuestions,
    safety_notice: specialistTrigger.detected
      ? "CIMA can provide defensive incident-management, command, escalation, communications, training and audit support only. It must not provide attack methods, evasion advice, weaponisation advice, targeting advice or instructions that could assist hostile activity."
      : "CIMA output remains draft support only and requires authorised human review."
  };
}

function getQuestionIntakeAgentStatus() {
  return {
    ok: true,
    agent: "question_intake_agent",
    build_iso: QUESTION_INTAKE_AGENT_BUILD_ISO,
    min_words_for_clear_question: MIN_WORDS_FOR_CLEAR_QUESTION,
    specialist_trigger_groups: SPECIALIST_TRIGGER_GROUPS.map((group) => ({
      type: group.type,
      agent: group.agent,
      words: group.words
    }))
  };
}

export {
  assessCimaQuestion,
  detectSpecialistTrigger,
  getQuestionIntakeAgentStatus
};

export default {
  assessCimaQuestion,
  detectSpecialistTrigger,
  getQuestionIntakeAgentStatus
};

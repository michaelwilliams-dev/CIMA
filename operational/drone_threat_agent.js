/**
 * AIVS / PGB CIMA - Drone Threat Agent
 * File: drone_threat_agent.js
 * ISO Timestamp: 2026-06-14T06:55:00+01:00
 *
 * Purpose:
 * - Builds defensive CIMA support responses for drone-related incidents, exercises and training prompts.
 * - Keeps drone-threat handling outside server.js.
 * - Supports command, escalation, logging, communications and audit discipline.
 *
 * Change Log:
 * - v0.1.0: created standalone drone threat response agent.
 *
 * ISO Control Notes:
 * - This agent must provide defensive incident-management support only.
 * - This agent must not provide attack methods, evasion advice, weaponisation advice, targeting advice or hostile-use instructions.
 * - This agent must not advise users to interfere with, jam, capture or damage aircraft or drone systems.
 * - This agent does not perform retrieval.
 * - This agent does not call external services.
 * - All outputs remain subject to human review and local emergency procedures.
 */

const DRONE_THREAT_AGENT_BUILD_ISO = "2026-06-14T06:55:00+01:00";

const SAFETY_NOTICE =
  "CIMA can provide defensive incident-management, command, escalation, communications, training and audit support only. It must not provide attack methods, evasion advice, weaponisation advice, targeting advice or instructions that could assist hostile activity.";

const DEFAULT_CLARITY_QUESTIONS = [
  "What exactly has been observed?",
  "Where is the drone or suspected drone in relation to the site?",
  "Is the incident live, recent, or a training scenario?",
  "How many drones or suspected drones have been observed?",
  "Is there any immediate risk to people, operations, transport, events or critical assets?",
  "Have security teams, police, airfield operators, site leads or command leads already been informed?"
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

function buildDroneThreatResponse(input = {}) {
  const question = normaliseText(input.question || input.message || input.text || "");
  const context = input.context || {};
  const triggerDecision = input.triggerDecision || input.trigger_decision || {};
    const questionLower = question.toLowerCase();

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
  
  const selectedMode = normaliseText(context.mode || input.mode || "Not supplied");
  const selectedPersona = normaliseText(context.persona || input.persona || "Not supplied");
  const selectedCommandLevel = normaliseText(context.command_level || context.commandLevel || input.command_level || "Not supplied");

  const clarityQuestions =
    Array.isArray(triggerDecision.clarity_questions) && triggerDecision.clarity_questions.length > 0
      ? triggerDecision.clarity_questions
      : DEFAULT_CLARITY_QUESTIONS;

  const immediatePriorities = [
    "Protect life and safety first.",
    "Do not attempt to interfere with, jam, capture, follow or damage any drone or aircraft.",
    "Move exposed people away from obvious risk areas if safe to do so and in line with local procedures.",
    "Notify the appropriate site lead, security lead, command lead and emergency services route where the situation may affect safety, aviation, public order or critical operations.",
    "Preserve observations and evidence without placing staff at risk.",
    "Start an incident log immediately with time, location, observer, description, decisions, actions and escalation route."
  ];

  const commandActions = [
    "Confirm whether this is a live incident, recent observation, intelligence concern or exercise scenario.",
    "Establish who is acting as operational lead and who is responsible for escalation.",
    "Define the affected area and any immediate safety perimeter using local procedures.",
    "Check whether the incident affects public safety, aviation, transport, events, critical infrastructure, vulnerable people or business continuity.",
    "Agree a single communication route so staff do not circulate speculation.",
    "Record decisions, uncertainties, handovers and rationale in the incident log."
  ];

  const informationToCapture = [
    "Time first observed and time last observed.",
    "Location of observer and approximate location of the drone or suspected drone.",
    "Direction of travel, height impression and whether it is hovering, circling or passing through.",
    "Number of drones or suspected drones.",
    "Any visible payload, lights, noise or unusual behaviour, recorded only as observation and not speculation.",
    "Photos or video only if safe, lawful and consistent with local policy.",
    "Names and contact details of observers.",
    "Actions taken, who was informed and when."
  ];

  const communicationsGuidance = [
    "Use calm factual language.",
    "Avoid guessing motive, capability or operator identity.",
    "Separate confirmed facts from unconfirmed reports.",
    "Tell staff what action to take, who to report to and what not to do.",
    "Do not post operational details on public or social media channels.",
    "Prepare a short internal holding line if the incident may attract attention."
  ];

  const humanReviewFlags = [
    "Immediate risk to life or public safety.",
    "Drone near an airport, emergency service route, transport hub, event venue, critical infrastructure or sensitive site.",
    "Repeated sightings suggesting surveillance or hostile reconnaissance.",
    "Any suspected payload, dropped object, collision, injury, damage or disruption.",
    "Media interest, social media escalation or reputational exposure.",
    "Unclear authority, unclear command lead or conflicting reports."
  ];

  const liveIncidentLine = isLiveIncident
    ? "This appears to be a live or potentially live incident. Escalate through local emergency, security and command procedures immediately."
    : "This can be handled as a defensive planning, training or command-support prompt unless the user confirms it is live.";

  const responseText = joinLines([
    "CIMA Drone Threat Agent",
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
    "Clarifying questions",
    buildNumberedList(clarityQuestions),
    "",
    "Human review and escalation flags",
    buildNumberedList(humanReviewFlags),
    "",
    "Safety boundary",
    SAFETY_NOTICE
  ]);

 return {
    ok: true,
    agent: "drone_threat_agent",
    build_iso: DRONE_THREAT_AGENT_BUILD_ISO,
    response_path: "SPECIALIST_DRONE_THREAT",
    path: "SPECIALIST_DRONE_THREAT",
    rag: isLiveIncident ? "RED" : "AMBER",
    rag_status: isLiveIncident ? "RED" : "AMBER",
    hitl: "Required before operational reliance",
    confidence: "Provisional",
    source_mode: "Approved CIMA source search has not yet been supplied to this agent.",
    requires_human_review: true,
    requires_escalation_check: true,
    safety_notice: SAFETY_NOTICE,
    clarity_questions: clarityQuestions,
    clarification_questions: clarityQuestions,
    search_plan: {
      approved_sources_first: true,
      external_search_allowed: false,
      external_search_note: "External search must not be used unless the user gives explicit permission after approved CIMA sources have been checked.",
      suggested_internal_search_terms: [
        "drone incident management",
        "hostile drone public safety",
        "drone threat command response",
        "counter drone safety procedures",
        "Silver command drone incident",
        "critical infrastructure drone observation"
      ]
    },
    answer: responseText,
    sources: []
      };
    }

    function getDroneThreatAgentStatus() {
  return {
    ok: true,
    agent: "drone_threat_agent",
    build_iso: DRONE_THREAT_AGENT_BUILD_ISO,
    response_path: "SPECIALIST_DRONE_THREAT",
    safety_notice: SAFETY_NOTICE
  };
}

export {
  buildDroneThreatResponse,
  getDroneThreatAgentStatus
};

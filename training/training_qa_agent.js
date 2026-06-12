/**
 * AIVS / PGB CIMA - Training Questions and Answers Agent
 * File: training/training_qa_agent.js
 * ISO Timestamp: 2026-06-09T18:05:00Z
 *
 * Purpose:
 * - Builds training questions with model answers from the latest CIMA question.
 * - Kept separate from server.js so it can be tuned independently.
 *
 * Change Log:
 * - v0.1.0: created standalone Training Questions and Answers agent.
 * - v0.2.0: removed scenario context and raw CIMA answer dump.
 * - v0.2.0: aligned questions and answers with the Training Questions sheet.
 *
 * ISO Control Notes:
 * - This agent must not send email.
 * - This agent must not write audit records directly.
 * - This agent must not perform uncontrolled source retrieval.
 * - This agent does not use FAISS until the controlled index is connected.
 * - All outputs remain draft training support only and require human review.
 */

const TRAINING_QA_AGENT_BUILD_ISO = "2026-06-09T18:05:00Z";

function trimText(value = "", maxLength = 1200) {
  const text = String(value || "")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength).trim() + "...";
}

function escapeHtml(value = "") {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function linesToHtml(lines = []) {
  return lines
    .map((line) => {
      if (!line) {
        return "";
      }

      if (line.startsWith("## ")) {
        return `<h3>${escapeHtml(line.replace(/^##\s+/, ""))}</h3>`;
      }

      return `<p>${escapeHtml(line)}</p>`;
    })
    .join("\n");
}

export function buildTrainingQa({
  question = "",
  answer = "",
  context = {}
} = {}) {
  const cleanQuestion = trimText(question, 700);

  const lines = [];

  lines.push("## Training Questions and Answers");
  lines.push(
    "This output uses the same prepared training questions as the Training Questions sheet, with model answer points added for facilitator review. It is for training, rehearsal and assurance learning only."
  );

  lines.push("");
  lines.push("## Persona");
  lines.push(String(context.persona || "N/A"));

  lines.push("");
  lines.push("## Scenario Brief");
  
  lines.push(cleanQuestion || "No scenario question was supplied.");

  lines.push("");
  lines.push("## Opening Understanding");

  lines.push("");
  lines.push("## Q1. What is the incident as currently understood?");
  lines.push("Model answer: The trainee should summarise the reported incident in plain language, avoiding assumptions. They should identify the venue, the nature of the confusion, the possibility of injuries, the conflicting reports and the need to establish a single working picture.");

  lines.push("");
  lines.push("## Q2. What facts are confirmed, and what information is still uncertain?");
  lines.push("Model answer: Confirmed facts should be separated from uncertain reports. The trainee should identify what is known from reliable sources, what is only alleged, what is missing, and what must be checked before action or communication.");

  lines.push("");
  lines.push("## Q3. Which reports may be incomplete, duplicated or unreliable?");
  lines.push("Model answer: Reports from staff, security, witnesses or emergency services may overlap or conflict. The trainee should check source, timing, location, corroboration and whether reports refer to the same event or separate events.");

  lines.push("");
  lines.push("## Q4. What is the first fact the strategic lead must confirm?");
  lines.push("Model answer: The first fact is whether there is an immediate risk to life or safety. The lead should also confirm location, people affected, current control arrangements and whether emergency services are involved.");

  lines.push("");
  lines.push("## Q5. What assumption would be most dangerous if treated as fact?");
  lines.push("Model answer: Dangerous assumptions include assuming nobody is injured, assuming the crowd is stable, assuming emergency services have full information, or assuming conflicting reports are harmless. Any such assumption should be tested quickly.");

  lines.push("");
  lines.push("## Command and Control");

  lines.push("");
  lines.push("## Q6. Who should own the first 30-minute operating picture?");
  lines.push("Model answer: The Gold or strategic lead should ensure ownership is clear. They may delegate collection of information, but accountability for the operating picture and strategic decisions must sit with an identified command lead.");

  lines.push("");
  lines.push("## Q7. Is a Gold, Silver or Bronze command structure required?");
  lines.push("Model answer: If the incident is serious, multi-agency, safety-critical or reputationally sensitive, a command structure should be considered. Gold sets strategy, Silver coordinates tactical response, and Bronze manages operational activity.");

  lines.push("");
  lines.push("## Q8. Who is responsible for safety, welfare, communications, security and partner liaison?");
  lines.push("Model answer: Named owners should be assigned quickly. Safety and welfare should focus on people at risk; communications should control messaging; security should manage site risks; partner liaison should coordinate with emergency services and authorities.");

  lines.push("");
  lines.push("## Q9. What decision needs to be made now, and what can wait until the next update?");
  lines.push("Model answer: Immediate decisions should protect life, prevent escalation and establish control. Less urgent decisions can wait until the next review cycle if more facts are needed.");

  lines.push("");
  lines.push("## Q10. How should conflicting instructions from different teams be prevented?");
  lines.push("Model answer: Establish one command route, one briefing line and one communications owner. Staff should be told where instructions come from and where updates will be issued.");

  lines.push("");
  lines.push("## Risk and Safety");

  lines.push("");
  lines.push("## Q11. Who may be injured, missing, vulnerable, trapped or exposed to further risk?");
  lines.push("Model answer: The trainee should identify potentially affected groups, including injured people, children, older people, disabled people, isolated individuals, staff, contractors and members of the public caught in crowd movement.");

  lines.push("");
  lines.push("## Q12. What would make this incident escalate from serious to critical?");
  lines.push("Model answer: Escalation triggers include confirmed serious injury, fatalities, missing people, crowd disorder, terrorism indicators, safeguarding concerns, major media interest or loss of command control.");

  lines.push("");
  lines.push("## Q13. What is the risk of under-reacting?");
  lines.push("Model answer: Under-reacting may leave people unsafe, delay medical support, miss vulnerable people, lose public confidence and create weak audit evidence for later review.");

  lines.push("");
  lines.push("## Q14. What is the risk of over-reacting?");
  lines.push("Model answer: Over-reacting may cause unnecessary alarm, disrupt emergency access, create crowd movement risk, damage trust or distract resources from the real priority.");

  lines.push("");
  lines.push("## Q15. What safeguarding, medical, crowd movement or public order concerns need checking?");
  lines.push("Model answer: The trainee should check whether anyone needs medical help, whether vulnerable people are accounted for, whether crowd routes are safe, and whether the situation could become disorderly or unsafe.");

  lines.push("");
  lines.push("## Coordination with Partners");

  lines.push("");
  lines.push("## Q16. Which external partners may need to be involved?");
  lines.push("Model answer: Depending on the facts, partners may include police, ambulance, fire and rescue, local authority, venue management, transport operators, safeguarding leads, public health or communications teams.");

  lines.push("");
  lines.push("## Q17. What information should be shared with emergency services, and by whom?");
  lines.push("Model answer: Share confirmed facts: location, nature of incident, injuries, risks, access routes, crowd conditions, command contact and any immediate hazards. The information should be shared by the nominated liaison owner.");

  lines.push("");
  lines.push("## Q18. What information should be held back until verified?");
  lines.push("Model answer: Unconfirmed casualty numbers, causes, blame, terrorism links, identities, medical details and speculative explanations should be held back until verified and authorised.");

  lines.push("");
  lines.push("## Q19. How should the organisation maintain one version of the truth?");
  lines.push("Model answer: Use a single operating picture, timed updates, named information owners and a decision log. Conflicting reports should be reconciled before being treated as confirmed.");

  lines.push("");
  lines.push("## Q20. What should be prepared for the next multi-agency briefing?");
  lines.push("Model answer: Prepare confirmed facts, current risks, people affected, actions taken, outstanding uncertainties, decisions needed, partner requests and the next review time.");

  lines.push("");
  lines.push("## Communications");

  lines.push("");
  lines.push("## Q21. What should staff be told immediately?");
  lines.push("Model answer: Staff should receive clear safety instructions, who is in command, where to report information, what not to say externally and when the next update will come.");

  lines.push("");
  lines.push("## Q22. What should not be said externally until confirmed?");
  lines.push("Model answer: Do not speculate on cause, blame, casualty numbers, motives, identities or operational failures. External messaging should remain factual and approved.");

  lines.push("");
  lines.push("## Q23. Who is authorised to issue a public, client-facing or media statement?");
  lines.push("Model answer: Only the nominated communications lead or authorised senior lead should issue external statements, after checking facts and command approval.");

  lines.push("");
  lines.push("## Q24. What holding statement might be needed if there is public concern?");
  lines.push("Model answer: A holding statement should acknowledge awareness of the incident, say that safety is the priority, confirm that facts are being checked, and avoid speculation.");

  lines.push("");
  lines.push("## Q25. How should uncertainty be communicated without creating alarm?");
  lines.push("Model answer: State what is known, what is being checked, what people should do now and when the next update will be provided. Avoid dramatic language.");

  lines.push("");
  lines.push("## Decision Log and Assurance");

  lines.push("");
  lines.push("## Q26. What should be recorded in the decision log?");
  lines.push("Model answer: Record time, facts known, uncertainty, options considered, decision made, reason, decision owner, action owner and next review point.");

  lines.push("");
  lines.push("## Q27. Who made each decision, and what information was available at the time?");
  lines.push("Model answer: The log should show the responsible decision maker and the information available when the decision was taken, so later review can understand the reasoning.");

  lines.push("");
  lines.push("## Q28. What options were considered and rejected?");
  lines.push("Model answer: Record important alternatives, especially where the team chose not to evacuate, not to escalate, not to issue a statement or not to involve a partner immediately.");

  lines.push("");
  lines.push("## Q29. What is the next review point?");
  lines.push("Model answer: The review point should be short and explicit, such as 10 or 15 minutes in a fast-moving incident, with a named owner responsible for updating the command lead.");

  lines.push("");
  lines.push("## Q30. What local procedure, source material or policy should be checked before reliance?");
  lines.push("Model answer: Check local emergency plans, venue plans, safeguarding policy, communications protocol, major incident guidance, partner procedures and any relevant source material held in the CIMA knowledge base.");

  lines.push("");
  lines.push("## Human Review");
  lines.push(
    "These are draft training questions and model answer points. They must be reviewed by a responsible human before use in training, assurance or operational briefings."
  );

  const plainText = lines.join("\n");

  return {
    ok: true,
    training_qa_agent_build_iso: TRAINING_QA_AGENT_BUILD_ISO,
    type: "training_qa",
    plain_text: plainText,
    html: linesToHtml(lines)
  };
}

export function getTrainingQaAgentStatus() {
  return {
    ok: true,
    agent: "training_qa_agent",
    training_qa_agent_build_iso: TRAINING_QA_AGENT_BUILD_ISO,
    mode: "demo-no-index"
  };
}

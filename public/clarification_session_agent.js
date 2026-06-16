/**
 * AIVS / PGB CIMA - Clarification Session Agent
 * File: public/clarification_session_agent.js
 * ISO Timestamp: 2026-06-16T11:40:00+01:00
 *
 * Purpose:
 * - Holds the original CIMA question during follow-up clarification.
 * - Stores the selected context from the dropdowns.
 * - Stores follow-up questions and user answers one at a time.
 * - Builds a combined question for CIMA when the clarification sequence is complete.
 *
 * Change Log:
 * - v0.1.0: created standalone browser-side clarification session agent.
 *
 * ISO Control Notes:
 * - This file does not call the backend directly.
 * - This file does not change the CIMA index.html behaviour until it is explicitly loaded and wired.
 * - Session facts are temporary incident-session facts, not FAISS knowledge-base material.
 * - All outputs remain subject to human review.
 */

(function () {
  const CLARIFICATION_SESSION_AGENT_BUILD_ISO = "2026-06-16T11:40:00+01:00";

  let originalQuestion = "";
  let originalContext = null;
  let clarificationQuestions = [];
  let clarificationAnswers = [];
  let activeIndex = -1;

  function cleanString(value) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value).replace(/\s+/g, " ").trim();
  }

  function cloneValue(value) {
    try {
      return JSON.parse(JSON.stringify(value || null));
    } catch (error) {
      return value || null;
    }
  }

  function reset() {
    originalQuestion = "";
    originalContext = null;
    clarificationQuestions = [];
    clarificationAnswers = [];
    activeIndex = -1;

    return getState();
  }

  function extractQuestionsFromAnswer(answerText) {
    const lines = String(answerText || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const questions = [];
    let inQuestionSection = false;

    const startHeadings = [
      "clarifying questions",
      "operational confirmation questions",
      "information needed before cima answers"
    ];

    const stopHeadings = [
      "human review",
      "human review and escalation flags",
      "safety boundary",
      "documents referenced",
      "source status",
      "communications guidance",
      "information to capture in the incident log"
    ];

    for (const line of lines) {
      const lower = line.toLowerCase();

      if (startHeadings.includes(lower)) {
        inQuestionSection = true;
        continue;
      }

      if (inQuestionSection && stopHeadings.includes(lower)) {
        break;
      }

      if (!inQuestionSection) {
        continue;
      }

      const numberedMatch = line.match(/^\d+\.\s+(.*)$/);

      if (numberedMatch && numberedMatch[1]) {
        questions.push(cleanString(numberedMatch[1]));
        continue;
      }

      if (line.startsWith("- ")) {
        questions.push(cleanString(line.replace(/^-+\s*/, "")));
      }
    }

    return questions.filter(Boolean);
  }

  function start(question, context, questionsList) {
    const cleanQuestion = cleanString(question);
    const cleanQuestions = Array.isArray(questionsList)
      ? questionsList.map((item) => cleanString(item)).filter(Boolean)
      : [];

    if (!cleanQuestion || cleanQuestions.length === 0) {
      return reset();
    }

    originalQuestion = cleanQuestion;
    originalContext = cloneValue(context || {});
    clarificationQuestions = cleanQuestions;
    clarificationAnswers = [];
    activeIndex = 0;

    return getState();
  }

  function hasActiveSession() {
    return (
      originalQuestion.length > 0 &&
      clarificationQuestions.length > 0 &&
      activeIndex >= 0 &&
      activeIndex < clarificationQuestions.length
    );
  }

  function getCurrentQuestion() {
    if (!hasActiveSession()) {
      return "";
    }

    return clarificationQuestions[activeIndex] || "";
  }

  function recordAnswer(answerText) {
    if (!hasActiveSession()) {
      return getState();
    }

    clarificationAnswers.push({
      question: getCurrentQuestion(),
      answer: cleanString(answerText),
      answered_at: new Date().toISOString()
    });

    activeIndex += 1;

    return getState();
  }

  function isComplete() {
    return (
      originalQuestion.length > 0 &&
      clarificationQuestions.length > 0 &&
      activeIndex >= clarificationQuestions.length
    );
  }

  function buildCombinedQuestion() {
    const factsText = clarificationAnswers
      .map((item, index) => {
        return [
          "Follow-up " + (index + 1) + ": " + item.question,
          "Answer " + (index + 1) + ": " + (item.answer || "Not supplied")
        ].join("\n");
      })
      .join("\n\n");

    return [
      "Original question:",
      originalQuestion,
      "",
      "Session fact base:",
      factsText || "No follow-up facts supplied.",
      "",
      "Answer the original question using the session fact base above."
    ].join("\n");
  }

  function getState() {
    return {
      ok: true,
      agent: "clarification_session_agent",
      build_iso: CLARIFICATION_SESSION_AGENT_BUILD_ISO,
      active: hasActiveSession(),
      complete: isComplete(),
      original_question: originalQuestion,
      context: cloneValue(originalContext),
      questions: clarificationQuestions.slice(),
      answers: clarificationAnswers.slice(),
      active_index: activeIndex,
      current_question: getCurrentQuestion(),
      total_questions: clarificationQuestions.length,
      answered_count: clarificationAnswers.length
    };
  }

  const api = {
    reset,
    extractQuestionsFromAnswer,
    start,
    hasActiveSession,
    getCurrentQuestion,
    recordAnswer,
    isComplete,
    buildCombinedQuestion,
    getState
  };

  if (typeof window !== "undefined") {
    window.CimaClarification = api;
  }
}());


/**
 * AIVS / PGB CIMA Demo Backend - server.js
 * ISO Timestamp: 2026-06-02T13:55:00Z
 *
 * Change Log:
 * - v0.3.0: moved Mailjet email sending into agents/email_agent.js
 * - v0.3.0: server.js now imports sendAccessCodeEmail, sendTranscriptEmail and getEmailAgentStatus
 * - v0.3.0: removed direct Mailjet client setup from server.js
 * - v0.3.0: retained transcript PDF and DOCX generation inside server.js for now
 * - v0.3.0: retained /health, /meta, /send-access-code-email, /check-access, /cima-chat and /send-transcript-email
 * - v0.3.0: no Companies House, FCA, insolvency, director, OCR or security agents
 *
 * Notes:
 * - Temporary working CIMA backend.
 * - Designed to match the current CIMA demo index.html.
 * - All operational outputs are draft support only and require human review.
 */

const BUILD_ISO = "2026-06-02T13:55:00Z";
console.log("PGB CIMA BACKEND BUILD:", BUILD_ISO);

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";


import {
  sendAccessCodeEmail,
  sendTranscriptEmail
} from "./export/mailjetExporter.js";

import {
  getAuditAgentStatus,
  writeAuditEvent
} from "./audit_agent.js";

import {
  buildCimaResponse,
  getCimaResponseAgentStatus
} from "./cima_response_agent.js";

import {
  buildTranscriptPackage,
  getTranscriptAgentStatus
} from "./transcript_agent.js";


import {
  buildCimaTrainingOutput,
  getCimaTrainingAgentStatus
} from "./cima_training_agent.js";

import {
  buildTrainingSynopsis,
  getTrainingSynopsisAgentStatus
} from "./training/training_synopsis_agent.js";

import {
  getTrainingQuestionsAgentStatus
} from "./training/training_questions_agent.js";

import {
  getTrainingQaAgentStatus
} from "./training/training_qa_agent.js";

import {
  registerTrainingSynopsisRoute
} from "./training/training_synopsis_route.js";

import {
  registerTrainingQuestionsRoute
} from "./training/training_questions_route.js";

import {
  registerTrainingQaRoute
} from "./training/training_qa_route.js";

import {
  registerTrainerNotesRoute
} from "./training/trainer_notes_route.js";

import {
  getSourceIndexAgentStatus
} from "./source_index_agent.js";

import {
  getFaissKnowledgeAgentStatus
} from "./retrieval/faiss_knowledge_agent.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 10000);

const ACCESS_CODE = String(
  process.env.ACCESS_CODE ||
  process.env.VACANCY_CODE ||
  "DEMO"
).trim();

const DATA_REVIEW_EMAIL = String(
  process.env.DATA_REVIEW_EMAIL ||
  "michael@aivs.uk"
).trim();

function getEmailAgentStatus() {
  return {
    ok: true,
    agent: "mailjetExporter",
    mailjet_ready: Boolean(
      process.env.MAILJET_API_KEY ||
      process.env.MJ_APIKEY_PUBLIC
    ) && Boolean(
      process.env.MAILJET_API_SECRET ||
      process.env.MJ_APIKEY_PRIVATE
    ),
    from_email_ready: Boolean(
      process.env.MAILJET_FROM_EMAIL ||
      process.env.MJ_FROM_EMAIL
    )
  };
}

const EMAIL_AGENT_STATUS = getEmailAgentStatus();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.options("*", cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

registerTrainingSynopsisRoute(app, {
  BUILD_ISO,
  writeAuditEvent
});

registerTrainingQuestionsRoute(app, {
  BUILD_ISO,
  writeAuditEvent
});

registerTrainingQaRoute(app, {
  BUILD_ISO,
  writeAuditEvent
});

registerTrainerNotesRoute(app, {
  BUILD_ISO,
  writeAuditEvent
});

console.log("ENV CHECK:", {
  accessCodeSet: Boolean(ACCESS_CODE),
  accessCodeLength: ACCESS_CODE.length,
  emailAgentReady: EMAIL_AGENT_STATUS.mailjet_ready,
  fromEmailReady: EMAIL_AGENT_STATUS.from_email_ready,
  dataReviewEmail: DATA_REVIEW_EMAIL
});

/* -------------------------- BASIC HELPERS -------------------------- */

function safeString(value = "") {
  if (value === null || value === undefined || value === "") {
    return "Not supplied";
  }

  return String(value);
}

function cleanText(value = "") {
  return String(value || "")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeHtml(value = "") {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normaliseEmailList(value) {
  if (Array.isArray(value)) {
    return value
      .map((email) => String(email || "").trim())
      .filter((email) => email.includes("@"));
  }

  return String(value || "")
    .split(/[;,]/)
    .map((email) => email.trim())
    .filter((email) => email.includes("@"));
}

function safeFilenamePart(value = "") {
  return String(value || "")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "CIMA";
}


/* -------------------------- ROUTES -------------------------- */

app.get("/health", (req, res) => {
  return res.json({
    ok: true,
    app: "AIVS / PGB CIMA Demo Backend",
    build_iso: BUILD_ISO,
    checked_at: new Date().toISOString()
  });
});

app.get("/meta", (req, res) => {
  return res.json({
    ok: true,
    app: "AIVS / PGB CIMA Demo Backend",
    build_iso: BUILD_ISO,
    iso_timestamp: new Date().toISOString(),
    access_ready: Boolean(ACCESS_CODE),

    email_agent: getEmailAgentStatus(),
    audit_agent: getAuditAgentStatus(),
    cima_response_agent: getCimaResponseAgentStatus(),
    transcript_agent: getTranscriptAgentStatus(),
    training_agent: getCimaTrainingAgentStatus(),
    training_synopsis_agent: getTrainingSynopsisAgentStatus(),
    source_index_agent: getSourceIndexAgentStatus(),
    faiss_knowledge_agent: getFaissKnowledgeAgentStatus(),
    data_review_email: DATA_REVIEW_EMAIL,
    pdf_index_ready: false,
    html_index_ready: false,
    pdf_document_count: 0,
    html_page_count: 0,
    chunk_count: 0,
    last_indexed_at: "Not indexed in demo starter backend",

    routes: [
      "/health",
      "/meta",
      "/send-access-code-email",
      "/check-access",
      "/cima-chat",
      "/cima-training",
      "/send-transcript-email",
      "/send-cima-transcript-email"
    ]
  });
});

app.post("/send-access-code-email", async (req, res) => {
  const toEmail = String(req.body.toEmail || "").trim();
  const secondEmail = String(req.body.secondEmail || "").trim();

  try {
    const result = await sendAccessCodeEmail({
      toEmail,
      secondEmail,
      accessCode: ACCESS_CODE
    });

    await writeAuditEvent({
      event_type: "access_code_email_sent",
      route: "/send-access-code-email",
      success: true,
      user_email: toEmail,
      second_email: secondEmail,
      access_mode: "one-time-code",
      ip_address: req.ip,
      user_agent: req.get("user-agent")
    });

    return res.json({
      ok: true,
      build_iso: BUILD_ISO,
      sent_at: new Date().toISOString(),
      email_sent: true,
      provider: result.provider,
      status: result.status,
      to: result.to,
      email_agent_build_iso: result.email_agent_build_iso
    });
  } catch (err) {
    console.error("ERROR /send-access-code-email failed:", err);

    await writeAuditEvent({
      event_type: "access_code_email_failed",
      route: "/send-access-code-email",
      success: false,
      error: err.message,
      user_email: toEmail,
      second_email: secondEmail,
      access_mode: "one-time-code",
      ip_address: req.ip,
      user_agent: req.get("user-agent")
    });

    return res.status(500).json({
      ok: false,
      error: "Access code email failed.",
      detail: err.message,
      build_iso: BUILD_ISO
    });
  }
});

app.post("/check-access", async (req, res) => {
  const submittedCode = String(
    req.body.accessCode ||
    req.body.vacancyCode ||
    req.body.code ||
    ""
  ).trim();

  const userEmail = String(
    req.body.email ||
    req.body.toEmail ||
    ""
  ).trim();

  const secondEmail = String(
    req.body.secondEmail ||
    ""
  ).trim();

  console.log("ACCESS CHECK:", {
    submittedLength: submittedCode.length,
    requiredLength: ACCESS_CODE.length,
    accessCodeSource: process.env.ACCESS_CODE
      ? "ACCESS_CODE"
      : process.env.VACANCY_CODE
        ? "VACANCY_CODE"
        : "DEMO"
  });

  if (!submittedCode) {
    await writeAuditEvent({
      event_type: "access_check_failed",
      route: "/check-access",
      success: false,
      error: "Access code required.",
      user_email: userEmail,
      second_email: secondEmail,
      access_mode: "one-time-code",
      ip_address: req.ip,
      user_agent: req.get("user-agent")
    });

    return res.status(400).json({
      ok: false,
      error: "Access code required.",
      build_iso: BUILD_ISO
    });
  }

  if (submittedCode !== ACCESS_CODE) {
    await writeAuditEvent({
      event_type: "access_check_failed",
      route: "/check-access",
      success: false,
      error: "Invalid access code.",
      user_email: userEmail,
      second_email: secondEmail,
      access_mode: "one-time-code",
      ip_address: req.ip,
      user_agent: req.get("user-agent")
    });

    return res.status(403).json({
      ok: false,
      error: "Invalid access code.",
      build_iso: BUILD_ISO
    });
  }

  await writeAuditEvent({
    event_type: "access_check_success",
    route: "/check-access",
    success: true,
    user_email: userEmail,
    second_email: secondEmail,
    access_mode: "one-time-code",
    ip_address: req.ip,
    user_agent: req.get("user-agent")
  });

  return res.json({
    ok: true,
    message: "Access confirmed.",
    build_iso: BUILD_ISO
  });
});

app.post("/cima-chat", async (req, res) => {
  const question = String(req.body.question || "").trim();

  const context = req.body.context && typeof req.body.context === "object"
    ? req.body.context
    : {};

  const terms = req.body.terms && typeof req.body.terms === "object"
    ? req.body.terms
    : {};

  const access = req.body.access && typeof req.body.access === "object"
    ? req.body.access
    : {};

  const userEmail = String(
    access.email ||
    req.body.email ||
    req.body.user_email ||
    ""
  ).trim();

  try {
    if (!terms.accepted) {
      await writeAuditEvent({
        event_type: "cima_question_rejected",
        route: "/cima-chat",
        success: false,
        error: "Terms and Conditions not accepted.",
        user_email: userEmail,
        access_mode: access.mode || "",
        terms_accepted: false,
        question,
        context_mode: context.mode || "",
        command_level: context.level || "",
        persona: context.persona || "",
        requested_output: context.output || "",
        ip_address: req.ip,
        user_agent: req.get("user-agent")
      });

      return res.status(403).json({
        ok: false,
        error: "Terms and Conditions must be confirmed before using the assistant.",
        build_iso: BUILD_ISO
      });
    }

    if (!question) {
      await writeAuditEvent({
        event_type: "cima_question_rejected",
        route: "/cima-chat",
        success: false,
        error: "Question required.",
        user_email: userEmail,
        access_mode: access.mode || "",
        terms_accepted: true,
        question,
        context_mode: context.mode || "",
        command_level: context.level || "",
        persona: context.persona || "",
        requested_output: context.output || "",
        ip_address: req.ip,
        user_agent: req.get("user-agent")
      });

      return res.status(400).json({
        ok: false,
        error: "Question required.",
        build_iso: BUILD_ISO
      });
    }

    await writeAuditEvent({
      event_type: "cima_question_submitted",
      route: "/cima-chat",
      success: true,
      user_email: userEmail,
      access_mode: access.mode || "",
      terms_accepted: true,
      question,
      context_mode: context.mode || "",
      command_level: context.level || "",
      persona: context.persona || "",
      requested_output: context.output || "",
      ip_address: req.ip,
      user_agent: req.get("user-agent")
    });

    const cimaResponse = buildCimaResponse({
      question,
      context
    });

    await writeAuditEvent({
      event_type: "cima_answer_generated",
      route: "/cima-chat",
      success: true,
      user_email: userEmail,
      access_mode: access.mode || "",
      terms_accepted: true,
      question,
      context_mode: context.mode || "",
      command_level: context.level || "",
      persona: context.persona || "",
      requested_output: context.output || "",
      response_path: cimaResponse.response_path,
      rag_status: cimaResponse.rag_status,
      hitl_status: cimaResponse.hitl,
      confidence: cimaResponse.confidence,
      ip_address: req.ip,
      user_agent: req.get("user-agent")
    });

    return res.json({
      ok: true,
      build_iso: BUILD_ISO,
      answered_at: new Date().toISOString(),
      response_agent_build_iso: cimaResponse.response_agent_build_iso,
      response_path: cimaResponse.response_path,
      path: cimaResponse.path,
      rag: cimaResponse.rag,
      rag_status: cimaResponse.rag_status,
      hitl: cimaResponse.hitl,
      confidence: cimaResponse.confidence,
      source_mode: cimaResponse.source_mode,
      answer: cimaResponse.answer,
      sources: cimaResponse.sources
    });
  } catch (err) {
    console.error("ERROR /cima-chat failed:", err);

    await writeAuditEvent({
      event_type: "cima_chat_failed",
      route: "/cima-chat",
      success: false,
      error: err.message,
      user_email: userEmail,
      access_mode: access.mode || "",
      terms_accepted: terms.accepted === true,
      question,
      context_mode: context.mode || "",
      command_level: context.level || "",
      persona: context.persona || "",
      requested_output: context.output || "",
      ip_address: req.ip,
      user_agent: req.get("user-agent")
    });

    return res.status(500).json({
      ok: false,
      error: "CIMA chat route failed.",
      detail: err.message,
      build_iso: BUILD_ISO
    });
  }
});

app.post("/cima-training", async (req, res) => {
  const question = String(req.body.question || "").trim();

  const context = req.body.context && typeof req.body.context === "object"
    ? req.body.context
    : {};

  const terms = req.body.terms && typeof req.body.terms === "object"
    ? req.body.terms
    : {};

  const access = req.body.access && typeof req.body.access === "object"
    ? req.body.access
    : {};

  const userEmail = String(
    access.email ||
    req.body.email ||
    req.body.user_email ||
    ""
  ).trim();

  try {
    if (!terms.accepted) {
      await writeAuditEvent({
        event_type: "cima_training_rejected",
        route: "/cima-training",
        success: false,
        error: "Terms and Conditions not accepted.",
        user_email: userEmail,
        access_mode: access.mode || "",
        terms_accepted: false,
        question,
        context_mode: context.mode || "",
        command_level: context.level || "",
        persona: context.persona || "",
        requested_output: context.output || "",
        ip_address: req.ip,
        user_agent: req.get("user-agent")
      });

      return res.status(403).json({
        ok: false,
        error: "Terms and Conditions must be confirmed before using the training agent.",
        build_iso: BUILD_ISO
      });
    }

    if (!question) {
      await writeAuditEvent({
        event_type: "cima_training_rejected",
        route: "/cima-training",
        success: false,
        error: "Training question required.",
        user_email: userEmail,
        access_mode: access.mode || "",
        terms_accepted: true,
        question,
        context_mode: context.mode || "",
        command_level: context.level || "",
        persona: context.persona || "",
        requested_output: context.output || "",
        ip_address: req.ip,
        user_agent: req.get("user-agent")
      });

      return res.status(400).json({
        ok: false,
        error: "Training question required.",
        build_iso: BUILD_ISO
      });
    }

    const trainingOutput = buildCimaTrainingOutput({
      question,
      answer: req.body.answer || "",
      context
    });

    await writeAuditEvent({
      event_type: "cima_training_generated",
      route: "/cima-training",
      success: true,
      user_email: userEmail,
      access_mode: access.mode || "",
      terms_accepted: true,
      question,
      context_mode: context.mode || "",
      command_level: context.level || "",
      persona: context.persona || "",
      requested_output: context.output || "",
      training_agent_build_iso: trainingOutput.training_agent_build_iso || trainingOutput.build_iso || "",
      ip_address: req.ip,
      user_agent: req.get("user-agent")
    });

    return res.json({
      ok: true,
      build_iso: BUILD_ISO,
      generated_at: new Date().toISOString(),
      training_agent_build_iso: trainingOutput.training_agent_build_iso || trainingOutput.build_iso || "",
      training: trainingOutput
    });
  } catch (err) {
    console.error("ERROR /cima-training failed:", err);

    await writeAuditEvent({
      event_type: "cima_training_failed",
      route: "/cima-training",
      success: false,
      error: err.message,
      user_email: userEmail,
      access_mode: access.mode || "",
      terms_accepted: terms.accepted === true,
      question,
      context_mode: context.mode || "",
      command_level: context.level || "",
      persona: context.persona || "",
      requested_output: context.output || "",
      ip_address: req.ip,
      user_agent: req.get("user-agent")
    });

    return res.status(500).json({
      ok: false,
      error: "CIMA training route failed.",
      detail: err.message,
      build_iso: BUILD_ISO
    });
  }
});

async function handleTranscriptEmail(req, res) {
  const generatedAt = String(req.body.generated_at || new Date().toISOString());

  let emails = [];
  let context = {};
  let questions = [];
  let subject = "PGB CIMA transcript";

  try {
    emails = normaliseEmailList(
      req.body.emails ||
      [req.body.toEmail, req.body.secondEmail]
    );

    if (!emails.length) {
      await writeAuditEvent({
        event_type: "transcript_email_failed",
        route: "/send-transcript-email",
        success: false,
        error: "At least one recipient email is required.",
        user_email: "",
        transcript_sent: false,
        email_recipients: [],
        ip_address: req.ip,
        user_agent: req.get("user-agent")
      });

      return res.status(400).json({
        ok: false,
        error: "At least one recipient email is required.",
        build_iso: BUILD_ISO
      });
    }

    context = req.body.context && typeof req.body.context === "object"
      ? req.body.context
      : {};

    questions = Array.isArray(req.body.questions)
      ? req.body.questions
      : [];

    subject = String(req.body.subject || "PGB CIMA transcript").trim();

    const transcriptPackage = await buildTranscriptPackage({
      transcript: req.body.transcript,
      generatedAt,
      context,
      questions,
      subject
    });

    const textPart = [
      "PGB CIMA transcript attached.",
      "",
      `Generated at: ${generatedAt}`,
      "",
      "Attached files:",
      `- ${transcriptPackage.pdfFilename}`,
      `- ${transcriptPackage.docxFilename}`,
      "",
      "This transcript is a demo operational support output and requires human review before reliance.",
      "",
      "AIVS Software Limited copyright 2026. All rights reserved."
    ].join("\n");

    const htmlPart = [
      '<div style="font-family:Arial,Helvetica,sans-serif;color:#14232B;line-height:1.5;">',
      '<h2 style="margin-bottom:4px;">PGB CIMA transcript attached</h2>',
      `<p><strong>Generated at:</strong> ${escapeHtml(generatedAt)}</p>`,
      "<p>The Word and PDF transcript files are attached.</p>",
      '<p style="font-size:12px;color:#4A5F6C;">',
      "This transcript is a demo operational support output and requires human review before reliance.",
      "</p>",
      '<p style="font-size:12px;color:#4A5F6C;">',
      "AIVS Software Limited copyright 2026. All rights reserved.",
      "</p>",
      "</div>"
    ].join("");

    const result = await sendTranscriptEmail({
      toEmails: emails,
      subject,
      bodyText: textPart,
      htmlPart,
      pdfBuffer: transcriptPackage.pdfBuffer,
      pdfFilename: transcriptPackage.pdfFilename,
      docxBuffer: transcriptPackage.docxBuffer,
      docxFilename: transcriptPackage.docxFilename
    });

    await writeAuditEvent({
      event_type: "transcript_email_sent",
      route: "/send-transcript-email",
      success: true,
      user_email: emails[0] || "",
      transcript_sent: true,
      email_recipients: emails,
      context_mode: context.mode || "",
      command_level: context.level || "",
      persona: context.persona || "",
      requested_output: context.output || "",
      ip_address: req.ip,
      user_agent: req.get("user-agent")
    });

    return res.json({
      ok: true,
      build_iso: BUILD_ISO,
      transcript_agent_build_iso: transcriptPackage.transcript_agent_build_iso,
      sent_at: new Date().toISOString(),
      email_sent: true,
      provider: result.provider,
      status: result.status,
      to: result.to,
      email_agent_build_iso: result.email_agent_build_iso,
      pdfFilename: transcriptPackage.pdfFilename,
      docxFilename: transcriptPackage.docxFilename,
      attachment_bytes: transcriptPackage.attachment_bytes
    });
  } catch (err) {
    console.error("ERROR transcript email failed:", err);

    await writeAuditEvent({
      event_type: "transcript_email_failed",
      route: "/send-transcript-email",
      success: false,
      error: err.message,
      user_email: emails[0] || "",
      transcript_sent: false,
      email_recipients: emails,
      context_mode: context.mode || "",
      command_level: context.level || "",
      persona: context.persona || "",
      requested_output: context.output || "",
      ip_address: req.ip,
      user_agent: req.get("user-agent")
    });

    return res.status(500).json({
      ok: false,
      error: "Transcript email failed.",
      detail: err.message,
      build_iso: BUILD_ISO
    });
  }
}

app.post("/send-transcript-email", handleTranscriptEmail);
app.post("/send-cima-transcript-email", handleTranscriptEmail);

/* -------------------------- START -------------------------- */

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AIVS / PGB CIMA demo backend running on port ${PORT}`);
});

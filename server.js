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
import PDFDocument from "pdfkit";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle
} from "docx";

import {
  sendAccessCodeEmail,
  sendTranscriptEmail,
  getEmailAgentStatus
} from "./export/mailjetExporter.js";

import {
  getAuditAgentStatus,
  writeAuditEvent
} from "./audit_agent.js";

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

const EMAIL_AGENT_STATUS = getEmailAgentStatus();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.options("*", cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

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

/* -------------------------- TRANSCRIPT BUILDERS -------------------------- */

function buildTranscriptText({
  transcript = "",
  generatedAt = new Date().toISOString(),
  context = {},
  questions = []
}) {
  const cleanTranscript = cleanText(transcript);

  if (cleanTranscript) {
    return cleanTranscript;
  }

  const questionLines = Array.isArray(questions) && questions.length
    ? questions.map((item, index) => {
        if (typeof item === "string") {
          return `${index + 1}. ${item}`;
        }

        return [
          `${index + 1}. ${safeString(item.question)}`,
          `   Path: ${safeString(item.path)}`,
          `   RAG: ${safeString(item.rag)}`,
          `   HITL: ${safeString(item.hitl)}`,
          `   Confidence: ${safeString(item.confidence)}`,
          `   Answer: ${safeString(item.answer)}`
        ].join("\n");
      }).join("\n\n")
    : "No questions recorded.";

  return [
    "PGB CIMA Transcript",
    "",
    `Generated at: ${generatedAt}`,
    "",
    "Context",
    `Thread: ${safeString(context.thread)}`,
    `Mode: ${safeString(context.mode)}`,
    `Command level: ${safeString(context.level)}`,
    `Persona: ${safeString(context.persona)}`,
    `Requested output: ${safeString(context.output)}`,
    "",
    "Transcript",
    questionLines
  ].join("\n");
}

function buildTranscriptPdfBuffer({
  transcriptText,
  generatedAt,
  subject = "PGB CIMA Transcript"
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 46
    });

    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc
      .fontSize(16)
      .fillColor("#14232B")
      .text("AIVS / PGB CIMA", { align: "left" });

    doc.moveDown(0.35);

    doc
      .fontSize(12)
      .fillColor("#243744")
      .text(subject, { align: "left" });

    doc.moveDown(0.35);

    doc
      .fontSize(8)
      .fillColor("#4A5F6C")
      .text(`Generated at: ${generatedAt}`);

    doc.moveDown(1);

    const lines = cleanText(transcriptText).split("\n");

    for (const line of lines) {
      const cleanLine = String(line || "").trim();

      if (doc.y > 760) {
        doc.addPage();
      }

      if (!cleanLine) {
        doc.moveDown(0.35);
        continue;
      }

      const isHeading =
        cleanLine === "Context" ||
        cleanLine === "Transcript" ||
        cleanLine === "PGB CIMA Transcript" ||
        cleanLine.startsWith("Question ") ||
        cleanLine.startsWith("Answer ");

      if (isHeading) {
        doc
          .fontSize(11)
          .fillColor("#14232B")
          .text(cleanLine, { align: "left" });

        doc.moveDown(0.25);
        continue;
      }

      doc
        .fontSize(9)
        .fillColor("#111827")
        .text(cleanLine, {
          align: "left",
          lineGap: 2
        });

      doc.moveDown(0.2);
    }

    doc.moveDown(1);

    if (doc.y > 720) {
      doc.addPage();
    }

    doc
      .fontSize(8)
      .fillColor("#4A5F6C")
      .text(
        "This transcript is a demo operational support output. It is not legal, safety, medical, security or emergency-services advice. Human command review is required before reliance.",
        { align: "left" }
      );

    doc.moveDown(0.5);

    doc
      .fontSize(8)
      .fillColor("#4A5F6C")
      .text("AIVS Software Limited copyright 2026. All rights reserved.");

    doc.end();
  });
}

function docxParagraph(text = "", options = {}) {
  return new Paragraph({
    heading: options.heading,
    spacing: {
      before: options.before ?? 80,
      after: options.after ?? 80
    },
    children: [
      new TextRun({
        text: safeString(text),
        bold: options.bold === true,
        italics: options.italics === true,
        color: options.color || "243744",
        size: options.size || 20,
        font: "Arial"
      })
    ]
  });
}

function docxCell(label = "", value = "") {
  return new TableRow({
    children: [
      new TableCell({
        width: {
          size: 34,
          type: WidthType.PERCENTAGE
        },
        shading: {
          fill: "EDE8DF"
        },
        margins: {
          top: 120,
          bottom: 120,
          left: 140,
          right: 140
        },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: "DDD6C9" },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "DDD6C9" },
          left: { style: BorderStyle.SINGLE, size: 1, color: "DDD6C9" },
          right: { style: BorderStyle.SINGLE, size: 1, color: "DDD6C9" }
        },
        children: [
          docxParagraph(label, {
            bold: true,
            size: 19,
            before: 0,
            after: 0
          })
        ]
      }),
      new TableCell({
        width: {
          size: 66,
          type: WidthType.PERCENTAGE
        },
        margins: {
          top: 120,
          bottom: 120,
          left: 140,
          right: 140
        },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: "DDD6C9" },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "DDD6C9" },
          left: { style: BorderStyle.SINGLE, size: 1, color: "DDD6C9" },
          right: { style: BorderStyle.SINGLE, size: 1, color: "DDD6C9" }
        },
        children: [
          docxParagraph(value, {
            size: 19,
            before: 0,
            after: 0
          })
        ]
      })
    ]
  });
}

async function buildTranscriptDocxBuffer({
  transcriptText,
  generatedAt,
  subject = "PGB CIMA Transcript",
  context = {}
}) {
  const children = [];

  children.push(
    docxParagraph("AIVS / PGB CIMA", {
      heading: HeadingLevel.TITLE,
      bold: true,
      color: "14232B",
      size: 34,
      before: 0,
      after: 80
    })
  );

  children.push(
    docxParagraph(subject, {
      heading: HeadingLevel.HEADING_1,
      bold: true,
      color: "14232B",
      size: 28,
      before: 0,
      after: 160
    })
  );

  children.push(
    new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE
      },
      rows: [
        docxCell("Generated at", generatedAt),
        docxCell("Thread", safeString(context.thread)),
        docxCell("Mode", safeString(context.mode)),
        docxCell("Command level", safeString(context.level)),
        docxCell("Persona", safeString(context.persona)),
        docxCell("Requested output", safeString(context.output))
      ]
    })
  );

  children.push(
    docxParagraph("Transcript", {
      heading: HeadingLevel.HEADING_2,
      bold: true,
      color: "14232B",
      size: 26,
      before: 300,
      after: 120
    })
  );

  const lines = cleanText(transcriptText).split("\n");

  for (const line of lines) {
    const cleanLine = String(line || "").trim();

    if (!cleanLine) {
      children.push(docxParagraph("", { after: 40 }));
      continue;
    }

    const isHeading =
      cleanLine === "Context" ||
      cleanLine === "Transcript" ||
      cleanLine === "PGB CIMA Transcript" ||
      cleanLine.startsWith("Question ") ||
      cleanLine.startsWith("Answer ");

    children.push(
      docxParagraph(cleanLine, {
        bold: isHeading,
        color: isHeading ? "14232B" : "243744",
        size: isHeading ? 22 : 20,
        before: isHeading ? 160 : 40,
        after: 60
      })
    );
  }

  children.push(
    docxParagraph(
      "This transcript is a demo operational support output. It is not legal, safety, medical, security or emergency-services advice. Human command review is required before reliance.",
      {
        italics: true,
        color: "4A5F6C",
        size: 18,
        before: 240,
        after: 80
      }
    )
  );

  children.push(
    docxParagraph("AIVS Software Limited copyright 2026. All rights reserved.", {
      color: "4A5F6C",
      size: 18,
      before: 40,
      after: 40
    })
  );

  const document = new Document({
    creator: "AIVS Software Limited",
    title: "PGB CIMA Transcript",
    description: "PGB CIMA transcript generated by AIVS CIMA demo backend",
    sections: [
      {
        properties: {},
        children
      }
    ]
  });

  return Packer.toBuffer(document);
}

/* -------------------------- CIMA DEMO ANSWER LOGIC -------------------------- */

function determineResponsePath(question = "", context = {}) {
  const text = [
    question,
    context.mode,
    context.level,
    context.persona,
    context.output,
    context.thread
  ].join(" ").toLowerCase();

  if (
    text.includes("assurance") ||
    text.includes("compliance") ||
    text.includes("statutory") ||
    text.includes("validate") ||
    text.includes("source") ||
    text.includes("citation") ||
    text.includes("policy") ||
    text.includes("safeguarding")
  ) {
    return "ASSURANCE PATH";
  }

  return "FAST PATH";
}

function inferRagStatus(question = "", context = {}, responsePath = "FAST PATH") {
  const text = [
    question,
    context.mode,
    context.level,
    context.persona,
    context.output
  ].join(" ").toLowerCase();

  if (
    text.includes("death") ||
    text.includes("serious injury") ||
    text.includes("life safety") ||
    text.includes("evacuation") ||
    text.includes("emergency") ||
    text.includes("missing person") ||
    text.includes("safeguarding")
  ) {
    return "RED";
  }

  if (responsePath === "ASSURANCE PATH") {
    return "AMBER";
  }

  return "GREEN";
}

function buildDemoCimaAnswer({ question = "", context = {}, path = "FAST PATH" }) {
  const sections = [];

  sections.push("## Executive Summary");

  if (path === "ASSURANCE PATH") {
    sections.push(
      "This has been treated as an assurance-style request. In the production system, the answer would be checked against the approved Source Register, policy abstracts and controlled internal material before being issued."
    );
  } else {
    sections.push(
      "This has been treated as a fast operational request. The immediate priority is to clarify the facts, identify people at risk, stabilise the situation and set a clear next action owner."
    );
  }

  sections.push("");
  sections.push("## Selected Context");
  sections.push(`- Thread: ${safeString(context.thread)}`);
  sections.push(`- Mode: ${safeString(context.mode)}`);
  sections.push(`- Command level: ${safeString(context.level)}`);
  sections.push(`- Persona: ${safeString(context.persona)}`);
  sections.push(`- Requested output: ${safeString(context.output)}`);

  sections.push("");
  sections.push("## Immediate Actions");
  sections.push("- Confirm what is known, what is assumed and what is still unknown.");
  sections.push("- Identify whether anyone is at immediate risk.");
  sections.push("- Set an owner for the next action.");
  sections.push("- Agree the next update time.");
  sections.push("- Record the decision and the reason for it.");

  sections.push("");
  sections.push("## Risk and Safety");
  sections.push("- Do not present uncertain information as confirmed.");
  sections.push("- Separate operational facts from assumptions.");
  sections.push("- Escalate immediately if life safety, safeguarding or public confidence is affected.");
  sections.push("- Keep a clear decision log.");

  sections.push("");
  sections.push("## Information Gaps");
  sections.push("- Exact location and time of incident.");
  sections.push("- Number and status of people affected.");
  sections.push("- Current command owner.");
  sections.push("- Any external authority involvement.");
  sections.push("- Whether a formal assurance or source-cited answer is required.");

  sections.push("");
  sections.push("## Human Review");
  sections.push(
    "This is a CIMA demo response. A responsible human lead must review and approve operational decisions before action."
  );

  return sections.join("\n");
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

    const responsePath = determineResponsePath(question, context);
    const rag = inferRagStatus(question, context, responsePath);

    const hitl = responsePath === "ASSURANCE PATH" || rag === "RED"
      ? "May be required"
      : "Not triggered";

    const confidence = responsePath === "ASSURANCE PATH"
      ? "Requires source check"
      : "Provisional";

    const answer = buildDemoCimaAnswer({
      question,
      context,
      path: responsePath
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
      response_path: responsePath,
      rag_status: rag,
      hitl_status: hitl,
      confidence,
      ip_address: req.ip,
      user_agent: req.get("user-agent")
    });

    return res.json({
      ok: true,
      build_iso: BUILD_ISO,
      answered_at: new Date().toISOString(),
      response_path: responsePath,
      path: responsePath,
      rag,
      rag_status: rag,
      hitl,
      confidence,
      source_mode: responsePath === "ASSURANCE PATH"
        ? "Source Register required in production"
        : "Internal first",
      answer,
      sources: responsePath === "ASSURANCE PATH"
        ? [
            {
              title: "Production source-register lookup required",
              type: "placeholder",
              note: "The demo starter backend does not retrieve controlled sources."
            }
          ]
        : []
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

    const transcriptText = buildTranscriptText({
      transcript: req.body.transcript,
      generatedAt,
      context,
      questions
    });

    const safeName = safeFilenamePart(subject);

    const pdfFilename = `${safeName}_${generatedAt.slice(0, 10)}.pdf`;
    const docxFilename = `${safeName}_${generatedAt.slice(0, 10)}.docx`;

    const pdfBuffer = await buildTranscriptPdfBuffer({
      transcriptText,
      generatedAt,
      subject
    });

    const docxBuffer = await buildTranscriptDocxBuffer({
      transcriptText,
      generatedAt,
      subject,
      context
    });

    const textPart = [
      "PGB CIMA transcript attached.",
      "",
      `Generated at: ${generatedAt}`,
      "",
      "Attached files:",
      `- ${pdfFilename}`,
      `- ${docxFilename}`,
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
      pdfBuffer,
      pdfFilename,
      docxBuffer,
      docxFilename
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
      sent_at: new Date().toISOString(),
      email_sent: true,
      provider: result.provider,
      status: result.status,
      to: result.to,
      email_agent_build_iso: result.email_agent_build_iso,
      pdfFilename,
      docxFilename,
      attachment_bytes: {
        pdf: pdfBuffer.length,
        docx: docxBuffer.length
      }
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

/**
 * AIVS / PGB CIMA Demo Backend - server.js
 * ISO Timestamp: 2026-05-19T18:05:00Z
 *
 * Change Log:
 * - v0.1.0: clean standalone backend for PGB CIMA demo index
 * - v0.1.0: removed dependency on AIVS Company Examiner / security backend
 * - v0.1.0: added /health and /meta
 * - v0.1.0: added /check-access using ACCESS_CODE or VACANCY_CODE
 * - v0.1.0: added /cima-chat demo response route
 * - v0.1.0: added /send-transcript-email route
 * - v0.1.0: sends transcript as PDF and DOCX via Mailjet
 * - v0.1.0: supports one or two email recipients
 *
 * Notes:
 * - Temporary working CIMA backend.
 * - No Companies House, FCA, insolvency, director, OCR or security agents.
 * - Designed to match the current CIMA demo index.
 * - All operational outputs are demo outputs and require human review.
 */

const BUILD_ISO = "2026-05-19T18:05:00Z";
console.log("PGB CIMA BACKEND BUILD:", BUILD_ISO);

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import MailjetPackage from "node-mailjet";
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

const MAILJET_API_KEY = String(
  process.env.MAILJET_API_KEY ||
  process.env.MJ_APIKEY_PUBLIC ||
  ""
).trim();

const MAILJET_API_SECRET = String(
  process.env.MAILJET_API_SECRET ||
  process.env.MJ_APIKEY_PRIVATE ||
  ""
).trim();

const MAILJET_FROM_EMAIL = String(
  process.env.MAILJET_FROM_EMAIL ||
  process.env.MJ_FROM_EMAIL ||
  "noreply@securemaildrop.uk"
).trim();

const MAILJET_FROM_NAME = String(
  process.env.MAILJET_FROM_NAME ||
  process.env.MJ_FROM_NAME ||
  "AIVS Software Limited"
).trim();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

console.log("ENV CHECK:", {
  accessCodeSet: Boolean(ACCESS_CODE),
  accessCodeLength: ACCESS_CODE.length,
  mailjetReady: Boolean(MAILJET_API_KEY && MAILJET_API_SECRET),
  fromEmail: MAILJET_FROM_EMAIL,
  dataReviewEmail: DATA_REVIEW_EMAIL
});

/* -------------------------- BASIC HELPERS -------------------------- */

function safeString(value = "") {
  if (value === null || value === undefined || value === "") return "Not supplied";
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

function getMailjetClient() {
  if (!MAILJET_API_KEY || !MAILJET_API_SECRET) {
    throw new Error("Missing Mailjet credentials. Set MAILJET_API_KEY and MAILJET_API_SECRET, or MJ_APIKEY_PUBLIC and MJ_APIKEY_PRIVATE.");
  }

  const Mailjet = MailjetPackage?.default || MailjetPackage;

  if (Mailjet?.apiConnect) {
    return Mailjet.apiConnect(MAILJET_API_KEY, MAILJET_API_SECRET);
  }

  return new Mailjet({
    apiKey: MAILJET_API_KEY,
    apiSecret: MAILJET_API_SECRET
  });
}

async function sendMailjetEmail({
  toEmails,
  subject,
  textPart,
  htmlPart,
  attachments = []
}) {
  const recipients = normaliseEmailList(toEmails);

  if (!recipients.length) {
    throw new Error("At least one valid recipient email address is required.");
  }

  const mailjet = getMailjetClient();

  const message = {
    From: {
      Email: MAILJET_FROM_EMAIL,
      Name: MAILJET_FROM_NAME
    },
    To: recipients.map((email) => ({ Email: email })),
    Subject: subject,
    TextPart: textPart,
    HTMLPart: htmlPart,
    Attachments: attachments
  };

  const response = await mailjet
    .post("send", { version: "v3.1" })
    .request({
      Messages: [message]
    });

  return {
    sent: true,
    provider: "Mailjet",
    to: recipients,
    status: response?.body?.Messages?.[0]?.Status || "sent"
  };
}

/* -------------------------- REPORT BUILDERS -------------------------- */

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
    `Scenario: ${safeString(context.scenario)}`,
    `Location: ${safeString(context.location)}`,
    `People at risk: ${safeString(context.people)}`,
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
        docxCell("Scenario", safeString(context.scenario)),
        docxCell("Location", safeString(context.location)),
        docxCell("People at risk", safeString(context.people)),
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
    mailjet_ready: Boolean(MAILJET_API_KEY && MAILJET_API_SECRET),
    data_review_email: DATA_REVIEW_EMAIL,
    routes: [
      "/health",
      "/meta",
      "/check-access",
      "/cima-chat",
      "/send-transcript-email",
      "/send-cima-transcript-email"
    ]
  });
});

app.post("/check-access", (req, res) => {
  const submittedCode = String(
    req.body.accessCode ||
    req.body.vacancyCode ||
    req.body.code ||
    ""
  ).trim();

  console.log("ACCESS CHECK:", {
    submittedLength: submittedCode.length,
    requiredLength: ACCESS_CODE.length,
    accessCodeSource: process.env.ACCESS_CODE ? "ACCESS_CODE" : process.env.VACANCY_CODE ? "VACANCY_CODE" : "DEMO"
  });

  if (!submittedCode) {
    return res.status(400).json({
      ok: false,
      error: "Access code required.",
      build_iso: BUILD_ISO
    });
  }

  if (submittedCode !== ACCESS_CODE) {
    return res.status(403).json({
      ok: false,
      error: "Invalid access code.",
      build_iso: BUILD_ISO
    });
  }

  return res.json({
    ok: true,
    message: "Access confirmed.",
    build_iso: BUILD_ISO
  });
});

function determineResponsePath(question = "", context = {}) {
  const text = [
    question,
    context.mode,
    context.output,
    context.scenario
  ].join(" ").toLowerCase();

  if (
    text.includes("assurance") ||
    text.includes("compliance") ||
    text.includes("statutory") ||
    text.includes("validate") ||
    text.includes("source") ||
    text.includes("citation") ||
    text.includes("policy")
  ) {
    return "ASSURANCE PATH";
  }

  return "FAST PATH";
}

function buildDemoCimaAnswer({ question = "", context = {}, path = "FAST PATH" }) {
  const sections = [];

  sections.push("## Executive Summary");

  if (path === "ASSURANCE PATH") {
    sections.push(
      "This has been treated as an assurance-style request. In the production system, the answer would be checked against the approved Source Register, policy abstracts and relevant SharePoint-controlled material before being issued."
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
  sections.push(`- Scenario: ${safeString(context.scenario)}`);
  sections.push(`- Location: ${safeString(context.location)}`);
  sections.push(`- People at risk: ${safeString(context.people)}`);
  sections.push(`- Requested output: ${safeString(context.output)}`);

  sections.push("");
  sections.push("## Immediate Actions");
  sections.push("- Confirm what is known, what is assumed and what is still unknown.");
  sections.push("- Identify whether anyone is at immediate risk.");
  sections.push("- Set an owner for the next action.");
  sections.push("- Agree the next update time.");
  sections.push("- Record the decision and the reason for it.");

  sections.push("");
  sections.push("## Information Gaps");
  sections.push("- Exact location and time of incident.");
  sections.push("- Number and status of people affected.");
  sections.push("- Current command owner.");
  sections.push("- Any external authority involvement.");
  sections.push("- Whether a formal assurance / source-cited answer is required.");

  sections.push("");
  sections.push("## Human Review");
  sections.push("This is a CIMA demo response. A responsible human lead must review and approve operational decisions before action.");

  return sections.join("\n");
}

app.post("/cima-chat", (req, res) => {
  try {
    const question = String(req.body.question || "").trim();
    const context = req.body.context && typeof req.body.context === "object"
      ? req.body.context
      : {};

    const terms = req.body.terms && typeof req.body.terms === "object"
      ? req.body.terms
      : {};

    if (!terms.accepted) {
      return res.status(403).json({
        ok: false,
        error: "Terms and Conditions must be confirmed before using the assistant.",
        build_iso: BUILD_ISO
      });
    }

    if (!question) {
      return res.status(400).json({
        ok: false,
        error: "Question required.",
        build_iso: BUILD_ISO
      });
    }

    const responsePath = determineResponsePath(question, context);
    const answer = buildDemoCimaAnswer({
      question,
      context,
      path: responsePath
    });

    return res.json({
      ok: true,
      build_iso: BUILD_ISO,
      answered_at: new Date().toISOString(),
      response_path: responsePath,
      hitl: responsePath === "ASSURANCE PATH" ? "May be required" : "Not triggered",
      source_mode: responsePath === "ASSURANCE PATH" ? "Source Register required in production" : "Internal first",
      answer,
      sources: responsePath === "ASSURANCE PATH"
        ? [
            {
              title: "Production source-register lookup required",
              type: "placeholder",
              note: "The demo backend does not retrieve SharePoint sources."
            }
          ]
        : []
    });
  } catch (err) {
    console.error("ERROR /cima-chat failed:", err);

    return res.status(500).json({
      ok: false,
      error: "CIMA chat route failed.",
      detail: err.message,
      build_iso: BUILD_ISO
    });
  }
});

async function handleTranscriptEmail(req, res) {
  try {
    const generatedAt = String(req.body.generated_at || new Date().toISOString());

    const emails = normaliseEmailList(
      req.body.emails ||
      [req.body.toEmail, req.body.secondEmail]
    );

    if (!emails.length) {
      return res.status(400).json({
        ok: false,
        error: "At least one recipient email is required.",
        build_iso: BUILD_ISO
      });
    }

    const context = req.body.context && typeof req.body.context === "object"
      ? req.body.context
      : {};

    const questions = Array.isArray(req.body.questions)
      ? req.body.questions
      : [];

    const subject = String(req.body.subject || "PGB CIMA transcript").trim();

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

    const htmlPart = `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#14232B;line-height:1.5;">
        <h2 style="margin-bottom:4px;">PGB CIMA transcript attached</h2>
        <p><strong>Generated at:</strong> ${escapeHtml(generatedAt)}</p>
        <p>The Word and PDF transcript files are attached.</p>
        <p style="font-size:12px;color:#4A5F6C;">
          This transcript is a demo operational support output and requires human review before reliance.
        </p>
        <p style="font-size:12px;color:#4A5F6C;">
          AIVS Software Limited copyright 2026. All rights reserved.
        </p>
      </div>
    `;

    const result = await sendMailjetEmail({
      toEmails: emails,
      subject,
      textPart,
      htmlPart,
      attachments: [
        {
          ContentType: "application/pdf",
          Filename: pdfFilename,
          Base64Content: pdfBuffer.toString("base64")
        },
        {
          ContentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          Filename: docxFilename,
          Base64Content: docxBuffer.toString("base64")
        }
      ]
    });

    return res.json({
      ok: true,
      build_iso: BUILD_ISO,
      sent_at: new Date().toISOString(),
      email_sent: true,
      provider: result.provider,
      status: result.status,
      to: result.to,
      pdfFilename,
      docxFilename,
      attachment_bytes: {
        pdf: pdfBuffer.length,
        docx: docxBuffer.length
      }
    });
  } catch (err) {
    console.error("ERROR transcript email failed:", err);

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

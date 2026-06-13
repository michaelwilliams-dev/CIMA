/**
 * AIVS / PGB CIMA - Transcript Agent
 * File: transcript_agent.js
 * ISO Timestamp: 2026-06-04T17:05:00Z
 *
 * Purpose:
 * - Builds CIMA session transcript content outside server.js.
 * - Prepares transcript text for Word and PDF generation.
 * - Returns PDF and DOCX buffers for email delivery by export/mailjetExporter.js.
 *
 * Change Log:
 * - v0.1.0: created blank controlled agent file for transcript handling.
 * - v0.2.0: added controlled transcript text, PDF and DOCX generation logic.
 *
 * ISO Control Notes:
 * - This agent must preserve question, answer, timestamp, path, RAG, HITL and confidence records.
 * - This agent must not send email directly.
 * - This agent must not write audit records directly.
 * - All transcript outputs are subject to human review.
 */

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

const TRANSCRIPT_AGENT_BUILD_ISO = "2026-06-04T17:05:00Z";

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

function safeFilenamePart(value = "") {
  return String(value || "")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "CIMA";
}

function buildTranscriptText({
  transcript = "",
  generatedAt = new Date().toISOString(),
  context = {},
  humanReview = {},
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
    `Human review confirmed: ${humanReview.confirmed === true ? "Yes" : "No"}`,
    `Human review confirmed at: ${safeString(humanReview.confirmed_at)}`,
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
    bullet: options.bullet === true ? { level: 0 } : undefined,
    spacing: {
      before: options.before ?? 80,
      after: options.after ?? 80
    },
    children: [
      new TextRun({
        text: text === null || text === undefined ? "" : String(text),
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
  context = {},
  humanReview = {}
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
        docxCell("Requested output", safeString(context.output)),
        docxCell("Human review confirmed", humanReview.confirmed === true ? "Yes" : "No"),
        docxCell("Human review confirmed at", safeString(humanReview.confirmed_at))
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

  let inFrontMatter = true;

  for (const line of lines) {
    const cleanLine = String(line || "").trim();

    if (inFrontMatter) {
      if (cleanLine === "Transcript") {
        inFrontMatter = false;
      }

      continue;
    }

    if (!cleanLine) {
      children.push(docxParagraph("", { after: 40 }));
      continue;
    }

    if (cleanLine.startsWith("Answer: ## ")) {
      children.push(
        docxParagraph("Answer", {
          heading: HeadingLevel.HEADING_2,
          bold: true,
          color: "14232B",
          size: 24,
          before: 180,
          after: 80
        })
      );

      children.push(
        docxParagraph(cleanLine.replace(/^Answer:\s*##\s*/, ""), {
          heading: HeadingLevel.HEADING_2,
          bold: true,
          color: "14232B",
          size: 24,
          before: 120,
          after: 80
        })
      );

      continue;
    }

    if (cleanLine.startsWith("## ")) {
      children.push(
        docxParagraph(cleanLine.replace(/^##\s*/, ""), {
          heading: HeadingLevel.HEADING_2,
          bold: true,
          color: "14232B",
          size: 24,
          before: 180,
          after: 80
        })
      );

      continue;
    }

    if (cleanLine.startsWith("- ")) {
      children.push(
        docxParagraph(cleanLine.replace(/^-+\s*/, ""), {
          bullet: true,
          color: "243744",
          size: 20,
          before: 40,
          after: 40
        })
      );

      continue;
    }

    const isHeading =
      cleanLine === "Transcript" ||
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
    description: "PGB CIMA transcript generated by AIVS CIMA transcript agent",
    sections: [
      {
        properties: {},
        children
      }
    ]
  });

  return Packer.toBuffer(document);
}

export async function buildTranscriptPackage({
  transcript = "",
  generatedAt = new Date().toISOString(),
  context = {},
  humanReview = {},
  questions = [],
  subject = "PGB CIMA transcript"
} = {}) {
  const transcriptText = buildTranscriptText({
    transcript,
    generatedAt,
    context,
    humanReview,
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
    context,
    humanReview
  });

  return {
    ok: true,
    transcript_agent_build_iso: TRANSCRIPT_AGENT_BUILD_ISO,
    transcriptText,
    pdfBuffer,
    docxBuffer,
    pdfFilename,
    docxFilename,
    attachment_bytes: {
      pdf: pdfBuffer.length,
      docx: docxBuffer.length
    }
  };
}

export function getTranscriptAgentStatus() {
  return {
    ok: true,
    agent: "transcript_agent",
    transcript_agent_build_iso: TRANSCRIPT_AGENT_BUILD_ISO,
    mode: "local-pdf-docx-build"
  };
}

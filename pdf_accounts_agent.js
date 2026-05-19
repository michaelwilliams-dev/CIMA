/**
 * AIVS Company Examiner — Company Accounts PDF Agent
 * File: company_accounts_pdf_agent.js
 * ISO Timestamp: 2026-05-05T14:45:00Z
 *
 * Change Log:
 * - v0.1.0: reusable agent created from successful PDF capture test
 * - v0.1.0: takes company number
 * - v0.1.0: fetches latest Companies House accounts PDF
 * - v0.1.0: captures PDF in memory only
 * - v0.1.0: sends in-memory PDF to OpenAI
 * - v0.1.0: returns reportText, source PDF filename and audit object
 *
 * Notes:
 * - Does not write PDF to disk.
 * - Does not send email.
 * - Email remains handled by /send-report-email in server.js.
 */

import { Buffer } from "buffer";
import OpenAI from "openai";
import PDFDocument from "pdfkit";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel
} from "docx";
import { sendResultEmail } from "./export/mailjetExporter.js";

const BUILD_ISO = "2026-05-05T14:45:00Z";

const COMPANIES_HOUSE_API_KEY = String(
  process.env.COMPANIES_HOUSE_API_KEY || ""
).trim();

const OPENAI_API_KEY = String(
  process.env.OPENAI_API_KEY || ""
).trim();

const OPENAI_PDF_MODEL = String(
  process.env.OPENAI_PDF_MODEL || "gpt-4o"
).trim();

const openai = OPENAI_API_KEY
  ? new OpenAI({ apiKey: OPENAI_API_KEY })
  : null;

function normaliseCompanyNumber(value = "") {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

function companiesHouseHeaders(accept = "application/json") {
  const token = Buffer.from(`${COMPANIES_HOUSE_API_KEY}:`).toString("base64");

  return {
    Authorization: `Basic ${token}`,
    Accept: accept
  };
}

async function companiesHouseGet(pathname) {
  const res = await fetch(
    `https://api.company-information.service.gov.uk${pathname}`,
    {
      headers: companiesHouseHeaders("application/json")
    }
  );

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(`Companies House JSON failed ${res.status}: ${text}`);
  }

  return data;
}

async function companiesHouseGetUrl(url, accept = "application/json") {
  const res = await fetch(url, {
    headers: companiesHouseHeaders(accept)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Companies House URL failed ${res.status}: ${text}`);
  }

  if (accept === "application/pdf") {
    const arrayBuffer = await res.arrayBuffer();

    return {
      buffer: Buffer.from(arrayBuffer),
      contentType: res.headers.get("content-type") || "application/pdf"
    };
  }

  return res.json();
}

async function fetchLatestAccountsPdf(companyNumber) {
  const number = normaliseCompanyNumber(companyNumber);

  if (!number) {
    throw new Error("Company number required.");
  }

  if (!COMPANIES_HOUSE_API_KEY) {
    throw new Error("COMPANIES_HOUSE_API_KEY is missing.");
  }

  const filingHistory = await companiesHouseGet(
    `/company/${encodeURIComponent(number)}/filing-history?category=accounts&items_per_page=25`
  );

  const filing = (filingHistory.items || []).find((item) =>
    item.links?.document_metadata &&
    (
      String(item.category || "").toLowerCase() === "accounts" ||
      String(item.type || "").toUpperCase() === "AA" ||
      String(item.description || "").toLowerCase().includes("accounts")
    )
  );

  if (!filing) {
    throw new Error("No downloadable accounts filing found.");
  }

  const metadataUrl = String(filing.links.document_metadata).startsWith("http")
    ? filing.links.document_metadata
    : `https://document-api.company-information.service.gov.uk${filing.links.document_metadata}`;

  const metadata = await companiesHouseGetUrl(metadataUrl);

  const pdfLink =
    metadata.resources?.["application/pdf"]?.links?.document ||
    metadata.resources?.["application/pdf"]?.link ||
    metadata.links?.document ||
    `${metadataUrl}/content`;

  if (!pdfLink) {
    throw new Error("No PDF content link returned by Companies House.");
  }

  const pdf = await companiesHouseGetUrl(pdfLink, "application/pdf");

  const filename = `Companies_House_latest_accounts_${number}_${filing.date || "undated"}.pdf`
    .replace(/[^\w.\-]+/g, "_");

  console.log("PDF_AGENT_CAPTURED_IN_MEMORY:", {
    companyNumber: number,
    filename,
    contentType: pdf.contentType,
    bytes: pdf.buffer.length,
    bufferPresent: Boolean(pdf.buffer),
    success: pdf.buffer.length > 1000,
    build_iso: BUILD_ISO
  });

  return {
    companyNumber: number,
    filename,
    buffer: pdf.buffer,
    contentType: pdf.contentType,
    filing
  };
}

async function buildOpenAiAccountsReport({
  companyNumber,
  companyName = "",
  riskFocus = "",
  urgencyLevel = "",
  examinationNeed = "",
  pdfBuffer,
  filename
}) {
  if (!openai) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const pdfBase64 = pdfBuffer.toString("base64");

  
const prompt = `
You are an evidence-first company accounts analyst for AIVS Software Limited.

Task:
Review the attached latest Companies House accounts PDF and produce a full, detailed AIVS Company Examiner accounts report.

This must be a comprehensive Full Accounts Report, not a short synopsis.

Do not call this a "board report" or "board-level report".
Use this report title format:

# AIVS Company Examiner
# Full Accounts Report - ${companyName || "Company"}

Generated: ${new Date().toISOString()}
Company: ${companyName || "Not supplied"}
Company number: ${companyNumber}
Source: ${filename}

Important rules:
- The report must start with these two markdown title lines:
# AIVS Company Examiner
# Full Accounts Report - ${companyName || "Company"}
- Never use the phrase "Board-Level Accounts Review".
- Never use the phrase "board report".
- Never use the phrase "board-level".
- Do not use the word "board" anywhere in the report title.
- Use only the attached Companies House accounts PDF.
- Do not invent facts.
- If a figure or fact is not visible, say so plainly.
- Do not provide legal, financial, investment, credit, sanctions, procurement or tax advice.
- Make clear that human review against the source Companies House filing is required.
- Do not include raw JSON.
- Do not mention internal implementation details.
- Never use horizontal divider lines such as ---.
- Do not use ### or #### headings.
- Use only # for the main title and ## for numbered section headings.
- Every numbered section from 1 to 21 must appear in the final answer.
- Do not collapse the report into a short narrative.
- Use markdown tables wherever requested.
- Where two-year figures are visible, compare current year against prior year.
- Explain what the figures mean in plain English.
- Identify contradictions, for example strong profit but weak liquidity.
- Do not produce a generic template.
- Do not make unsupported assumptions.

Required report structure:

## 1. Executive view

Provide a concise but useful executive overview.

Include a markdown table with:
| Area | Current position | Initial view |
|---|---|---|

Cover revenue, operating profit, profit before tax, profit after tax, net assets, cash, net current liabilities, lease liabilities, pension position, audit opinion and going concern where visible.

## 2. Company identity and filing details

Include a markdown table with:
| Item | Detail |
|---|---|

Cover company name, company number, reporting period, registered office, principal activity, auditor, directors where visible, parent/group position where visible, and filing type.

State clearly whether this is a standalone company filing or part of a wider group.

## 3. Business and trading performance

Explain what the company does and what management says about trading.

Include a profit and loss markdown table where figures are visible:
| £m | Current year | Prior year | Movement / comment |
|---|---:|---:|---|

Cover revenue, cost of sales, gross profit, administrative expenses, operating profit, interest income, interest expense, profit before tax, tax charge and profit after tax where visible.

Explain whether profit growth is stronger or weaker than revenue growth.

## 4. Balance sheet and financial position

Include a markdown table:
| £m | Current year | Prior year | Comment |
|---|---:|---:|---|

Cover intangible assets, tangible assets, right-of-use assets, debtors, stocks, cash, current liabilities, net current liabilities, non-current liabilities and net assets where visible.

Explain the main balance sheet strengths and weaknesses.

## 5. Cash, liquidity and going concern

Explain cash position, current liabilities, net current liabilities, funding support, available facilities and going concern wording where visible.

Include a table:
| Area | View |
|---|---|

Make clear whether liquidity is a review point even if the business is profitable.

## 6. Audit opinion and audit focus

Summarise the auditor, audit opinion, whether the opinion is qualified or unqualified, going concern audit conclusion, fraud-risk focus and any key audit or judgement areas visible.

Explain why the audit focus matters.

## 7. Strategic report and management narrative

Summarise the strategic report and directors’ report.

Cover management tone, positive statements, cautious statements, promotional language, future developments and any phrases that indicate pressure, uncertainty or resilience planning.

## 8. Principal risks and operational exposure

Identify risk themes visible in the accounts.

Include a markdown table:
| Risk area | Why it matters |
|---|---|

Cover cyber security, data privacy, technology, geopolitics, supply chain, competition, regulatory compliance, product safety, health and safety, people risk, macroeconomic risk and any sector-specific risks where visible.

If adverse media, sanctions or credit checks are not available from the accounts, say so.

## 9. Employees and workforce

Summarise employee numbers, staff costs, pensions, benefits, inclusion, employment policies, union or workforce issues where visible.

Use a table for staff cost figures if visible.

## 10. Dividends and reserves

Cover dividends, reserves, shareholder funds, distributable reserves where visible, and whether dividends should be checked against liquidity and reserves.

## 11. Leases and right-of-use assets

Summarise right-of-use assets, current lease liabilities, non-current lease liabilities and total lease exposure where visible.

Include a table:
| Item | Current year | Prior year |
|---|---:|---:|

Explain why lease exposure matters.

## 12. Tangible assets and impairment

Explain tangible assets, impairment charges or reversals, cash-generating units, assumptions, discount rates, growth rates, property values and sensitivity analysis where visible.

Explain why impairment is judgemental.

## 13. Commercial income and supplier arrangements

Explain commercial income, supplier arrangements, buying arrangements, rebates, promotional allowances or other supplier income where visible.

If the auditor treats this as a risk or judgement area, explain that this does not mean fraud occurred but does mean the area needs careful review.

## 14. Pensions and post-employment benefits

Summarise defined benefit and defined contribution pension position where visible.

Include a table:
| Area | View |
|---|---|

Cover deficit/surplus, movement, assumptions, funding and sensitivity where visible.

## 15. Provisions

Summarise provisions, including property, restructuring, onerous contracts, vacant properties and other provisions where visible.

Explain why provisions matter.

## 16. Related-party transactions and group position

Summarise related-party transactions, group balances, parent support, joint ventures, group treasury, intercompany balances and group dependency where visible.

Include a table where figures are visible:
| Item | Current year | Prior year |
|---|---:|---:|

## 17. Capital commitments, guarantees and contingencies

Identify capital commitments, guarantees, contingent liabilities, legal claims, equal pay claims, pension security arrangements and other commitments where visible.

Make clear where outcomes are uncertain.

## 18. Events after the reporting period

State whether any post-balance-sheet events are disclosed.

If none are disclosed, say so plainly.

## 19. Initial RAG assessment

Provide a markdown table with:
| Area | RAG | Reason |
|---|---|---|

Include at least:
- Company identity
- Trading performance
- Audit opinion
- Going concern
- Net current liabilities
- Lease exposure
- Pensions
- Commercial income
- Provisions
- Related parties
- Claims / contingencies
- Cyber / data / technology risk
- Adverse media / sanctions / credit

Use Green, Amber, Red or Grey.

Grey means not assessed from the accounts alone.

## 20. Human-review checklist

Provide a practical checklist of points a human reviewer should verify against the source accounts.

Use bullet points.

## 21. Conclusion

Give a balanced conclusion.

State whether the initial overall view is Green, Amber, Red or mixed, and why.

The conclusion must be realistic, not promotional.

User context:

Company number:
${companyNumber}

Company name:
${companyName || "Not supplied"}

Risk focus:
${riskFocus || "Not supplied"}

Urgency:
${urgencyLevel || "Not supplied"}

User question / need:
${examinationNeed || "Not supplied"}

Source PDF:
${filename}
`.trim();

  console.log("PDF_AGENT_OPENAI_REPORT_STARTED:", {
    model: OPENAI_PDF_MODEL,
    filename,
    bytes: pdfBuffer.length,
    at: new Date().toISOString(),
    build_iso: BUILD_ISO
  });

  const response = await openai.responses.create({
    model: OPENAI_PDF_MODEL,
    max_output_tokens: 12000,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_file",
            filename,
            file_data: `data:application/pdf;base64,${pdfBase64}`
          },
          {
            type: "input_text",
            text: prompt
          }
        ]
      }
    ]
  });

  const reportText = String(response.output_text || "").trim();

  console.log("PDF_AGENT_OPENAI_REPORT_FINISHED:", {
    reportChars: reportText.length,
    success: reportText.length > 500,
    at: new Date().toISOString(),
    build_iso: BUILD_ISO
  });

  return reportText;
}

export async function buildCompanyAccountsPdfReport({
  companyNumber,
  companyName = "",
  riskFocus = "",
  urgencyLevel = "",
  examinationNeed = ""
}) {
  const startedAt = new Date().toISOString();
  const number = normaliseCompanyNumber(companyNumber);

  
  if (!number) {
    return {
      ok: false,
      error: "Company number required.",
      build_iso: BUILD_ISO
    };
  }

  let resolvedCompanyName = String(companyName || "").trim();

  if (!resolvedCompanyName) {
    const companyProfile = await companiesHouseGet(
      `/company/${encodeURIComponent(number)}`
    );

    resolvedCompanyName = companyProfile?.company_name || number;
  }

  try {
    const latestPdf = await fetchLatestAccountsPdf(number);

    const reportText = await buildOpenAiAccountsReport({
      companyNumber: number,
      companyName: resolvedCompanyName,
      riskFocus,
      urgencyLevel,
      examinationNeed,
      pdfBuffer: latestPdf.buffer,
      filename: latestPdf.filename
    });

    return {
      ok: true,
      build_iso: BUILD_ISO,
      generated_at: new Date().toISOString(),
      reportText,
      evidence: {
        company_number: number,
        company_name: resolvedCompanyName || null,
        source: "companies_house_latest_accounts_pdf_agent",
        source_pdf: latestPdf.filename,
        filing_date: latestPdf.filing?.date || null,
        filing_type: latestPdf.filing?.type || null,
        filing_description: latestPdf.filing?.description || null
      },
      audit: {
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        agent: "company_accounts_pdf_agent",
        pdf_loaded: true,
        pdf_stored: "memory_only",
        pdf_bytes: latestPdf.buffer.length,
        pdf_sent_directly_to_openai: true,
        openai_used: true,
        openai_model: OPENAI_PDF_MODEL,
        report_chars: reportText.length,
        build_iso: BUILD_ISO
      }
    };
  } catch (err) {
    console.error("PDF_AGENT_FAILED:", {
      companyNumber: number,
      error: err.message,
      build_iso: BUILD_ISO
    });

    return {
      ok: false,
      error: "Company accounts PDF agent failed.",
      detail: err.message,
      company_number: number,
      build_iso: BUILD_ISO
    };
  }
}
function cleanMarkdownLine(line = "") {
  return String(line || "")
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\-\s+/, "")
    .replace(/\*\*/g, "")
    .trim();
}

function buildReportPdfBuffer({
  companyName,
  companyNumber,
  reportText
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 42
    });

    const chunks = [];

    doc.on("data", chunk => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(15).text("AIVS Company Examiner", { align: "left" });
    doc.moveDown(0.25);
    doc.fontSize(9).text(`Company: ${companyName || "Not supplied"}`);
    doc.fontSize(9).text(`Company number: ${companyNumber || "Not supplied"}`);
    doc.fontSize(8).text(`Generated: ${new Date().toISOString()}`);
    doc.moveDown(1);

    const lines = String(reportText || "").split("\n");

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line) {
        doc.moveDown(0.35);
        continue;
      }

      if (line.startsWith("## ")) {
        doc.moveDown(0.6);
        doc.fontSize(13).text(cleanMarkdownLine(line));
        doc.moveDown(0.2);
        continue;
      }

      if (line.startsWith("### ")) {
        doc.moveDown(0.4);
        doc.fontSize(11).text(cleanMarkdownLine(line));
        doc.moveDown(0.15);
        continue;
      }

      if (line.startsWith("- ")) {
        doc.fontSize(9.5).text(`• ${cleanMarkdownLine(line)}`, {
          indent: 14,
          lineGap: 3
        });
        continue;
      }

      doc.fontSize(9.5).text(cleanMarkdownLine(line), {
        align: "left",
        lineGap: 3
      });
    }

    doc.moveDown(1.5);
    doc.fontSize(8).text(
      "This report is a structured draft requiring human review against the original Companies House filing before reliance.",
      { align: "left" }
    );

    doc.moveDown(0.5);
    doc.fontSize(8).text("(c) AIVS Software Limited copyright 2026. All rights reserved.");

    doc.end();
  });
}

async function buildReportDocxBuffer({
  companyName,
  companyNumber,
  reportText
}) {
  const children = [
    new Paragraph({
      children: [
        new TextRun({
          text: "AIVS Company Examiner",
          bold: true,
          size: 28
        })
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Company: ${companyName || "Not supplied"}`,
          size: 18
        })
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Company number: ${companyNumber || "Not supplied"}`,
          size: 18
        })
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated: ${new Date().toISOString()}`,
          size: 16
        })
      ]
    }),
    new Paragraph("")
  ];

  const lines = String(reportText || "").split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      children.push(new Paragraph(""));
      continue;
    }

    if (line.startsWith("## ")) {
      children.push(
        new Paragraph({
          text: cleanMarkdownLine(line),
          heading: HeadingLevel.HEADING_2
        })
      );
      continue;
    }

    if (line.startsWith("### ")) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: cleanMarkdownLine(line),
              bold: true,
              size: 22
            })
          ]
        })
      );
      continue;
    }

    if (line.startsWith("- ")) {
      children.push(
        new Paragraph({
          text: cleanMarkdownLine(line),
          bullet: {
            level: 0
          }
        })
      );
      continue;
    }

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: cleanMarkdownLine(line),
            size: 20
          })
        ]
      })
    );
  }

  children.push(
    new Paragraph(""),
    new Paragraph({
      children: [
        new TextRun({
          text: "This report is a structured draft requiring human review against the original Companies House filing before reliance.",
          italics: true
        })
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "AIVS Software Limited copyright 2026. All rights reserved."
        })
      ]
    })
  );

  const document = new Document({
    sections: [
      {
        properties: {},
        children
      }
    ]
  });

  return Packer.toBuffer(document);
}

export async function buildAndEmailCompanyAccountsPdfReport({
  companyNumber,
  companyName = "",
  riskFocus = "",
  urgencyLevel = "",
  examinationNeed = "",
  toEmail,
  secondEmail = ""
}) {
  const result = await buildCompanyAccountsPdfReport({
    companyNumber,
    companyName,
    riskFocus,
    urgencyLevel,
    examinationNeed
  });

  if (!result.ok) {
    return result;
  }

  const reportText = String(result.reportText || "").trim();

  if (!reportText) {
    return {
      ok: false,
      error: "Report generated but reportText was empty.",
      build_iso: BUILD_ISO
    };
  }

  const recipients = [toEmail, secondEmail]
    .map((email) => String(email || "").trim())
    .filter(Boolean);

  if (!recipients.length) {
    return {
      ok: false,
      error: "No email recipient supplied.",
      build_iso: BUILD_ISO
    };
  }

  const safeCompany =
    companyName ||
    result.evidence?.company_name ||
    result.evidence?.company_number ||
    "Company";

  const safeCompanyNumber =
    result.evidence?.company_number ||
    companyNumber ||
    "company";

  const pdfFilename = `AIVS_Company_Examiner_Report_${safeCompanyNumber}.pdf`
    .replace(/[^\w.\-]+/g, "_");

  const docxFilename = `AIVS_Company_Examiner_Report_${safeCompanyNumber}.docx`
    .replace(/[^\w.\-]+/g, "_");

  const pdfBuffer = await buildReportPdfBuffer({
    companyName: safeCompany,
    companyNumber: safeCompanyNumber,
    reportText
  });

  const docxBuffer = await buildReportDocxBuffer({
    companyName: safeCompany,
    companyNumber: safeCompanyNumber,
    reportText
  });

  const subject = `AIVS Company Examiner Report - ${safeCompany}`;

  const bodyText = [
    "AIVS Company Examiner report attached.",
    "",
    `Company: ${safeCompany}`,
    `Company number: ${safeCompanyNumber}`,
    `Source PDF: ${result.evidence?.source_pdf || "Latest Companies House accounts PDF"}`,
    `Generated: ${result.generated_at || new Date().toISOString()}`,
    "",
    "Attached files:",
    `- ${pdfFilename}`,
    `- ${docxFilename}`,
    "",
    "This report is a structured draft requiring human review against the original Companies House filing before reliance.",
    "",
    "(c) AIVS Software Limited copyright 2026. All rights reserved."
  ].join("\n");

  const sent = [];

  for (const recipient of recipients) {
    const mailjetResult = await sendResultEmail({
      toEmail: recipient,
      subject,
      bodyText,
      pdfBuffer,
      pdfFilename,
      docxBuffer,
      docxFilename
    });

    sent.push({
      to: recipient,
      status: mailjetResult?.Status || "sent"
    });
  }

  return {
    ok: true,
    build_iso: BUILD_ISO,
    sent_at: new Date().toISOString(),
    company_number: safeCompanyNumber,
    company_name: safeCompany,
    source_pdf: result.evidence?.source_pdf || null,
    report_chars: reportText.length,
    pdfFilename,
    docxFilename,
    sent,
    audit: result.audit || null
  };
}

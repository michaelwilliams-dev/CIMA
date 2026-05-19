// export/mailjetExporter.js
// ISO Timestamp: 2026-05-03T09:45:00Z
// Purpose: Controlled Mailjet export for AIVS Sovereign Company Examiner reports

import Mailjet from "node-mailjet";

function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();

  if (!value) {
    throw new Error(`${name} environment variable is not set.`);
  }

  return value;
}

export async function sendResultEmail({
  toEmail,
  subject,
  bodyText,
  pdfBuffer,
  pdfFilename,
  docxBuffer,
  docxFilename
}) {
  const mailjet = Mailjet.apiConnect(
    requiredEnv("MJ_APIKEY_PUBLIC"),
    requiredEnv("MJ_APIKEY_PRIVATE")
  );

  const attachments = [];

  if (pdfBuffer && pdfFilename) {
    attachments.push({
      ContentType: "application/pdf",
      Filename: pdfFilename,
      Base64Content: pdfBuffer.toString("base64")
    });
  }

  if (docxBuffer && docxFilename) {
    attachments.push({
      ContentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      Filename: docxFilename,
      Base64Content: docxBuffer.toString("base64")
    });
  }

  const message = {
    From: {
      Email: requiredEnv("MAILJET_FROM_EMAIL"),
      Name: process.env.MAILJET_FROM_NAME || "AIVS Software Limited"
    },
    To: [
      {
        Email: toEmail
      }
    ],
    Subject: subject,
    TextPart: bodyText || "",
    Attachments: attachments
  };

  const response = await mailjet
    .post("send", { version: "v3.1" })
    .request({
      Messages: [message]
    });

  return response.body.Messages[0];
}

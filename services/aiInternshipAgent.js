const fs = require('fs');
const pdfParse = require('pdf-parse');
const OpenAI = require('openai');

// NVIDIA NIM API Client (OpenAI-compatible)
const client = new OpenAI({
    baseURL: 'https://integrate.api.nvidia.com/v1',
    apiKey: process.env.NVIDIA_API_KEY || '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',
});

async function ask_agent(pdfPath, studentFullName) {
    try {
       

        const dataBuffer = fs.readFileSync(pdfPath);
        const pdfData = await pdfParse(dataBuffer);
        const extractedText = pdfData.text.trim();

       

        if (extractedText.length < 30) {
            console.log("⚠️ No digital text found. Likely a scanned image PDF.");
            return {
                valid: false,
                chatMessage: "I cannot read scanned image PDFs. Please upload a true digital PDF (e.g., exported directly from Word or a digital signature platform)."
            };
        }

   

        const prompt = `
You are an expert HR and internship document analysis assistant.
The student submitting this internship document is named: "${studentFullName}".

DOCUMENT TEXT:
"""
${extractedText}
"""

TASK:
Carefully analyze the document and extract the following information:

1. **studentName**: The name of the intern/student mentioned in the document.
2. **isStudentMatch**: Compare it to "${studentFullName}". Allow minor differences (reversed name order, accents, abbreviations). Return true/false.
3. **enterpriseName**: The full official name of the company/organization where the internship took place.
4. **department**: The department, team, or service within the company (e.g., "IT Department", "R&D Division"). Return null if not found.
5. **project**: The main project(s) or mission(s) the intern worked on. Summarize in a few words, no need to include project details. Return null if not found.
6. **startDate**: The internship start date. Format as YYYY-MM-DD. Return null if not found.
7. **endDate**: The internship end date. Format as YYYY-MM-DD. Return null if not found.
8. **durationDays**: Leave this as null. It will be calculated automatically by the server logic.
9. **durationMonths**: The exact duration in months explicitly stated in the text (e.g., 3.0, 6.0). Look closely for phrases like "duration of 3 months" or "3 mois". Do NOT calculate this from dates unless it is not written directly in the text at all.
10. **supervisorName**: Name of the company supervisor or tutor who signed the document. Return null if not found.
11. **valid**: true if this is a legitimate internship certificate/attestation/convention, false otherwise.
12. **chatMessage**: A short, friendly summary message explaining what was found or why the document was rejected.

STRICT RULES:
- For **durationMonths**: If the text explicitly says "(duration of 3 months)", you MUST return 3.0. Do not guess or use calendar math to change it.
- All dates MUST be in YYYY-MM-DD format.
- If the document is NOT an internship-related document (e.g., medical certificate, invoice), set "valid": false.
- Do NOT invent or hallucinate any information. If a field is missing, use null.
- Respond ONLY with a single valid JSON object. No markdown, no explanation outside the JSON.

JSON FORMAT:
{
  "valid": true,
  "studentName": "...",
  "isStudentMatch": true,
  "enterpriseName": "...",
  "department": "...",
  "project": "...",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "durationDays": null,
  "durationMonths": 3.0,
  "supervisorName": "...",
  "chatMessage": "..."
}
`;

        const completion = await client.chat.completions.create({
            model: 'meta/llama-3.1-70b-instruct',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.0,
            max_tokens: 1024,
        });

        const aiResponseRaw = completion.choices[0]?.message?.content || '';
        console.log("📦 Raw AI Response:", aiResponseRaw);

        const jsonMatch = aiResponseRaw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No valid JSON found in AI response.");

        const parsedData = JSON.parse(jsonMatch[0]);

        // ── Date Logic & Code Calculations ────────────────────────────────────
        if (parsedData.startDate && parsedData.endDate) {
            const start = new Date(parsedData.startDate);
            const end   = new Date(parsedData.endDate);

            if (end < start) {
                console.log("❌ Date error: endDate is before startDate.");
                return {
                    valid: false,
                    chatMessage: `Invalid dates detected: the end date (${parsedData.endDate}) is before the start date (${parsedData.startDate}). Please check your document.`
                };
            }

            // Always calculate precise days count via code
            const diffMs   = end - start;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
            parsedData.durationDays = diffDays;

            // ONLY fall back to code calculation for months if the AI failed to find a stated text value
            if (parsedData.durationMonths === null || parsedData.durationMonths === undefined) {
               
                parsedData.durationMonths = parseFloat((diffDays / 30.44).toFixed(1));
            } else {
                // Ensure it is a clean float number
                parsedData.durationMonths = parseFloat(parsedData.durationMonths);
              
            }

          
        }
        // ─────────────────────────────────────────────────────────────────────

        return parsedData;

    } catch (err) {
        console.error("❌ Internship Agent Error:", err);
        return {
            valid: false,
            chatMessage: "A technical error occurred while analyzing the internship document. Please try again."
        };
    }
}

module.exports = { ask_agent };
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function generateLessonSummary(lesson) {

    const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `
You are a learning assistant.

Create a short and simple study summary for this lesson.

Lesson title:
${lesson.title}

Lesson description:
${lesson.description}

Rules:
- Keep the summary concise.
- Explain the main concepts learned.
- Use simple language.
- Do not invent information that is not present in the lesson.
- Return only the summary.
        `
    });

    return response.text;
}

module.exports = {
    generateLessonSummary
};
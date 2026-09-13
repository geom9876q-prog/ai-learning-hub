const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

         async function generateLessonSummary(lesson) {

         const response = await ai.models.generateContent({
                model: "gemini-3.8-flash",
                contents: `
                You are a learning assistant helping a student remember what they studied.

                Create a concise learning memory from the lesson below.

                Lesson title:
                ${lesson.title}

                Lesson description:
                ${lesson.description}

                Lesson content:
                ${lesson.content}

                Use exactly this format:

                What you learned:
                Write 1-2 simple sentences explaining what the learner learned.

                Key concepts:
                - List the most important concepts.
                - Keep each point short.

                Important points:
                - Mention important technical details, rules, formulas, or complexity if they are present in the lesson.

                Remember:
                Write one short sentence containing the most important thing the learner should remember.

                Rules:
                - Use ONLY information provided in the lesson.
                - Do not invent information.
                - Use simple language.
                - Keep the entire response concise.
                - Do not add any other sections.
                        `
                    });

            return response.text;
        }
module.exports = {
    generateLessonSummary
};
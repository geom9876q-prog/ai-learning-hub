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

    async function generateLearningPlan(profile,availableLessons,completedLessons) {
    const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",

        contents: `
        You are a personalized learning coach for AI Learning Hub.

        Your job is to create a realistic learning plan for the learner using ONLY the lessons available in the platform.

        LEARNER PROFILE:

        Career goal:
        ${profile.career_goal}

        Motivation:
        ${profile.motivation}

        Current level:
        ${profile.current_level}

        Days available:
        ${profile.days_to_goal}

        Daily study time:
        ${profile.daily_study_minutes} minutes


        AVAILABLE LESSONS:

        ${JSON.stringify(availableLessons, null, 2)}


        LESSONS ALREADY COMPLETED:

        ${JSON.stringify(completedLessons, null, 2)}


        INSTRUCTIONS:

        1. Create a personalized learning plan based on the learner's career goal, level, available time and available days.

        2. Use ONLY lessons from AVAILABLE LESSONS.

        3. Do NOT invent courses or lessons.

        4. Do NOT recommend lessons that are already completed.

        5. Organize the learning plan in a logical order.

        6. Prioritize lessons that are most relevant to the learner's career goal.

        7. Keep the daily workload realistic according to the learner's daily study time.

        8. Include revision and practice when appropriate.

        9. Explain briefly why each major learning step is useful for the learner's goal.

        10. Return only the learning plan.
                `
            });

            return response.text;
}
        
module.exports = {
    generateLessonSummary,
    generateLearningPlan
};
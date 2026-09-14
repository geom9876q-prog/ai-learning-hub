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

    async function generateRecoveryPlan(profile,weakAreas,learningMemory) {

    const response = await ai.models.generateContent({

        model: "gemini-3.8-flash",

        contents: `
        You are an AI learning recovery coach.

        Your job is to help a learner recover from concepts they are struggling with.

        LEARNER PROFILE:

        Career goal:
        ${profile.career_goal}

        Motivation:
        ${profile.motivation}

        Current level:
        ${profile.current_level}

        Daily study time:
        ${profile.daily_study_minutes} minutes


        WEAK AREAS:

        ${JSON.stringify(weakAreas, null, 2)}


        LEARNING MEMORY:

        ${JSON.stringify(learningMemory, null, 2)}


        INSTRUCTIONS:

        1. Identify the learner's main weak concepts using the provided weak areas.

        2. Use the learning memory to understand what the learner has already studied.

        3. Create a short recovery plan focused on the weak areas.

        4. Do not recommend concepts that are unrelated to the weak areas.

        5. Use only information provided in the learner data.

        6. Keep the recovery plan realistic for the learner's available study time.

        7. Include:
        - What the learner should review
        - What they should practice
        - What they should do next

        8. Explain briefly why the recovery step is useful.

        9. Use simple language.

        10. Do not invent courses, lessons, scores, or learner information.

        11. Return only the recovery plan.
                `
            });

    return response.text;
}
        
module.exports = {
    generateLessonSummary,
    generateLearningPlan,
    generateRecoveryPlan
};
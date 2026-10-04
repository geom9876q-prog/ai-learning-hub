const { GoogleGenAI } = require("@google/genai");
const Groq = require("groq-sdk");


// =========================
// GEMINI
// =========================

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});


// =========================
// GROQ
// =========================

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});


// =========================
// COMMON AI FUNCTION
// =========================

async function generateAIText(prompt) {

    // -------------------------
    // TRY GEMINI FIRST
    // -------------------------

    try {

        const response =
            await ai.models.generateContent({
                model: "gemini-3.6-flash",
                contents: prompt
            });

        console.log(
            "AI response generated using Gemini"
        );

        return response.text;

    } catch (geminiError) {

        console.log(
            "Gemini failed. Trying Groq..."
        );

        console.log(
            "Gemini error:",
            geminiError.message
        );

    }


    // -------------------------
    // TRY GROQ
    // -------------------------

    try {

            const response =
    await groq.chat.completions.create({
        model: "openai/gpt-oss-20b",

        messages: [
            {
                role: "user",
                content: prompt
            }
        ]
    });

                console.log(
                    "AI response generated using Groq"
                );

                const result =
                    response.choices[0].message.content;

                console.log(
                    "Groq response:",
                    result
                );

                return result;


    } catch (groqError) {

        console.log(
            "Groq also failed:",
            groqError.message
        );

        throw new Error(
            "Both Gemini and Groq AI services are unavailable."
        );

    }

}


// =====================================================
// GENERATE LESSON SUMMARY
// =====================================================

async function generateLessonSummary(lesson) {

    const prompt = `

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

    `;


    return await generateAIText(prompt);

}


// =====================================================
// GENERATE LEARNING PLAN
// =====================================================

async function generateLearningPlan(
    profile,
    availableLessons,
    completedLessons
) {

    const prompt = `

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

    `;


    return await generateAIText(prompt);

}


// =====================================================
// GENERATE RECOVERY PLAN
// =====================================================

async function generateRecoveryPlan(
    profile,
    weakAreas,
    learningMemory
) {

    const prompt = `

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

    `;


    return await generateAIText(prompt);

}


// =====================================================
// GENERATE RETENTION QUIZ
// =====================================================

async function generateRetentionQuiz(lesson) {

    const prompt = `

    You are an AI learning assistant.

    The learner studied the following lesson more than 30 days ago.

    Lesson title:
    ${lesson.title}

    Lesson description:
    ${lesson.description || ""}

    Lesson content:
    ${lesson.content || ""}

    Create a short retention revision session.

    Requirements:

    1. Create concise revision notes covering the most important concepts.

    2. Create exactly 3 multiple-choice questions.

    3. Questions should test understanding, not just memorization.

    4. Each question must have exactly 4 options.

    5. Provide the correct option.

    6. Use ONLY the information from the lesson.

    7. Do not introduce concepts that are not present in the lesson.

    Return ONLY valid JSON in this exact structure:

    {
        "notes": "...",
        "questions": [
            {
                "question": "...",
                "option_a": "...",
                "option_b": "...",
                "option_c": "...",
                "option_d": "...",
                "correct_option": "A"
            }
        ]
    }

    `;


    let text =
        await generateAIText(prompt);


    // Remove markdown code fences
    // in case AI returns ```json ... ```

    text = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();


    return JSON.parse(text);

}


// =====================================================
// EXPORT
// =====================================================

module.exports = {

    generateLessonSummary,

    generateLearningPlan,

    generateRecoveryPlan,

    generateRetentionQuiz

};
require("dotenv").config();

const { generateLearningPlan } = require("./aiService");

async function testAI() {

    const profile = {
        career_goal: "Become a backend developer",
        motivation: "I want to prepare for software engineering placements",
        current_level: "Beginner",
        days_to_goal: 60,
        daily_study_minutes: 120
    };

    try {

        const plan = await generateLearningPlan(profile);

        console.log("AI LEARNING PLAN:");
        console.log(plan);

    } catch (error) {

        console.error("AI ERROR:");
        console.error(error.message);

    }
}

testAI();
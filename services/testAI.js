require("dotenv").config();

const { generateLessonSummary } = require("./aiService");

async function testAI() {

    const lesson = {
        title: "Arrays Basics",
        description: "Learn how arrays store multiple values and how to access elements using indexes."
    };

    try {

        const summary = await generateLessonSummary(lesson);

        console.log("AI SUMMARY:");
        console.log(summary);

    } catch (error) {

        console.error("AI ERROR:");
        console.error(error.message);

    }
}

testAI();
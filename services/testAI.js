require("dotenv").config();

const { generateLearningPlan,
        generateRetentionQuiz
 } = require("./aiService");

  async function testRetentionQuiz() {

    const lesson = {
        title: "Binary Search",
        description: "Searching for an element in a sorted array.",
        content: `
        Binary Search works on a sorted array.
        It compares the target with the middle element.
        If the target is smaller, search the left half.
        If the target is larger, search the right half.
        The time complexity is O(log n).
        `
    };

    const result = await generateRetentionQuiz(lesson);

    console.log(JSON.stringify(result, null, 2));
}

testRetentionQuiz();
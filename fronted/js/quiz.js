
const API_URL = "http://localhost:3000/api/lessons";
const COURSE_API_URL = "http://localhost:3000/api/courses";

const token = localStorage.getItem("token");

const params = new URLSearchParams(window.location.search);
const lessonId = params.get("id");
const quizType = params.get("type");

let quizId = null;
let dsaQuiz = null;

// =========================
// CHECK LOGIN
// =========================

if (!token) {
    window.location.href = "login.html";
}

// =========================
// ESCAPE HTML
// =========================

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// =========================
// LOAD EXISTING LESSON QUIZ
// =========================

async function loadQuiz() {
    try {
        const response = await fetch(
            `${API_URL}/${lessonId}/quiz`,
            {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to load quiz");
        }

        const quiz = data.quiz;
        quizId = quiz.id;

        document.getElementById("quizTitle").textContent = quiz.title;

        const container = document.getElementById("quizContainer");

        if (!quiz.questions.length) {
            container.innerHTML = "<p>No questions available.</p>";
            return;
        }

        container.innerHTML = quiz.questions.map((question, index) => `
            <div class="dashboard-card">
                <h3>${index + 1}. ${escapeHTML(question.question)}</h3>

                <label>
                    <input type="radio" name="question-${question.id}" value="A">
                    ${escapeHTML(question.option_a)}
                </label>
                <br><br>

                <label>
                    <input type="radio" name="question-${question.id}" value="B">
                    ${escapeHTML(question.option_b)}
                </label>
                <br><br>

                <label>
                    <input type="radio" name="question-${question.id}" value="C">
                    ${escapeHTML(question.option_c)}
                </label>
                <br><br>

                <label>
                    <input type="radio" name="question-${question.id}" value="D">
                    ${escapeHTML(question.option_d)}
                </label>
            </div>
        `).join("");

    } catch (error) {
        console.error(error);

        document.getElementById("quizTitle").textContent =
            "Unable to load quiz";

        document.getElementById("quizContainer").textContent =
            error.message;
    }
}

// =========================
// SUBMIT EXISTING LESSON QUIZ
// =========================

async function submitQuiz() {
    const answers = {};

    document.querySelectorAll("#quizContainer .dashboard-card")
        .forEach(questionCard => {
            const selected = questionCard.querySelector(
                'input[type="radio"]:checked'
            );

            if (selected) {
                const questionId = selected.name.replace("question-", "");
                answers[questionId] = selected.value;
            }
        });

    const button = document.getElementById("submitQuizBtn");

    button.disabled = true;
    button.textContent = "Submitting...";

    try {
        const response = await fetch(
            `${API_URL}/${lessonId}/quiz/submit`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ answers })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to submit quiz");
        }

        const result = data.result;

        document.getElementById("quizMessage").textContent =
            `Quiz Completed! Score: ${result.score}/${result.total_questions}. ` +
            `Percentage: ${result.percentage}%`;

        button.textContent = "Quiz Submitted";

    } catch (error) {
        console.error(error);

        document.getElementById("quizMessage").textContent =
            error.message;

        button.disabled = false;
        button.textContent = "Submit Quiz";
    }
}

// =========================
// LOAD AI-GENERATED DSA QUIZ
// =========================

async function loadDSAQuiz() {
    try {
        dsaQuiz = JSON.parse(
            sessionStorage.getItem("dsaQuiz") || "null"
        );

        if (!dsaQuiz || !Array.isArray(dsaQuiz.questions) ||
            dsaQuiz.questions.length === 0) {
            throw new Error("Quiz data is missing. Generate a new quiz.");
        }

        document.getElementById("quizTitle").textContent =
            dsaQuiz.title;

        const container = document.getElementById("quizContainer");

        container.innerHTML = dsaQuiz.questions.map((question, index) => `
            <div class="dashboard-card">
                <h3>${index + 1}. ${escapeHTML(question.question)}</h3>

                ${["a", "b", "c", "d"].map(letter => `
                    <label>
                        <input
                            type="radio"
                            name="question-${question.id}"
                            value="${letter.toUpperCase()}">
                        ${escapeHTML(question["option_" + letter])}
                    </label>
                    <br><br>
                `).join("")}
            </div>
        `).join("");

    } catch (error) {
        console.error(error);

        document.getElementById("quizTitle").textContent =
            "Unable to load quiz";

        document.getElementById("quizContainer").textContent =
            error.message;
    }
}

// =========================
// SUBMIT DSA QUIZ
// =========================

async function submitDSAQuiz() {
    if (!dsaQuiz) {
        document.getElementById("quizMessage").textContent =
            "Quiz data is missing. Generate a new quiz.";
        return;
    }

    const itemId = params.get("itemId");

    if (!itemId) {
        document.getElementById("quizMessage").textContent =
            "DSA topic ID is missing.";
        return;
    }

    const answers = {};

    dsaQuiz.questions.forEach(question => {
        const selected = document.querySelector(
            `input[name="question-${question.id}"]:checked`
        );

        if (selected) {
            answers[question.id] = selected.value;
        }
    });

    const button = document.getElementById("submitQuizBtn");

    button.disabled = true;
    button.textContent = "Submitting...";

    try {
        const response = await fetch(
            `${COURSE_API_URL}/learning-items/${itemId}/quiz/${dsaQuiz.id}/submit`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ answers })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to submit DSA quiz");
        }

        const result = data.result;

        document.getElementById("quizMessage").textContent =
            `Quiz Completed! Score: ${result.score}/${result.total_questions}. ` +
            `Percentage: ${result.percentage}%`;

        button.textContent = "Quiz Submitted";

    } catch (error) {
        console.error(error);

        document.getElementById("quizMessage").textContent =
            error.message;

        button.disabled = false;
        button.textContent = "Submit Quiz";
    }
}

// =========================
// LOGOUT
// =========================

document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "login.html";
});

// =========================
// SUBMIT BUTTON
// =========================

document.getElementById("submitQuizBtn").addEventListener("click", () => {
    if (quizType === "dsa") {
        submitDSAQuiz();
    } else {
        submitQuiz();
    }
});

// =========================
// START
// =========================

if (quizType === "dsa") {
    loadDSAQuiz();
} else if (!lessonId) {
    document.getElementById("quizTitle").textContent = "Quiz not found";
} else {
    loadQuiz();
}

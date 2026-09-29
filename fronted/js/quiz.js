const API_URL = "http://localhost:3000/api/lessons";

const token = localStorage.getItem("token");


// =========================
// CHECK LOGIN
// =========================

if (!token) {

    window.location.href = "login.html";

}


// =========================
// GET LESSON ID
// =========================

const params =
    new URLSearchParams(window.location.search);

const lessonId =
    params.get("id");


// =========================
// QUIZ DATA
// =========================

let quizId = null;


// =========================
// LOAD QUIZ
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

            throw new Error(
                data.message || "Failed to load quiz"
            );

        }

        const quiz = data.quiz;

        quizId = quiz.id;

        document.getElementById("quizTitle").textContent =
            quiz.title;


        const container =
            document.getElementById("quizContainer");


        if (quiz.questions.length === 0) {

            container.innerHTML = `
                <p>No questions available.</p>
            `;

            return;
        }


        container.innerHTML =
            quiz.questions.map((question, index) => `

                <div class="dashboard-card">

                    <h3>
                        ${index + 1}. ${question.question}
                    </h3>

                    <label>
                        <input
                            type="radio"
                            name="question-${question.id}"
                            value="A">

                        ${question.option_a}
                    </label>

                    <br><br>

                    <label>
                        <input
                            type="radio"
                            name="question-${question.id}"
                            value="B">

                        ${question.option_b}
                    </label>

                    <br><br>

                    <label>
                        <input
                            type="radio"
                            name="question-${question.id}"
                            value="C">

                        ${question.option_c}
                    </label>

                    <br><br>

                    <label>
                        <input
                            type="radio"
                            name="question-${question.id}"
                            value="D">

                        ${question.option_d}
                    </label>

                </div>

            `).join("");


    } catch (error) {

        console.error(error);

        document.getElementById("quizTitle").textContent =
            "Unable to load quiz";

        document.getElementById("quizContainer").innerHTML =
            `<p>${error.message}</p>`;

    }

}


// =========================
// SUBMIT QUIZ
// =========================

async function submitQuiz() {

    const answers = {};

    const questions =
        document.querySelectorAll(
            "#quizContainer .dashboard-card"
        );


    questions.forEach((questionCard) => {

        const selected =
            questionCard.querySelector(
                'input[type="radio"]:checked'
            );

        if (selected) {

            const questionId =
                selected.name.replace(
                    "question-",
                    ""
                );

            answers[questionId] =
                selected.value;

        }

    });


    try {

        const button =
            document.getElementById("submitQuizBtn");

        button.disabled = true;

        button.textContent =
            "Submitting...";


        const response = await fetch(
            `${API_URL}/${lessonId}/quiz/submit`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },

                body: JSON.stringify({
                    answers: answers
                })
            }
        );


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                data.message || "Failed to submit quiz"
            );

        }


        const result =
            data.result;


        document.getElementById("quizMessage").innerHTML = `

            <strong>
                Quiz Completed!
            </strong>

            <br>

            Score:
            ${result.score}/${result.total_questions}

            <br>

            Percentage:
            ${result.percentage}%

        `;


        button.textContent =
            "Quiz Submitted";


    } catch (error) {

        console.error(error);

        document.getElementById("quizMessage").textContent =
            error.message;

        document.getElementById("submitQuizBtn").disabled =
            false;

        document.getElementById("submitQuizBtn").textContent =
            "Submit Quiz";

    }

}


// =========================
// LOGOUT
// =========================

document
    .getElementById("logoutBtn")
    .addEventListener("click", () => {

        localStorage.removeItem("token");

        window.location.href = "login.html";

    });


// =========================
// BUTTON EVENT
// =========================

document
    .getElementById("submitQuizBtn")
    .addEventListener(
        "click",
        submitQuiz
    );


// =========================
// START
// =========================

if (!lessonId) {

    document.getElementById("quizTitle").textContent =
        "Quiz not found";

} else {

    loadQuiz();

}
const API_URL = "http://localhost:3000/api/users";

const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "login.html";
}


const params =
    new URLSearchParams(window.location.search);

const lessonId =
    params.get("id");


let questions = [];


// LOAD RETENTION SESSION

async function loadRetentionSession() {

    try {

        const response = await fetch(
            `${API_URL}/retention-session/${lessonId}`,
            {
                method: "POST",

                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Failed to generate retention session"
            );

        }


        // Lesson title

        document.getElementById(
            "lessonTitle"
        ).textContent =
            data.lesson.title;


        // AI notes

        document.getElementById(
            "retentionNotes"
        ).innerHTML = `
            <p>
                ${data.notes}
            </p>
        `;


        // Questions

        questions =
            data.questions;


        renderQuestions();

    } catch (error) {

        console.error(error);

        document.getElementById(
            "lessonTitle"
        ).textContent =
            "Retention Check";


        document.getElementById(
            "questionsContainer"
        ).innerHTML = `
            <p>
                ${error.message}
            </p>
        `;

    }
}



// RENDER QUESTIONS

function renderQuestions() {

    const container =
        document.getElementById(
            "questionsContainer"
        );


    container.innerHTML =
        questions.map((question, index) => `

            <div class="quiz-question">

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


                <br>


                <label>
                    <input
                        type="radio"
                        name="question-${question.id}"
                        value="B">

                    ${question.option_b}
                </label>


                <br>


                <label>
                    <input
                        type="radio"
                        name="question-${question.id}"
                        value="C">

                    ${question.option_c}
                </label>


                <br>


                <label>
                    <input
                        type="radio"
                        name="question-${question.id}"
                        value="D">

                    ${question.option_d}
                </label>

            </div>

        `).join("");
}



// SUBMIT RETENTION CHECK

async function submitRetentionCheck() {

    const answers = [];


    for (const question of questions) {

        const selected =
            document.querySelector(
                `input[name="question-${question.id}"]:checked`
            );


        if (!selected) {

            alert(
                "Please answer all questions."
            );

            return;
        }


        answers.push({
            question_id: question.id,
            answer: selected.value
        });

    }


    const button =
        document.getElementById(
            "submitRetentionBtn"
        );


    const resultMessage =
        document.getElementById(
            "resultMessage"
        );


    try {

        button.disabled = true;

        button.textContent =
            "Submitting...";


        const response = await fetch(
            `${API_URL}/retention-session/${lessonId}/submit`,
            {
                method: "POST",

                headers: {
                    "Authorization": `Bearer ${token}`,

                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    answers: answers
                })
            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Failed to submit retention check"
            );

        }


        const score =
            data.result.score;

        const total =
            data.result.total_questions;


        resultMessage.innerHTML = `
            <strong>
                Retention Check Complete
            </strong>

            <p>
                Score: ${score}/${total}
            </p>
        `;


        button.textContent =
            "Completed";


        // Disable all answers

        document
            .querySelectorAll(
                "#questionsContainer input"
            )
            .forEach(input => {
                input.disabled = true;
            });


    } catch (error) {

        console.error(error);

        resultMessage.textContent =
            error.message;

        button.disabled = false;

        button.textContent =
            "Submit Retention Check";

    }

}



// BUTTON EVENT

document
    .getElementById(
        "submitRetentionBtn"
    )
    .addEventListener(
        "click",
        submitRetentionCheck
    );



// LOGOUT

document
    .getElementById("logoutBtn")
    .addEventListener("click", () => {

        localStorage.removeItem("token");

        window.location.href =
            "login.html";

    });



// CHECK LESSON ID

if (!lessonId) {

    document.getElementById(
        "lessonTitle"
    ).textContent =
        "Retention lesson not found";

} else {

    loadRetentionSession();

}
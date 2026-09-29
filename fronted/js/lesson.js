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
// LOAD LESSON
// =========================

async function loadLesson() {

    try {
            
         const response = await fetch(
                `${API_URL}/${lessonId}`,
                {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                }
            );
       

        const data = await response.json();

        if (!response.ok) {

            throw new Error(
                data.message || "Failed to load lesson"
            );

        }

        const lesson = data.lesson;
        const completed = data.completed;

        if (completed) {

                const button =
                    document.getElementById("completeLessonBtn");

                button.textContent = "✓ Lesson Completed";
                button.disabled = true;

                document.getElementById("completionMessage").textContent =
                    "You have already completed this lesson.";

            }

        document.getElementById("lessonTitle").textContent =
            lesson.title;

        document.getElementById("lessonDescription").textContent =
            lesson.description || "No description available.";

            document.getElementById("lessonContent").innerHTML = `

                <p>
                    ${lesson.content || "No lesson content available."}
                </p>

                ${
                    lesson.learning_memory
                        ? `
                            <hr>

                            <h3>Your Learning Memory</h3>

                            <p>
                                ${data.learning_memory || "Learning memory is not available yet."}
                            </p>
                        `
                        : ""
                }

            `;

        

    } catch (error) {

        console.error(error);

        document.getElementById("lessonTitle").textContent =
            "Unable to load lesson";

        document.getElementById("lessonDescription").textContent =
            error.message;

    }

}


// =========================
// COMPLETE LESSON
// =========================

async function completeLesson() {

    const message =
        document.getElementById("completionMessage");

    const button =
        document.getElementById("completeLessonBtn");

    try {

        button.disabled = true;

        button.textContent = "Completing...";

        const response = await fetch(
            `${API_URL}/${lessonId}/complete`,
            {
                method: "POST",

                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {

            throw new Error(
                data.message || "Failed to complete lesson"
            );

        }

        message.textContent =
            "Lesson completed successfully!";

        button.textContent =
            "Lesson Completed";

        document.getElementById("lessonContent").innerHTML += `

            <hr>

            <h3>Your Learning Memory</h3>

            <p>
                ${data.learning_memory}
            </p>

        `;

    } catch (error) {

        console.error(error);

        message.textContent =
            error.message;

        button.disabled = false;

        button.textContent =
            "Mark Lesson Complete";

    }

}


// =========================
// BUTTON EVENT
// =========================

document
    .getElementById("completeLessonBtn")
    .addEventListener("click", completeLesson);


// =========================
// START
// =========================

if (!lessonId) {

    document.getElementById("lessonTitle").textContent =
        "Lesson not found";

} else {

    loadLesson();

}

function openQuiz() {

    window.location.href =
        `quiz.html?id=${lessonId}`;

}
document
    .getElementById("quizBtn")
    .addEventListener(
        "click",
        openQuiz
    );
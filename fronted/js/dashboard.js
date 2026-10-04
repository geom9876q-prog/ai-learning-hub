const API_URL = "http://localhost:3000/api/users";

const token = localStorage.getItem("token");


// =========================
// CHECK LOGIN
// =========================

if (!token) {

    window.location.href = "login.html";

}


// =========================
// COMMON API FUNCTION
// =========================

async function fetchAPI(endpoint) {

    const response = await fetch(`${API_URL}${endpoint}`, {

        headers: {
            "Authorization": `Bearer ${token}`
        }

    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Request failed");
    }

    return data;
}

// =========================
// WHERE I LEFT OFF
// =========================
 async function loadWhereILeftOff() {

    const container =
        document.getElementById("whereLeftOff");

    try {

        const data =
            await fetchAPI("/where-i-left-off");

        const lesson =
            data.where_i_left_off;


        container.innerHTML = `

            <h3>
                ${lesson.lesson_title}
            </h3>

            <p>
                Course: ${lesson.course_title}
            </p>

            <p>
                ${lesson.summary ||
                "Learning memory available."}
            </p>

            <button
                class="auth-btn"
                onclick="continueLesson(
                    ${lesson.lesson_id}
                )">

                Continue Lesson

            </button>

        `;

    } catch (error) {

        container.innerHTML =
            `<p>${error.message}</p>`;

    }
}

function continueLesson(lessonId) {

    window.location.href =
        `lesson.html?id=${lessonId}`;

}

// =========================
// NEXT RECOMMENDATION
// =========================

async function loadRecommendation() {

    const container =
        document.getElementById("recommendation");

    try {

        const data =
            await fetchAPI("/next-recommendation");

        const recommendation =
            data.recommendation;


        if (!recommendation) {

            container.innerHTML = `
                <p>
                    You have completed all available lessons.
                </p>
            `;

            return;
        }


        let buttonText =
            "Open Lesson";


        if (recommendation.type === "next_lesson") {

            buttonText =
                "Start Lesson";

        }


        container.innerHTML = `

            <h3>
                ${recommendation.lesson_title}
            </h3>

            <p>
                ${recommendation.reason ||
                "Continue with this lesson."}
            </p>

            <button
                class="auth-btn"
                onclick="openRecommendedLesson(
                    ${recommendation.lesson_id}
                )">

                ${buttonText}

            </button>

        `;


    } catch (error) {

        container.innerHTML = `
            <p>${error.message}</p>
        `;

    }
}

function openRecommendedLesson(lessonId) {

    window.location.href =
        `lesson.html?id=${lessonId}`;

}

// =========================
// MY COURSES
// =========================

async function loadMyCourses() {

    const container = document.getElementById("myCourses");

    try {

        const data = await fetchAPI("/my-courses");

        const courses = data.courses;

        if (courses.length === 0) {

            container.innerHTML = `
                <p>You are not enrolled in any courses yet.</p>
            `;

            return;
        }

        container.innerHTML = courses.map(course => `

            <div class="course-card">

                <h3>
                    ${course.title}
                </h3>

                <p>
                    ${course.description || "No description available."}
                </p>

                <div class="progress-bar">

                    <div
                        class="progress-fill"
                        style="width: ${course.completed_percentage}%">
                    </div>

                </div>

                <p class="progress-text">
                    ${course.completed_percentage}% completed
                </p>

                <button
                    class="auth-btn"
                    onclick="openCourse(${course.id})">
                    Open Course
                </button>

            </div>

        `).join("");

       
    } catch (error) {

        container.innerHTML = `
            <p>${error.message}</p>
        `;

    }
}

    function openCourse(courseId) {

        window.location.href =
            `course.html?id=${courseId}`;

    }

// =========================
// LEARNING RECOVERY
// =========================

async function loadLearningRecovery() {

    const container =
        document.getElementById("learningRecovery");

    try {

        // Get weak areas only
        // This does NOT call Gemini

        const data =
            await fetchAPI("/weak-areas");


        const weakAreas =
            data.weak_areas;


        // No weak areas

        if (!weakAreas || weakAreas.length === 0) {

            container.innerHTML = `
                <p>
                    No weak areas detected.
                    Keep learning!
                </p>
            `;

            return;
        }


        // Show weak areas

        container.innerHTML = `

            <h3>
                Topics that need attention
            </h3>

            ${weakAreas.map(area => `

                <div style="margin-top: 15px;">

                    <strong>
                        ${area.lesson_title}
                    </strong>

                    <p>
                        Quiz score:
                        ${area.score}/${area.total_questions}
                        (${area.percentage}%)
                    </p>

                    <button
                        class="auth-btn"
                        onclick="openRecoveryLesson(
                            ${area.lesson_id}
                        )">

                        Review This Topic

                    </button>

                </div>

            `).join("")}


            <hr style="margin: 25px 0;">


            <h3>
                Need help recovering?
            </h3>

            <p>
                Generate a personalized recovery plan
                based on your weak areas.
            </p>

            <button
                id="generateRecoveryBtn"
                class="auth-btn"
                onclick="generateRecoveryPlan()">

                Generate Recovery Plan

            </button>

            <div
                id="recoveryPlan"
                style="margin-top: 20px;">
            </div>

        `;

    } catch (error) {

        container.innerHTML =
            `<p>${error.message}</p>`;

    }
}

async function generateRecoveryPlan() {

    const button =
        document.getElementById(
            "generateRecoveryBtn"
        );

    const container =
        document.getElementById(
            "recoveryPlan"
        );

    try {

        button.disabled = true;

        button.textContent =
            "Generating...";


        // THIS is where Gemini/Groq is called

        const data =
            await fetchAPI("/learning-recovery");

                    console.log(
            "Recovery API response:",
            data
        );


        if (!data.learning_recovery) {

            container.innerHTML = `
                <p>
                    No recovery plan is available.
                </p>
            `;

            return;
        }


        container.innerHTML = `

            <h3>
                Your Recovery Plan
            </h3>

            <p>
                ${data.learning_recovery}
            </p>

        `;

        button.textContent =
            "Regenerate Recovery Plan";


    } catch (error) {

        container.innerHTML = `
            <p>
                ${error.message}
            </p>
        `;

        button.disabled = false;

        button.textContent =
            "Generate Recovery Plan";

    }

}

function openRecoveryLesson(lessonId) {

    window.location.href =
        `lesson.html?id=${lessonId}`;

}

// =========================
// RETENTION CHECK
// =========================
async function loadRetentionCheck() {
    const container =
        document.getElementById("retentionCheck");

    try {
        const data =
            await fetchAPI("/retention-check");

        const lessons =
            data.lessons_due_for_review;

        if (lessons.length === 0) {
            container.innerHTML = `
                <p>
                    No retention checks are due right now.
                </p>
            `;
            return;
        }

        container.innerHTML = `
            <p>
                You have ${lessons.length}
                lesson(s) due for a retention check.
            </p>

            ${lessons.map(lesson => `
                <div style="margin-top: 15px;">

                    <strong>
                        ${lesson.lesson_title}
                    </strong>

                    <p>
                        This topic is due for a short
                        retention check.
                    </p>

                    <button
                        class="auth-btn"
                        onclick="startRetentionCheck(
                            ${lesson.lesson_id}
                        )">
                        Start Retention Check
                    </button>

                </div>
            `).join("")}
        `;
    } catch (error) {
        container.innerHTML =
            `<p>${error.message}</p>`;
    }
}

// =========================
// LOAD DASHBOARD
// =========================

loadWhereILeftOff();
loadRecommendation();
loadMyCourses();
loadLearningRecovery();
loadRetentionCheck();


// =========================
// LOGOUT
// =========================

document.getElementById("logoutBtn").addEventListener("click", () => {

    localStorage.removeItem("token");

    window.location.href = "login.html";

});
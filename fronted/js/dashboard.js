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

    const container = document.getElementById("whereLeftOff");

    try {

        const data = await fetchAPI("/where-i-left-off");

        const lesson = data.where_i_left_off;

        container.innerHTML = `
            <h3>${lesson.lesson_title}</h3>

            <p>
                Course: ${lesson.course_title}
            </p>

            <p>
                ${lesson.summary || "Learning memory available."}
            </p>
        `;

    } catch (error) {

        container.innerHTML = `
            <p>${error.message}</p>
        `;

    }
}

// =========================
// NEXT RECOMMENDATION
// =========================

async function loadRecommendation() {

    const container = document.getElementById("recommendation");

    try {

        const data = await fetchAPI("/next-recommendation");

        const recommendation = data.recommendation;

        if (!recommendation) {

            container.innerHTML = `
                <p>You have completed all available lessons.</p>
            `;

            return;
        }

        container.innerHTML = `
            <h3>${recommendation.lesson_title}</h3>

            <p>
                ${recommendation.reason || "Continue with this lesson."}
            </p>
        `;

    } catch (error) {

        container.innerHTML = `
            <p>${error.message}</p>
        `;

    }
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

    const container = document.getElementById("learningRecovery");

    try {

        const data = await fetchAPI("/learning-recovery");

        container.innerHTML = `
            <p>
                ${data.recovery_plan || "No recovery plan available."}
            </p>
        `;

    } catch (error) {

        container.innerHTML = `
            <p>${error.message}</p>
        `;

    }
}

// =========================
// RETENTION CHECK
// =========================

async function loadRetentionCheck() {

    const container = document.getElementById("retentionCheck");

    try {

        const data = await fetchAPI("/retention-check");

        const lessons = data.lessons_due_for_review;

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

                </div>

            `).join("")}

        `;

    } catch (error) {

        container.innerHTML = `
            <p>${error.message}</p>
        `;

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
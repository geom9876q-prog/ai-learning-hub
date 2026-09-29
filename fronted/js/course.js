const API_URL = "http://localhost:3000/api/users";
const COURSE_API_URL = "http://localhost:3000/api/courses";

const token = localStorage.getItem("token");


// =========================
// CHECK LOGIN
// =========================

if (!token) {
    window.location.href = "login.html";
}


// =========================
// GET COURSE ID
// =========================

const params = new URLSearchParams(window.location.search);

const courseId = params.get("id");


// =========================
// LOAD COURSE
// =========================

async function loadCourse() {

    try {

        const response = await fetch(
            `${COURSE_API_URL}/${courseId}`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to load course"
            );
        }

        document.getElementById("courseTitle").textContent =
            data.course.title;

        document.getElementById("courseDescription").textContent =
            data.course.description || "No description available.";

    } catch (error) {

        console.error(error);

        document.getElementById("courseTitle").textContent =
            "Unable to load course";

        document.getElementById("courseDescription").textContent =
            error.message;
    }
}


// =========================
// LOAD LESSONS
// =========================

async function loadLessons() {

    const container =
        document.getElementById("lessonsContainer");

    try {

        const response = await fetch(
            `${COURSE_API_URL}/${courseId}/lessons`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to load lessons"
            );
        }

        const lessons = data.lessons;

        if (lessons.length === 0) {

            container.innerHTML = `
                <p>No lessons available for this course.</p>
            `;

            return;
        }

        container.innerHTML = lessons.map((lesson, index) => `

            <div class="course-card">

                <p class="section-tag">
                    LESSON ${index + 1}
                </p>

                <h3>
                    ${lesson.title}
                </h3>

                <p>
                    ${lesson.description || "No description available."}
                </p>

                <button
                    class="auth-btn"
                    onclick="openLesson(${lesson.id})">
                    Open Lesson
                </button>

            </div>

        `).join("");

    } catch (error) {

        console.error(error);

        container.innerHTML = `
            <p>${error.message}</p>
        `;
    }
}


// =========================
// OPEN LESSON
// =========================

function openLesson(lessonId) {

    window.location.href =
        `lesson.html?id=${lessonId}`;
}


// =========================
// LOGOUT
// =========================

document.getElementById("logoutBtn").addEventListener(
    "click",
    () => {

        localStorage.removeItem("token");

        window.location.href = "login.html";

    }
);


// =========================
// START
// =========================

if (!courseId) {

    document.getElementById("courseTitle").textContent =
        "Course not found";

} else {

    loadCourse();
    loadLessons();

}
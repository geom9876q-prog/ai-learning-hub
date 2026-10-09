const API_URL = "http://localhost:3000/api/users";
const COURSE_API_URL = "http://localhost:3000/api/courses";

const token = localStorage.getItem("token");
let currentParentId = null;


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
// LOAD COURSE CONTENT
// =========================

async function loadContent(parentId = null) {

    currentParentId = parentId;

    const container =
        document.getElementById("lessonsContainer");

    try {

        let url =
            `${COURSE_API_URL}/${courseId}/content`;

        if (parentId !== null) {
            url += `?parent_id=${parentId}`;
        }

        // Get content
        const contentResponse = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const contentData = await contentResponse.json();

        if (!contentResponse.ok) {
            throw new Error(
                contentData.message || "Failed to load course content"
            );
        }

        // Get completed learning topics
        const completedResponse = await fetch(
            `${API_URL}/learning-items/completed`,
            {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const completedData = await completedResponse.json();

        if (!completedResponse.ok) {
            throw new Error(
                completedData.message ||
                "Failed to load completed topics"
            );
        }

        const completedIds = new Set(
            completedData.completed_items.map(
                item => Number(item.learning_item_id)
            )
        );

        const items = contentData.items;

        if (items.length === 0) {

            container.innerHTML = `
                <p>No content available.</p>
            `;

            return;
        }

        container.innerHTML = items.map(item => {

            // =========================
            // FOLDER
            // =========================

            if (item.type === "folder") {

                const completed =
                    completedIds.has(Number(item.id));

                return `
                    <div class="course-card">

                        <p class="section-tag">
                            TOPIC
                        </p>

                        <h3>
                            📁 ${item.name}
                        </h3>

                        <button
                            class="auth-btn"
                            onclick="openFolder(${item.id})">
                            Open Folder
                        </button>

                        ${
                            completed
                            ? `
                                <p style="margin-top: 15px;">
                                    ✓ Completed
                                </p>
                            `
                            : `
                                <button
                                    class="auth-btn"
                                    onclick="completeTopic(${item.id})">
                                    Mark Complete
                                </button>
                            `
                        }

                        <button
                            class="auth-btn"
                            onclick="generateQuiz(${item.id})">
                            Generate Quiz
                        </button>

                    </div>
                `;

            }

            // =========================
            // DOCUMENT
            // =========================

            return `
                <div class="course-card">

                    <p class="section-tag">
                        MATERIAL
                    </p>

                    <h3>
                        📄 ${item.name}
                    </h3>

                    <button
                        class="auth-btn"
                        onclick="openDocument('${item.file_path}')">
                        Open Material
                    </button>

                </div>
            `;

        }).join("");

    } catch (error) {

        console.error(error);

        container.innerHTML = `
            <p>${error.message}</p>
        `;
    }
}

async function completeTopic(itemId) {

    try {

        const response = await fetch(
            `${API_URL}/learning-item/${itemId}/complete`,
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
                data.message || "Failed to complete topic"
            );
        }

        alert("Topic completed successfully!");

        loadContent(currentParentId);

    } catch (error) {

        console.error(error);

        alert(error.message);
    }
}


// =========================
// OPEN FOLDER
// =========================

function openFolder(folderId) {

    loadContent(folderId);
}

async function generateQuiz(itemId) {
    try {
        const response = await fetch(
            `${COURSE_API_URL}/learning-items/${itemId}/quiz`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Quiz generation failed");
        }

        sessionStorage.setItem("dsaQuiz", JSON.stringify(data.quiz));

        window.location.href = `quiz.html?type=dsa&itemId=${itemId}`;
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

// =========================
// OPEN DOCUMENT
// =========================

function openDocument(filePath) {

    const relativePath =
        filePath.replace("data/DSA/", "");

    window.open(
        `http://localhost:3000/materials/${relativePath}`,
        "_blank"
    );
}
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
    loadContent();
}

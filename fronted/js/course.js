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
// LOAD COURSE CONTENT
// =========================

async function loadContent(parentId = null) {

    const container =
        document.getElementById("lessonsContainer");

    try {

        let url =
            `${COURSE_API_URL}/${courseId}/content`;

        if (parentId !== null) {
            url += `?parent_id=${parentId}`;
        }

        const response = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to load course content"
            );
        }

        const items = data.items;

        if (items.length === 0) {

            container.innerHTML = `
                <p>No content available.</p>
            `;

            return;
        }

        container.innerHTML = items.map(item => {

            if (item.type === "folder") {

                return `
                    <div class="course-card">

                        <p class="section-tag">
                            FOLDER
                        </p>

                        <h3>
                            📁 ${item.name}
                        </h3>

                        <button
                            class="auth-btn"
                            onclick="openFolder(${item.id})">
                            Open Folder
                        </button>

                    </div>
                `;

            }

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


// =========================
// OPEN FOLDER
// =========================

function openFolder(folderId) {

    loadContent(folderId);
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
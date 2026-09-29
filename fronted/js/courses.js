const API_URL = "http://localhost:3000/api/courses";

const token = localStorage.getItem("token");


// =========================
// CHECK LOGIN
// =========================

if (!token) {

    window.location.href = "login.html";

}


// =========================
// LOAD COURSES
// =========================

async function loadCourses() {

    const container =
        document.getElementById("coursesContainer");

    try {

        const response =
            await fetch(API_URL);

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.message || "Failed to load courses"
            );

        }

        const courses =
            data.courses;


        if (courses.length === 0) {

            container.innerHTML = `
                <p>
                    No courses are available right now.
                </p>
            `;

            return;
        }


        container.innerHTML =
            courses.map(course => `

                <div class="course-card">

                    <p class="section-tag">
                        COURSE
                    </p>

                    <h3>
                        ${course.title}
                    </h3>

                    <p>
                        ${course.description ||
                        "No description available."}
                    </p>

                    <button
                        class="auth-btn"
                        onclick="enrollCourse(${course.id})">

                        Enroll

                    </button>

                </div>

            `).join("");


    } catch (error) {

        console.error(error);

        container.innerHTML = `
            <p>
                ${error.message}
            </p>
        `;

    }

}


// =========================
// ENROLL COURSE
// =========================

async function enrollCourse(courseId) {

    try {

        const response =
            await fetch(
                `${API_URL}/${courseId}/enroll`,
                {
                    method: "POST",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Failed to enroll in course"
            );

        }


        alert(
            "Enrolled successfully!"
        );


        window.location.href =
            `course.html?id=${courseId}`;


    } catch (error) {

        console.error(error);

        alert(error.message);

    }

}


// =========================
// LOGOUT
// =========================

document
    .getElementById("logoutBtn")
    .addEventListener(
        "click",
        () => {

            localStorage.removeItem("token");

            window.location.href =
                "login.html";

        }
    );


// =========================
// START
// =========================
loadCourses();
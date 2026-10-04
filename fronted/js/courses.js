const API_URL = "http://localhost:3000/api/courses";
const USERS_API_URL = "http://localhost:3000/api/users";

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

        // Get all available courses

        const coursesResponse =
            await fetch(API_URL);

        const coursesData =
            await coursesResponse.json();

        if (!coursesResponse.ok) {
            throw new Error(
                coursesData.message ||
                "Failed to load courses"
            );
        }


        // Get courses enrolled by current user

        const enrolledResponse =
            await fetch(
                `${USERS_API_URL}/my-courses`,
                {
                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );

        const enrolledData =
            await enrolledResponse.json();

        if (!enrolledResponse.ok) {
            throw new Error(
                enrolledData.message ||
                "Failed to load enrolled courses"
            );
        }


        const courses =
            coursesData.courses;

        const enrolledCourses =
            enrolledData.courses;


        if (courses.length === 0) {

            container.innerHTML = `
                <p>
                    No courses are available right now.
                </p>
            `;

            return;
        }


        // Store enrolled course IDs

        const enrolledCourseIds =
            new Set(
                enrolledCourses.map(
                    course => Number(course.id)
                )
            );


        // Display courses

        container.innerHTML =
            courses.map(course => {

                const isEnrolled =
                    enrolledCourseIds.has(
                        Number(course.id)
                    );


                return `

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


                        ${
                            isEnrolled

                            ?

                            `
                                <button
                                    class="auth-btn"
                                    onclick="openCourse(
                                        ${course.id}
                                    )">

                                    ✓ Enrolled

                                </button>
                            `

                            :

                            `
                                <button
                                    class="auth-btn"
                                    onclick="enrollCourse(
                                        ${course.id}
                                    )">

                                    Enroll

                                </button>
                            `
                        }

                    </div>

                `;

            }).join("");


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


        // Reload course list
        // so button changes to "✓ Enrolled"

        loadCourses();


    } catch (error) {

        console.error(error);

        alert(error.message);

    }

}


// =========================
// OPEN COURSE
// =========================

function openCourse(courseId) {

    window.location.href =
        `course.html?id=${courseId}`;

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
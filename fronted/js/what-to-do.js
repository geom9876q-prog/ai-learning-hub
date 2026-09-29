const API_URL = "http://localhost:3000/api/users";

const token = localStorage.getItem("token");


// =========================
// CHECK LOGIN
// =========================

if (!token) {

    window.location.href = "login.html";

}


// =========================
// FORM
// =========================

const form =
    document.getElementById("learnerProfileForm");


// =========================
// SUBMIT PROFILE
// =========================

form.addEventListener("submit", async (event) => {

    event.preventDefault();


    const career_goal =
        document.getElementById("careerGoal").value;

    const motivation =
        document.getElementById("motivation").value;

    const current_level =
        document.getElementById("currentLevel").value;

    const days_to_goal =
        document.getElementById("daysToGoal").value;

    const daily_study_minutes =
        document.getElementById("dailyStudyMinutes").value;

    const message =
        document.getElementById("profileMessage");


    try {

        // =========================
        // SAVE PROFILE
        // =========================

        message.textContent =
            "Saving your profile...";


        const profileResponse =
            await fetch(
                `${API_URL}/learner-profile`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "Authorization":
                            `Bearer ${token}`
                    },

                    body: JSON.stringify({

                        career_goal,
                        motivation,
                        current_level,

                        days_to_goal:
                            Number(days_to_goal),

                        daily_study_minutes:
                            Number(daily_study_minutes)

                    })
                }
            );


        const profileData =
            await profileResponse.json();


        if (!profileResponse.ok) {

            throw new Error(
                profileData.message ||
                "Failed to save learner profile"
            );

        }


        // =========================
        // GENERATE LEARNING PLAN
        // =========================

        message.textContent =
            "Profile saved. Generating your learning plan...";


        const planResponse =
            await fetch(
                `${API_URL}/learning-plan`,
                {
                    method: "POST",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );


        const planData =
            await planResponse.json();


        if (!planResponse.ok) {

            throw new Error(
                planData.message ||
                "Failed to generate learning plan"
            );

        }


        // =========================
        // DISPLAY PLAN
        // =========================

        message.textContent =
            "Your personalized learning plan is ready!";


        displayLearningPlan(
            planData.learning_plan.plan
        );


    } catch (error) {

        console.error(error);

        message.textContent =
            error.message;

    }

});


// =========================
// DISPLAY LEARNING PLAN
// =========================

function displayLearningPlan(plan) {

    const container =
        document.createElement("div");

    container.className =
        "dashboard-card";


    container.innerHTML = `

        <hr>

        <p class="section-tag">
            YOUR PERSONALIZED PLAN
        </p>

        <h2>
            Learning Plan
        </h2>

        <div>
            ${formatPlan(plan)}
        </div>

    `;


    document
        .getElementById("learnerProfileForm")
        .parentElement
        .appendChild(container);

}


// =========================
// FORMAT PLAN
// =========================

function formatPlan(plan) {

    return plan
        .replace(/\n/g, "<br>");
}


// =========================
// LOGOUT
// =========================

document
    .getElementById("logoutBtn")
    .addEventListener("click", () => {

        localStorage.removeItem("token");

        window.location.href =
            "login.html";

    });
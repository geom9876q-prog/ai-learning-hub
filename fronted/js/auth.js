const API_URL = "http://localhost:3000/api/users";


// =========================
// SIGNUP
// =========================

const signupForm = document.getElementById("signupForm");

if (signupForm) {

    signupForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const name = document.getElementById("name").value;
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        const message = document.getElementById("signupMessage");

        try {

            const response = await fetch(`${API_URL}/register`, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name,
                    email,
                    password
                })

            });

            const data = await response.json();

            if (!response.ok) {

                message.textContent =
                    data.message || "Registration failed";

                return;
            }

            message.textContent =
                "Account created successfully. Redirecting...";

            setTimeout(() => {
                window.location.href = "login.html";
            }, 1000);

        } catch (error) {

            console.error(error);

            message.textContent =
                "Unable to connect to the server.";
        }

    });

}


// =========================
// LOGIN
// =========================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        const message = document.getElementById("loginMessage");

        try {

            const response = await fetch(`${API_URL}/login`, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email,
                    password
                })

            });

            const data = await response.json();

            if (!response.ok) {

                message.textContent =
                    data.message || "Login failed";

                return;
            }

            // Store JWT
            localStorage.setItem("token", data.token);

            message.textContent =
                "Login successful. Redirecting...";

            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 700);

        } catch (error) {

            console.error(error);

            message.textContent =
                "Unable to connect to the server.";
        }

    });

}
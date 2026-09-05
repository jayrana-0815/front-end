/* =========================================================
WEATHERGPT — COMPLETE JAVASCRIPT
Navigation + AI Chat + Framer Mode + Animations
========================================================= */

/* =========================================================
WEATHER DATA
========================================================= */

let weatherData = {
city: "Ahmedabad",
country: "India",
temperature: 32,
feelsLike: 35,
condition: "Sunny",
humidity: 65,
wind: 12,
rain: 20,
pressure: 1008
};

/* =========================================================
DOM ELEMENTS
========================================================= */

const homeScreen = document.getElementById("homeScreen");
const forecastScreen = document.getElementById("forecastScreen");
const alertsScreen = document.getElementById("alertsScreen");
const chatScreen = document.getElementById("chatScreen");

const screens = {
home: homeScreen,
forecast: forecastScreen,
alerts: alertsScreen,
chat: chatScreen
};

/* =========================================================
BOTTOM NAVIGATION
========================================================= */

const navItems = document.querySelectorAll(".bottom-nav .nav-item");

navItems.forEach((button) => {

button.addEventListener("click", function () {

    /* Framer Mode */
    if (this.id === "framerNav") {
        toggleFramerMode();
        return;
    }

    const label = this.querySelector("small");

    if (!label) return;

    const page = label.textContent.trim().toLowerCase();

    if (page === "home") {
        showScreen("home");
    }

    else if (page === "forecast") {
        showScreen("forecast");
    }

    else if (page === "alerts") {
        showScreen("alerts");
    }

    else if (page === "ai chat") {
        showScreen("chat");
    }

});

});

/* =========================================================
SCREEN NAVIGATION
========================================================= */

function showScreen(screenName) {

Object.values(screens).forEach(screen => {

    if (screen) {
        screen.classList.add("hidden");
        screen.classList.remove("screen-enter");
    }

});


const selectedScreen = screens[screenName];

if (!selectedScreen) return;


selectedScreen.classList.remove("hidden");

/* Animation */
void selectedScreen.offsetWidth;

selectedScreen.classList.add("screen-enter");


/* Update navigation */

navItems.forEach(item => {
    item.classList.remove("active");
});


navItems.forEach(item => {

    const label = item.querySelector("small");

    if (!label) return;

    if (
        label.textContent.trim().toLowerCase() ===
        (screenName === "chat" ? "ai chat" : screenName)
    ) {
        item.classList.add("active");
    }

});


window.scrollTo({
    top: 0,
    behavior: "smooth"
});

}

/* =========================================================
TOP MENU BUTTON
========================================================= */

const menuButton =
document.querySelector(".top-bar .icon-btn:first-child");

if (menuButton) {

menuButton.addEventListener("click", function () {

    showMenu();

    this.classList.add("button-click");

    setTimeout(() => {
        this.classList.remove("button-click");
    }, 300);

});

}

/* =========================================================
MOBILE MENU
========================================================= */

function showMenu() {

const existingMenu =
    document.getElementById("mobileMenu");

if (existingMenu) {
    existingMenu.classList.add("menu-close");

    setTimeout(() => {
        existingMenu.remove();
    }, 200);

    return;
}


const menu = document.createElement("div");

menu.id = "mobileMenu";


menu.innerHTML = `

    <div class="menu-item" data-screen="home">
        🏠 <span>Home</span>
    </div>

    <div class="menu-item" data-screen="forecast">
        🌤️ <span>Forecast</span>
    </div>

    <div class="menu-item" data-screen="alerts">
        ⚠️ <span>Alerts</span>
    </div>

    <div class="menu-item" data-screen="chat">
        🤖 <span>WeatherGPT</span>
    </div>

    <div class="menu-item" id="menuFramer">
        ✨ <span>Framer Mode</span>
    </div>

`;


document.body.appendChild(menu);


/* Menu styling */

menu.style.position = "fixed";
menu.style.top = "75px";
menu.style.left = "20px";
menu.style.zIndex = "9999";
menu.style.width = "220px";
menu.style.padding = "10px";

menu.style.background =
    "rgba(15, 23, 42, 0.94)";

menu.style.backdropFilter =
    "blur(20px)";

menu.style.webkitBackdropFilter =
    "blur(20px)";

menu.style.border =
    "1px solid rgba(255,255,255,0.12)";

menu.style.borderRadius = "18px";

menu.style.boxShadow =
    "0 20px 60px rgba(0,0,0,0.35)";

menu.style.animation =
    "menuOpen 0.25s ease";


/* Menu items */

menu.querySelectorAll(".menu-item")
    .forEach(item => {

        item.style.padding = "13px 14px";
        item.style.margin = "3px 0";
        item.style.cursor = "pointer";
        item.style.color = "#E2E8F0";
        item.style.borderRadius = "12px";
        item.style.transition =
            "all 0.2s ease";


        item.addEventListener("mouseenter", function () {

            this.style.background =
                "rgba(96,165,250,0.15)";

            this.style.transform =
                "translateX(5px)";

        });


        item.addEventListener("mouseleave", function () {

            this.style.background =
                "transparent";

            this.style.transform =
                "translateX(0)";

        });


        item.addEventListener("click", function () {

            if (this.id === "menuFramer") {

                toggleFramerMode();

                menu.remove();

                return;
            }


            const screen =
                this.dataset.screen;

            showScreen(screen);

            menu.remove();

        });

    });

}

/* =========================================================
NOTIFICATION BUTTON
========================================================= */

const notificationButton =
document.querySelector(".top-bar .icon-btn:last-child");

if (notificationButton) {

notificationButton.addEventListener("click", function () {

    showNotification(
        "⚠️ You have 2 active weather alerts"
    );

    showScreen("alerts");

    this.classList.add("bell-shake");

    setTimeout(() => {
        this.classList.remove("bell-shake");
    }, 700);

});

}

/* =========================================================
TOAST NOTIFICATION
========================================================= */

function showNotification(message) {

const oldToast =
    document.getElementById("weatherToast");

if (oldToast) {
    oldToast.remove();
}


const toast =
    document.createElement("div");

toast.id = "weatherToast";

toast.textContent = message;


toast.style.position = "fixed";
toast.style.top = "85px";
toast.style.left = "50%";
toast.style.transform =
    "translateX(-50%) translateY(-20px)";

toast.style.zIndex = "10000";

toast.style.padding =
    "12px 20px";

toast.style.borderRadius =
    "14px";

toast.style.background =
    "rgba(15,23,42,0.94)";

toast.style.backdropFilter =
    "blur(15px)";

toast.style.color =
    "#F8FAFC";

toast.style.border =
    "1px solid rgba(96,165,250,0.25)";

toast.style.boxShadow =
    "0 15px 40px rgba(0,0,0,0.35)";

toast.style.fontSize = "14px";

toast.style.animation =
    "toastIn 0.35s ease forwards";


document.body.appendChild(toast);


setTimeout(() => {

    toast.style.animation =
        "toastOut 0.3s ease forwards";

    setTimeout(() => {
        toast.remove();
    }, 300);

}, 2800);

}

/* =========================================================
FRAMER MODE
========================================================= */

let framerMode = false;

function toggleFramerMode() {

framerMode = !framerMode;


document.body.classList.toggle(
    "framer-mode",
    framerMode
);


const framerButton =
    document.getElementById("framerNav");


if (framerButton) {

    framerButton.classList.toggle(
        "active",
        framerMode
    );

}


if (framerMode) {

    showNotification(
        "✨ Framer Mode activated"
    );

    createFramerParticles();

}

else {

    showNotification(
        "✨ Framer Mode disabled"
    );

    removeFramerParticles();

}

}

/* =========================================================
FRAMER PARTICLE EFFECT
========================================================= */

function createFramerParticles() {

removeFramerParticles();


const container =
    document.createElement("div");

container.id =
    "framerParticles";


container.style.position =
    "fixed";

container.style.inset = "0";

container.style.pointerEvents =
    "none";

container.style.zIndex = "0";

document.body.appendChild(container);


for (let i = 0; i < 20; i++) {

    const particle =
        document.createElement("span");


    particle.className =
        "framer-particle";


    particle.textContent =
        i % 2 === 0 ? "✦" : "•";


    particle.style.position =
        "absolute";

    particle.style.left =
        Math.random() * 100 + "%";

    particle.style.top =
        Math.random() * 100 + "%";

    particle.style.color =
        i % 2 === 0
            ? "#93C5FD"
            : "#C4B5FD";

    particle.style.fontSize =
        Math.random() * 10 + 6 + "px";

    particle.style.opacity =
        Math.random() * 0.6 + 0.2;

    particle.style.animation =
        `floatParticle ${
            3 + Math.random() * 5
        }s ease-in-out infinite`;

    particle.style.animationDelay =
        Math.random() * 3 + "s";


    container.appendChild(particle);

}

}

function removeFramerParticles() {

const particles =
    document.getElementById(
        "framerParticles"
    );

if (particles) {
    particles.remove();
}

}

/* =========================================================
FORECAST TABS
========================================================= */

const forecastTabs =
document.querySelectorAll(
".forecast-tab"
);

forecastTabs.forEach((tab, index) => {

tab.addEventListener("click", function () {

    forecastTabs.forEach(item => {
        item.classList.remove("active");
    });


    this.classList.add("active");


    if (index === 0) {

        showNotification(
            "📅 Showing today's forecast"
        );

    }

    else if (index === 1) {

        showNotification(
            "📅 Showing tomorrow's forecast"
        );

    }

    else {

        showNotification(
            "📅 Showing 7-day forecast"
        );

    }

});

});

/* =========================================================
ALERT FILTERS
========================================================= */

const alertFilters =
document.querySelectorAll(
".alert-filter"
);

const alertCards =
document.querySelectorAll(
".alert-card"
);

alertFilters.forEach(filter => {

filter.addEventListener("click", function () {

    alertFilters.forEach(button => {
        button.classList.remove("active");
    });


    this.classList.add("active");


    const filterName =
        this.textContent
            .trim()
            .toLowerCase();


    alertCards.forEach(card => {

        if (filterName === "all") {

            card.style.display = "block";

        }

        else if (
            card.classList.contains(
                `${filterName}-alert`
            )
        ) {

            card.style.display = "block";

            card.style.animation =
                "cardAppear 0.3s ease";

        }

        else {

            card.style.display = "none";

        }

    });

});

});

/* =========================================================
ALERT DETAILS
========================================================= */

const detailsButtons =
document.querySelectorAll(
".alert-action button"
);

detailsButtons.forEach(button => {

button.addEventListener("click", function () {

    const card =
        this.closest(".alert-card");

    if (!card) return;


    const title =
        card.querySelector("h3");


    const name =
        title
            ? title.textContent
            : "Weather Alert";


    showNotification(
        `⚠️ More information about ${name}`
    );

});

});

/* =========================================================
CHAT SYSTEM
========================================================= */

const chatBody =
document.getElementById("chatBody");

const chatInput =
document.getElementById("chatInput");

const sendButton =
document.getElementById("sendButton");

/* =========================================================
SEND CHAT MESSAGE
========================================================= */

function sendChatMessage() {

if (!chatInput) return;


const message =
    chatInput.value.trim();


if (!message) return;


addChatMessage(
    message,
    "user"
);


chatInput.value = "";


showTyping();


setTimeout(async () => {

    removeTyping();


    const response =
        await getAIResponse(message);


    addChatMessage(
        response,
        "ai"
    );

}, 700);

}

if (sendButton) {

sendButton.addEventListener(
    "click",
    sendChatMessage
);

}

if (chatInput) {

chatInput.addEventListener(
    "keydown",
    function(event) {

        if (event.key === "Enter") {

            event.preventDefault();

            sendChatMessage();

        }

    }
);

}

/* =========================================================
ADD CHAT MESSAGE
========================================================= */

function addChatMessage(message, type) {

if (!chatBody) return;


const wrapper =
    document.createElement("div");


wrapper.className =
    type === "ai"
        ? "message ai-message"
        : "message user-message";


if (type === "ai") {

    wrapper.innerHTML = `

        <div class="message-avatar">
            🤖
        </div>

        <div class="message-content">

            <div class="message-bubble">

                <p>${escapeHTML(message)}</p>

            </div>

            <small>
                WeatherGPT • Now
            </small>

        </div>

    `;

}

else {

    wrapper.innerHTML = `

        <div class="message-content">

            <div class="message-bubble">

                <p>${escapeHTML(message)}</p>

            </div>

            <small>
                You • Now
            </small>

        </div>

    `;

}


wrapper.style.animation =
    "messageIn 0.35s ease";


chatBody.appendChild(wrapper);


chatBody.scrollTo({
    top: chatBody.scrollHeight,
    behavior: "smooth"
});

}

/* =========================================================
ESCAPE HTML
========================================================= */

function escapeHTML(text) {

const div =
    document.createElement("div");

div.textContent = text;

return div.innerHTML;

}

/* =========================================================
TYPING INDICATOR
========================================================= */

function showTyping() {

if (!chatBody) return;


const typing =
    document.createElement("div");


typing.id =
    "typingIndicator";


typing.className =
    "message ai-message";


typing.innerHTML = `

    <div class="message-avatar">
        🤖
    </div>

    <div class="message-content">

        <div class="message-bubble">

            <p>
                WeatherGPT is thinking
                <span class="typing-dots">
                    • • •
                </span>
            </p>

        </div>

    </div>

`;


typing.style.animation =
    "messageIn 0.3s ease";


chatBody.appendChild(typing);


chatBody.scrollTop =
    chatBody.scrollHeight;

}

function removeTyping() {

const typing =
    document.getElementById(
        "typingIndicator"
    );


if (typing) {
    typing.remove();
}

}

/* =========================================================
WEATHER AI
========================================================= */

async function getAIResponse(message) {

const text =
    message.toLowerCase();


/* Temperature */

if (
    text.includes("temperature") ||
    text.includes("hot") ||
    text.includes("cold")
) {

    return `

🌡️ The current temperature in
${weatherData.city} is
${weatherData.temperature}°C.

It feels like
${weatherData.feelsLike}°C.
`;

}


/* Rain */

if (
    text.includes("rain") ||
    text.includes("raining") ||
    text.includes("umbrella")
) {

    if (weatherData.rain >= 60) {

        return `

🌧️ Yes, there is a high chance
of rain today.

Rain probability:
${weatherData.rain}%.

I recommend carrying an umbrella.
`;

    }


    return `

🌤️ Current rain probability is
${weatherData.rain}%.

Rain is not the main concern
right now.
`;

}


/* Humidity */

if (
    text.includes("humidity") ||
    text.includes("humid")
) {

    return `

💧 Humidity in
${weatherData.city} is
${weatherData.humidity}%.
`;

}


/* Wind */

if (
    text.includes("wind") ||
    text.includes("windy")
) {

    return `

💨 Current wind speed is
${weatherData.wind} km/h.
`;

}


/* Outdoor */

if (
    text.includes("outdoor") ||
    text.includes("outside") ||
    text.includes("activity")
) {

    if (weatherData.rain >= 60) {

        return `

⚠️ Outdoor activities may not
be ideal because the chance of
rain is ${weatherData.rain}%.
`;

    }


    if (weatherData.temperature >= 35) {

        return `

☀️ It's quite hot at
${weatherData.temperature}°C.

Stay hydrated and avoid
strong afternoon sunlight.
`;

    }


    return `

🌤️ Current conditions look
reasonably suitable for
outdoor activities.
`;

}


/* Weather */

if (
    text.includes("weather") ||
    text.includes("condition")
) {

    return `

🌤️ Current weather in
${weatherData.city}:

Temperature:
${weatherData.temperature}°C

Condition:
${weatherData.condition}

Humidity:
${weatherData.humidity}%

Rain:
${weatherData.rain}%
`;

}


/* Forecast */

if (
    text.includes("forecast") ||
    text.includes("tomorrow")
) {

    return `

📅 You can check the Forecast
section for the hourly and
7-day weather outlook.
`;

}


/* Greetings */

if (
    text.includes("hello") ||
    text.includes("hi") ||
    text.includes("hey")
) {

    return `

👋 Hello!

I'm WeatherGPT.

Ask me about temperature,
rain, humidity, wind,
forecast or outdoor activities.
`;

}


/* Default */

return `

🤖 I can help you understand
the weather in
${weatherData.city}.

Try asking:

🌡️ How hot is it?

🌧️ Will it rain?

💧 What's the humidity?

💨 Is it windy?

☀️ Is it good for outdoor activities?
`;

}

/* =========================================================
QUICK QUESTIONS
========================================================= */

const quickQuestions =
document.querySelectorAll(
".quick-question"
);

quickQuestions.forEach(button => {

button.addEventListener("click", function () {

    if (!chatInput) return;


    chatInput.value =
        this.textContent.trim();


    sendChatMessage();

});

});

/* =========================================================
CHAT MENU
========================================================= */

const chatMenu =
document.querySelector(".chat-menu");

if (chatMenu) {

chatMenu.addEventListener("click", function () {

    showNotification(
        "⚙️ Chat settings coming soon"
    );

});

}

/* =========================================================
PLUS BUTTON
========================================================= */

const inputAction =
document.querySelector(".input-action");

if (inputAction) {

inputAction.addEventListener(
    "click",
    function () {

        showNotification(
            "📎 Attachment feature coming soon"
        );

    }
);

}

/* =========================================================
WEATHER UI UPDATE
========================================================= */

function updateWeatherUI() {

const cityName =
    document.querySelector(
        "#homeScreen .location h2"
    );


const temperature =
    document.querySelector(
        "#homeScreen .weather-card h1"
    );


const condition =
    document.querySelector(
        "#homeScreen .weather-card h3"
    );


const feels =
    document.querySelector(
        "#homeScreen .weather-card > p"
    );


if (cityName) {

    cityName.textContent =
        `${weatherData.city}, ${weatherData.country}`;

}


if (temperature) {

    temperature.textContent =
        `${weatherData.temperature}°C`;

}


if (condition) {

    condition.textContent =
        weatherData.condition;

}


if (feels) {

    feels.textContent =
        `Feels like ${weatherData.feelsLike}°C`;

}


const details =
    document.querySelectorAll(
        "#homeScreen .detail-card strong"
    );


if (details.length >= 3) {

    details[0].textContent =
        `${weatherData.humidity}%`;

    details[1].textContent =
        `${weatherData.wind} km/h`;

    details[2].textContent =
        `${weatherData.rain}%`;

}


const forecastCity =
    document.querySelector(
        "#forecastScreen .forecast-header h1"
    );


if (forecastCity) {

    forecastCity.textContent =
        weatherData.city;

}


const forecastTemperature =
    document.querySelector(
        "#forecastScreen .forecast-summary h2"
    );


if (forecastTemperature) {

    forecastTemperature.textContent =
        `${weatherData.temperature}°C`;

}


updateAIInsight();

}

/* =========================================================
AI HOME INSIGHT
========================================================= */

function updateAIInsight() {

const aiText =
    document.querySelector(
        "#homeScreen .ai-card p"
    );


if (!aiText) return;


let insight;


if (weatherData.rain >= 60) {

    insight =
        `Rain probability is high at ${weatherData.rain}%. Carry an umbrella and consider avoiding unnecessary outdoor travel.`;

}

else if (weatherData.temperature >= 35) {

    insight =
        `It's quite hot today at ${weatherData.temperature}°C. Stay hydrated and avoid prolonged exposure to direct sunlight.`;

}

else if (weatherData.humidity >= 75) {

    insight =
        `Humidity is high at ${weatherData.humidity}%. The temperature may feel warmer than the actual reading.`;

}

else {

    insight =
        `The weather is ${weatherData.condition.toLowerCase()} with a temperature of ${weatherData.temperature}°C. Conditions currently look comfortable.`;

}


aiText.textContent =
    insight;

}

/* =========================================================
OPTIONAL CITY SEARCH
========================================================= */

function searchCity(city) {

if (!city || !city.trim()) {

    showNotification(
        "📍 Please enter a city"
    );

    return;

}


city = city.trim();


weatherData =
    generateDemoWeather(city);


updateWeatherUI();


showScreen("home");


showNotification(
    `🌤️ Weather updated for ${weatherData.city}`
);

}

/* =========================================================
DEMO WEATHER GENERATOR
========================================================= */

function generateDemoWeather(city) {

const lower =
    city.toLowerCase()
        .replace(/\s+/g, "");


const cities = {

    ahmedabad: {
        city: "Ahmedabad",
        country: "India",
        temperature: 32,
        feelsLike: 35,
        condition: "Sunny",
        humidity: 65,
        wind: 12,
        rain: 20,
        pressure: 1008
    },

    mumbai: {
        city: "Mumbai",
        country: "India",
        temperature: 29,
        feelsLike: 33,
        condition: "Rainy",
        humidity: 78,
        wind: 16,
        rain: 70,
        pressure: 1005
    },

    delhi: {
        city: "Delhi",
        country: "India",
        temperature: 34,
        feelsLike: 37,
        condition: "Partly Cloudy",
        humidity: 52,
        wind: 10,
        rain: 15,
        pressure: 1009
    },

    london: {
        city: "London",
        country: "United Kingdom",
        temperature: 18,
        feelsLike: 17,
        condition: "Cloudy",
        humidity: 72,
        wind: 14,
        rain: 45,
        pressure: 1012
    },

    newyork: {
        city: "New York",
        country: "USA",
        temperature: 24,
        feelsLike: 25,
        condition: "Cloudy",
        humidity: 60,
        wind: 13,
        rain: 30,
        pressure: 1010
    }

};


if (cities[lower]) {

    return cities[lower];

}


return {

    city:
        city.charAt(0).toUpperCase() +
        city.slice(1),

    country: "Location",

    temperature:
        Math.floor(Math.random() * 15) + 20,

    feelsLike:
        Math.floor(Math.random() * 15) + 22,

    condition: "Partly Cloudy",

    humidity:
        Math.floor(Math.random() * 40) + 40,

    wind:
        Math.floor(Math.random() * 15) + 5,

    rain:
        Math.floor(Math.random() * 70),

    pressure:
        1005 + Math.floor(Math.random() * 10)

};

}

/* =========================================================
CARD HOVER ANIMATION
========================================================= */

document.querySelectorAll(
".weather-card, .detail-card, .ai-card, .day-card, .hour-card, .alert-card"
).forEach(card => {

card.addEventListener("mouseenter", function () {

    this.style.transform =
        "translateY(-4px)";

});


card.addEventListener("mouseleave", function () {

    this.style.transform =
        "translateY(0)";

});

});

/* =========================================================
BUTTON CLICK ANIMATION
========================================================= */

document.querySelectorAll("button")
.forEach(button => {

    button.addEventListener("click", function () {

        this.style.transform =
            "scale(0.95)";

        setTimeout(() => {

            this.style.transform = "";

        }, 120);

    });

});

/* =========================================================
INITIALIZE APP
========================================================= */

document.addEventListener(
"DOMContentLoaded",
function () {

    showScreen("home");

    updateWeatherUI();

    console.log(
        "🌦️ WeatherGPT loaded successfully"
    );

}

);

/* =========================================================
DYNAMIC ANIMATION STYLES
========================================================= */

const animationStyle =
document.createElement("style");

animationStyle.textContent = `

/* Screen animation */

.screen-enter {
animation: screenEnter 0.45s ease both;
}

@keyframes screenEnter {

from {
    opacity: 0;
    transform: translateY(15px);
}

to {
    opacity: 1;
    transform: translateY(0);
}

}

/* Menu */

@keyframes menuOpen {

from {
    opacity: 0;
    transform: translateY(-10px) scale(0.96);
}

to {
    opacity: 1;
    transform: translateY(0) scale(1);
}

}

.menu-close {
animation: menuClose 0.2s ease forwards;
}

@keyframes menuClose {

to {
    opacity: 0;
    transform: translateY(-10px) scale(0.96);
}

}

/* Toast */

@keyframes toastIn {

from {
    opacity: 0;
    transform:
        translateX(-50%)
        translateY(-20px);
}

to {
    opacity: 1;
    transform:
        translateX(-50%)
        translateY(0);
}

}

@keyframes toastOut {

from {
    opacity: 1;
    transform:
        translateX(-50%)
        translateY(0);
}

to {
    opacity: 0;
    transform:
        translateX(-50%)
        translateY(-15px);
}

}

/* Chat messages */

@keyframes messageIn {

from {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
}

to {
    opacity: 1;
    transform: translateY(0) scale(1);
}

}

/* Cards */

@keyframes cardAppear {

from {
    opacity: 0;
    transform: translateY(10px);
}

to {
    opacity: 1;
    transform: translateY(0);
}

}

/* Notification bell */

.bell-shake {
animation: bellShake 0.7s ease;
}

@keyframes bellShake {

0%, 100% {
    transform: rotate(0);
}

20% {
    transform: rotate(-15deg);
}

40% {
    transform: rotate(15deg);
}

60% {
    transform: rotate(-10deg);
}

80% {
    transform: rotate(8deg);
}

}

/* Button */

.button-click {
animation: buttonPulse 0.3s ease;
}

@keyframes buttonPulse {

50% {
    transform: scale(0.88);
}

}

/* Framer particles */

@keyframes floatParticle {

0%, 100% {
    transform:
        translate3d(0, 0, 0)
        rotate(0deg);
}

50% {
    transform:
        translate3d(
            20px,
            -35px,
            0
        )
        rotate(180deg);
}

}

/* Framer mode */

body.framer-mode {
transition:
background 0.5s ease,
filter 0.5s ease;
}

body.framer-mode .app {
animation:
framerGlow 3s ease-in-out infinite;
}

@keyframes framerGlow {

0%, 100% {
    filter:
        drop-shadow(
            0 0 0
            rgba(147,197,253,0)
        );
}

50% {
    filter:
        drop-shadow(
            0 0 25px
            rgba(147,197,253,0.12)
        );
}

}

/* Typing dots */

.typing-dots {
display: inline-block;
animation:
typingDots 1.2s infinite;
}

@keyframes typingDots {

0% {
    opacity: 0.25;
}

50% {
    opacity: 1;
}

100% {
    opacity: 0.25;
}

}

`;

document.head.appendChild(animationStyle);

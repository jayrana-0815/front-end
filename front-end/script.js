/* =========================================================
WEATHERGPT — FARMER MODE COMPLETE
Navigation + AI Chat + Farmer Modes + Voice Commands
========================================================= */

/* =========================================================
WEATHER & FARMER DATA
========================================================= */

let weatherData = {
city: "Current location",
country: "",
temperature: null,
feelsLike: null,
condition: "Waiting for live data",
humidity: null,
wind: null,
rain: null,
pressure: null
};

const API_BASE =
window.WEATHER_API_BASE ||
(window.location.protocol === "file:" ? "http://localhost:3000" : window.location.origin);

let farmerLocation = {
name: "Ahmedabad",
country: "India",
latitude: 23.0225,
longitude: 72.5714
};

let latestForecast = null;
let latestFarmerPlanResult = null;
let isFarmerMode = false;
let isRecordingVoice = false;
let currentLanguage = localStorage.getItem("weatherGptLanguage") || "en";
let languageChangeToken = 0;
const normalChatHistory = [];
const farmerChatHistory = [];
let hourlyContainer;
let weekForecast;
let activeForecastTab = "Today";

const weatherScene = document.getElementById("weatherScene");
const weatherParticles = document.getElementById("weatherParticles");
const weatherIcon = document.getElementById("weatherIcon");
const weatherConditionLabel = document.getElementById("weatherConditionLabel");
const feelsLikeLabel = document.getElementById("feelsLikeLabel");
const temperatureDifference = document.getElementById("temperatureDifference");
const comfortBadge = document.getElementById("comfortBadge");

function updateWeatherScene() {
    if (!weatherScene || !weatherParticles) return;

    const condition = weatherData.condition.toLowerCase();
    const sceneType = condition.includes("snow") || condition.includes("winter")
        ? "snow"
        : condition.includes("rain") || condition.includes("storm")
            ? "rain"
            : condition.includes("cloud")
                ? "cloudy"
                : "sunny";

    weatherScene.dataset.scene = sceneType;
    weatherParticles.replaceChildren();
    const particleCount = sceneType === "rain" ? 22 : sceneType === "snow" ? 18 : 0;

    for (let index = 0; index < particleCount; index += 1) {
        const particle = document.createElement("span");
        particle.className = "weather-particle";
        particle.style.setProperty("--particle-x", `${(index * 37) % 100}%`);
        particle.style.setProperty("--particle-delay", `${(index % 9) * 0.16}s`);
        particle.style.setProperty("--particle-duration", `${1.1 + (index % 5) * 0.18}s`);
        weatherParticles.appendChild(particle);
    }

    if (weatherIcon) {
        weatherIcon.textContent = sceneType === "snow" ? "❄️" : sceneType === "rain" ? "🌧️" : sceneType === "cloudy" ? "⛅" : "☀️";
    }

    if (weatherConditionLabel) weatherConditionLabel.textContent = sceneType === "snow" ? "Snowy" : sceneType === "rain" ? "Rainy" : sceneType === "cloudy" ? "Cloudy" : "Sunny";
    if (feelsLikeLabel) feelsLikeLabel.textContent = `Feels like ${weatherData.feelsLike}°C`;

    const difference = weatherData.feelsLike - weatherData.temperature;
    if (temperatureDifference) {
        temperatureDifference.textContent = difference === 0
            ? "Feels like the actual temperature"
            : `${difference > 0 ? "+" : ""}${difference}° ${difference > 0 ? "warmer" : "cooler"} than actual`;
    }

    if (comfortBadge) {
        comfortBadge.textContent = weatherData.temperature >= 30 ? "Stay hydrated" : weatherData.temperature <= 12 ? "Keep warm" : "Comfortable";
    }
}

const supportedLanguages = [
    { code: "en", name: "English" },
    { code: "hi", name: "हिन्दी" },
    { code: "gu", name: "ગુજરાતી" },
    { code: "mr", name: "मराठी" },
    { code: "kn", name: "ಕನ್ನಡ" },
    { code: "ta", name: "தமிழ்" },
    { code: "bn", name: "বাংলা" },
    { code: "te", name: "తెలుగు" }
];
const languageNames = Object.fromEntries(supportedLanguages.map(language => [language.code, language.name]));

function renderLanguagePickers() {
    const options = supportedLanguages.map(language => `<option value="${language.code}">${language.name}</option>`).join("");
    const planning = document.getElementById("planningLanguageSelect");
    const seasonal = document.getElementById("seasonalLanguage");
    if (planning && !planning.dataset.catalogLoaded) { planning.innerHTML = options; planning.dataset.catalogLoaded = "true"; }
    if (seasonal && !seasonal.dataset.catalogLoaded) { seasonal.innerHTML = options; seasonal.dataset.catalogLoaded = "true"; }
    const onboardingMenu = document.getElementById("onboardingLanguageMenu");
    if (onboardingMenu && !onboardingMenu.dataset.catalogLoaded) {
        onboardingMenu.innerHTML = supportedLanguages.map(language => `<button type="button" data-onboarding-language="${language.code}">${language.name}</button>`).join("");
        onboardingMenu.dataset.catalogLoaded = "true";
    }
}

const translations = {
    hi: {
        "Good Afternoon 👋": "नमस्कार 👋",
        "Ahmedabad, India": "अहमदाबाद, भारत",
        "Sunny": "धूप",
        "Feels like 35°C": "महसूस तापमान 35°C",
        "Humidity": "नमी",
        "Wind": "हवा",
        "Rain": "बारिश",
        "AI Weather Assistant": "AI मौसम सहायक",
        "Today": "आज",
        "Hello! 👋": "नमस्ते! 👋",
        "I'm WeatherGPT. Ask me about today's weather, rainfall, temperature or alerts.": "मैं WeatherGPT हूँ। आज के मौसम, बारिश, तापमान या चेतावनियों के बारे में पूछें।",
        "Quick questions": "त्वरित प्रश्न",
        "Will it rain today?": "क्या आज बारिश होगी?",
        "How hot will it be?": "कितनी गर्मी होगी?",
        "Is it good for outdoor activities?": "क्या बाहर की गतिविधियों के लिए मौसम अच्छा है?",
        "What's the forecast tomorrow?": "कल का पूर्वानुमान क्या है?",
        "Ask WeatherGPT...": "WeatherGPT से पूछें...",
        "Forecast": "पूर्वानुमान",
        "Alerts": "चेतावनियाँ",
        "Farmer": "किसान",
        "Home": "होम",
        "Language": "भाषा",
        "Farmer Mode": "किसान मोड",
        "Weather Forecast": "मौसम पूर्वानुमान",
        "Hourly Forecast": "घंटेवार पूर्वानुमान",
        "7-Day Forecast": "7-दिन का पूर्वानुमान",
        "Normal": "सामान्य",
        "Planning": "योजना",
        "Chat": "चैट"
    },
    gu: {
        "Good Afternoon 👋": "શુભ બપોર 👋",
        "Ahmedabad, India": "અમદાવાદ, ભારત",
        "Sunny": "તડકો",
        "Feels like 35°C": "અનુભવાય છે 35°C",
        "Humidity": "ભેજ",
        "Wind": "પવન",
        "Rain": "વરસાદ",
        "AI Weather Assistant": "AI હવામાન સહાયક",
        "Today": "આજે",
        "Hello! 👋": "નમસ્તે! 👋",
        "I'm WeatherGPT. Ask me about today's weather, rainfall, temperature or alerts.": "હું WeatherGPT છું. આજના હવામાન, વરસાદ, તાપમાન અથવા ચેતવણીઓ વિશે પૂછો.",
        "Quick questions": "ઝડપી પ્રશ્નો",
        "Will it rain today?": "શું આજે વરસાદ પડશે?",
        "How hot will it be?": "કેટલી ગરમી રહેશે?",
        "Is it good for outdoor activities?": "શું બહારની પ્રવૃત્તિઓ માટે હવામાન સારું છે?",
        "What's the forecast tomorrow?": "કાલનું અનુમાન શું છે?",
        "Ask WeatherGPT...": "WeatherGPT ને પૂછો...",
        "Forecast": "આગાહી",
        "Alerts": "ચેતવણીઓ",
        "Farmer": "ખેડૂત",
        "Home": "હોમ",
        "Language": "ભાષા",
        "Farmer Mode": "ખેડૂત મોડ",
        "Weather Forecast": "હવામાન આગાહી",
        "Hourly Forecast": "કલાકદીઠ આગાહી",
        "7-Day Forecast": "7 દિવસની આગાહી",
        "Normal": "સામાન્ય",
        "Planning": "આયોજન",
        "Chat": "ચેટ"
    },
    mr: {
        "Good Afternoon 👋": "शुभ दुपार 👋",
        "Ahmedabad, India": "अहमदाबाद, भारत",
        "Sunny": "उन्हाळी",
        "Feels like 35°C": "जाणवते 35°C",
        "Humidity": "आर्द्रता",
        "Wind": "वारा",
        "Rain": "पाऊस",
        "AI Weather Assistant": "AI हवामान सहाय्यक",
        "Today": "आज",
        "Hello! 👋": "नमस्कार! 👋",
        "I'm WeatherGPT. Ask me about today's weather, rainfall, temperature or alerts.": "मी WeatherGPT आहे. आजचे हवामान, पाऊस, तापमान किंवा सूचनांबद्दल विचारा.",
        "Quick questions": "जलद प्रश्न",
        "Will it rain today?": "आज पाऊस पडेल का?",
        "How hot will it be?": "किती उष्णता असेल?",
        "Is it good for outdoor activities?": "बाहेरील उपक्रमांसाठी हवामान चांगले आहे का?",
        "What's the forecast tomorrow?": "उद्याचा अंदाज काय आहे?",
        "Ask WeatherGPT...": "WeatherGPT ला विचारा...",
        "Forecast": "अंदाज",
        "Alerts": "सूचना",
        "Farmer": "शेतकरी",
        "Home": "होम",
        "Language": "भाषा",
        "Farmer Mode": "शेतकरी मोड",
        "Weather Forecast": "हवामान अंदाज",
        "Hourly Forecast": "तासाचा अंदाज",
        "7-Day Forecast": "7 दिवसांचा अंदाज",
        "Normal": "सामान्य",
        "Planning": "नियोजन",
        "Chat": "चॅट"
    },
    kn: {
        "Good Afternoon 👋": "ಶುಭ ಮಧ್ಯಾಹ್ನ 👋",
        "Ahmedabad, India": "ಅಹಮದಾಬಾದ್, ಭಾರತ",
        "Sunny": "ಬಿಸಿಲು",
        "Feels like 35°C": "ಅನುಭವ 35°C",
        "Humidity": "ತೇವಾಂಶ",
        "Wind": "ಗಾಳಿ",
        "Rain": "ಮಳೆ",
        "AI Weather Assistant": "AI ಹವಾಮಾನ ಸಹಾಯಕ",
        "Today": "ಇಂದು",
        "Hello! 👋": "ನಮಸ್ಕಾರ! 👋",
        "I'm WeatherGPT. Ask me about today's weather, rainfall, temperature or alerts.": "ನಾನು WeatherGPT. ಇಂದಿನ ಹವಾಮಾನ, ಮಳೆ, ತಾಪಮಾನ ಅಥವಾ ಎಚ್ಚರಿಕೆಗಳ ಬಗ್ಗೆ ಕೇಳಿ.",
        "Quick questions": "ತ್ವರಿತ ಪ್ರಶ್ನೆಗಳು",
        "Will it rain today?": "ಇಂದು ಮಳೆಯಾಗುತ್ತದೆಯೇ?",
        "How hot will it be?": "ಎಷ್ಟು ಬಿಸಿಯಾಗಿರುತ್ತದೆ?",
        "Is it good for outdoor activities?": "ಹೊರಾಂಗಣ ಚಟುವಟಿಕೆಗಳಿಗೆ ಹವಾಮಾನ ಉತ್ತಮವೇ?",
        "What's the forecast tomorrow?": "ನಾಳೆಯ ಮುನ್ಸೂಚನೆ ಏನು?",
        "Ask WeatherGPT...": "WeatherGPT ಅನ್ನು ಕೇಳಿ...",
        "Forecast": "ಮುನ್ಸೂಚನೆ",
        "Alerts": "ಎಚ್ಚರಿಕೆಗಳು",
        "Farmer": "ರೈತ",
        "Home": "ಮುಖಪುಟ",
        "Language": "ಭಾಷೆ",
        "Farmer Mode": "ರೈತ ಮೋಡ್",
        "Weather Forecast": "ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ",
        "Hourly Forecast": "ಗಂಟೆಯ ಮುನ್ಸೂಚನೆ",
        "7-Day Forecast": "7 ದಿನಗಳ ಮುನ್ಸೂಚನೆ",
        "Normal": "ಸಾಮಾನ್ಯ",
        "Planning": "ಯೋಜನೆ",
        "Chat": "ಚಾಟ್"
    },
    ta: {
        "Good Afternoon 👋": "மதிய வணக்கம் 👋",
        "Ahmedabad, India": "அகமதாபாத், இந்தியா",
        "Sunny": "வெயில்",
        "Feels like 35°C": "உணரப்படும் வெப்பநிலை 35°C",
        "Humidity": "ஈரப்பதம்",
        "Wind": "காற்று",
        "Rain": "மழை",
        "AI Weather Assistant": "AI வானிலை உதவியாளர்",
        "Today": "இன்று",
        "Hello! 👋": "வணக்கம்! 👋",
        "I'm WeatherGPT. Ask me about today's weather, rainfall, temperature or alerts.": "நான் WeatherGPT. இன்றைய வானிலை, மழை, வெப்பநிலை அல்லது எச்சரிக்கைகள் பற்றி கேளுங்கள்.",
        "Quick questions": "விரைவு கேள்விகள்",
        "Will it rain today?": "இன்று மழை பெய்யுமா?",
        "How hot will it be?": "எவ்வளவு வெப்பமாக இருக்கும்?",
        "Is it good for outdoor activities?": "வெளிப்புற செயல்பாடுகளுக்கு வானிலை ஏற்றதா?",
        "What's the forecast tomorrow?": "நாளைய வானிலை முன்னறிவிப்பு என்ன?",
        "Ask WeatherGPT...": "WeatherGPT-யிடம் கேளுங்கள்...",
        "Forecast": "முன்னறிவிப்பு",
        "Alerts": "எச்சரிக்கைகள்",
        "Farmer": "விவசாயி",
        "Home": "முகப்பு",
        "Language": "மொழி",
        "Farmer Mode": "விவசாயி பயன்முறை",
        "Weather Forecast": "வானிலை முன்னறிவிப்பு",
        "Hourly Forecast": "மணிநேர முன்னறிவிப்பு",
        "7-Day Forecast": "7 நாள் முன்னறிவிப்பு",
        "Normal": "இயல்பு",
        "Planning": "திட்டமிடல்",
        "Chat": "உரையாடல்"
    },
    bn: {
        "Good Afternoon 👋": "শুভ অপরাহ্ন 👋",
        "Ahmedabad, India": "আহমেদাবাদ, ভারত",
        "Sunny": "রৌদ্রোজ্জ্বল",
        "Feels like 35°C": "অনুভূত তাপমাত্রা 35°C",
        "Humidity": "আর্দ্রতা",
        "Wind": "বাতাস",
        "Rain": "বৃষ্টি",
        "AI Weather Assistant": "AI আবহাওয়া সহায়ক",
        "Today": "আজ",
        "Hello! 👋": "হ্যালো! 👋",
        "I'm WeatherGPT. Ask me about today's weather, rainfall, temperature or alerts.": "আমি WeatherGPT। আজকের আবহাওয়া, বৃষ্টি, তাপমাত্রা বা সতর্কতা সম্পর্কে জিজ্ঞাসা করুন।",
        "Quick questions": "দ্রুত প্রশ্ন",
        "Will it rain today?": "আজ কি বৃষ্টি হবে?",
        "How hot will it be?": "কতটা গরম হবে?",
        "Is it good for outdoor activities?": "বাইরের কাজের জন্য আবহাওয়া ভালো কি?",
        "What's the forecast tomorrow?": "আগামীকালের পূর্বাভাস কী?",
        "Ask WeatherGPT...": "WeatherGPT-কে জিজ্ঞাসা করুন...",
        "Forecast": "পূর্বাভাস",
        "Alerts": "সতর্কতা",
        "Farmer": "কৃষক",
        "Home": "হোম",
        "Language": "ভাষা",
        "Farmer Mode": "কৃষক মোড",
        "Weather Forecast": "আবহাওয়ার পূর্বাভাস",
        "Hourly Forecast": "ঘণ্টাভিত্তিক পূর্বাভাস",
        "7-Day Forecast": "৭ দিনের পূর্বাভাস",
        "Normal": "সাধারণ",
        "Planning": "পরিকল্পনা",
        "Chat": "চ্যাট"
    }
};

const farmerTranslationRows = {
    "Feels like 35°C": ["महसूस तापमान 35°C", "અનુભવાય છે 35°C", "जाणवते 35°C", "ಅನುಭವ 35°C", "உணரப்படும் வெப்பநிலை 35°C", "অনুভূত তাপমাত্রা 35°C"],
    "+3° warmer than actual": ["वास्तविक से +3° अधिक गर्म", "વાસ્તવિક કરતાં +3° વધુ ગરમ", "प्रत्यक्ष तापमानापेक्षा +3° उबदार", "ನಿಜವಾದ ತಾಪಮಾನಕ್ಕಿಂತ +3° ಹೆಚ್ಚು ಬೆಚ್ಚಗೆ", "உண்மையான வெப்பநிலையை விட +3° வெப்பம்", "প্রকৃত তাপমাত্রার চেয়ে +3° বেশি উষ্ণ"],
    "Comfortable": ["आरामदायक", "આરામદાયક", "आरामदायक", "ಆರಾಮದಾಯಕ", "வசதியானது", "আরামদায়ক"],
    "Stay hydrated": ["पानी पीते रहें", "પાણી પીતા રહો", "पाणी पीत राहा", "ನೀರನ್ನು ಸಾಕಷ್ಟು ಕುಡಿಯಿರಿ", "நீர்ச்சத்து பெறுங்கள்", "জল পান করুন"],
    "Keep warm": ["गर्म रहें", "ગરમ રહો", "उबदार राहा", "ಬೆಚ್ಚಗಿರಿ", "சூடாக இருங்கள்", "উষ್ಣ থাকুন"],
    "Current location": ["वर्तमान स्थान", "વર્તમાન સ્થાન", "सध्याचे स्थान", "ಪ್ರಸ್ತುತ ಸ್ಥಳ", "தற்போதைய இருப்பிடம்", "বর্তমান অবস্থান"],
    "Search city...": ["शहर खोजें...", "શહેર શોધો...", "शहर शोधा...", "ನಗರವನ್ನು ಹುಡುಕಿ...", "நகரத்தைத் தேடுங்கள்...", "শহর খুঁজুন..."],
    "Search location": ["स्थान खोजें", "સ્થાન શોધો", "स्थान शोधा", "ಸ್ಥಳವನ್ನು ಹುಡುಕಿ", "இருப்பிடத்தைத் தேடுங்கள்", "অবস্থান খুঁজুন"],
    "No locations found": ["कोई स्थान नहीं मिला", "કોઈ સ્થાન મળ્યું નથી", "स्थान सापडले नाही", "ಯಾವುದೇ ಸ್ಥಳಗಳು ಕಂಡುಬಂದಿಲ್ಲ", "இருப்பிடங்கள் எதுவும் கிடைக்கவில்லை", "কোনো অবস্থান পাওয়া যায়নি"],
    "Today's Farm Plan": ["आज की खेती योजना", "આજની ખેતી યોજના", "आजची शेती योजना", "ಇಂದಿನ ಕೃಷಿ ಯೋಜನೆ", "இன்றைய பண்ணைத் திட்டம்", "আজকের খামার পরিকল্পনা"],
    "Crop": ["फसल", "પાક", "पीक", "ಬೆಳೆ", "பயிர்", "ফসল"],
    "Growth stage": ["विकास चरण", "વૃદ્ધિનો તબક્કો", "वाढीचा टप्पा", "ಬೆಳವಣಿಗೆಯ ಹಂತ", "வளர்ச்சி நிலை", "বৃদ্ধির পর্যায়"],
    "Soil moisture (%)": ["मिट्टी की नमी (%)", "જમીનની ભેજ (%)", "मातीतील ओलावा (%)", "ಮಣ್ಣಿನ ತೇವಾಂಶ (%)", "மண் ஈரப்பதம் (%)", "মাটির আর্দ্রতা (%)"],
    "Refresh plan": ["योजना ताज़ा करें", "યોજના તાજી કરો", "योजना ताजी करा", "ಯೋಜನೆಯನ್ನು ರಿಫ್ರೆಶ್ ಮಾಡಿ", "திட்டத்தைப் புதுப்பிக்கவும்", "পরিকল্পনা রিফ্রেশ করুন"],
    "Choose your crop to load a plan.": ["योजना लोड करने के लिए अपनी फसल चुनें।", "યોજના લોડ કરવા માટે તમારો પાક પસંદ કરો.", "योजना लोड करण्यासाठी तुमचे पीक निवडा.", "ಯೋಜನೆಯನ್ನು ಲೋಡ್ ಮಾಡಲು ನಿಮ್ಮ ಬೆಳೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.", "திட்டத்தை ஏற்ற உங்கள் பயிரைத் தேர்ந்தெடுக்கவும்.", "পরিকল্পনা লোড করতে আপনার ফসল বেছে নিন।"],
    "Rainfall forecast": ["वर्षा पूर्वानुमान", "વરસાદની આગાહી", "पावसाचा अंदाज", "ಮಳೆಯ ಮುನ್ಸೂಚನೆ", "மழை முன்னறிவிப்பு", "বৃষ্টির পূর্বাভাস"],
    "Hourly": ["घंटेवार", "કલાકદીઠ", "तासानुसार", "ಗಂಟೆಯ", "மணிநேர", "ঘণ্টাভিত্তিক"],
    "7 / 14-day outlook": ["7 / 14-दिन का पूर्वानुमान", "7 / 14 દિવસની આગાહી", "7 / 14 दिवसांचा अंदाज", "7 / 14 ದಿನಗಳ ಮುನ್ಸೂಚನೆ", "7 / 14 நாள் பார்வை", "৭ / ১৪ দিনের পূর্বাভাস"],
    "Daily": ["दैनिक", "દૈનિક", "दैनिक", "ದೈನಂದಿನ", "தினசரி", "দৈনিক"],
    "💧 Irrigation advisor": ["💧 सिंचाई सलाहकार", "💧 સિંચાઈ સલાહકાર", "💧 सिंचन सल्लागार", "💧 ನೀರಾವರಿ ಸಲಹೆಗಾರ", "💧 நீர்ப்பாசன ஆலோசகர்", "💧 সেচ পরামর্শদাতা"],
    "Add your crop details to see irrigation advice.": ["सिंचाई सलाह देखने के लिए फसल की जानकारी जोड़ें।", "સિંચાઈની સલાહ જોવા માટે પાકની વિગતો ઉમેરો.", "सिंचन सल्ला पाहण्यासाठी पिकाची माहिती जोडा.", "ನೀರಾವರಿ ಸಲಹೆ ನೋಡಲು ನಿಮ್ಮ ಬೆಳೆಯ ವಿವರಗಳನ್ನು ಸೇರಿಸಿ.", "நீர்ப்பாசன ஆலோசனையைப் பார்க்க பயிர் விவரங்களைச் சேர்க்கவும்.", "সেচের পরামর্শ দেখতে ফসলের তথ্য যোগ করুন।"],
    "☀️ Best time to work": ["☀️ काम करने का सबसे अच्छा समय", "☀️ કામ કરવાનો શ્રેષ્ઠ સમય", "☀️ काम करण्याची सर्वोत्तम वेळ", "☀️ ಕೆಲಸ ಮಾಡಲು ಉತ್ತಮ ಸಮಯ", "☀️ வேலை செய்ய சிறந்த நேரம்", "☀️ কাজের সেরা সময়"],
    "We'll suggest the safest work window.": ["हम सबसे सुरक्षित काम का समय सुझाएंगे।", "અમે સૌથી સુરક્ષિત કામનો સમય સૂચવીશું.", "आम्ही सर्वात सुरक्षित कामाची वेळ सुचवू.", "ನಾವು ಸುರಕ್ಷಿತ ಕೆಲಸದ ಸಮಯವನ್ನು ಸೂಚಿಸುತ್ತೇವೆ.", "பாதுகாப்பான வேலை நேரத்தைப் பரிந்துரைப்போம்.", "আমরা নিরাপদ কাজের সময়ের পরামর্শ দেব।"],
    "Saved crop plan": ["सहेजी गई फसल योजना", "સાચવેલી પાક યોજના", "जतन केलेली पीक योजना", "ಉಳಿಸಿದ ಬೆಳೆ ಯೋಜನೆ", "சேமித்த பயிர் திட்டம்", "সংরক্ষিত ফসল পরিকল্পনা"],
    "Open saved crop plan": ["सहेजी गई फसल योजना खोलें", "સાચવેલી પાક યોજના ખોલો", "जतन केलेली पीक योजना उघडा", "ಉಳಿಸಿದ ಬೆಳೆ ಯೋಜನೆ ತೆರೆಯಿರಿ", "சேமித்த பயிர் திட்டத்தைத் திறக்கவும்", "সংরক্ষিত ফসল পরিকল্পনা খুলুন"],
    "Tap to open full plan and prediction": ["पूरी योजना और अनुमान खोलने के लिए टैप करें", "સંપૂર્ણ યોજના અને અનુમાન ખોલવા માટે ટેપ કરો", "संपूर्ण योजना आणि अंदाज उघडण्यासाठी टॅप करा", "ಪೂರ್ಣ ಯೋಜನೆ ಮತ್ತು ಮುನ್ಸೂಚನೆ ತೆರೆಯಲು ಟ್ಯಾಪ್ ಮಾಡಿ", "முழு திட்டம் மற்றும் முன்னறிவிப்பைத் திறக்க தட்டவும்", "সম্পূর্ণ পরিকল্পনা এবং পূর্বাভাস খুলতে ট্যাপ করুন"],
    "Analyze plan": ["योजना का विश्लेषण करें", "યોજનાનું વિશ્લેષણ કરો", "योजनेचे विश्लेषण करा", "ಯೋಜನೆಯನ್ನು ವಿಶ್ಲೇಷಿಸಿ", "திட்டத்தைப் பகுப்பாய்வு செய்யவும்", "পরিকল্পনা বিশ্লেষণ করুন"],
    "Farmer Forecast": ["किसान पूर्वानुमान", "ખેડૂત આગાહી", "शेतकरी अंदाज", "ರೈತ ಮುನ್ಸೂಚನೆ", "விவசாயி முன்னறிவிப்பு", "কৃষক পূর্বাভাস"],
    "7-Day Weather": ["7-दिन का मौसम", "7 દિવસનું હવામાન", "7 दिवसांचे हवामान", "7 ದಿನಗಳ ಹವಾಮಾನ", "7 நாள் வானிலை", "৭ দিনের আবহাওয়া"],
    "Based on your location": ["आपके स्थान के आधार पर", "તમારા સ્થાનના આધારે", "तुमच्या स्थानावर आधारित", "ನಿಮ್ಮ ಸ್ಥಳವನ್ನು ಆಧರಿಸಿ", "உங்கள் இருப்பிடத்தின் அடிப்படையில்", "আপনার অবস্থানের ভিত্তিতে"],
    "Summer Season": ["गर्मी का मौसम", "ઉનાળાની ઋતુ", "उन्हाळ्याचा ऋतू", "ಬೇಸಿಗೆ ಕಾಲ", "கோடைக்காலம்", "গ্রীষ্মকাল"],
    "Perfect for planting heat-resistant crops": ["गर्मी सहने वाली फसलें लगाने के लिए उपयुक्त", "ગરમી સહન કરતા પાક માટે યોગ્ય", "उष्णता सहन करणारी पिके लावण्यासाठी योग्य", "ಶಾಖ-ನಿರೋಧಕ ಬೆಳೆಗಳನ್ನು ನೆಡಲು ಸೂಕ್ತ", "வெப்பத்தைத் தாங்கும் பயிர்களை நடவு செய்ய ஏற்றது", "তাপ-সহনশীল ফসল রোপণের জন্য উপযুক্ত"],
    "High Rainfall Expected": ["भारी बारिश की संभावना", "ભારે વરસાદની શક્યતા", "जोरदार पावसाची शक्यता", "ಹೆಚ್ಚಿನ ಮಳೆಯ ನಿರೀಕ್ಷೆ", "அதிக மழை எதிர்பார்க்கப்படுகிறது", "ভারী বৃষ্টির সম্ভাবনা"],
    "Hot & Dry Ahead": ["आगे गर्मी और सूखा", "આગળ ગરમી અને શુષ્કતા", "पुढे उष्ण आणि कोरडे हवामान", "ಮುಂದೆ ಬಿಸಿ ಮತ್ತು ಶುಷ್ಕ ಹವಾಮಾನ", "முன்னால் வெப்பமும் வறட்சியும்", "সামনে গরম ও শুষ্ক আবহাওয়া"],
    "Farmer Assistant": ["किसान सहायक", "ખેડૂત સહાયક", "शेतकरी सहाय्यक", "ರೈತ ಸಹಾಯಕ", "விவசாயி உதவியாளர்", "কৃষক সহায়ক"],
    "Ask Your Questions": ["अपने प्रश्न पूछें", "તમારા પ્રશ્નો પૂછો", "तुमचे प्रश्न विचारा", "ನಿಮ್ಮ ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಿ", "உங்கள் கேள்விகளைக் கேளுங்கள்", "আপনার প্রশ্ন জিজ্ঞাসা করুন"],
    "Common Questions": ["सामान्य प्रश्न", "સામાન્ય પ્રશ્નો", "सामान्य प्रश्न", "ಸಾಮಾನ್ಯ ಪ್ರಶ್ನೆಗಳು", "பொதுவான கேள்விகள்", "সাধারণ প্রশ্ন"],
    "Farmer Alerts": ["किसान चेतावनियाँ", "ખેડૂત ચેતવણીઓ", "शेतकरी सूचना", "ರೈತ ಎಚ್ಚರಿಕೆಗಳು", "விவசாயி எச்சரிக்கைகள்", "কৃষক সতর্কতা"],
    "Weather & Crop Alerts": ["मौसम और फसल चेतावनियाँ", "હવામાન અને પાકની ચેતવણીઓ", "हवामान आणि पीक सूचना", "ಹವಾಮಾನ ಮತ್ತು ಬೆಳೆ ಎಚ್ಚರಿಕೆಗಳು", "வானிலை மற்றும் பயிர் எச்சரிக்கைகள்", "আবহাওয়া ও ফসলের সতর্কতা"],
    "Critical information for your farm": ["आपके खेत के लिए महत्वपूर्ण जानकारी", "તમારા ખેતર માટે મહત્વપૂર્ણ માહિતી", "तुमच्या शेतासाठी महत्त्वाची माहिती", "ನಿಮ್ಮ ಹೊಲಕ್ಕೆ ಪ್ರಮುಖ ಮಾಹಿತಿ", "உங்கள் பண்ணைக்கான முக்கிய தகவல்", "আপনার খামারের জন্য গুরুত্বপূর্ণ তথ্য"],
    "Hello! 👋 I am your farming assistant.": ["नमस्ते! 👋 मैं आपका किसान सहायक हूँ।", "નમસ્તે! 👋 હું તમારો ખેડૂત સહાયક છું.", "नमस्कार! 👋 मी तुमचा शेतकरी सहाय्यक आहे.", "ನಮಸ್ಕಾರ! 👋 ನಾನು ನಿಮ್ಮ ರೈತ ಸಹಾಯಕ.", "வணக்கம்! 👋 நான் உங்கள் விவசாயி உதவியாளர்.", "হ্যালো! 👋 আমি আপনার কৃষক সহায়ক।"],
    "Ask me:": ["मुझसे पूछें:", "મને પૂછો:", "मला विचारा:", "ನನ್ನನ್ನು ಕೇಳಿ:", "என்னிடம் கேளுங்கள்:", "আমাকে জিজ্ঞাসা করুন:"],
    "Can I irrigate today?": ["क्या मैं आज सिंचाई कर सकता हूँ?", "શું હું આજે સિંચાઈ કરી શકું?", "मी आज सिंचन करू शकतो का?", "ನಾನು ಇಂದು ನೀರಾವರಿ ಮಾಡಬಹುದೇ?", "இன்று நீர்ப்பாசனம் செய்யலாமா?", "আমি কি আজ সেচ দিতে পারি?"],
    "Which crop can be planted now?": ["अभी कौन सी फसल बोई जा सकती है?", "હમણાં કયો પાક વાવી શકાય?", "आता कोणते पीक लावता येईल?", "ಈಗ ಯಾವ ಬೆಳೆಯನ್ನು ನೆಡಬಹುದು?", "இப்போது எந்தப் பயிரை நடலாம்?", "এখন কোন ফসল লাগানো যায়?"],
    "What should the soil moisture be?": ["मिट्टी की नमी कितनी होनी चाहिए?", "જમીનની ભેજ કેટલી હોવી જોઈએ?", "मातीतील ओलावा किती असावा?", "ಮಣ್ಣಿನ ತೇವಾಂಶ ಎಷ್ಟಿರಬೇಕು?", "மண் ஈரப்பதம் எவ்வளவு இருக்க வேண்டும்?", "মাটির আর্দ্রতা কত হওয়া উচিত?"],
    "Irrigation timing?": ["सिंचाई का समय?", "સિંચાઈનો સમય?", "सिंचनाची वेळ?", "ನೀರಾವರಿ ಸಮಯ?", "நீர்ப்பாசன நேரம்?", "সেচের সময়?"],
    "Crop care": ["फसल की देखभाल", "પાકની સંભાળ", "पिकाची काळजी", "ಬೆಳೆ ಆರೈಕೆ", "பயிர் பராமரிப்பு", "ফসলের যত্ন"],
    "Pest control": ["कीट नियंत्रण", "જીવાત નિયંત્રણ", "कीड नियंत्रण", "ಕೀಟ ನಿಯಂತ್ರಣ", "பூச்சி கட்டுப்பாடு", "কীটপতঙ্গ নিয়ন্ত্রণ"],
    "Soil testing": ["मिट्टी की जांच", "જમીનની તપાસ", "मातीची तपासणी", "ಮಣ್ಣಿನ ಪರೀಕ್ಷೆ", "மண் பரிசோதனை", "মাটি পরীক্ষা"],
    "No tasks recommended for today.": ["आज के लिए कोई कार्य सुझाया नहीं गया।", "આજ માટે કોઈ કાર્ય સૂચવ્યું નથી.", "आजसाठी कोणतेही काम सुचवलेले नाही.", "ಇಂದಿಗೆ ಯಾವುದೇ ಕೆಲಸವನ್ನು ಶಿಫಾರಸು ಮಾಡಲಾಗಿಲ್ಲ.", "இன்றைக்கு பணிகள் எதுவும் பரிந்துரைக்கப்படவில்லை.", "আজকের জন্য কোনো কাজের পরামর্শ নেই।"],
    "No forecast data": ["पूर्वानुमान डेटा उपलब्ध नहीं है", "આગાહીની માહિતી ઉપલબ્ધ નથી", "अंदाजाचा डेटा उपलब्ध नाही", "ಮುನ್ಸೂಚನೆ ಡೇಟಾ ಲಭ್ಯವಿಲ್ಲ", "முன்னறிவிப்பு தரவு இல்லை", "পূর্বাভাসের তথ্য নেই"],
    "Cyclone Center": ["चक्रवात केंद्र", "વાવાઝોડા કેન્દ્ર", "चक्रीवादळ केंद्र", "ಚಂಡಮಾರುತ ಕೇಂದ್ರ", "சூறாவளி மையம்", "ঘূর্ণিঝড় কেন্দ্র"],
    "Checking official sources...": ["आधिकारिक स्रोतों की जांच हो रही है...", "સત્તાવાર સ્ત્રોતો તપાસી રહ્યા છીએ...", "अधिकृत स्रोत तपासत आहे...", "ಅಧಿಕೃತ ಮೂಲಗಳನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...", "அதிகாரப்பூர்வ ஆதாரங்கள் சரிபார்க்கப்படுகின்றன...", "সরকারি উৎস পরীক্ষা করা হচ্ছে..."],
    "No active cyclone warning": ["कोई सक्रिय चक्रवात चेतावनी नहीं", "સક્રિય વાવાઝોડાની ચેતવણી નથી", "सक्रिय चक्रीवादळाची सूचना नाही", "ಸಕ್ರಿಯ ಚಂಡಮಾರುತ ಎಚ್ಚರಿಕೆ ಇಲ್ಲ", "செயலில் உள்ள சூறாவளி எச்சரிக்கை இல்லை", "কোনো সক্রিয় ঘূর্ণিঝড় সতর্কতা নেই"],
    "Official data is being checked": ["आधिकारिक डेटा जांचा जा रहा है", "સત્તાવાર માહિતી તપાસવામાં આવી રહી છે", "अधिकृत डेटा तपासला जात आहे", "ಅಧಿಕೃತ ಡೇಟಾವನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ", "அதிகாரப்பூர்வ தரவு சரிபார்க்கப்படுகிறது", "সরকারি তথ্য পরীক্ষা করা হচ্ছে"],
    "Tracking map": ["ट्रैकिंग मानचित्र", "ટ્રેકિંગ નકશો", "ट्रॅकिंग नकाशा", "ಟ್ರ್ಯಾಕಿಂಗ್ ನಕ್ಷೆ", "கண்காணிப்பு வரைபடம்", "ট্র্যাকিং মানচিত্র"],
    "Expected movement": ["अपेक्षित गति", "અપેક્ષિત ગતિ", "अपेक्षित हालचाल", "ನಿರೀಕ್ಷಿತ ಚಲನೆ", "எதிர்பார்க்கப்படும் இயக்கம்", "প্রত্যাশিত গতিপথ"],
    "Farmer precautions": ["किसान सावधानियां", "ખેડૂત સાવચેતીઓ", "शेतकरी खबरदारी", "ರೈತರ ಮುನ್ನೆಚ್ಚರಿಕೆಗಳು", "விவசாயி முன்னெச்சரிக்கைகள்", "কৃষকের সতর্কতা"],
    "Ask about this cyclone": ["इस चक्रवात के बारे में पूछें", "આ વાવાઝોડા વિશે પૂછો", "या चक्रीवादळाबद्दल विचारा", "ಈ ಚಂಡಮಾರುತದ ಬಗ್ಗೆ ಕೇಳಿ", "இந்த சூறாவளி பற்றி கேளுங்கள்", "এই ঘূর্ণিঝড় সম্পর্কে জিজ্ঞাসা করুন"],
    "Weather Warnings": ["मौसम चेतावनियां", "હવામાન ચેતવણીઓ", "हवामान सूचना", "ಹವಾಮಾನ ಎಚ್ಚರಿಕೆಗಳು", "வானிலை எச்சரிக்கைகள்", "আবহাওয়ার সতর্কতা"],
    "Live risk center": ["लाइव जोखिम केंद्र", "લાઇવ જોખમ કેન્દ્ર", "लाइव्ह जोखीम केंद्र", "ನೇರ ಅಪಾಯ ಕೇಂದ್ರ", "நேரடி ஆபத்து மையம்", "লাইভ ঝুঁকি কেন্দ্র"],
    "Refresh": ["ताज़ा करें", "તાજું કરો", "ताजे करा", "ರಿಫ್ರೆಶ್", "புதுப்பிக்கவும்", "রিফ্রেশ করুন"],
    "All": ["सभी", "બધા", "सर्व", "ಎಲ್ಲಾ", "அனைத்தும்", "সব"],
    "High": ["उच्च", "ઉચ્ચ", "उच्च", "ಹೆಚ್ಚು", "அதிகம்", "উচ্চ"],
    "Medium": ["मध्यम", "મધ્યમ", "मध्यम", "ಮಧ್ಯಮ", "நடுத்தரம்", "মাঝারি"],
    "Low": ["कम", "નીચું", "कमी", "ಕಡಿಮೆ", "குறைவு", "কম"],
    "Before we build your plan": ["योजना बनाने से पहले", "તમારી યોજના બનાવતા પહેલાં", "तुमची योजना बनवण्यापूर्वी", "ನಿಮ್ಮ ಯೋಜನೆಯನ್ನು ನಿರ್ಮಿಸುವ ಮೊದಲು", "உங்கள் திட்டத்தை உருவாக்கும் முன்", "আপনার পরিকল্পনা তৈরির আগে"],
    "Are you starting a new crop this season?": ["क्या आप इस मौसम में नई फसल शुरू कर रहे हैं?", "શું તમે આ સિઝનમાં નવો પાક શરૂ કરી રહ્યા છો?", "या हंगामात तुम्ही नवीन पीक सुरू करत आहात का?", "ಈ ಋತುವಿನಲ್ಲಿ ನೀವು ಹೊಸ ಬೆಳೆಯನ್ನು ಪ್ರಾರಂಭಿಸುತ್ತಿದ್ದೀರಾ?", "இந்த பருவத்தில் புதிய பயிரைத் தொடங்குகிறீர்களா?", "আপনি কি এই মৌসুমে নতুন ফসল শুরু করছেন?"],
    "Yes, start cropping": ["हां, फसल शुरू करें", "હા, પાક શરૂ કરો", "होय, पीक सुरू करा", "ಹೌದು, ಬೆಳೆ ಪ್ರಾರಂಭಿಸಿ", "ஆம், பயிர் தொடங்கவும்", "হ্যাঁ, ফসল শুরু করুন"],
    "No, show seasonal advice": ["नहीं, मौसमी सलाह दिखाएं", "ના, મોસમી સલાહ બતાવો", "नाही, हंगामी सल्ला दाखवा", "ಇಲ್ಲ, ಋತುಮಾನದ ಸಲಹೆ ತೋರಿಸಿ", "இல்லை, பருவகால ஆலோசனையைக் காட்டு", "না, মৌসুমি পরামর্শ দেখান"]
};

Object.entries(farmerTranslationRows).forEach(([source, values]) => {
    ["hi", "gu", "mr", "kn", "ta", "bn"].forEach((language, index) => {
        translations[language][source] = values[index];
    });
});

const intelligenceTranslationRows = {
    "Weather Intelligence": ["मौसम इंटेलिजेंस", "હવામાન ઇન્ટેલિજન્સ", "हवामान इंटेलिजन्स", "ಹವಾಮಾನ ಬುದ್ಧಿವಂತಿಕೆ", "வானிலை நுண்ணறிவு", "আবহাওয়া বুদ্ধিমত্তা"],
    "Route Intelligence": ["मार्ग इंटेलिजेंस", "રૂટ ઇન્ટેલિજન્સ", "मार्ग इंटेलिजन्स", "ಮಾರ್ಗ ಬುದ್ಧಿವಂತಿಕೆ", "வழி நுண்ணறிவு", "রুট বুদ্ধিমত্তা"],
    "Mission Briefing": ["मिशन ब्रीफिंग", "મિશન બ્રીફિંગ", "मिशन ब्रीफिंग", "ಮಿಷನ್ ಬ್ರೀಫಿಂಗ್", "பணி விளக்கம்", "মিশন ব্রিফিং"],
    "Live route weather": ["लाइव मार्ग मौसम", "લાઇવ રૂટ હવામાન", "लाइव्ह मार्ग हवामान", "ಲೈವ್ ಮಾರ್ಗ ಹವಾಮಾನ", "நேரடி வழி வானிலை", "লাইভ রুট আবহাওয়া"],
    "Analyze Route": ["मार्ग का विश्लेषण करें", "રૂટનું વિશ્લેષણ કરો", "मार्गाचे विश्लेषण करा", "ಮಾರ್ಗವನ್ನು ವಿಶ್ಲೇಷಿಸಿ", "வழியைப் பகுப்பாய்வு செய்யவும்", "রুট বিশ্লেষণ করুন"],
    "Refresh Briefing": ["ब्रीफिंग ताज़ा करें", "બ્રીફિંગ તાજું કરો", "ब्रीफिंग ताजी करा", "ಬ್ರೀಫಿಂಗ್ ರಿಫ್ರೆಶ್ ಮಾಡಿ", "விளக்கத்தைப் புதுப்பிக்கவும்", "ব্রিফিং রিফ্রেশ করুন"],
    "Aviation Mode": ["विमानन मोड", "એવિએશન મોડ", "विमान वाहतूक मोड", "ವಿಮಾನಯಾನ ಮೋಡ್", "விமானப் பயன்முறை", "বিমান চলাচল মোড"],
    "Marine Mode": ["समुद्री मोड", "મરીન મોડ", "सागरी मोड", "ಸಮುದ್ರ ಮೋಡ್", "கடல் பயன்முறை", "সামুদ্রিক মোড"],
    "Open Mission Briefing": ["मिशन ब्रीफिंग खोलें", "મિશન બ્રીફિંગ ખોલો", "मिशन ब्रीफिंग उघडा", "ಮಿಷನ್ ಬ್ರೀಫಿಂಗ್ ತೆರೆಯಿರಿ", "பணி விளக்கத்தைத் திறக்கவும்", "মিশন ব্রিফিং খুলুন"]
};
Object.entries(intelligenceTranslationRows).forEach(([source, values]) => {
    ["hi", "gu", "mr", "kn", "ta", "bn"].forEach((language, index) => {
        translations[language][source] = values[index];
    });
});

function translatePage() {
    const dictionary = translations[currentLanguage] || {};
    document.documentElement.lang = currentLanguage;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
        const displayedText = node.nodeValue.trim();
        const sourceText = node._weatherGptSource || displayedText;
        if (!sourceText || !dictionary[sourceText] && currentLanguage !== "en") continue;
        node._weatherGptSource = sourceText;
        const translated = currentLanguage === "en" ? sourceText : dictionary[sourceText];
        node.nodeValue = node.nodeValue.replace(displayedText, translated);
    }

    document.querySelectorAll("[placeholder], [aria-label], [title]").forEach(element => {
        ["placeholder", "aria-label", "title"].forEach(attribute => {
            const value = element.getAttribute(attribute);
            if (!value) return;
            const sourceKey = `weatherGpt${attribute.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())}`;
            const sourceValue = element.dataset[sourceKey] || value;
            const translated = currentLanguage === "en" ? sourceValue : dictionary[sourceValue];
            if (translated) {
                element.dataset[sourceKey] = sourceValue;
                element.setAttribute(attribute, translated);
            }
        });
    });
}

function setLanguage(language) {
    if (!languageNames[language]) return;
    currentLanguage = language;
    const changeToken = ++languageChangeToken;
    if (recognition) recognition.lang = speechLocales[language] || "en-IN";
    localStorage.setItem("weatherGptLanguage", language);
    const storedProfile = readStoredProfile();
    if (storedProfile?.name) {
        storedProfile.language = language;
        storedProfile.syncStatus = "local";
        localStorage.setItem("weatherGptProfile", JSON.stringify(storedProfile));
        syncProfile(storedProfile)
            .then(() => {
                storedProfile.syncStatus = "synced";
                localStorage.setItem("weatherGptProfile", JSON.stringify(storedProfile));
            })
            .catch(error => console.warn("Could not sync the language preference", error));
    }
    const seasonalLanguage = document.getElementById("seasonalLanguage");
    if (seasonalLanguage) seasonalLanguage.value = language;
    const planningLanguageSelect = document.getElementById("planningLanguageSelect");
    if (planningLanguageSelect) planningLanguageSelect.value = language;
    refreshCropOptionLabels();
    updateWeatherScene();
    translatePage();
    updateCurrentDate();
    window.setTimeout(() => {
        if (changeToken !== languageChangeToken) return;
        if (!cycloneScreen?.classList.contains("hidden")) loadCycloneStatus();
        if (!alertsScreen?.classList.contains("hidden")) loadEarlyWarnings(changeToken);
        if (!seasonalPlanner?.classList.contains("hidden")) buildSeasonalPlan();
        if (!farmerPlanContent?.classList.contains("hidden") && latestFarmerPlanResult) loadFarmerPlan();
    }, 0);
    renderSavedFarmProfile();
    showNotification(`${languageNames[language]} selected`);
}

/* =========================================================
DOM ELEMENTS
========================================================= */

const app = document.querySelector(".app");
const homeScreen = document.getElementById("homeScreen");
const forecastScreen = document.getElementById("forecastScreen");
const alertsScreen = document.getElementById("alertsScreen");
const farmerScreen = document.getElementById("farmerScreen");
const cycloneScreen = document.getElementById("cycloneScreen");
const farmerForecastScreen = document.getElementById("farmerForecastScreen");
const farmerChatScreen = document.getElementById("farmerChatScreen");
const farmerAlertScreen = document.getElementById("farmerAlertScreen");
const profileScreen = document.getElementById("profileScreen");

const currentLocationLabel = document.getElementById("currentLocationLabel");
const homeLocationLabel = document.getElementById("homeLocationLabel");
const forecastLocationLabel = document.getElementById("forecastLocationLabel");
const farmerLocationLabel = document.getElementById("farmerLocationLabel");
const farmerForecastLocationLabel = document.getElementById("farmerForecastLocationLabel");
const currentDateLabel = document.getElementById("currentDateLabel");
const locationSearchForm = document.getElementById("locationSearchForm");
const locationSearchInput = document.getElementById("locationSearchInput");
const locationResults = document.getElementById("locationResults");

function updateCurrentDate() {
    if (!currentDateLabel) return;
    const locale = {
        en: "en-IN", hi: "hi-IN", gu: "gu-IN", mr: "mr-IN",
        kn: "kn-IN", ta: "ta-IN", bn: "bn-IN"
    }[currentLanguage] || "en-IN";
    currentDateLabel.textContent = new Intl.DateTimeFormat(locale, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
    }).format(new Date());
}

function updateLocationLabels(location) {
    const cityLabel = `${location.name}, ${location.country || "India"}`;
    const cityOnly = location.name;
    if (currentLocationLabel) currentLocationLabel.textContent = cityLabel;
    if (homeLocationLabel) homeLocationLabel.textContent = cityLabel;
    if (forecastLocationLabel) forecastLocationLabel.textContent = cityOnly;
    if (farmerLocationLabel) farmerLocationLabel.textContent = `📍 ${cityLabel}`;
    if (farmerForecastLocationLabel) farmerForecastLocationLabel.textContent = `📍 ${cityLabel}`;

    farmerLocation = {
        ...farmerLocation,
        name: location.name,
        country: location.country || farmerLocation.country,
        latitude: location.latitude,
        longitude: location.longitude
    };
    weatherData.city = location.name;
    weatherData.country = location.country || weatherData.country;
    localStorage.setItem("weatherGptLocation", JSON.stringify(farmerLocation));
    translatePage();
    loadWeatherData();
}

const speechLocales = {
    en: "en-IN", hi: "hi-IN", gu: "gu-IN", mr: "mr-IN",
    kn: "kn-IN", ta: "ta-IN", bn: "bn-IN", te: "te-IN",
    ml: "ml-IN", pa: "pa-IN", or: "od-IN"
};

function weatherEmoji(code) {
    return code >= 95 ? "⛈️" : code >= 51 ? "🌧️" : code >= 1 ? "⛅" : "☀️";
}

function renderHourlyCards(hourly, isTomorrow = false) {
    if (!hourlyContainer || !Array.isArray(hourly) || !hourly.length) return;
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const tomorrowItems = hourly.filter(item => item.time && item.time.startsWith(tomorrow));
    const items = isTomorrow
        ? (tomorrowItems.length >= 6 ? tomorrowItems.slice(0, 8) : hourly.slice(24, 32))
        : hourly.slice(0, 8);
    hourlyContainer.innerHTML = items.map((item, index) => {
        const time = new Date(item.time).toLocaleTimeString([], { hour: "numeric" });
        return `<div class="hour-card${index === 0 && !isTomorrow ? " active" : ""}"><small>${index === 0 && !isTomorrow ? "Now" : escapeHTML(time)}</small><span>${weatherEmoji(item.weatherCode)}</span><strong>${item.temperature}°</strong><small>${item.precipitationProbability ?? 0}%</small></div>`;
    }).join("");
}

function renderTrendChart(days, selector, highSelector, lowSelector, pointsSelector, barsSelector) {
    const svg = document.querySelector(selector);
    const visibleDays = Array.isArray(days) ? days.slice(0, 7) : [];
    if (!svg || !visibleDays.length) return;
    const points = visibleDays.map((_, index) => 83 + (index * 450 / Math.max(visibleDays.length - 1, 1)));
    const values = visibleDays.flatMap(day => [Number(day.tempMax), Number(day.tempMin)]).filter(Number.isFinite);
    if (!values.length) return;
    const top = Math.max(30, Math.max(...values) + 2);
    const bottom = Math.min(186, Math.min(...values) - 2);
    const yFor = temperature => 30 + ((top - temperature) / Math.max(top - bottom, 1)) * 156;
    const highPath = `M${visibleDays.map((day, index) => `${points[index]} ${yFor(Number(day.tempMax))}`).join(" L")}`;
    const lowPath = `M${visibleDays.map((day, index) => `${points[index]} ${yFor(Number(day.tempMin))}`).join(" L")}`;
    svg.querySelector(highSelector)?.setAttribute("d", highPath);
    svg.querySelector(lowSelector)?.setAttribute("d", lowPath);
    svg.querySelector(".chart-area")?.setAttribute("d", `${highPath} L${points[points.length - 1]} 186 L${points[0]} 186 Z`);
    const pointGroup = svg.querySelector(pointsSelector);
    if (pointGroup) pointGroup.innerHTML = visibleDays.map((day, index) => `<circle cx="${points[index]}" cy="${yFor(Number(day.tempMax))}" r="4"/>`).join("");
    const labels = svg.querySelector(".chart-labels");
    if (labels) labels.innerHTML = visibleDays.map((day, index) => `<text x="${points[index]}" y="216">${escapeHTML(index === 0 ? "Today" : new Date(`${day.date}T00:00:00`).toLocaleDateString([], { weekday: "short" }))}</text>`).join("");
    const bars = svg.querySelector(barsSelector);
    if (bars) bars.innerHTML = visibleDays.map((day, index) => {
        const rain = Number(day.precipitationProbabilityMax) || 0;
        const height = Math.max(10, rain * 0.9);
        const className = rain >= 60 ? "bar-danger" : rain >= 30 ? "bar-watch" : "bar-safe";
        return `<rect class="${className}" x="${points[index] - 17}" y="${186 - height}" width="34" height="${height}" rx="8"/>`;
    }).join("");
}

async function loadWeatherData() {
    try {
        const params = new URLSearchParams({
            lat: String(farmerLocation.latitude),
            lon: String(farmerLocation.longitude),
            name: farmerLocation.name
        });
        const response = await fetch(`${API_BASE}/api/weather/current?${params.toString()}`);
        if (!response.ok) throw new Error(`Weather request failed (${response.status})`);
        const result = await response.json();
        latestForecast = result;
        renderWeatherMap(result);
        const current = result.current || {};
        weatherData = {
            ...weatherData,
            temperature: current.temperature ?? weatherData.temperature,
            feelsLike: current.apparentTemperature ?? weatherData.feelsLike,
            condition: current.weatherDescription ?? weatherData.condition,
            humidity: current.relativeHumidity ?? weatherData.humidity,
            wind: current.windSpeed ?? weatherData.wind,
            rain: current.precipitationProbability ?? weatherData.rain
        };
        syncBackendSoilMoisture(current.soilMoisture);
        if (!seasonalPlanner?.classList.contains("hidden")) buildSeasonalPlan();
        updateWeatherScene();
        document.getElementById("currentTemperature")?.replaceChildren(document.createTextNode(`${weatherData.temperature ?? "--"}${weatherData.temperature === null ? "" : "°C"}`));
        document.getElementById("currentHumidity")?.replaceChildren(document.createTextNode(`${weatherData.humidity ?? "--"}${weatherData.humidity === null ? "" : "%"}`));
        document.getElementById("currentWind")?.replaceChildren(document.createTextNode(`${weatherData.wind ?? "--"}${weatherData.wind === null ? "" : " km/h"}`));
        document.getElementById("currentRain")?.replaceChildren(document.createTextNode(`${weatherData.rain ?? "--"}${weatherData.rain === null ? "" : "%"}`));
        const quality = document.getElementById("homeDataQuality");
        if (quality) quality.textContent = `Source: ${result.source || "live provider"} · Updated: ${result.updatedAt ? new Date(result.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "--"} · Confidence: ${result.dataQuality?.confidence || "modelled"}`;
        const detailValues = document.querySelectorAll(".weather-details .detail-card strong");
        if (detailValues.length >= 3) {
            detailValues[0].textContent = `${weatherData.humidity}%`;
            detailValues[1].textContent = `${weatherData.wind} km/h`;
            detailValues[2].textContent = `${weatherData.rain}%`;
        }
        renderFarmerForecast(result.daily || []);
        renderNormalForecast(result);
        function renderNormalForecast(result) {
            const hourly = Array.isArray(result.hourly) ? result.hourly : [];
            const daily = Array.isArray(result.daily) ? result.daily : [];
            renderHourlyCards(hourly, activeForecastTab === "Tomorrow");
            const forecastHeroTemp = document.getElementById("forecastHeroTemp");
            const forecastHeroCondition = document.getElementById("forecastHeroCondition");
            const forecastHeroHigh = document.getElementById("forecastHeroHigh");
            const forecastHeroLow = document.getElementById("forecastHeroLow");
            const current = result.current || {};
            if (forecastHeroTemp && current.temperature !== undefined) forecastHeroTemp.textContent = `${current.temperature}°C`;
            if (forecastHeroCondition && current.weatherDescription) forecastHeroCondition.textContent = current.weatherDescription;
            if (forecastHeroHigh && daily[0]?.tempMax !== undefined) forecastHeroHigh.textContent = `H: ${daily[0].tempMax}°`;
            if (forecastHeroLow && daily[0]?.tempMin !== undefined) forecastHeroLow.textContent = `L: ${daily[0].tempMin}°`;
            if (weekForecast) {
                weekForecast.innerHTML = daily.slice(0, 7).map(day => {
                    const date = new Date(`${day.date}T00:00:00`).toLocaleDateString([], { month: "short", day: "numeric" });
                    return `<div class="day-card"><div class="day-name"><strong>${escapeHTML(day.dayName)}</strong><small>${date}</small></div><span class="day-icon">${weatherEmoji(day.weatherCode)}</span><div class="rain">💧 ${day.precipitationProbabilityMax}%</div><div class="temperature"><strong>${day.tempMax}°</strong><span>${day.tempMin}°</span></div></div>`;
                }).join("");
            }
            const chartSummary = document.querySelector(".forecast-chart-card .chart-summary");
            if (chartSummary && daily.length) {
                const avgHigh = Math.round(daily.slice(0, 7).reduce((sum, day) => sum + (day.tempMax || 0), 0) / Math.min(daily.length, 7));
                const maxRain = Math.max(...daily.slice(0, 7).map(day => day.precipitationProbabilityMax || 0));
                chartSummary.innerHTML = `<span><strong>${avgHigh}°</strong> average high</span><span><strong>${maxRain}%</strong> max rain probability</span><span class="trend-up">↗ Live 7-day forecast</span>`;
            }
            renderTrendChart(daily, ".forecast-chart-card svg", ".high-line", ".low-line", ".high-points", ".rain-bars");
        }
    } catch (error) {
        console.warn("Live weather data is unavailable", error);
    }
}

function renderFarmerForecast(days) {
    const container = document.getElementById("farmer7DayForecast");
    if (!container || !days.length) return;
    container.innerHTML = days.slice(0, 7).map(day => `
        <div class="farmer-day-card">
            <div class="day-date">${escapeHTML(day.dayName || day.date || "Day")}</div>
            <div class="day-condition">${day.weatherCode >= 51 ? "🌧️" : day.weatherCode >= 1 ? "⛅" : "☀️"}</div>
            <div class="day-temp">${day.tempMax}°C / ${day.tempMin}°C</div>
            <div class="day-rain">🌧️ ${day.precipitationProbabilityMax}%</div>
            <div class="day-wind">💨 ${day.windSpeedMax} km/h</div>
        </div>
    `).join("");
    renderTrendChart(days, ".farmer-chart-card svg", ".farmer-high-line", ".farmer-low-line", ".farmer-points", ".farmer-bars");
}

async function loadFarmerForecast() {
    const container = document.getElementById("farmer7DayForecast");
    if (container) {
        container.setAttribute("aria-busy", "true");
        container.innerHTML = `<div class="farmer-forecast-status">Checking the skies for your farm...</div>`;
    }
    try {
        const params = new URLSearchParams({
            lat: String(farmerLocation.latitude),
            lon: String(farmerLocation.longitude),
            name: farmerLocation.name
        });
        const response = await fetch(`${API_BASE}/api/weather/current?${params.toString()}`);
        if (!response.ok) throw new Error(`Forecast request failed (${response.status})`);
        const result = await response.json();
        latestForecast = result;
        renderFarmerForecast(Array.isArray(result.daily) ? result.daily : []);
        renderFarmerForecastSummary(result.daily || []);
    } catch (error) {
        console.error("Farmer forecast request failed", error);
        if (container) container.innerHTML = `<div class="farmer-forecast-status error">Live forecast is unavailable. Please try again.</div>`;
    } finally {
        container?.setAttribute("aria-busy", "false");
    }
}

function renderFarmerForecastSummary(days) {
    const rainfallAlert = document.querySelector("#farmerForecastScreen .rainfall-alert p");
    const droughtAlert = document.querySelector("#farmerForecastScreen .drought-alert p");
    if (!days.length) return;
    const wettest = days.reduce((best, day) => (day.precipitationProbabilityMax > (best?.precipitationProbabilityMax || 0) ? day : best), days[0]);
    const hottest = days.reduce((best, day) => (day.tempMax > (best?.tempMax || 0) ? day : best), days[0]);
    if (rainfallAlert) rainfallAlert.textContent = `${wettest.dayName || wettest.date} has the highest rain probability at ${wettest.precipitationProbabilityMax}%. Avoid irrigation if rain is likely.`;
    if (droughtAlert) droughtAlert.textContent = `${hottest.dayName || hottest.date} may reach ${hottest.tempMax}°C. Check soil moisture and irrigate only when needed.`;
}

function hideLocationResults() {
    if (!locationResults) return;
    locationResults.classList.add("hidden");
    locationResults.replaceChildren();
}

function showLocationResults(locations) {
    if (!locationResults) return;
    locationResults.replaceChildren();
    if (!locations.length) {
        const empty = document.createElement("div");
        empty.className = "location-result";
        empty.textContent = "No locations found";
        locationResults.appendChild(empty);
    } else {
        locations.slice(0, 5).forEach(location => {
            const option = document.createElement("button");
            option.type = "button";
            option.className = "location-result";
            option.textContent = location.display_name;
            option.addEventListener("click", () => {
                updateLocationLabels({
                    name: location.name || location.display_name.split(",")[0],
                    country: location.address?.country || "",
                    latitude: Number(location.lat),
                    longitude: Number(location.lon)
                });
                locationSearchInput.value = "";
                hideLocationResults();
                showNotification(`📍 Location changed to ${location.name || location.display_name}`);
            });
            locationResults.appendChild(option);
        });
    }
    locationResults.classList.remove("hidden");
}

async function searchLocation(query) {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`, {
        headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error("Location search failed");
    return response.json();
}

if (locationSearchForm) {
    locationSearchForm.addEventListener("submit", async event => {
        event.preventDefault();
        const query = locationSearchInput.value.trim();
        if (!query) return;
        locationSearchInput.disabled = true;
        try {
            showLocationResults(await searchLocation(query));
        } catch (error) {
            showNotification("Could not search for that location");
            hideLocationResults();
        } finally {
            locationSearchInput.disabled = false;
        }
    });
}

function openLocationSearch() {
    locationSearchInput?.focus();
    locationSearchInput?.scrollIntoView({ behavior: "smooth", block: "center" });
}

document.querySelector(".forecast-header")?.addEventListener("click", openLocationSearch);
document.querySelector(".forecast-header")?.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openLocationSearch();
    }
});
document.querySelector("#farmerForecastScreen .farmer-header")?.addEventListener("click", openLocationSearch);

const savedLocation = JSON.parse(localStorage.getItem("weatherGptLocation") || "null");
if (savedLocation?.name && Number.isFinite(savedLocation.latitude) && Number.isFinite(savedLocation.longitude)) {
    updateLocationLabels(savedLocation);
} else if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async position => {
        try {
            const { latitude, longitude } = position.coords;
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
            const result = await response.json();
            updateLocationLabels({
                name: result.address?.city || result.address?.town || result.address?.village || "Current location",
                country: result.address?.country || "",
                latitude,
                longitude
            });
        } catch (error) {
            console.warn("Could not resolve the current location", error);
        }
    }, () => {
        // Ahmedabad remains the default when location access is declined.
    }, { enableHighAccuracy: false, timeout: 7000, maximumAge: 300000 });
}
updateCurrentDate();
updateWeatherScene();
loadWeatherData();

const normalNav = document.getElementById("normalNav");
const farmerNav = document.getElementById("farmerNav");

const screens = {
home: homeScreen,
forecast: forecastScreen,
alerts: alertsScreen,
farmer: farmerScreen,
cyclone: cycloneScreen,
farmerForecast: farmerForecastScreen,
farmerChat: farmerChatScreen,
farmerAlerts: farmerAlertScreen,
profile: profileScreen,
weatherHub: document.getElementById("weatherHubScreen"),
aviation: document.getElementById("aviationScreen"),
marine: document.getElementById("marineScreen"),
routeWeather: document.getElementById("routeWeatherScreen"),
missionBriefing: document.getElementById("missionBriefingScreen")
};

/* =========================================================
NORMAL MODE NAVIGATION
========================================================= */

const normalNavItems = document.querySelectorAll("#normalNav .nav-item");

normalNavItems.forEach((button) => {
button.addEventListener("click", function () {

    if (this.id === "framerNav") {
        enterFarmerMode();
        return;
    }

    const screenName = this.dataset.screen;
    if (screenName) {
        showScreen(screenName);
        if (screenName === "profile") renderOnboardingProfile();
    }
});
});

/* =========================================================
FARMER MODE NAVIGATION
========================================================= */

const farmerNavItems = document.querySelectorAll("#farmerNav .farmer-nav-item");

farmerNavItems.forEach((button) => {
button.addEventListener("click", function () {

    const mode = this.dataset.farmerMode;

    if (mode === "normal") {
        exitFarmerMode();
        return;
    }

    switch(mode) {
        case "planning":
            showScreen("farmer");
            openPlanningStart();
            break;
        case "forecast":
            showScreen("farmerForecast");
            break;
        case "chat":
            showScreen("farmerChat");
            break;
        case "alerts":
            showScreen("farmerAlerts");
            break;
        case "profile":
            showScreen("profile");
            renderOnboardingProfile();
            break;
    }

    updateFarmerNavActive(this);
});
});

function updateFarmerNavActive(button) {
    farmerNavItems.forEach(item => item.classList.remove("active"));
    button.classList.add("active");
}

/* =========================================================
ENTER/EXIT FARMER MODE
========================================================= */

function enterFarmerMode() {
isFarmerMode = true;
app.classList.add("farmer-mode");
normalNav.classList.add("hidden");
farmerNav.classList.remove("hidden");
showScreen("farmer");
openPlanningStart();
showNotification("🌾 Welcome to Farmer Mode!");
}

function exitFarmerMode() {
isFarmerMode = false;
app.classList.remove("farmer-mode");
normalNav.classList.remove("hidden");
farmerNav.classList.add("hidden");
showScreen("home");
showNotification("👋 Back to Normal Mode");
}

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
void selectedScreen.offsetWidth;
selectedScreen.classList.add("screen-enter");

// Load data when entering specific screens
if (screenName === "cyclone") {
    loadCycloneStatus();
}
if (screenName === "alerts") {
    loadEarlyWarnings();
}

if (screenName === "farmerForecast") {
    initSeasonIndicator();
    loadFarmerForecast();
}
if (screenName === "forecast") {
    loadWeatherData();
}
if (screenName === "farmer") {
    renderSavedFarmProfile();
}

if (screenName === "farmerAlerts") {
    initFarmerAlerts();
}

if (["weatherHub", "aviation", "marine", "missionBriefing"].includes(screenName)) {
    loadIntelligenceScreen(screenName);
}
if (screenName === "routeWeather") {
    initializeRouteMap();
}

translatePage();

// Update navigation active state based on mode
if (isFarmerMode) {
    // Update farmer mode navigation active state
    farmerNavItems.forEach(item => {
        item.classList.remove("active");
    });
    
    farmerNavItems.forEach(item => {
        const mode = item.dataset.farmerMode;
        const screenMap = {
            "planning": "farmer",
            "forecast": "farmerForecast",
            "chat": "farmerChat",
            "alerts": "farmerAlerts"
        };
        
        if (screenMap[mode] === screenName) {
            item.classList.add("active");
        }
    });
} else {
    // Update normal mode navigation active state
    normalNavItems.forEach(item => {
        item.classList.remove("active");
    });
    
    normalNavItems.forEach(item => {
        if (item.dataset.screen === screenName) {
            item.classList.add("active");
        }
    });
}

window.scrollTo({ top: 0, behavior: "smooth" });
}

function intelligenceLocationQuery() {
    const params = new URLSearchParams({
        lat: String(farmerLocation.latitude),
        lon: String(farmerLocation.longitude),
        name: farmerLocation.name
    });
    return params.toString();
}

async function loadIntelligenceScreen(screenName) {
    const endpoint = {
        weatherHub: "/api/intelligence/hub",
        aviation: "/api/intelligence/aviation",
        marine: "/api/intelligence/marine",
        missionBriefing: "/api/intelligence/mission-briefing"
    }[screenName];
    if (!endpoint) return;

    try {
        const query = new URLSearchParams(intelligenceLocationQuery());
        if (screenName === "aviation") {
            query.set("airport", document.getElementById("aviationAirportSelect")?.value || "VAAH");
        }
        const response = await fetch(`${API_BASE}${endpoint}?${query.toString()}`);
        if (!response.ok) throw new Error(`Intelligence request failed (${response.status})`);
        const data = await response.json();
        if (screenName === "weatherHub") {
            document.getElementById("weatherHubLocation").textContent = `📍 ${data.location}`;
            const summary = document.getElementById("weatherHubSummary");
            const temperature = document.getElementById("weatherHubTemperature");
            const wind = document.getElementById("weatherHubWind");
            const rain = document.getElementById("weatherHubRain");
            if (summary) summary.textContent = `${data.summary?.condition || "Live conditions"} at ${data.summary?.temperature ?? "--"}°C. Updated ${data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "now"}.`;
            if (temperature) temperature.textContent = `${data.summary?.temperature ?? "--"}°C`;
            if (wind) wind.textContent = `${data.summary?.windSpeed ?? "--"} km/h`;
            if (rain) rain.textContent = `${data.summary?.precipitationProbability ?? "--"}%`;
        } else if (screenName === "aviation") {
            document.getElementById("aviationTitle").textContent = data.location;
            document.getElementById("aviationRiskScore").textContent = `${data.risk.score} / 100`;
            document.getElementById("aviationRiskLevel").textContent = data.risk.level;
            renderOperationalBriefing("aviation", data);
        } else if (screenName === "marine") {
            document.getElementById("marineTitle").textContent = data.location;
            document.getElementById("marineRiskScore").textContent = `${data.risk.score} / 100`;
            document.getElementById("marineRiskLevel").textContent = data.risk.level;
            renderOperationalBriefing("marine", data);
        } else if (screenName === "missionBriefing") {
            renderMissionBriefing(data);
        }
    } catch (error) {
        console.warn(`Unable to load ${screenName} intelligence`, error);
        showNotification("Live intelligence is temporarily unavailable.");
    }
}

document.getElementById("aviationAirportSelect")?.addEventListener("change", () => {
    if (!document.getElementById("aviationScreen")?.classList.contains("hidden")) loadIntelligenceScreen("aviation");
});

function riskLabel(level) {
    const normalized = String(level || "").toUpperCase();
    return normalized === "LOW" ? "🟢 LOW" : normalized === "HIGH" ? "🔴 HIGH" : "🟡 MODERATE";
}

function renderOperationalBriefing(operation, data) {
    const risk = riskLabel(data.risk?.level);
    const updated = data.updatedAt ? `Updated ${new Date(data.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Updated live";
    const set = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };
    if (operation === "aviation") {
        const storm = data.hazard?.title && !data.hazard.title.toLowerCase().includes("no active") ? "🟠 WATCH" : "🟢 LOW";
        set("aviationBriefingRisk", risk);
        set("aviationUpdated", updated);
        set("aviationBriefingVisibility", data.metrics?.visibility >= 8 ? "🟢 Good" : data.metrics?.visibility >= 5 ? "🟡 Monitor" : "🔴 Poor");
        set("aviationBriefingWind", data.metrics?.windSpeed <= 20 ? "🟢 Calm" : "🟡 Monitor");
        set("aviationBriefingRain", data.metrics?.weather?.toLowerCase().includes("rain") ? "🟡 Moderate" : "🟢 Low");
        set("aviationBriefingStorm", storm);
        set("aviationDataQuality", `METAR: ${data.dataQuality?.metar || "unavailable"} · TAF: ${data.dataQuality?.taf || "unavailable"}`);
        set("aviationBriefingSummary", `${data.hazard?.detail || "Conditions are generally favorable."} ${data.metrics?.weather || ""}`.trim());
    } else {
        const rain = data.seaState?.rainSeverity || "Low";
        const mainFactor = data.metrics?.windSpeed >= 25 ? "Increasing wind expected." : data.metrics?.waveHeight >= 2 ? "Wave height requires monitoring." : "Conditions remain manageable.";
        set("marineBriefingRisk", risk);
        set("marineUpdated", updated);
        set("marineBriefingWind", data.metrics?.windSpeed <= 15 ? "🟢 Low" : data.metrics?.windSpeed <= 25 ? "🟡 Moderate" : "🔴 High");
        set("marineBriefingWave", data.metrics?.waveHeight <= 1 ? "🟢 Low" : data.metrics?.waveHeight <= 2 ? "🟡 Moderate" : "🔴 High");
        set("marineBriefingRain", rain === "Heavy" ? "🔴 Heavy" : rain === "Moderate" ? "🟡 Moderate" : "🟢 Low");
        set("marineBriefingVisibility", "🟢 Good");
        set("marineBriefingSummary", `${data.seaState?.weather || "Live marine conditions"} are being monitored. Plan a cautious crossing when conditions trend upward.`);
        set("marineBriefingFactor", mainFactor);
    }
}

function renderMissionBriefing(data) {
    const risks = data.risks || {};
    const summary = document.getElementById("missionBriefingSummary");
    const updated = document.getElementById("missionBriefingUpdated");
    const location = document.querySelector("#missionBriefingScreen .location-badge");
    if (location && data.location) location.textContent = `📍 ${data.location}`;
    if (summary) summary.textContent = data.summary || "Live operational weather is available.";
    if (updated) updated.textContent = data.updatedAt ? `Updated ${new Date(data.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Updated live";
    const domainRisks = [["missionLandRisk", "land", risks.land], ["missionAirRisk", "air", risks.air], ["missionSeaRisk", "sea", risks.sea]];
    domainRisks.forEach(([id, domain, risk]) => {
        const element = document.getElementById(id);
        const card = element?.closest(".mission-risk-card");
        const level = String(risk?.level || "Unknown");
        if (element && risk) element.textContent = `${level} risk · ${risk.detail}`;
        if (card) {
            card.dataset.risk = level.toLowerCase();
            card.setAttribute("aria-label", `${domain} operations: ${level} risk`);
        }
    });
    const action = document.getElementById("missionBriefingAction");
    if (action) {
        const phrase = (risk, clearText, watchText, highText) => {
            const level = String(risk?.level || "").toLowerCase();
            return level === "high" ? highText : level === "medium" || level === "moderate" ? watchText : clearText;
        };
        action.textContent = [
            phrase(risks.land, "Land ops clear", "Monitor land rainfall and soil moisture", "Delay exposed land work"),
            phrase(risks.air, "Air visibility stable", "Monitor air visibility before midday", "Recheck flight conditions before departure"),
            phrase(risks.sea, "Sea conditions stable", "Use caution at sea", "Postpone marine operations")
        ].join("; ") + ".";
    }
}

let routeMap;
let routeMapLayers = [];

function initializeRouteMap() {
    const container = document.getElementById("routeMap");
    if (!container || !window.L) return;
    if (!routeMap) {
        routeMap = L.map(container, { zoomControl: true }).setView([farmerLocation.latitude, farmerLocation.longitude], 6);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors",
            maxZoom: 18
        }).addTo(routeMap);
    }
    window.setTimeout(() => routeMap.invalidateSize(), 50);
}

function routeRiskColor(level) {
    const normalized = String(level || "").toLowerCase();
    return normalized.includes("high") || normalized.includes("extreme") ? "#c05b48" : normalized.includes("moderate") || normalized.includes("watch") ? "#c67a2c" : "#328e84";
}

function renderRouteMap(data) {
    initializeRouteMap();
    if (!routeMap) return;
    routeMapLayers.forEach(layer => routeMap.removeLayer(layer));
    routeMapLayers = [];
    const toPair = point => {
        if (Array.isArray(point)) return [Number(point[1]), Number(point[0])];
        if (point && Number.isFinite(Number(point.latitude)) && Number.isFinite(Number(point.longitude))) return [Number(point.latitude), Number(point.longitude)];
        if (point && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lon))) return [Number(point.lat), Number(point.lon)];
        return null;
    };
    const geometryValue = data.geometry || data.route?.geometry || [];
    const geometry = Array.isArray(geometryValue) ? geometryValue : geometryValue.coordinates || [];
    const points = Array.isArray(geometry) ? geometry.map(toPair).filter(Boolean) : [];
    const origin = data.origin?.coordinates || data.originCoordinates;
    const destination = data.destination?.coordinates || data.destinationCoordinates;
    const originPair = toPair(origin);
    const destinationPair = toPair(destination);
    const linePoints = points.length ? points : [originPair, destinationPair].filter(Boolean);
    if (linePoints.length >= 2) {
        const line = L.polyline(linePoints.map(point => [Number(point[0]), Number(point[1])]), { color: "#2777a9", weight: 5, opacity: 0.85 }).addTo(routeMap);
        routeMapLayers.push(line);
        routeMap.fitBounds(line.getBounds(), { padding: [24, 24] });
    }
    [["origin", originPair], ["destination", destinationPair]].forEach(([label, coordinates]) => {
        if (!coordinates) return;
        const marker = L.marker(coordinates).addTo(routeMap);
        marker.bindPopup(`<strong>${label === "origin" ? escapeHTML(data.origin?.name || "Origin") : escapeHTML(data.destination?.name || "Destination")}</strong>`);
        routeMapLayers.push(marker);
    });
    (data.weatherPoints || data.route?.weatherPoints || data.routeWeatherSamples || []).forEach(point => {
        const coordinates = point.coordinates ? toPair(point.coordinates) : toPair(point);
        if (!coordinates || !Number.isFinite(Number(coordinates[0]))) return;
        const marker = L.circleMarker(coordinates, {
            radius: 8, color: routeRiskColor(point.riskLevel || point.risk), fillColor: routeRiskColor(point.riskLevel || point.risk), fillOpacity: 0.8, weight: 2
        }).addTo(routeMap);
        marker.bindPopup(`<strong>${escapeHTML(point.location || "Route point")}</strong><br>🌡️ ${point.temperature ?? "--"}°C · 🌧️ ${point.precipitationProbability ?? "--"}%<br>💨 ${point.windSpeed ?? "--"} km/h`);
        routeMapLayers.push(marker);
    });
}

async function loadRouteIntelligence() {
    const cleanRouteLocation = value => String(value || "").replace(/^[\s📍]+/, "").replace(/\s+/g, " ").trim();
    const origin = cleanRouteLocation(document.getElementById("routeFrom")?.value);
    const destination = cleanRouteLocation(document.getElementById("routeTo")?.value);
    const mode = document.querySelector(".route-mode-pills button.active")?.dataset.mode || "general";
    if (!origin || !destination) {
        showNotification("Enter both route locations.");
        return;
    }
    const params = new URLSearchParams({ origin, destination, mode });
    try {
        const response = await fetch(`${API_BASE}/api/intelligence/route?${params.toString()}`);
        if (!response.ok) throw new Error(`Route request failed (${response.status})`);
        const data = await response.json();
        const modeFocus = {
            general: "balanced wind, rain, and visibility",
            aviation: "wind, visibility, rain, and thunderstorms",
            marine: "wind, waves, rain, and visibility"
        }[mode] || "route conditions";
        const button = document.getElementById("analyzeRouteButton");
        if (button) button.textContent = `Route analyzed · ${data.overallRisk}`;
        const status = document.getElementById("routeMapStatus");
        if (status) status.textContent = data.travel?.durationLabel || "Live route weather";
        const journeyTitle = document.getElementById("routeJourneyTitle");
        if (journeyTitle) journeyTitle.innerHTML = `${escapeHTML(data.origin || origin)} <span>→</span> ${escapeHTML(data.destination || destination)}`;
        const journeyMeta = document.getElementById("routeJourneyMeta");
        if (journeyMeta) journeyMeta.textContent = `${data.distanceKm ?? "--"} km · ${data.travelDuration || `${data.travelDurationMinutes ?? "--"} minutes`} · ${modeFocus} forecast sampled along your route`;
        const score = document.getElementById("routeRiskScore");
        if (score) score.innerHTML = `${data.routeRiskScore ?? "--"} <small id="routeRiskLevel">${escapeHTML(data.overallRisk || "UNKNOWN")}</small>`;
        const riskBadge = document.getElementById("routeRiskBadge");
        if (riskBadge) {
            riskBadge.textContent = `${data.overallRisk || "Unknown"} · ${modeFocus}`;
            riskBadge.dataset.risk = String(data.overallRisk || "").toLowerCase();
        }
        const hazard = document.getElementById("routeHazardSummary");
        const firstHazard = data.hazards?.[0] || data.weatherPoints?.find(point => point.riskLevel && point.riskLevel !== "Low");
        if (hazard) hazard.innerHTML = firstHazard ? `<strong>⚠️ ${escapeHTML(firstHazard.summary || firstHazard.weatherDescription || "Weather risk along route")}</strong>` : "No significant weather hazards reported along this route.";
        const wind = document.getElementById("routeWindSummary");
        const destinationForecast = data.destinationForecast || data.destinationForecastAtArrival;
        if (wind) wind.textContent = destinationForecast?.windSpeed != null ? `${destinationForecast.windSpeed} km/h at arrival` : "--";
        const rain = document.getElementById("routeRainSummary");
        if (rain) rain.textContent = destinationForecast?.precipitationProbability != null ? `${destinationForecast.precipitationProbability}% at arrival` : "--";
        const arrival = document.getElementById("routeArrivalForecast");
        if (arrival) arrival.textContent = destinationForecast ? `${destinationForecast.temperature}°C · ${destinationForecast.weatherDescription}` : "--";
        const arrivalHeadline = document.getElementById("routeArrivalHeadline");
        if (arrivalHeadline) arrivalHeadline.textContent = destinationForecast ? `${destinationForecast.temperature}°C · ${destinationForecast.weatherDescription}` : "--";
        const arrivalTime = document.getElementById("routeArrivalTime");
        if (arrivalTime) arrivalTime.textContent = data.estimatedArrival ? new Date(data.estimatedArrival).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Arrival time unavailable";
        const briefing = document.getElementById("routeBriefingText");
        if (briefing) briefing.textContent = data.summary || data.advisoryText || `Arrival conditions: ${destinationForecast?.weatherDescription || "forecast unavailable"}.`;
        renderRouteSafetyTimeline(data);
        renderRouteMap(data);
        showNotification(`Route risk: ${data.overallRisk}`);
    } catch (error) {
        console.warn("Unable to load route intelligence", error);
        showNotification("Route intelligence is temporarily unavailable.");
    }

    function renderRouteSafetyTimeline(data) {
        const container = document.getElementById("routeSafetyTimeline");
        if (!container) return;
        const samples = Array.isArray(data.routeWeatherSamples) ? data.routeWeatherSamples : [];
        const checkpoints = Array.isArray(data.routeWeather) ? data.routeWeather : [];
        const indices = samples.length ? [0, Math.floor(samples.length / 2), samples.length - 1] : [];
        const labels = ["Departure", "Midway", "Arrival"];
        const cards = indices.map((index, position) => {
            const sample = samples[index] || {};
            const checkpoint = checkpoints[position] || {};
            const location = checkpoint.checkpoint || (position === 0 ? data.origin : position === 2 ? data.destination : "Midway route");
            const risk = sample.riskLevel || (position === 2 ? data.overallRisk : "Moderate");
            const riskClass = String(risk).toLowerCase();
            return `<article class="route-timeline-stop"><div class="route-timeline-marker ${riskClass}"></div><div class="route-timeline-content"><div class="route-timeline-top"><small>${labels[position]}</small><strong>${escapeHTML(location || "Route checkpoint")}</strong><span class="route-timeline-risk ${riskClass}">${escapeHTML(risk)}</span></div><p>${escapeHTML(sample.weatherDescription || checkpoint.weatherDescription || "Forecast available")} · ${sample.temperature ?? checkpoint.temperature ?? "--"}°C</p><small>🌧️ ${sample.precipitationProbability ?? checkpoint.rainProb ?? "--"}% rain · 💨 ${sample.windSpeed ?? "--"} km/h wind</small></div></article>`;
        });
        container.innerHTML = cards.length ? cards.join("") : '<p class="route-empty-state">No route checkpoints were returned. Try analyzing again.</p>';
        const recommendation = document.getElementById("routeRecommendationText");
        if (recommendation) {
            const highestRain = samples.reduce((best, sample) => (Number(sample.precipitationProbability) > Number(best?.precipitationProbability || 0) ? sample : best), null);
            recommendation.textContent = highestRain && Number(highestRain.precipitationProbability) >= 60
                ? `Plan extra time near the highest-risk checkpoint. Rain probability reaches ${highestRain.precipitationProbability}%, so reduce speed and confirm visibility before departure.`
                : `Conditions are generally manageable. Keep monitoring updates and review the arrival forecast before leaving.`;
        }
    }
}

document.querySelectorAll(".content [data-screen]").forEach(button => {
    button.addEventListener("click", () => {
        const screenName = button.dataset.screen;
        showScreen(screenName);
        if (screenName === "profile") renderOnboardingProfile();
    });
});

document.querySelectorAll(".route-mode-pills button").forEach(button => {
    button.addEventListener("click", () => {
        button.parentElement.querySelectorAll("button").forEach(item => item.classList.remove("active"));
        button.classList.add("active");
        button.parentElement.querySelectorAll("button").forEach(item => item.setAttribute("aria-pressed", item === button ? "true" : "false"));
        const status = document.getElementById("routeMapStatus");
        if (status) status.textContent = `${button.dataset.mode} mode selected · analyze route for a live risk assessment`;
    });
});

document.querySelectorAll("[data-briefing]").forEach(button => {
    button.addEventListener("click", () => {
        if (button.dataset.briefing === "mission") {
            loadIntelligenceScreen("missionBriefing");
            button.textContent = "Briefing refreshed ✓";
        } else if (button.dataset.briefing === "aviation" || button.dataset.briefing === "marine") {
            const card = button.closest(".operational-briefing-card");
            card?.classList.add("briefing-generated");
            button.textContent = "Briefing ready ✓";
        } else {
            button.textContent = "Briefing ready ✓";
        }
        button.classList.add("selected");
    });
});

document.getElementById("analyzeRouteButton")?.addEventListener("click", loadRouteIntelligence);

/* =========================================================
TOP MENU BUTTON
========================================================= */

const menuButton = document.querySelector(".top-bar .icon-btn:first-child");

if (menuButton) {
menuButton.addEventListener("click", function () {
    showMenu();
    this.classList.add("button-click");
    setTimeout(() => this.classList.remove("button-click"), 300);
});
}

/* =========================================================
MOBILE MENU
========================================================= */

function showMenu() {

const existingMenu = document.getElementById("mobileMenu");

if (existingMenu) {
    existingMenu.classList.add("menu-close");
    setTimeout(() => existingMenu.remove(), 200);
    return;
}

const menu = document.createElement("div");
menu.id = "mobileMenu";

menu.innerHTML = `
    <div class="menu-title">☰ MENU</div>
    <button type="button" class="menu-section-toggle" data-screen="weatherHub">
        <strong>WEATHER INTELLIGENCE</strong><span>→</span>
    </button>
    <div class="menu-item" data-screen="aviation">
        ✈️ <span>Aviation Mode</span>
    </div>
    <div class="menu-item" data-screen="marine">
        ⚓ <span>Marine Mode</span>
    </div>
    <div class="menu-item" data-screen="routeWeather">
        🗺️ <span>Route Weather</span>
    </div>
    <div class="menu-item" data-screen="missionBriefing">
        🧠 <span>Mission Briefing</span>
    </div>
    <div class="menu-section-label">GENERAL NAVIGATION</div>
    <div class="menu-item" data-screen="forecast">
        🌤️ <span>Forecast</span>
    </div>
    <div class="menu-item" data-screen="alerts">
        ⚠️ <span>Alerts</span>
    </div>
    <div class="menu-item" data-action="map">
        🗺️ <span>Weather Map</span>
    </div>
    <button type="button" class="menu-item language-toggle" id="menuLanguage" aria-expanded="false">
        🌐 <span>Language</span><span class="language-arrow" aria-hidden="true">⌄</span>
    </button>
    <div class="language-panel hidden" id="languagePanel">
        ${Object.entries(languageNames).map(([code, name]) => `
            <button class="language-option${currentLanguage === code ? " active" : ""}" data-language="${code}">${name}</button>
        `).join("")}
    </div>
    <div class="menu-item" id="menuFarmer">
        🌾 <span>Farmer Mode</span>
    </div>
    <div class="menu-item" data-screen="profile">
        👤 <span>Profile</span>
    </div>
`;

document.body.appendChild(menu);

menu.style.position = "fixed";
menu.style.top = "75px";
menu.style.left = "20px";
menu.style.zIndex = "9999";
menu.style.width = "220px";
menu.style.padding = "10px";
menu.style.background = "rgba(15, 23, 42, 0.94)";
menu.style.backdropFilter = "blur(20px)";
menu.style.webkitBackdropFilter = "blur(20px)";
menu.style.border = "1px solid rgba(255,255,255,0.12)";
menu.style.borderRadius = "18px";
menu.style.boxShadow = "0 20px 60px rgba(0,0,0,0.35)";
menu.style.animation = "menuOpen 0.25s ease";

menu.querySelectorAll(".menu-item").forEach(item => {
    item.style.padding = "13px 14px";
    item.style.margin = "3px 0";
    item.style.cursor = "pointer";
    item.style.color = "#E2E8F0";
    item.style.borderRadius = "12px";
    item.style.transition = "all 0.2s ease";

    item.addEventListener("mouseenter", function () {
        this.style.background = "rgba(96,165,250,0.15)";
        this.style.transform = "translateX(5px)";
    });

    item.addEventListener("mouseleave", function () {
        this.style.background = "transparent";
        this.style.transform = "translateX(0)";
    });

    item.addEventListener("click", function () {
    if (this.id === "menuLanguage") return;

        if (this.id === "menuFarmer") {
            enterFarmerMode();
            menu.remove();
            return;
        }

        if (this.dataset.action === "map") {
            weatherMapModal?.classList.remove("hidden");
            document.body.style.overflow = "hidden";
            loadIndiaWeatherMap().catch(error => {
                console.warn("India weather map is unavailable", error);
                const status = document.getElementById("weatherMapStatus");
                if (status) status.textContent = "Live weather is temporarily unavailable. Try refresh again.";
            });
            menu.remove();
            return;
        }

        const screen = this.dataset.screen;
        showScreen(screen);
        if (screen === "profile") renderOnboardingProfile();
        menu.remove();
    });
});

menu.querySelector(".menu-section-toggle")?.addEventListener("click", function () {
    showScreen(this.dataset.screen);
    menu.remove();
});

const languageToggle = menu.querySelector("#menuLanguage");
const languagePanel = menu.querySelector("#languagePanel");
languageToggle?.addEventListener("click", event => {
    event.preventDefault();
    const expanded = languagePanel?.classList.toggle("hidden") === false;
    languageToggle.setAttribute("aria-expanded", String(expanded));
    const arrow = languageToggle.querySelector(".language-arrow");
    if (arrow) arrow.textContent = expanded ? "⌃" : "⌄";
});

menu.querySelectorAll(".language-option").forEach(option => {
    option.addEventListener("click", function () {
        setLanguage(this.dataset.language);
        menu.remove();
    });
});

translatePage();
}

translatePage();

/* =========================================================
NOTIFICATION BUTTON
========================================================= */

const notificationButton = document.querySelector(".top-bar .icon-btn:last-child");

if (notificationButton) {
notificationButton.addEventListener("click", function () {
    showNotification("⚠️ You have 2 active weather alerts");
    showScreen(isFarmerMode ? "farmerAlerts" : "alerts");
    this.classList.add("bell-shake");
    setTimeout(() => this.classList.remove("bell-shake"), 700);
});
}

/* =========================================================
TOAST NOTIFICATION
========================================================= */

function showNotification(message) {

const oldToast = document.getElementById("weatherToast");
if (oldToast) oldToast.remove();

const toast = document.createElement("div");
toast.id = "weatherToast";
toast.textContent = message;

toast.style.position = "fixed";
toast.style.top = "85px";
toast.style.left = "50%";
toast.style.transform = "translateX(-50%) translateY(-20px)";
toast.style.zIndex = "10000";
toast.style.padding = "12px 20px";
toast.style.borderRadius = "14px";
toast.style.background = "rgba(15,23,42,0.94)";
toast.style.backdropFilter = "blur(15px)";
toast.style.color = "#F8FAFC";
toast.style.border = "1px solid rgba(96,165,250,0.25)";
toast.style.boxShadow = "0 15px 40px rgba(0,0,0,0.35)";
toast.style.fontSize = "14px";
toast.style.animation = "toastIn 0.35s ease forwards";

document.body.appendChild(toast);

setTimeout(() => {
    toast.style.animation = "toastOut 0.3s ease forwards";
    setTimeout(() => toast.remove(), 300);
}, 2800);
}

/* =========================================================
FARMER PLANNING MODE (Dashboard)
========================================================= */

const farmerPlanForm = document.getElementById("farmerPlanForm");
let farmerPlanLoaded = false;

function farmerValue(value, fallback = "") {
    return value === undefined || value === null || value === "" ? fallback : value;
}

function escapeHTML(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

function setFarmerStatus(message, state) {
    const status = document.getElementById("farmerPlanStatus");
    if (!status) return;
    status.textContent = message;
    status.className = `farmer-status${state ? ` ${state}` : ""}`;
}

const planningText = {
    en: { today: "Today's weather prediction", rain: "Rain chance", temp: "Temperature", wind: "Wind", advice: "Farm advice", noRain: "No rain is expected; inspect soil before irrigation.", rain: "Rain may affect field work; keep drainage open and avoid spraying.", hot: "Hot conditions may stress the crop; work in the morning and evening." },
    hi: { today: "आज का मौसम अनुमान", rain: "बारिश की संभावना", temp: "तापमान", wind: "हवा", advice: "खेत की सलाह", noRain: "बारिश की संभावना कम है; सिंचाई से पहले मिट्टी जांचें।", rain: "बारिश खेत के काम को प्रभावित कर सकती है; नालियां साफ रखें और छिड़काव न करें।", hot: "गर्मी से फसल को तनाव हो सकता है; सुबह और शाम काम करें।" },
    gu: { today: "આજનું હવામાન અનુમાન", rain: "વરસાદની શક્યતા", temp: "તાપમાન", wind: "પવન", advice: "ખેતરની સલાહ", noRain: "વરસાદની શક્યતા ઓછી છે; સિંચાઈ પહેલાં જમીન તપાસો.", rain: "વરસાદથી ખેતરનું કામ અસરગ્રસ્ત થઈ શકે છે; નિકાસ સાફ રાખો અને છંટકાવ ન કરો.", hot: "ગરમીથી પાકને તાણ થઈ શકે છે; સવારે અને સાંજે કામ કરો." },
    mr: { today: "आजचा हवामान अंदाज", rain: "पावसाची शक्यता", temp: "तापमान", wind: "वारा", advice: "शेती सल्ला", noRain: "पावसाची शक्यता कमी आहे; सिंचनापूर्वी माती तपासा.", rain: "पावसामुळे शेतकामावर परिणाम होऊ शकतो; निचरा स्वच्छ ठेवा आणि फवारणी टाळा.", hot: "उष्णतेमुळे पिकावर ताण येऊ शकतो; सकाळी आणि संध्याकाळी काम करा." },
    kn: { today: "ಇಂದಿನ ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ", rain: "ಮಳೆಯ ಸಾಧ್ಯತೆ", temp: "ತಾಪಮಾನ", wind: "ಗಾಳಿ", advice: "ಕೃಷಿ ಸಲಹೆ", noRain: "ಮಳೆಯ ಸಾಧ್ಯತೆ ಕಡಿಮೆ; ನೀರಾವರಿಗೆ ಮೊದಲು ಮಣ್ಣನ್ನು ಪರಿಶೀಲಿಸಿ.", rain: "ಮಳೆ ಹೊಲದ ಕೆಲಸಕ್ಕೆ ತೊಂದರೆ ಮಾಡಬಹುದು; ಚರಂಡಿ ತೆರವುಗೊಳಿಸಿ ಮತ್ತು ಸಿಂಪಡಣೆ ತಪ್ಪಿಸಿ.", hot: "ಬಿಸಿಲು ಬೆಳೆಗೆ ಒತ್ತಡ ನೀಡಬಹುದು; ಬೆಳಿಗ್ಗೆ ಅಥವಾ ಸಂಜೆ ಕೆಲಸ ಮಾಡಿ." },
    ta: { today: "இன்றைய வானிலை முன்னறிவிப்பு", rain: "மழை வாய்ப்பு", temp: "வெப்பநிலை", wind: "காற்று", advice: "வயல் ஆலோசனை", noRain: "மழை எதிர்பார்ப்பு குறைவு; பாசனத்திற்கு முன் மண்ணைச் சரிபார்க்கவும்.", rain: "மழை வயல் பணியை பாதிக்கலாம்; வடிகாலை திறந்து வைத்து தெளிப்பைத் தவிர்க்கவும்.", hot: "வெப்பம் பயிருக்கு அழுத்தம் தரலாம்; காலை அல்லது மாலை வேலை செய்யவும்." },
    bn: { today: "আজকের আবহাওয়ার পূর্বাভাস", rain: "বৃষ্টির সম্ভাবনা", temp: "তাপমাত্রা", wind: "বাতাস", advice: "কৃষি পরামর্শ", noRain: "বৃষ্টির সম্ভাবনা কম; সেচের আগে মাটি পরীক্ষা করুন।", rain: "বৃষ্টি মাঠের কাজে প্রভাব ফেলতে পারে; নিষ্কাশন পরিষ্কার রাখুন এবং স্প্রে করবেন না।", hot: "গরমে ফসলের চাপ হতে পারে; সকাল বা সন্ধ্যায় কাজ করুন।" }
};

const farmerPlanCopy = {
    en: { weather: "Weather", risk: "Crop risk", irrigation: "Irrigation", lastDate: "Last date", forecastChecked: "Forecast checked", noTask: "No tasks recommended for today.", priority: "Priority", weatherAction: "Weather action", walk: crop => `Walk the ${crop} field; check leaves, stems, weeds and standing water.`, drainage: "Keep drainage channels open; do not irrigate before the rain.", irrigate: "Irrigate slowly near the root zone; stop if rain begins.", soil: "Check soil at root depth before deciding on irrigation.", pests: "Record pest or disease spots and remove badly affected plant parts safely.", harvest: "Harvest only mature produce and keep it shaded.", weeds: "Remove weeds and inspect plant spacing without disturbing roots.", beforeRain: "Secure tools, support tall plants and clear field drains." },
    hi: { weather: "मौसम", risk: "फसल जोखिम", irrigation: "सिंचाई", lastDate: "अंतिम तारीख", forecastChecked: "पूर्वानुमान जांचा गया", noTask: "आज के लिए कोई काम सुझाया नहीं गया।", priority: "प्राथमिकता", weatherAction: "मौसम कार्रवाई", walk: crop => `${crop} के खेत में जाकर पत्तियां, तने, खरपतवार और जमा पानी जांचें।`, drainage: "जल निकासी की नालियां खुली रखें; बारिश से पहले सिंचाई न करें।", irrigate: "जड़ क्षेत्र में धीरे-धीरे सिंचाई करें; बारिश शुरू हो तो रोक दें।", soil: "सिंचाई तय करने से पहले जड़ की गहराई पर मिट्टी जांचें।", pests: "कीट या रोग के निशान दर्ज करें और बहुत प्रभावित हिस्से सुरक्षित रूप से हटाएं।", harvest: "केवल पकी उपज काटें और उसे छाया में रखें।", weeds: "खरपतवार हटाएं और जड़ों को परेशान किए बिना पौधों की दूरी जांचें।", beforeRain: "औजार सुरक्षित रखें, लंबे पौधों को सहारा दें और खेत की नालियां साफ करें।" },
    gu: { weather: "હવામાન", risk: "પાકનું જોખમ", irrigation: "સિંચાઈ", lastDate: "છેલ્લી તારીખ", forecastChecked: "આગાહી તપાસી", noTask: "આજ માટે કોઈ કામ સૂચવાયું નથી.", priority: "પ્રાથમિકતા", weatherAction: "હવામાન કાર્યવાહી", walk: crop => `${crop}ના ખેતરમાં પાંદડા, ડાંઠ, નીંદણ અને ભરાયેલું પાણી તપાસો.`, drainage: "નિકાસની નાળીઓ ખુલ્લી રાખો; વરસાદ પહેલાં સિંચાઈ ન કરો.", irrigate: "મૂળ વિસ્તારમાં ધીમે સિંચાઈ કરો; વરસાદ શરૂ થાય તો બંધ કરો.", soil: "સિંચાઈ નક્કી કરતા પહેલાં મૂળની ઊંડાઈએ જમીન તપાસો.", pests: "જીવાત અથવા રોગના નિશાન નોંધો અને વધુ અસરગ્રસ્ત ભાગો સુરક્ષિત રીતે દૂર કરો.", harvest: "માત્ર પાકેલી ઉપજ લો અને છાયામાં રાખો.", weeds: "નીંદણ દૂર કરો અને મૂળને નુકસાન કર્યા વગર છોડનું અંતર તપાસો.", beforeRain: "સાધનો સુરક્ષિત રાખો, ઊંચા છોડને આધાર આપો અને ખેતરની નાળીઓ સાફ કરો." },
    mr: { weather: "हवामान", risk: "पीक धोका", irrigation: "सिंचन", lastDate: "शेवटची तारीख", forecastChecked: "अंदाज तपासला", noTask: "आजसाठी कोणतेही काम सुचवलेले नाही.", priority: "प्राधान्य", weatherAction: "हवामान कृती", walk: crop => `${crop}च्या शेतात जाऊन पाने, देठ, तण आणि साचलेले पाणी तपासा.`, drainage: "निचऱ्याच्या नाल्या खुल्या ठेवा; पावसापूर्वी सिंचन करू नका.", irrigate: "मुळाजवळ हळूहळू सिंचन करा; पाऊस सुरू झाल्यास थांबवा.", soil: "सिंचन ठरवण्यापूर्वी मुळांच्या खोलीवर माती तपासा.", pests: "कीड किंवा रोगाच्या खुणा नोंदवा आणि जास्त बाधित भाग सुरक्षितपणे काढा.", harvest: "फक्त पिकलेली उपज काढा आणि सावलीत ठेवा.", weeds: "तण काढा आणि मुळांना त्रास न देता रोपांमधील अंतर तपासा.", beforeRain: "साधने सुरक्षित ठेवा, उंच झाडांना आधार द्या आणि निचऱ्याच्या नाल्या साफ करा." },
    kn: { weather: "ಹವಾಮಾನ", risk: "ಬೆಳೆ ಅಪಾಯ", irrigation: "ನೀರಾವರಿ", lastDate: "ಕೊನೆಯ ದಿನಾಂಕ", forecastChecked: "ಮುನ್ಸೂಚನೆ ಪರಿಶೀಲಿಸಲಾಗಿದೆ", noTask: "ಇಂದು ಯಾವುದೇ ಕೆಲಸವನ್ನು ಶಿಫಾರಸು ಮಾಡಲಾಗಿಲ್ಲ.", priority: "ಆದ್ಯತೆ", weatherAction: "ಹವಾಮಾನ ಕ್ರಮ", walk: crop => `${crop} ಹೊಲದಲ್ಲಿ ಎಲೆ, ಕಾಂಡ, ಕಳೆ ಮತ್ತು ನಿಂತ ನೀರನ್ನು ಪರಿಶೀಲಿಸಿ.`, drainage: "ನೀರಿನ ಹರಿವು ಕಾಲುವೆಗಳನ್ನು ತೆರೆದಿಡಿ; ಮಳೆಯ ಮೊದಲು ನೀರಾವರಿ ಮಾಡಬೇಡಿ.", irrigate: "ಬೇರಿನ ಪ್ರದೇಶಕ್ಕೆ ನಿಧಾನವಾಗಿ ನೀರು ನೀಡಿ; ಮಳೆ ಆರಂಭವಾದರೆ ನಿಲ್ಲಿಸಿ.", soil: "ನೀರಾವರಿ ನಿರ್ಧರಿಸುವ ಮೊದಲು ಬೇರಿನ ಆಳದಲ್ಲಿನ ಮಣ್ಣನ್ನು ಪರಿಶೀಲಿಸಿ.", pests: "ಕೀಟ ಅಥವಾ ರೋಗದ ಗುರುತುಗಳನ್ನು ದಾಖಲಿಸಿ ಮತ್ತು ಹೆಚ್ಚು ಹಾನಿಗೊಂಡ ಭಾಗಗಳನ್ನು ಸುರಕ್ಷಿತವಾಗಿ ತೆಗೆದುಹಾಕಿ.", harvest: "ಪಕ್ವವಾದ ಬೆಳೆಯನ್ನು ಮಾತ್ರ ಕೊಯ್ಲು ಮಾಡಿ ನೆರಳಿನಲ್ಲಿ ಇಡಿ.", weeds: "ಕಳೆ ತೆಗೆಯಿರಿ ಮತ್ತು ಬೇರುಗಳಿಗೆ ತೊಂದರೆ ಮಾಡದೆ ಗಿಡಗಳ ಅಂತರ ಪರಿಶೀಲಿಸಿ.", beforeRain: "ಉಪಕರಣಗಳನ್ನು ಸುರಕ್ಷಿತವಾಗಿಡಿ, ಎತ್ತರದ ಗಿಡಗಳಿಗೆ ಆಸರೆ ನೀಡಿ ಮತ್ತು ಹೊಲದ ಕಾಲುವೆಗಳನ್ನು ಸ್ವಚ್ಛಗೊಳಿಸಿ." },
    ta: { weather: "வானிலை", risk: "பயிர் ஆபத்து", irrigation: "பாசனம்", lastDate: "கடைசி தேதி", forecastChecked: "முன்னறிவிப்பு சரிபார்க்கப்பட்டது", noTask: "இன்றைக்கு பணிகள் எதுவும் பரிந்துரைக்கப்படவில்லை.", priority: "முக்கியத்துவம்", weatherAction: "வானிலை நடவடிக்கை", walk: crop => `${crop} வயலில் இலைகள், தண்டுகள், களைகள் மற்றும் தேங்கிய நீரைப் பாருங்கள்.`, drainage: "வடிகால் கால்வாய்களை திறந்து வைக்கவும்; மழைக்கு முன் பாசனம் செய்ய வேண்டாம்.", irrigate: "வேர் பகுதியில் மெதுவாக பாசனம் செய்யவும்; மழை தொடங்கினால் நிறுத்தவும்.", soil: "பாசனம் முடிவு செய்வதற்கு முன் வேர் ஆழத்தில் மண்ணைச் சரிபார்க்கவும்.", pests: "பூச்சி அல்லது நோய் அறிகுறிகளை பதிவு செய்து அதிகம் பாதித்த பகுதிகளை பாதுகாப்பாக அகற்றவும்.", harvest: "முதிர்ந்த விளைச்சலை மட்டும் அறுவடை செய்து நிழலில் வைக்கவும்.", weeds: "களைகளை அகற்றி வேர்களை பாதிக்காமல் செடிகளின் இடைவெளியைப் பாருங்கள்.", beforeRain: "கருவிகளை பாதுகாப்பாக வைத்து, உயரமான செடிகளுக்கு ஆதரவு அளித்து வடிகால்களை சுத்தம் செய்யவும்." },
    bn: { weather: "আবহাওয়া", risk: "ফসলের ঝুঁকি", irrigation: "সেচ", lastDate: "শেষ তারিখ", forecastChecked: "পূর্বাভাস পরীক্ষা করা হয়েছে", noTask: "আজকের জন্য কোনো কাজের পরামর্শ নেই।", priority: "অগ্রাধিকার", weatherAction: "আবহাওয়া ব্যবস্থা", walk: crop => `${crop} ক্ষেতে পাতা, কাণ্ড, আগাছা এবং জমে থাকা জল পরীক্ষা করুন।`, drainage: "নিষ্কাশনের নালা খোলা রাখুন; বৃষ্টির আগে সেচ দেবেন না।", irrigate: "গোড়ায় ধীরে সেচ দিন; বৃষ্টি শুরু হলে থামুন।", soil: "সেচের সিদ্ধান্তের আগে শিকড়ের গভীরতায় মাটি পরীক্ষা করুন।", pests: "পোকা বা রোগের দাগ নথিভুক্ত করুন এবং বেশি আক্রান্ত অংশ নিরাপদে সরান।", harvest: "শুধু পাকা ফসল তুলুন এবং ছায়ায় রাখুন।", weeds: "আগাছা সরান এবং শিকড় না নাড়িয়ে গাছের দূরত্ব পরীক্ষা করুন।", beforeRain: "সরঞ্জাম নিরাপদে রাখুন, লম্বা গাছকে সহায়তা দিন এবং নালা পরিষ্কার করুন।" }
};

function getFarmerPlanCopy(language = currentLanguage) {
    return farmerPlanCopy[language] || farmerPlanCopy.en;
}

function renderDailyPrediction(targetId, forecast, cropName = "crop") {
    const target = document.getElementById(targetId);
    if (!target) return;
    const day = forecast?.daily?.[0] || forecast?.[0] || {};
    const rain = Number(day.precipitationProbabilityMax ?? day.precipitationProbability ?? weatherData.rain ?? 0);
    const max = Number(day.tempMax ?? weatherData.temperature);
    const min = Number(day.tempMin ?? Math.max(0, max - 7));
    const wind = Number(day.windSpeedMax ?? weatherData.wind ?? 0);
    const text = planningText[currentLanguage] || planningText.en;
    const advice = rain >= 50 ? text.rain : max >= 35 ? text.hot : text.noRain;
    target.innerHTML = `<div class="daily-prediction-heading"><strong>${escapeHTML(text.today)}</strong><span>${escapeHTML(String(day.dayName || "Today"))}</span></div><div class="daily-prediction-values"><span>🌡️ <b>${escapeHTML(String(max))}°C / ${escapeHTML(String(min))}°C</b><small>${escapeHTML(text.temp)}</small></span><span>🌧️ <b>${escapeHTML(String(rain))}%</b><small>${escapeHTML(text.rain)}</small></span><span>💨 <b>${escapeHTML(String(wind))} km/h</b><small>${escapeHTML(text.wind)}</small></span></div><p><b>${escapeHTML(text.advice)}:</b> ${escapeHTML(advice)} ${escapeHTML(cropName)}.</p>`;
}

function renderFarmerPlan(result) {
    latestFarmerPlanResult = result;
    const plan = result.plan || result.today_plan || {};
    const tasks = plan.tasks || result.tasks || [];
    const rainfall = result.rainfall || {};
    const hourly = rainfall.hourly || result.hourly_rainfall || [];
    const daily = rainfall.daily || result.daily_rainfall || [];
    const taskList = document.getElementById("farmTaskList");
    const hourlyEl = document.getElementById("farmerHourlyRainfall");
    const dailyEl = document.getElementById("farmerDailyRainfall");
    const irrigationEl = document.getElementById("farmerIrrigation");
    const workEl = document.getElementById("farmerWorkTime");
    const dateEl = document.getElementById("farmerPlanDate");
    const summaryEl = document.getElementById("farmerPlanSummary");
    const detailsEl = document.getElementById("farmerPlanDetails");
    const avoidEl = document.getElementById("farmerAvoidList");
    const weeklyEl = document.getElementById("farmerWeeklyPlan");
    const copy = getFarmerPlanCopy();

    if (dateEl) dateEl.textContent = farmerValue(plan.date || result.date, "Today");
    renderDailyPrediction("farmerTodayPrediction", result, result.summary?.crop || "your crop");
    if (summaryEl) {
        const summary = result.summary || {};
        summaryEl.innerHTML = [
            [copy.weather, summary.weather || result.weather_summary || copy.forecastChecked],
            [copy.risk, summary.risk || result.crop_risk || copy.forecastChecked],
            [copy.irrigation, summary.irrigation || (result.irrigation && result.irrigation.recommendation) || copy.forecastChecked],
            [copy.lastDate, summary.lastDate || result.last_crop_date || copy.forecastChecked]
        ].map(([label, value]) => `<div><small>${escapeHTML(label)}</small><strong>${escapeHTML(String(value))}</strong></div>`).join("");
    }
    
    if (taskList) {
        taskList.innerHTML = tasks.length
            ? tasks.map(task => {
                const item = typeof task === "string" ? { task } : task;
                const detail = [item.time, item.task || item.title || item.action, item.priority]
                    .filter(Boolean).join(" · ");
                return `<li>${escapeHTML(detail)}</li>`;
            }).join("")
            : `<li>${escapeHTML(copy.noTask)}</li>`;
    }
    if (detailsEl) {
        const details = result.details || [];
        detailsEl.innerHTML = details.length
            ? details.map(item => `<div><strong>${escapeHTML(String(item.label || "Advice"))}</strong><p>${escapeHTML(String(item.value || item))}</p></div>`).join("")
            : "<div><p>Crop, soil, irrigation and weather details are needed for a safe recommendation.</p></div>";
    }
    if (avoidEl) {
        const avoid = result.avoid || [];
        avoidEl.innerHTML = avoid.length
            ? avoid.map(item => `<li>${escapeHTML(String(item))}</li>`).join("")
            : "<li>No specific activity to avoid was identified.</li>";
    }
    if (weeklyEl) {
        const weekly = result.weekly || [];
        weeklyEl.innerHTML = weekly.length
            ? weekly.map((item, index) => `<button type="button" class="weekly-plan-card${index === 0 ? " expanded" : ""}" aria-expanded="${index === 0}" data-week-detail="${index}"><span>${escapeHTML(String(item.week))}</span><strong>${escapeHTML(String(item.action))}</strong><small>${escapeHTML(String(item.detail || "Review weather before acting."))}</small></button>`).join("")
            : "<div class=\"weekly-plan-card\"><strong>Weekly plan unavailable</strong><small>Add crop stage and planting date for a dated plan.</small></div>";
        bindWeeklyPlanCards(weeklyEl);
    }

    const renderRain = (items, target) => {
        if (!target) return;
        target.innerHTML = items.length
            ? items.map(item => {
                const row = typeof item === "string" ? { label: item } : item;
                const label = row.time || row.date || row.day || row.label || "—";
                const probability = farmerValue(row.probability ?? row.precip_probability ?? row.rain_probability, "—");
                const amount = row.amount_mm ?? row.precipitation_mm;
                return `<div class="farmer-rain-card"><small>${escapeHTML(String(label))}</small><strong>🌧️ ${escapeHTML(String(probability))}${String(probability).includes("%") ? "" : "%"}</strong><small>${amount === undefined ? "" : `${escapeHTML(String(amount))} mm`}</small></div>`;
            }).join("")
            : "<div class=\"farmer-rain-card\"><small>No forecast data</small></div>";
    };

    renderRain(hourly, hourlyEl);
    renderRain(daily, dailyEl);

    const irrigation = result.irrigation || result.irrigation_advisor || {};
    const irrigationText = typeof irrigation === "string"
        ? irrigation
        : irrigation.recommendation || irrigation.advice || (irrigation.amount_mm !== undefined ? `Apply ${irrigation.amount_mm} mm of water.` : "No irrigation needed right now.");
    if (irrigationEl) irrigationEl.textContent = irrigationText;

    const work = result.best_time_to_work || result.best_work_time || {};
    const workText = typeof work === "string" ? work : [work.start && `From ${work.start}`, work.end && `to ${work.end}`, work.reason].filter(Boolean).join(" ") || "No work window available.";
    if (workEl) workEl.textContent = workText;

    translatePage();
}

function bindWeeklyPlanCards(container) {
    container.querySelectorAll(".weekly-plan-card[data-week-detail]").forEach(card => {
        card.addEventListener("click", () => {
            container.querySelectorAll(".weekly-plan-card[data-week-detail]").forEach(otherCard => {
                if (otherCard !== card) {
                    otherCard.classList.remove("expanded");
                    otherCard.setAttribute("aria-expanded", "false");
                }
            });
            const expanded = card.classList.toggle("expanded");
            card.setAttribute("aria-expanded", String(expanded));
        });
    });
}

const cropPlanningData = {
    rice: { name: "Rice / Paddy", department: "Cereals", seasons: ["Monsoon"], months: [6, 7], duration: 120, water: "High", risk: "Flooding and waterlogging" },
    wheat: { name: "Wheat", department: "Cereals", seasons: ["Winter"], months: [10, 11], duration: 120, water: "Medium–High", risk: "Heat and frost" },
    maize: { name: "Maize", department: "Cereals", seasons: ["Monsoon", "Winter", "Summer"], months: [6, 10, 2], duration: 105, water: "Medium", risk: "Waterlogging or drought" },
    bajra: { name: "Bajra", department: "Cereals", seasons: ["Monsoon", "Summer"], months: [6, 2], duration: 90, water: "Low", risk: "Drought" },
    sorghum: { name: "Sorghum / Jowar", department: "Cereals", seasons: ["Monsoon", "Winter"], months: [6, 9], duration: 120, water: "Low–Medium", risk: "Drought" },
    ragi: { name: "Ragi", department: "Cereals", seasons: ["Monsoon"], months: [6], duration: 110, water: "Low–Medium", risk: "Dry spell" },
    barley: { name: "Barley", department: "Cereals", seasons: ["Winter"], months: [10, 11], duration: 110, water: "Low–Medium", risk: "Heat" },
    oats: { name: "Oats", department: "Cereals", seasons: ["Winter"], months: [10, 11], duration: 100, water: "Medium", risk: "Heat" },
    chickpea: { name: "Chickpea / Gram", department: "Pulses", seasons: ["Winter"], months: [10, 11], duration: 115, water: "Low–Medium", risk: "Excess moisture" },
    "pigeon-pea": { name: "Pigeon Pea / Tur", department: "Pulses", seasons: ["Monsoon"], months: [6, 7], duration: 180, water: "Medium", risk: "Excess rain or drought" },
    "green-gram": { name: "Green Gram / Moong", department: "Pulses", seasons: ["Summer", "Monsoon"], months: [2, 6], duration: 70, water: "Low–Medium", risk: "Excess rain and heat" },
    "black-gram": { name: "Black Gram / Urad", department: "Pulses", seasons: ["Monsoon"], months: [6, 7], duration: 80, water: "Medium", risk: "Excess moisture" },
    lentil: { name: "Lentil / Masoor", department: "Pulses", seasons: ["Winter"], months: [10, 11], duration: 110, water: "Low–Medium", risk: "Excess moisture" },
    cowpea: { name: "Cowpea", department: "Pulses", seasons: ["Summer", "Monsoon"], months: [2, 6], duration: 70, water: "Medium", risk: "Heat" },
    "field-pea": { name: "Field Pea", department: "Pulses", seasons: ["Winter"], months: [10, 11], duration: 100, water: "Medium", risk: "Heat and disease" },
    groundnut: { name: "Groundnut", department: "Oilseeds", seasons: ["Monsoon", "Summer"], months: [5, 2], duration: 115, water: "Medium", risk: "Excess rain and disease" },
    soybean: { name: "Soybean", department: "Oilseeds", seasons: ["Monsoon"], months: [6, 7], duration: 105, water: "Medium", risk: "Waterlogging" },
    mustard: { name: "Mustard", department: "Oilseeds", seasons: ["Winter"], months: [10, 11], duration: 120, water: "Low–Medium", risk: "Frost and excess rain" },
    sesame: { name: "Sesame", department: "Oilseeds", seasons: ["Summer", "Monsoon"], months: [2, 6], duration: 90, water: "Low", risk: "Excess rain" },
    sunflower: { name: "Sunflower", department: "Oilseeds", seasons: ["Winter", "Summer"], months: [10, 2], duration: 100, water: "Medium", risk: "Heat and drought" },
    castor: { name: "Castor", department: "Oilseeds", seasons: ["Monsoon"], months: [6], duration: 180, water: "Medium", risk: "Waterlogging" },
    safflower: { name: "Safflower", department: "Oilseeds", seasons: ["Winter"], months: [10], duration: 125, water: "Low", risk: "Heat" },
    cotton: { name: "Cotton", department: "Fibre", seasons: ["Monsoon"], months: [6, 7], duration: 180, water: "Medium", risk: "Heavy rain and pests" },
    jute: { name: "Jute", department: "Fibre", seasons: ["Monsoon"], months: [4, 5], duration: 120, water: "High", risk: "Flooding" },
    sugarcane: { name: "Sugarcane", department: "Sugar & starch", seasons: ["Monsoon", "Long duration"], months: [2, 6, 9], duration: 365, water: "High", risk: "Drought" },
    "sweet-potato": { name: "Sweet potato", department: "Tuber", seasons: ["Summer", "Monsoon"], months: [2, 6], duration: 120, water: "Medium", risk: "Waterlogging" },
    tapioca: { name: "Tapioca", department: "Tuber", seasons: ["Monsoon"], months: [5, 6], duration: 300, water: "Medium", risk: "Waterlogging" },
    cumin: { name: "Cumin", department: "Spice", seasons: ["Winter"], months: [10, 11], duration: 120, water: "Low", risk: "Humidity and disease" },
    coriander: { name: "Coriander", department: "Spice", seasons: ["Winter"], months: [10, 11], duration: 100, water: "Medium", risk: "Disease and excess moisture" },
    fennel: { name: "Fennel", department: "Spice", seasons: ["Winter"], months: [10, 11], duration: 180, water: "Medium", risk: "Humidity" },
    turmeric: { name: "Turmeric", department: "Spice", seasons: ["Monsoon"], months: [5, 6], duration: 240, water: "Medium–High", risk: "Rhizome rot" },
    ginger: { name: "Ginger", department: "Spice", seasons: ["Monsoon"], months: [5, 6], duration: 240, water: "Medium–High", risk: "Rhizome rot" },
    garlic: { name: "Garlic", department: "Spice", seasons: ["Winter"], months: [10, 11], duration: 150, water: "Medium", risk: "Excess moisture" },
    chilli: { name: "Chilli", department: "Vegetables", seasons: ["Monsoon", "Winter"], months: [6, 9], duration: 180, water: "Medium", risk: "Pests and disease" },
    fenugreek: { name: "Fenugreek", department: "Vegetables", seasons: ["Winter"], months: [10, 11], duration: 90, water: "Low–Medium", risk: "Excess moisture" },
    potato: { name: "Potato", department: "Tubers", seasons: ["Winter"], months: [10, 11], duration: 100, water: "Medium", risk: "Frost and late blight" },
    tomato: { name: "Tomato", department: "Vegetables", seasons: ["Winter", "Summer"], months: [9, 1], duration: 120, water: "Medium", risk: "Blight and heat" },
    brinjal: { name: "Brinjal", department: "Vegetables", seasons: ["Summer", "Monsoon"], months: [2, 6], duration: 150, water: "Medium", risk: "Fruit borer" },
    okra: { name: "Okra", department: "Vegetables", seasons: ["Summer", "Monsoon"], months: [2, 6], duration: 75, water: "Medium", risk: "Pests" },
    cucumber: { name: "Cucumber", department: "Vegetables", seasons: ["Summer", "Monsoon"], months: [2, 6], duration: 65, water: "Medium–High", risk: "Heat and disease" },
    onion: { name: "Onion", department: "Vegetables", seasons: ["Winter"], months: [10, 11], duration: 150, water: "Medium", risk: "Excess rain" },
    spinach: { name: "Spinach", department: "Leafy vegetables", seasons: ["Winter", "Summer"], months: [10, 2], duration: 45, water: "Medium", risk: "Heat and leaf disease" },
    mango: { name: "Mango", department: "Fruit", seasons: ["Perennial"], months: [6, 7], duration: 365, water: "Medium", risk: "Flowering pests" },
    banana: { name: "Banana", department: "Fruit", seasons: ["Perennial"], months: [1, 6], duration: 365, water: "High", risk: "Wind and drought" },
    papaya: { name: "Papaya", department: "Fruit", seasons: ["Perennial"], months: [2, 6], duration: 300, water: "Medium", risk: "Virus and waterlogging" },
    guava: { name: "Guava", department: "Fruit", seasons: ["Perennial"], months: [6, 7], duration: 365, water: "Medium", risk: "Fruit fly" },
    pomegranate: { name: "Pomegranate", department: "Fruit", seasons: ["Perennial"], months: [6, 7], duration: 365, water: "Medium", risk: "Fruit cracking" },
    grapes: { name: "Grapes", department: "Fruit", seasons: ["Winter"], months: [10, 11], duration: 180, water: "Medium", risk: "Fungal disease" },
    watermelon: { name: "Watermelon", department: "Fruit", seasons: ["Winter", "Summer"], months: [10, 2], duration: 90, water: "Medium–High", risk: "Heat and water stress" },
    muskmelon: { name: "Muskmelon", department: "Fruit", seasons: ["Winter", "Summer"], months: [10, 2], duration: 90, water: "Medium", risk: "Disease" },
    coconut: { name: "Coconut", department: "Plantation", seasons: ["Perennial"], months: [6, 7], duration: 365, water: "Medium–High", risk: "Drought and pests" },
    rose: { name: "Rose", department: "Flower", seasons: ["Perennial"], months: [9, 10], duration: 120, water: "Medium", risk: "Mildew and pests" },
    marigold: { name: "Marigold", department: "Flower", seasons: ["Winter", "Summer"], months: [9, 2], duration: 90, water: "Medium", risk: "Thrips and rot" },
    tea: { name: "Tea", department: "Plantation", seasons: ["Perennial"], months: [6, 7], duration: 365, water: "High", risk: "Drought and pests" },
    coffee: { name: "Coffee", department: "Plantation", seasons: ["Perennial"], months: [6, 7], duration: 365, water: "Medium–High", risk: "Rust and drought" },
    arecanut: { name: "Arecanut", department: "Plantation", seasons: ["Perennial"], months: [6, 7], duration: 365, water: "High", risk: "Wind and drought" },
    rubber: { name: "Rubber", department: "Plantation", seasons: ["Perennial"], months: [6, 7], duration: 365, water: "High", risk: "Wind and disease" },
    "aloe-vera": { name: "Aloe vera", department: "Medicinal", seasons: ["Perennial"], months: [6, 7], duration: 240, water: "Low", risk: "Waterlogging" },
    ashwagandha: { name: "Ashwagandha", department: "Medicinal", seasons: ["Winter"], months: [9, 10], duration: 180, water: "Low", risk: "Excess moisture" },
    isabgol: { name: "Isabgol", department: "Medicinal", seasons: ["Winter"], months: [10, 11], duration: 120, water: "Low", risk: "Rain at maturity" },
    lemongrass: { name: "Lemongrass", department: "Aromatic", seasons: ["Monsoon"], months: [6, 7], duration: 120, water: "Medium", risk: "Waterlogging" },
    mint: { name: "Mint", department: "Aromatic", seasons: ["Winter", "Summer"], months: [10, 2], duration: 100, water: "Medium", risk: "Leaf disease" },
    berseem: { name: "Berseem", department: "Fodder", seasons: ["Winter"], months: [10, 11], duration: 180, water: "Medium", risk: "Waterlogging" },
    lucerne: { name: "Lucerne", department: "Fodder", seasons: ["Winter"], months: [10, 11], duration: 365, water: "Medium", risk: "Heat" },
    "fodder-maize": { name: "Fodder Maize", department: "Fodder", seasons: ["All seasons"], months: [2, 6, 10], duration: 70, water: "Medium", risk: "Drought" },
    napier: { name: "Napier Grass", department: "Fodder", seasons: ["Monsoon"], months: [6, 7], duration: 90, water: "High", risk: "Drought" },
    linseed: { name: "Linseed", department: "Oilseeds", seasons: ["Winter"], months: [10, 11], duration: 150, water: "Low", risk: "Excess moisture" },
    flax: { name: "Flax", department: "Fibre", seasons: ["Winter"], months: [10, 11], duration: 120, water: "Medium", risk: "Disease" },
    mesta: { name: "Mesta", department: "Fibre", seasons: ["Monsoon"], months: [6, 7], duration: 150, water: "Medium", risk: "Waterlogging" },
    ramie: { name: "Ramie", department: "Fibre", seasons: ["Monsoon"], months: [6, 7], duration: 365, water: "High", risk: "Drought" },
    "sugar-beet": { name: "Sugar beet", department: "Sugar & starch", seasons: ["Winter"], months: [10, 11], duration: 180, water: "Medium", risk: "Heat" },
    yam: { name: "Yam", department: "Tubers", seasons: ["Monsoon"], months: [5, 6], duration: 240, water: "Medium", risk: "Rot" },
    colocasia: { name: "Colocasia", department: "Tubers", seasons: ["Monsoon"], months: [6, 7], duration: 180, water: "High", risk: "Waterlogging" },
    "black-pepper": { name: "Black pepper", department: "Spice", seasons: ["Perennial"], months: [6, 7], duration: 365, water: "High", risk: "Disease" },
    cardamom: { name: "Cardamom", department: "Spice", seasons: ["Perennial"], months: [6, 7], duration: 365, water: "High", risk: "Fungal disease" },
    "bottle-gourd": { name: "Bottle gourd", department: "Vegetables", seasons: ["Summer", "Monsoon"], months: [2, 6], duration: 100, water: "Medium–High", risk: "Fruit fly" },
    "bitter-gourd": { name: "Bitter gourd", department: "Vegetables", seasons: ["Summer", "Monsoon"], months: [2, 6], duration: 100, water: "Medium", risk: "Disease" },
    pumpkin: { name: "Pumpkin", department: "Vegetables", seasons: ["Summer", "Monsoon"], months: [2, 6], duration: 120, water: "Medium", risk: "Mildew" },
    carrot: { name: "Carrot", department: "Root vegetables", seasons: ["Winter"], months: [10, 11], duration: 100, water: "Medium", risk: "Root disease" },
    radish: { name: "Radish", department: "Root vegetables", seasons: ["Winter", "Summer"], months: [10, 2], duration: 45, water: "Medium", risk: "Pest damage" },
    beetroot: { name: "Beetroot", department: "Root vegetables", seasons: ["Winter"], months: [10, 11], duration: 90, water: "Medium", risk: "Leaf disease" },
    amaranth: { name: "Amaranth", department: "Leafy vegetables", seasons: ["Summer", "Monsoon"], months: [2, 6], duration: 45, water: "Medium", risk: "Leaf pests" },
    lemon: { name: "Lemon", department: "Fruit", seasons: ["Perennial"], months: [6, 7], duration: 365, water: "Medium", risk: "Canker and pests" },
    apple: { name: "Apple", department: "Fruit", seasons: ["Perennial"], months: [10, 11], duration: 365, water: "Medium", risk: "Frost" },
    sapota: { name: "Sapota / Chikoo", department: "Fruit", seasons: ["Perennial"], months: [6, 7], duration: 365, water: "Medium", risk: "Fruit pests" },
    jasmine: { name: "Jasmine", department: "Flower", seasons: ["Perennial"], months: [6, 7], duration: 180, water: "Medium", risk: "Budworm" },
    chrysanthemum: { name: "Chrysanthemum", department: "Flower", seasons: ["Winter"], months: [8, 9], duration: 120, water: "Medium", risk: "Mildew" },
    tuberose: { name: "Tuberose", department: "Flower", seasons: ["Summer", "Monsoon"], months: [2, 6], duration: 150, water: "Medium", risk: "Bulb rot" },
    gerbera: { name: "Gerbera", department: "Flower", seasons: ["Perennial"], months: [6, 7], duration: 180, water: "Medium", risk: "Root rot" },
    gladiolus: { name: "Gladiolus", department: "Flower", seasons: ["Winter"], months: [10, 11], duration: 120, water: "Medium", risk: "Thrips" },
    cocoa: { name: "Cocoa", department: "Plantation", seasons: ["Perennial"], months: [6, 7], duration: 365, water: "High", risk: "Pod disease" },
    cashew: { name: "Cashew", department: "Plantation", seasons: ["Perennial"], months: [6, 7], duration: 365, water: "Low–Medium", risk: "Tea mosquito bug" },
    senna: { name: "Senna", department: "Medicinal", seasons: ["Summer"], months: [2], duration: 150, water: "Low", risk: "Drought" },
    "fodder-sorghum": { name: "Fodder Sorghum", department: "Fodder", seasons: ["Monsoon", "Summer"], months: [2, 6], duration: 70, water: "Low–Medium", risk: "Drought" },
    "fodder-bajra": { name: "Fodder Bajra", department: "Fodder", seasons: ["Monsoon", "Summer"], months: [2, 6], duration: 70, water: "Low", risk: "Drought" }
};

const cropEmoji = {
    rice: "🌾", wheat: "🌾", maize: "🌽", bajra: "🌾", sorghum: "🌾", ragi: "🌾", barley: "🌾", oats: "🌾",
    chickpea: "🫘", "pigeon-pea": "🫘", "green-gram": "🫘", "black-gram": "🫘", lentil: "🫘", cowpea: "🫘", "field-pea": "🫛",
    groundnut: "🥜", soybean: "🫘", mustard: "🌻", sesame: "🌿", sunflower: "🌻", castor: "🌿", safflower: "🌿",
    cotton: "🌿", jute: "🌿", sugarcane: "🌱", "sweet-potato": "🥔", tapioca: "🥔",
    cumin: "🌿", coriander: "🌿", fennel: "🌿", turmeric: "🌿", ginger: "🫚", garlic: "🧄", chilli: "🌶️", fenugreek: "🌿",
    potato: "🥔", tomato: "🍅", brinjal: "🍆", okra: "🥬", cucumber: "🥒", onion: "🧅", spinach: "🥬",
    mango: "🥭", banana: "🍌", papaya: "🍈", guava: "🍐", pomegranate: "🍎", grapes: "🍇", watermelon: "🍉", muskmelon: "🍈", coconut: "🥥",
    rose: "🌹", marigold: "🌼", tea: "🍃", coffee: "☕", arecanut: "🌴", rubber: "🌳", "aloe-vera": "🌱",
    ashwagandha: "🌿", isabgol: "🌿", lemongrass: "🌿", mint: "🌿", berseem: "🌱", lucerne: "🌱", "fodder-maize": "🌽", napier: "🌱"
};

const localizedCropNames = {
    rice: { hi: "धान", gu: "ચોખા", mr: "तांदूळ", kn: "ಅಕ್ಕಿ", ta: "நெல்", bn: "ধান" },
    wheat: { hi: "गेहूं", gu: "ઘઉં", mr: "गहू", kn: "ಗೋಧಿ", ta: "கோதுமை", bn: "গম" },
    maize: { hi: "मक्का", gu: "મકાઈ", mr: "मका", kn: "ಮೆಕ್ಕೆಜೋಳ", ta: "மக்காச்சோளம்", bn: "ভুট্টা" },
    sorghum: { hi: "ज्वार", gu: "જુવાર", mr: "ज्वारी", kn: "ಜೋಳ", ta: "சோளம்", bn: "জোয়ার" },
    bajra: { hi: "बाजरा", gu: "બાજરી", mr: "बाजरी", kn: "ಸಜ್ಜೆ", ta: "கம்பு", bn: "বাজরা" },
    ragi: { hi: "रागी", gu: "રાગી", mr: "नाचणी", kn: "ರಾಗಿ", ta: "கேழ்வரகு", bn: "রাগি" },
    cotton: { hi: "कपास", gu: "કપાસ", mr: "कापूस", kn: "ಹತ್ತಿ", ta: "பருத்தி", bn: "তুলা" },
    sugarcane: { hi: "गन्ना", gu: "શેરડી", mr: "ऊस", kn: "ಕಬ್ಬು", ta: "கரும்பு", bn: "আখ" },
    groundnut: { hi: "मूंगफली", gu: "મગફળી", mr: "भुईमूग", kn: "ಕಡಲೆಕಾಯಿ", ta: "நிலக்கடலை", bn: "চিনাবাদাম" },
    soybean: { hi: "सोयाबीन", gu: "સોયાબીન", mr: "सोयाबीन", kn: "ಸೋಯಾಬೀನ್", ta: "சோயாபீன்", bn: "সয়াবিন" },
    mustard: { hi: "सरसों", gu: "સરસવ", mr: "मोहरी", kn: "ಸಾಸಿವೆ", ta: "கடுகு", bn: "সরিষা" },
    chickpea: { hi: "चना", gu: "ચણા", mr: "हरभरा", kn: "ಕಡಲೆ", ta: "கொண்டைக்கடலை", bn: "ছোলা" },
    "green-gram": { hi: "मूंग", gu: "મગ", mr: "मूग", kn: "ಹೆಸರುಕಾಳು", ta: "பாசிப்பயறு", bn: "মুগ" },
    "pigeon-pea": { hi: "अरहर", gu: "તુવેર", mr: "तूर", kn: "ತೊಗರಿ", ta: "துவரம் பருப்பு", bn: "অড়হর" },
    potato: { hi: "आलू", gu: "બટાકા", mr: "बटाटा", kn: "ಆಲೂಗಡ್ಡೆ", ta: "உருளைக்கிழங்கு", bn: "আলু" },
    tomato: { hi: "टमाटर", gu: "ટામેટા", mr: "टोमॅटो", kn: "ಟೊಮ್ಯಾಟೊ", ta: "தக்காளி", bn: "টমেটো" },
    onion: { hi: "प्याज", gu: "ડુંગળી", mr: "कांदा", kn: "ಈರುಳ್ಳಿ", ta: "வெங்காயம்", bn: "পেঁয়াজ" },
    chilli: { hi: "मिर्च", gu: "મરચું", mr: "मिरची", kn: "ಮೆಣಸಿನಕಾಯಿ", ta: "மிளகாய்", bn: "লঙ্কা" },
    mango: { hi: "आम", gu: "કેરી", mr: "आंबा", kn: "ಮಾವು", ta: "மாம்பழம்", bn: "আম" },
    banana: { hi: "केला", gu: "કેળું", mr: "केळी", kn: "ಬಾಳೆಹಣ್ಣು", ta: "வாழை", bn: "কলা" },
    coconut: { hi: "नारियल", gu: "નાળિયેર", mr: "नारळ", kn: "ತೆಂಗಿನಕಾಯಿ", ta: "தேಂಗಿನಕಾಯಿ", bn: "নারকেল" }
};

function localizedCropName(key, fallback = "Crop", language = currentLanguage) {
    return localizedCropNames[key]?.[language] || fallback;
}

function cropLabel(key, item = cropPlanningData[key], language = currentLanguage) {
    return `${cropEmoji[key] || "🌱"} ${localizedCropName(key, item?.name || key, language)}`;
}

const seasonalPlanCopy = {
    en: { title: "plan for", week: "Week", tap: "Tap to view details", crop: "Crop", stage: "Growth stage", soil: "Soil", moisture: "Moisture", capacity: "Water capacity", goodCrops: "Good crops to plant in", noWindow: "No crop window is stored for this month. Check the local agriculture department.", mainRisk: "Main risk", checkWeather: "Check the weather before doing this work.", duration: "180-day approximate crop duration", actions: ["Test {soil} soil, check drainage and arrange {crop} seed/seedlings.", "Prepare the field and plant/transplant only in a safe weather window.", "Check germination, weeds, moisture and early crop risk.", "Review nutrition, scout pests and record the next irrigation or field operation.", "Check plant growth, remove weeds and maintain proper spacing.", "Inspect for pests and disease; use only crop-labelled treatment if needed.", "Check water, support plants if needed and remove damaged leaves.", "Review maturity, calculate harvest timing and prepare safe storage."] },
    hi: { title: "की योजना", week: "सप्ताह", tap: "विवरण देखने के लिए टैप करें", crop: "फसल", stage: "फसल अवस्था", soil: "मिट्टी", moisture: "नमी", capacity: "पानी की क्षमता", goodCrops: "सितंबर में बोने के लिए अच्छी फसलें", noWindow: "इस महीने की फसल अवधि उपलब्ध नहीं है। स्थानीय कृषि विभाग से जांच करें।", mainRisk: "मुख्य जोखिम", checkWeather: "काम करने से पहले मौसम जांचें।", duration: "लगभग 180 दिन की फसल अवधि", actions: ["मिट्टी की जांच करें, जल निकासी देखें और बीज तैयार रखें।", "खेत तैयार करें और सुरक्षित मौसम में ही बुवाई या रोपाई करें।", "अंकुरण, खरपतवार, नमी और शुरुआती जोखिम जांचें।", "पोषण की समीक्षा करें, कीट देखें और अगली सिंचाई दर्ज करें।", "फसल की बढ़वार देखें, खरपतवार हटाएं और दूरी बनाए रखें।", "कीट और रोग देखें; जरूरत हो तो फसल-अनुमोदित उपचार ही करें।", "पानी जांचें, जरूरत पर पौधों को सहारा दें और खराब पत्तियां हटाएं।", "परिपक्वता देखें, कटाई का समय तय करें और सुरक्षित भंडारण तैयार करें।"] },
    gu: { title: "માટેની યોજના", week: "અઠવાડિયું", tap: "વિગતો જોવા ટેપ કરો", crop: "પાક", stage: "વિકાસ તબક્કો", soil: "જમીન", moisture: "ભેજ", capacity: "પાણીની ક્ષમતા", duration: "લગભગ 180 દિવસનો પાક સમય", actions: ["જમીન તપાસો, નિકાસ જુઓ અને બીજ તૈયાર રાખો.", "ખેતર તૈયાર કરો અને સુરક્ષિત હવામાનમાં જ વાવણી કરો.", "અંકુરણ, નીંદણ, ભેજ અને શરૂઆતનું જોખમ તપાસો.", "પોષણની સમીક્ષા કરો, જીવાત જુઓ અને આગામી સિંચાઈ નોંધો.", "પાકની વૃદ્ધિ જુઓ, નીંદણ દૂર કરો અને અંતર જાળવો.", "જીવાત અને રોગ તપાસો; જરૂર હોય તો પાક માટે મંજૂર સારવાર કરો.", "પાણી તપાસો, જરૂર હોય તો છોડને આધાર આપો અને ખરાબ પાંદડા દૂર કરો.", "પરિપક્વતા તપાસો, લણણીનો સમય નક્કી કરો અને સંગ્રહ તૈયાર કરો."] },
    mr: { title: "योजना", week: "आठवडा", tap: "तपशील पाहण्यासाठी टॅप करा", crop: "पीक", stage: "पीक अवस्था", soil: "माती", moisture: "ओलावा", capacity: "पाण्याची क्षमता", duration: "सुमारे 180 दिवसांचा पीक कालावधी", actions: ["माती तपासा, निचरा पाहा आणि बियाणे तयार ठेवा.", "शेत तयार करा आणि सुरक्षित हवामानातच पेरणी करा.", "उगवण, तण, ओलावा आणि सुरुवातीचा धोका तपासा.", "पोषण तपासा, कीड पाहा आणि पुढील सिंचन नोंदवा.", "पिकाची वाढ पाहा, तण काढा आणि योग्य अंतर ठेवा.", "कीड व रोग तपासा; गरज असल्यास पीक-मंजूर उपचार करा.", "पाणी तपासा, गरज असल्यास झाडांना आधार द्या आणि खराब पाने काढा.", "परिपक्वता तपासा, कापणीची वेळ ठरवा आणि साठवण तयार करा."] },
    kn: { title: "ಯೋಜನೆ", week: "ವಾರ", tap: "ವಿವರಗಳಿಗಾಗಿ ಟ್ಯಾಪ್ ಮಾಡಿ", crop: "ಬೆಳೆ", stage: "ಬೆಳೆಯ ಹಂತ", soil: "ಮಣ್ಣು", moisture: "ತೇವಾಂಶ", capacity: "ನೀರಿನ ಸಾಮರ್ಥ್ಯ", duration: "ಸುಮಾರು 180 ದಿನಗಳ ಬೆಳೆ ಅವಧಿ", actions: ["ಮಣ್ಣು ಪರೀಕ್ಷಿಸಿ, ನೀರು ಹರಿಯುವಿಕೆ ನೋಡಿ ಮತ್ತು ಬೀಜ ಸಿದ್ಧಪಡಿಸಿ.", "ಹೊಲ ಸಿದ್ಧಪಡಿಸಿ ಸುರಕ್ಷಿತ ಹವಾಮಾನದಲ್ಲಿ ಮಾತ್ರ ಬಿತ್ತನೆ ಮಾಡಿ.", "ಮೊಳಕೆ, ಕಳೆ, ತೇವಾಂಶ ಮತ್ತು ಆರಂಭಿಕ ಅಪಾಯ ಪರಿಶೀಲಿಸಿ.", "ಪೋಷಣೆ ಪರಿಶೀಲಿಸಿ, ಕೀಟ ನೋಡಿ ಮತ್ತು ಮುಂದಿನ ನೀರಾವರಿ ದಾಖಲಿಸಿ.", "ಬೆಳೆಯ ಬೆಳವಣಿಗೆ ನೋಡಿ, ಕಳೆ ತೆಗೆಯಿರಿ ಮತ್ತು ಅಂತರ ಕಾಪಾಡಿ.", "ಕೀಟ ಮತ್ತು ರೋಗ ಪರಿಶೀಲಿಸಿ; ಅಗತ್ಯವಿದ್ದರೆ ಬೆಳೆ-ಅನುಮೋದಿತ ಚಿಕಿತ್ಸೆ ಬಳಸಿ.", "ನೀರು ಪರಿಶೀಲಿಸಿ, ಅಗತ್ಯವಿದ್ದರೆ ಸಸ್ಯಕ್ಕೆ ಆಸರೆ ನೀಡಿ ಮತ್ತು ಹಾನಿಗೊಂಡ ಎಲೆ ತೆಗೆಯಿರಿ.", "ಪಕ್ವತೆ ಪರಿಶೀಲಿಸಿ, ಕೊಯ್ಲಿನ ಸಮಯ ನಿಗದಿ ಮಾಡಿ ಮತ್ತು ಸಂಗ್ರಹ ಸಿದ್ಧಪಡಿಸಿ."] },
    ta: { title: "திட்டம்", week: "வாரம்", tap: "விவரங்களுக்கு தட்டவும்", crop: "பயிர்", stage: "வளர்ச்சி நிலை", soil: "மண்", moisture: "ஈரம்", capacity: "நீர் திறன்", duration: "சுமார் 180 நாள் பயிர் காலம்", actions: ["மண்ணை சோதித்து, வடிகால் பார்த்து, விதைகளை தயாராக வைக்கவும்.", "வயலை தயார் செய்து பாதுகாப்பான வானிலையில் மட்டும் விதைக்கவும்.", "முளைப்பு, களைகள், ஈரம் மற்றும் ஆரம்ப அபாயத்தை பார்க்கவும்.", "ஊட்டத்தை சரிபார்த்து, பூச்சிகளை பார்த்து அடுத்த பாசனத்தை பதிவு செய்யவும்.", "பயிர் வளர்ச்சியை பார்த்து, களைகளை அகற்றி இடைவெளி காக்கவும்.", "பூச்சி மற்றும் நோயை பார்க்கவும்; தேவையெனில் பயிருக்கு அனுமதிக்கப்பட்ட சிகிச்சை மட்டும் பயன்படுத்தவும்.", "நீரை சரிபார்த்து, தேவைப்பட்டால் செடிக்கு ஆதரவு அளித்து சேதமான இலைகளை அகற்றவும்.", "முதிர்ச்சியை பார்த்து அறுவடை நேரம் முடிவு செய்து சேமிப்பை தயார் செய்யவும்."] },
    bn: { title: "পরিকল্পনা", week: "সপ্তাহ", tap: "বিস্তারিত দেখতে ট্যাপ করুন", crop: "ফসল", stage: "ফসলের পর্যায়", soil: "মাটি", moisture: "আর্দ্রতা", capacity: "জলের ক্ষমতা", duration: "প্রায় ১৮০ দিনের ফসলের সময়কাল", actions: ["মাটি পরীক্ষা করুন, নিষ্কাশন দেখুন এবং বীজ প্রস্তুত রাখুন।", "জমি প্রস্তুত করে নিরাপদ আবহাওয়ায় বপন বা রোপণ করুন।", "অঙ্কুরোদগম, আগাছা, আর্দ্রতা ও প্রাথমিক ঝুঁকি দেখুন।", "পুষ্টি পরীক্ষা করুন, কীট দেখুন এবং পরের সেচ নথিভুক্ত করুন।", "ফসলের বৃদ্ধি দেখুন, আগাছা সরান এবং দূরত্ব বজায় রাখুন।", "কীট ও রোগ দেখুন; প্রয়োজনে ফসল-অনুমোদিত চিকিৎসা ব্যবহার করুন।", "জল পরীক্ষা করুন, প্রয়োজনে গাছকে সহায়তা দিন এবং নষ্ট পাতা সরান।", "পরিপক্বতা দেখে কাটার সময় ঠিক করুন এবং নিরাপদ সংরক্ষণ প্রস্তুত করুন।"] }
};

function getSeasonalPlanCopy(language = currentLanguage) {
    return { ...seasonalPlanCopy.en, ...(seasonalPlanCopy[language] || {}) };
}

function syncBackendSoilMoisture(value) {
    const moisture = Number(value);
    if (!Number.isFinite(moisture)) return;
    ["farmerSoilMoisture", "seasonalSoilMoisture"].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = String(Math.max(0, Math.min(100, Math.round(moisture))));
    });
}

function currentSeason(monthNumber = new Date().getMonth()) {
    if ([5, 6, 7, 8, 9].includes(monthNumber)) return "Monsoon";
    if ([10, 11, 0, 1].includes(monthNumber)) return "Winter";
    return "Summer";
}

function getFarmerInputs() {
    const value = id => document.getElementById(id)?.value || "";
    const backendMoisture = Number(latestForecast?.current?.soilMoisture);
    return {
        crop: value("farmerCrop"),
        growthStage: value("farmerGrowthStage"),
        soilMoisture: Number.isFinite(backendMoisture) ? backendMoisture : Number(value("farmerSoilMoisture")),
        soilType: value("farmerSoilType"),
        waterCapacity: value("farmerWaterCapacity"),
        irrigationStatus: value("farmerIrrigationStatus"),
        plantingDate: value("farmerPlantingDate"),
        farmNote: value("farmerFarmNote")
    };
}

function buildLocalFarmPlan(inputs) {
    const data = cropPlanningData[inputs.crop] || { name: inputs.crop, department: "Crop", seasons: [], duration: 100, water: "Unknown", risk: "Check crop-specific risk" };
    const planCopy = getSeasonalPlanCopy();
    const copy = getFarmerPlanCopy();
    const displayCrop = cropLabel(inputs.crop, data);
    const forecast = latestForecast?.daily?.[0] || {};
    const rainProbability = Number(forecast.precipitationProbabilityMax ?? weatherData.rain ?? 0);
    const temperature = Number(forecast.tempMax ?? weatherData.temperature);
    const rainExpected = rainProbability >= 50;
    const drySoil = Number.isFinite(inputs.soilMoisture) && inputs.soilMoisture < 30;
    const irrigationNeeded = !rainExpected && drySoil && inputs.irrigationStatus !== "rainfed";
    const risk = rainExpected ? `${data.risk}; rain risk is high today` : temperature >= 35 ? `${data.risk}; heat stress is possible` : data.risk;
    const today = new Date();
    const lastDate = inputs.plantingDate && data.duration
        ? new Date(new Date(`${inputs.plantingDate}T00:00:00`).getTime() + data.duration * 86400000).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        : "Add planting date";
    const tasks = [
        { time: "6:00–8:00 AM", task: copy.walk(cropLabel(inputs.crop, data)), priority: `${copy.priority} 1` },
        { time: "8:00–10:00 AM", task: irrigationNeeded ? copy.irrigate : rainExpected ? copy.drainage : copy.soil, priority: `${copy.priority} 2` },
        { time: "10:00 AM", task: copy.pests, priority: `${copy.priority} 3` },
        { time: "4:00–6:00 PM", task: inputs.growthStage === "harvest" ? copy.harvest : copy.weeds, priority: `${copy.priority} 4` }
    ];
    if (rainExpected) tasks.push({ time: "Before rain", task: copy.beforeRain, priority: copy.weatherAction });
    return {
        date: today.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        tasks,
        avoid: [
            ...(rainExpected ? ["Do not spray pesticide or fertilizer before rain.", "Do not irrigate while soil is wet or rain is expected."] : []),
            ...(temperature >= 35 ? ["Avoid transplanting and heavy field work in the hot afternoon."] : []),
            "Do not mix chemicals without a label and crop-specific advice."
        ],
        summary: { crop: displayCrop, weather: `${temperature || "—"}°C · rain chance ${rainProbability || 0}%`, risk, irrigation: irrigationNeeded ? "Required if soil is dry" : rainExpected ? "Not required today" : "Check root-zone moisture", lastDate },
        details: [
            { label: "Crop and department", value: `${displayCrop} · ${data.department} · ${inputs.growthStage} stage` },
            { label: "Soil and water", value: `${inputs.soilType || "Not given"} soil · moisture ${inputs.soilMoisture}% · ${inputs.waterCapacity || "capacity not given"} capacity` },
            { label: "Fertilizer", value: rainExpected ? "Wait for a dry window and soil test; do not apply before rain." : inputs.growthStage === "sowing" ? "Use only a crop-labelled basal dose after soil-test guidance." : "Apply nutrition only if the crop stage and soil test require it." },
            { label: "Spraying", value: rainExpected || windSpeedFromForecast(forecast) > 20 ? "Not suitable today; inspect first and wait for a calm, dry window." : "Scout first; spray only a labelled product when a pest threshold is reached." },
            { label: "Weather risk and prevention", value: `${risk}. ${rainExpected ? "Keep drains clear and support plants." : "Use mulch and work in morning/evening during heat."}` },
            { label: "Crop finish", value: `${data.duration}-day approximate duration. Expected last date: ${lastDate}. Confirm with crop stage and local variety.` }
        ],
        weekly: [
            { week: `${planCopy.week} 1`, action: planCopy.actions[0].replace("{soil}", inputs.soilType || "soil").replace("{crop}", displayCrop), detail: `Prioritize ${data.risk.toLowerCase()} prevention.` },
            { week: `${planCopy.week} 2`, action: planCopy.actions[1].replace("{soil}", inputs.soilType || "soil").replace("{crop}", displayCrop), detail: `Use the ${data.water} water requirement; follow soil-test advice.` },
            { week: `${planCopy.week} 3`, action: planCopy.actions[2].replace("{soil}", inputs.soilType || "soil").replace("{crop}", displayCrop), detail: "Spray only a labelled product after confirming the problem." },
            { week: `${planCopy.week} 4`, action: planCopy.actions[3].replace("{soil}", inputs.soilType || "soil").replace("{crop}", displayCrop), detail: `Approximate duration: ${data.duration} days.` }
        ],
        irrigation: { recommendation: irrigationNeeded ? "Irrigation is required only at the root zone because soil moisture is low." : rainExpected ? "No irrigation today; rain may supply water." : "Check soil before irrigation; avoid unnecessary watering." },
        best_time_to_work: { start: "6:00 AM", end: "10:00 AM", reason: temperature >= 35 ? "Cooler and safer window; return after 4 PM." : "Lower heat and better crop inspection." },
        daily: latestForecast?.daily || [],
        hourly: latestForecast?.hourly || []
    };
}

function windSpeedFromForecast(day) {
    return Number(day.windSpeedMax ?? weatherData.wind ?? 0);
}

async function loadFarmerPlan() {
    const inputs = getFarmerInputs();
    if (!inputs.crop || !inputs.growthStage) {
        setFarmerStatus("Choose a crop and growth stage before loading the plan.", "error");
        return;
    }
    saveFarmProfile({ id: activeProfileId, mode: "farmer", ...inputs });

    setFarmerStatus("Your farm plan is loading...");
    document.getElementById("farmerPlanContent").setAttribute("aria-busy", "true");

    const params = new URLSearchParams({
        lat: String(farmerLocation.latitude),
        lon: String(farmerLocation.longitude),
        crop: inputs.crop,
        language: currentLanguage,
        growth_stage: inputs.growthStage,
        soil_moisture: inputs.soilMoisture,
        soil_type: inputs.soilType,
        water_capacity: inputs.waterCapacity,
        irrigation_status: inputs.irrigationStatus,
        planting_date: inputs.plantingDate
    });

    try {
        const response = await fetch(`${API_BASE}/api/advisory/agriculture`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                location: farmerLocation.name,
                lat: farmerLocation.latitude,
                lon: farmerLocation.longitude,
                crop: inputs.crop,
                language: currentLanguage,
                growth_stage: inputs.growthStage,
                soil_moisture: inputs.soilMoisture,
                soil_type: inputs.soilType,
                water_capacity: inputs.waterCapacity,
                irrigation_status: inputs.irrigationStatus,
                planting_date: inputs.plantingDate,
                farm_note: inputs.farmNote
            })
        });
        const localPlan = buildLocalFarmPlan(inputs);
        let result = localPlan;
        if (response.ok) {
            const advisory = await response.json();
            result = {
                ...localPlan,
                ...advisory,
                summary: { ...localPlan.summary, ...(advisory.summary || {}) },
                details: advisory.details || localPlan.details,
                avoid: advisory.avoid || localPlan.avoid,
                irrigation: advisory.irrigationAdvice || advisory.irrigation || localPlan.irrigation,
                best_time_to_work: advisory.forecastSummary || advisory.best_time_to_work || localPlan.best_time_to_work,
                tasks: advisory.tasks || advisory.precautions || localPlan.tasks,
                daily: advisory.daily || latestForecast?.daily || [],
                hourly: advisory.hourly || latestForecast?.hourly || []
            };
        }
        result._localPlan = localPlan;
        result.summary = {
            ...(result.summary || {}),
            crop: cropLabel(inputs.crop, cropPlanningData[inputs.crop])
        };
        if (currentLanguage !== "en" && result._localPlan) {
            result = {
                ...result,
                summary: result._localPlan.summary,
                details: result._localPlan.details,
                avoid: result._localPlan.avoid,
                tasks: result._localPlan.tasks,
                weekly: result._localPlan.weekly,
                irrigation: result._localPlan.irrigation,
                best_time_to_work: result._localPlan.best_time_to_work
            };
        } else if (!response.ok) {
            console.warn(`Farm plan service returned ${response.status}; using local crop and weather rules.`);
        }
        const hasData = result && (result.plan || result.today_plan || result.tasks || result.rainfall || result.irrigation || result.best_time_to_work);
        if (!hasData) {
            setFarmerStatus("No plan is available for these options.", "empty");
            return;
        }
        renderFarmerPlan(result);
        setFarmerStatus(`Plan updated for ${farmerLocation.name || "your location"}.`);
        translatePage();
        farmerPlanLoaded = true;
    } catch (error) {
        console.warn("Farmer plan service unavailable; using local crop and weather rules.", error);
        const localPlan = buildLocalFarmPlan(inputs);
        renderFarmerPlan(localPlan);
        setFarmerStatus(`Live advisory unavailable. Showing a crop-and-weather plan for ${farmerLocation.name || "your location"}.`, "empty");
    } finally {
        document.getElementById("farmerPlanContent").setAttribute("aria-busy", "false");
    }
}

if (farmerPlanForm) {
    farmerPlanForm.addEventListener("submit", event => {
        event.preventDefault();
        loadFarmerPlan();
    });
}

/* =========================================================
   CYCLONE INTELLIGENCE
========================================================= */

function renderCycloneStatus(data) {
    const hasCyclone = data && (data.name || data.cyclone_name || data.status === "active");
    const card = document.getElementById("cycloneStatusCard");
    const status = document.getElementById("cycloneStatus");
    const name = document.getElementById("cycloneName");
    const message = document.getElementById("cycloneMessage");
    const source = document.getElementById("cycloneSource");
    const updated = document.getElementById("cycloneUpdated");
    if (!card || !status || !name || !message) return;

    card.className = `cyclone-status-card ${hasCyclone ? (data.alert_level || "watch") : "neutral"}`;
    status.textContent = hasCyclone ? (data.alert_label || "Verified cyclone advisory") : "No active cyclone warning";
    name.textContent = hasCyclone ? (data.name || data.cyclone_name) : "No verified system in this area";
    message.textContent = hasCyclone
        ? (data.summary || "Follow the latest official advisory and local authority instructions.")
        : "No official cyclone warning is available for your location right now. This center never invents warnings.";
    if (source) source.textContent = data?.source || "WeatherGPT live data service";
    if (updated) updated.textContent = `Last updated: ${data?.updated_at ? new Date(data.updated_at).toLocaleString() : "just now"}`;

    const values = {
        cycloneLocation: data?.location || "Not available",
        cycloneDistance: `Distance: ${data?.distance_km ? `${data.distance_km} km` : "—"}`,
        cycloneWind: data?.wind_speed ? `${data.wind_speed} km/h` : "—",
        cycloneDirection: `Direction: ${data?.wind_direction || "—"}`,
        cycloneRainfall: data?.rainfall ? `${data.rainfall} mm` : "—",
        cycloneLandfall: data?.landfall || "No landfall estimate",
        cycloneMovement: data?.movement || "A movement forecast will appear here when a verified cyclone advisory is received."
    };
    Object.entries(values).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
    const mapNote = document.getElementById("cycloneMapNote");
    if (mapNote) mapNote.textContent = hasCyclone ? "Verified track data loaded" : "No verified track to plot";
    translatePage();
}

async function loadCycloneStatus() {
    const updated = document.getElementById("cycloneUpdated");
    if (updated) updated.textContent = "Checking official sources...";
    try {
        const params = new URLSearchParams({ lat: String(farmerLocation.latitude), lon: String(farmerLocation.longitude), language: currentLanguage });
        const response = await fetch(`${API_BASE}/api/cyclones`);
        if (!response.ok) throw new Error(`Cyclone request failed (${response.status})`);
        const cyclones = await response.json();
        const active = Array.isArray(cyclones) ? cyclones[0] : cyclones;
        renderCycloneStatus(active ? {
            ...active,
            alert_level: active.warningLevel,
            alert_label: active.status,
            wind_speed: active.maxWindSpeedKmh,
            wind_direction: active.movementDirection,
            location: active.basin,
            summary: active.intensity,
            updated_at: active.updatedAt
        } : null);
    } catch (error) {
        console.warn("Cyclone data is unavailable", error);
        renderCycloneStatus(null);
        if (updated) updated.textContent = "Live source unavailable · no warning issued";
        translatePage();
    }
}

    /* =========================================================
       EARLY WARNING & ALERT CENTER
    ========================================================= */

    function setEarlyWarningState(payload) {
        const verified = payload && Array.isArray(payload.alerts) ? payload.alerts : [];
        const highest = verified[0] || {};
        const level = highest.level || "normal";
        const levelCard = document.getElementById("warningLevelCard");
        const levelLabel = document.getElementById("warningLevel");
        const summary = document.getElementById("warningSummary");
        const source = document.getElementById("warningSource");
        const updated = document.getElementById("earlyWarningUpdated");
        const location = document.getElementById("warningLocation");
        const mapNote = document.getElementById("warningMapNote");
        const history = document.getElementById("alertHistoryList");
        const farmerNote = document.getElementById("farmerWarningText");
        const aiText = document.getElementById("warningAiText");
        if (!levelCard || !levelLabel || !summary) return;

        const rainfallValue = payload?.rainfall_24h || payload?.rainfall;
        const rain = rainfallValue && typeof rainfallValue === "object" ? rainfallValue : {};
        const rainExpected = rain.expected === true || rain.expected === "true" || payload?.rain_expected === true || Number(rain.probability) > 0;
        const rainExpectation = document.getElementById("rainExpectation");
        const rainExpectationDetail = document.getElementById("rainExpectationDetail");
        const rain24Status = document.getElementById("rain24Status");
        const rain24Detail = document.getElementById("rain24Detail");
        const cropRisk = document.getElementById("cropRisk");
        const cropSolution = document.getElementById("cropSolution");
        const floodScore = document.getElementById("floodRiskScore");
        const floodMeter = document.getElementById("floodRiskMeter");
        const floodDetail = document.getElementById("floodRiskDetail");
        const hasRainData = Object.keys(rain).length > 0;
        if (rainExpectation) rainExpectation.textContent = hasRainData ? (rainExpected ? "Rain expected" : "No rain expected") : "Data unavailable";
        if (rainExpectationDetail) rainExpectationDetail.textContent = hasRainData
            ? `${rain.amount_mm !== undefined ? `${rain.amount_mm} mm expected` : "Official rainfall outlook available"}${rain.probability !== undefined ? ` · ${rain.probability}% chance` : ""}`
            : "Verified 24-hour forecast will appear here.";
        if (rain24Status) rain24Status.textContent = hasRainData ? (rainExpected ? "Rain in next 24 hours" : "No heavy rain in next 24 hours") : "Data unavailable";
        if (rain24Detail) rain24Detail.textContent = hasRainData
            ? (rain.window || rain.summary || "Follow the latest official forecast.")
            : "No forecast has been loaded yet.";

        const cropValue = payload?.crop_risk;
        const crop = cropValue && typeof cropValue === "object" ? cropValue : {};
        if (cropRisk) cropRisk.textContent = typeof cropValue === "string" ? cropValue : (crop.level || "Not available");
        if (cropSolution) cropSolution.textContent = crop.solution || crop.advice || "A verified weather assessment is required before advice is shown.";

        const floodValue = payload?.flood_risk;
        const flood = floodValue && typeof floodValue === "object" ? floodValue : {};
        const score = Number(flood.score ?? payload?.flood_risk_score);
        const hasFloodScore = Number.isFinite(score);
        if (floodScore) floodScore.textContent = hasFloodScore ? `${Math.max(0, Math.min(100, score))} / 100` : "— / 100";
        if (floodMeter) floodMeter.style.width = hasFloodScore ? `${Math.max(0, Math.min(100, score))}%` : "0%";
        if (floodDetail) floodDetail.textContent = hasFloodScore
            ? `${flood.level || "Risk assessment"}${flood.summary ? ` · ${flood.summary}` : ""}`
            : "Based on verified rainfall, drainage, and official flood guidance.";

        levelCard.className = `warning-level ${level}`;
        levelLabel.textContent = level.charAt(0).toUpperCase() + level.slice(1);
        summary.textContent = highest.summary || "No verified warning is available for your location.";
        if (source) source.textContent = highest.source || payload?.source || "Official source pending";
        if (location) location.textContent = payload?.location || farmerLocation.name || "Your location";
        if (updated) updated.textContent = `Last updated: ${payload?.updated_at ? new Date(payload.updated_at).toLocaleString() : "just now"}`;
        if (mapNote) mapNote.textContent = highest.affected_area ? `Affected area: ${highest.affected_area}` : "No affected area has been published.";
        if (farmerNote && highest.farmer_advice) farmerNote.textContent = highest.farmer_advice;
        if (aiText) aiText.textContent = highest.ai_explanation || "I will explain verified warnings in simple English, Gujarati, or Hindi. Alerts are never generated without a trusted source.";
        if (["warning", "emergency"].includes(level) && highest.id) {
            const lastAlertId = localStorage.getItem("weatherGptLastAlertId");
            if (lastAlertId !== String(highest.id)) {
                notifyDevice(`🚨 ${levelLabel.textContent}`, highest.type || "official weather alert");
                localStorage.setItem("weatherGptLastAlertId", String(highest.id));
            }
        }
        if (history) {
            const entries = payload?.history || [];
            history.innerHTML = entries.length
                ? entries.slice(0, 5).map(item => `<div class="history-row"><span>${escapeHTML(item.type || "Weather alert")}</span><small>${escapeHTML(item.level || "Normal")} · ${escapeHTML(item.time || "Date unavailable")}</small></div>`).join("")
                : '<p class="empty-history">No verified alerts recorded for this location.</p>';
        }
            translatePage();
    }

    async function loadEarlyWarnings(requestLanguageToken = languageChangeToken) {
        const updated = document.getElementById("earlyWarningUpdated");
        if (updated) updated.textContent = "Checking official weather sources...";
        try {
            const params = new URLSearchParams({ lat: String(farmerLocation.latitude), lon: String(farmerLocation.longitude), language: currentLanguage });
            const response = await fetch(`${API_BASE}/api/weather/alerts?${params.toString()}`);
            if (!response.ok) throw new Error(`Early warning request failed (${response.status})`);
            if (requestLanguageToken !== languageChangeToken) return;
            setEarlyWarningState(await response.json());
        } catch (error) {
            console.warn("Early warning data is unavailable", error);
            if (requestLanguageToken !== languageChangeToken) return;
            setEarlyWarningState({ alerts: [], history: [], source: "Live source unavailable" });
            if (updated) updated.textContent = "Live source unavailable · no warning issued";
            translatePage();
        }
    }

    document.getElementById("refreshEarlyWarnings")?.addEventListener("click", loadEarlyWarnings);
    window.setInterval(() => {
        if (!alertsScreen?.classList.contains("hidden")) loadEarlyWarnings();
    }, 15 * 60 * 1000);

/* =========================================================
   GUIDED CROP PLANNING
========================================================= */

const planningStart = document.getElementById("planningStart");
const farmerPlanContent = document.getElementById("farmerPlanContent");
const seasonalPlanner = document.getElementById("seasonalPlanner");
let activeProfileId = null;
const savedFarmProfileKey = "weatherGptSavedFarmProfile";
const plannerLocale = {
    en: { saved: "Saved crop plan", open: "Tap to open full plan and prediction", crop: "Crop", stage: "Stage", soil: "Soil", moisture: "Moisture", planted: "Planted", seasonal: "Seasonal plan", daily: "Daily prediction" },
    hi: { saved: "सहेजी गई फसल योजना", open: "पूरी योजना और अनुमान खोलने के लिए टैप करें", crop: "फसल", stage: "अवस्था", soil: "मिट्टी", moisture: "नमी", planted: "बुवाई", seasonal: "मौसमी योजना", daily: "दैनिक अनुमान" },
    gu: { saved: "સાચવેલી પાક યોજના", open: "સંપૂર્ણ યોજના અને અનુમાન ખોલવા માટે ટેપ કરો", crop: "પાક", stage: "તબક્કો", soil: "જમીન", moisture: "ભેજ", planted: "વાવણી", seasonal: "મોસમી યોજના", daily: "દૈનિક અનુમાન" },
    mr: { saved: "जतन केलेली पीक योजना", open: "संपूर्ण योजना आणि अंदाज उघडण्यासाठी टॅप करा", crop: "पीक", stage: "अवस्था", soil: "माती", moisture: "ओलावा", planted: "पेरणी", seasonal: "हंगामी योजना", daily: "दैनिक अंदाज" },
    kn: { saved: "ಉಳಿಸಿದ ಬೆಳೆ ಯೋಜನೆ", open: "ಪೂರ್ಣ ಯೋಜನೆ ಮತ್ತು ಮುನ್ಸೂಚನೆ ತೆರೆಯಲು ಟ್ಯಾಪ್ ಮಾಡಿ", crop: "ಬೆಳೆ", stage: "ಹಂತ", soil: "ಮಣ್ಣು", moisture: "ತೇವಾಂಶ", planted: "ನಾಟಿ", seasonal: "ಋತು ಯೋಜನೆ", daily: "ದೈನಂದಿನ ಮುನ್ಸೂಚನೆ" },
    ta: { saved: "சேமித்த பயிர் திட்டம்", open: "முழு திட்டம் மற்றும் முன்னறிவிப்பைத் திறக்க தட்டவும்", crop: "பயிர்", stage: "நிலை", soil: "மண்", moisture: "ஈரம்", planted: "நடவு", seasonal: "பருவ திட்டம்", daily: "தினசரி முன்னறிவிப்பு" },
    bn: { saved: "সংরক্ষিত ফসল পরিকল্পনা", open: "সম্পূর্ণ পরিকল্পনা এবং পূর্বাভাস খুলতে ট্যাপ করুন", crop: "ফসল", stage: "পর্যায়", soil: "মাটি", moisture: "আর্দ্রতা", planted: "রোপণ", seasonal: "মৌসুমি পরিকল্পনা", daily: "দৈনিক পূর্বাভাস" }
};

function getPlannerLocale() {
    return plannerLocale[currentLanguage] || plannerLocale.en;
}

function readSavedFarmProfile() {
    try {
        const raw = localStorage.getItem(savedFarmProfileKey);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        const profiles = Array.isArray(parsed) ? parsed : [parsed];
        return profiles.filter(Boolean).map((profile, index) => ({
            ...profile,
            id: profile.id || `legacy-${index}`,
            signature: profile.signature || [
                profile.mode, profile.crop, profile.growthStage || profile.seasonalGrowthStage,
                profile.soilType, profile.soilMoisture, profile.waterCapacity,
                profile.irrigationStatus, profile.plantingDate, profile.farmNote
            ].join("|")
        }));
    } catch (error) {
        console.warn("Saved farm profile could not be read", error);
        return [];
    }
}

function saveFarmProfile(profile) {
    try {
        const profiles = readSavedFarmProfile();
        const signature = [
            profile.mode, profile.crop, profile.growthStage || profile.seasonalGrowthStage,
            profile.soilType, profile.soilMoisture, profile.waterCapacity,
            profile.irrigationStatus, profile.plantingDate, profile.farmNote
        ].join("|");
        const savedProfile = { ...profile, id: profile.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, signature, savedAt: new Date().toISOString() };
        const existingIndex = profiles.findIndex(item => item.signature === signature);
        if (existingIndex >= 0) profiles[existingIndex] = { ...profiles[existingIndex], ...savedProfile };
        else profiles.unshift(savedProfile);
        localStorage.setItem(savedFarmProfileKey, JSON.stringify(profiles.slice(0, 10)));
        renderSavedFarmProfile();
    } catch (error) {
        console.warn("Farm profile could not be saved", error);
    }
}

function renderSavedFarmProfile() {
    const container = document.getElementById("savedFarmProfiles");
    const profiles = readSavedFarmProfile();
    if (!container) return;
    if (!profiles.length) {
        container.innerHTML = "";
        return;
    }
    const labels = getPlannerLocale();
    container.innerHTML = profiles.map((profile, index) => {
        const data = cropPlanningData[profile.crop] || { name: profile.crop || "Crop", department: "Crop" };
        const displayName = cropLabel(profile.crop, data);
        return `<article class="saved-farm-profile" data-profile-id="${escapeHTML(profile.id || String(index))}" role="button" tabindex="0" aria-label="${escapeHTML(labels.open)}"><div><strong>🌱 ${escapeHTML(labels.saved)} ${profiles.length - index}</strong><button type="button" class="saved-farm-delete" data-delete-profile="${escapeHTML(profile.id || String(index))}" aria-label="Delete saved crop plan">×</button></div><b>${escapeHTML(displayName)} · ${escapeHTML(data.department)}</b><span>${escapeHTML(labels.crop)}: ${escapeHTML(displayName)} · ${escapeHTML(labels.stage)}: ${escapeHTML(profile.growthStage || profile.seasonalGrowthStage || "—")} · ${escapeHTML(labels.soil)}: ${escapeHTML(profile.soilType || "—")} · ${escapeHTML(labels.moisture)}: ${escapeHTML(String(profile.soilMoisture ?? "—"))}%</span><small>${escapeHTML(labels.open)} ↗</small></article>`;
    }).join("");
    container.querySelectorAll(".saved-farm-profile").forEach(card => {
        const profile = profiles.find(item => String(item.id) === card.dataset.profileId);
        card.addEventListener("click", event => {
            if (event.target.closest(".saved-farm-delete")) return;
            if (profile) openSavedFarmProfile(profile);
        });
        card.addEventListener("keydown", event => {
            if ((event.key === "Enter" || event.key === " ") && profile) {
                event.preventDefault();
                openSavedFarmProfile(profile);
            }
        });
    });
    container.querySelectorAll("[data-delete-profile]").forEach(button => {
        button.addEventListener("click", event => {
            event.stopPropagation();
            deleteSavedFarmProfile(button.dataset.deleteProfile);
        });
    });
}

function deleteSavedFarmProfile(profileId) {
    const remaining = readSavedFarmProfile().filter(profile => String(profile.id) !== String(profileId));
    localStorage.setItem(savedFarmProfileKey, JSON.stringify(remaining));
    renderSavedFarmProfile();
}

function restoreInputs(profile, prefix = "farmer") {
    const values = {
        Crop: profile.crop,
        GrowthStage: profile.growthStage || profile.seasonalGrowthStage,
        SoilType: profile.soilType,
        SoilMoisture: profile.soilMoisture,
        WaterCapacity: profile.waterCapacity,
        IrrigationStatus: profile.irrigationStatus,
        PlantingDate: profile.plantingDate,
        FarmNote: profile.farmNote
    };
    Object.entries(values).forEach(([suffix, value]) => {
        const element = document.getElementById(`${prefix}${suffix}`);
        if (element && value !== undefined && value !== null) element.value = value;
    });
}

function openSavedFarmProfile(profile) {
    activeProfileId = profile.id;
    planningStart?.classList.add("hidden");
    if (profile.mode === "seasonal") {
        farmerPlanContent?.classList.add("hidden");
        document.getElementById("farmerPlanForm")?.classList.add("hidden");
        seasonalPlanner?.classList.remove("hidden");
        restoreInputs(profile, "seasonal");
        buildSeasonalPlan();
    } else {
        seasonalPlanner?.classList.add("hidden");
        farmerPlanContent?.classList.remove("hidden");
        document.getElementById("farmerPlanForm")?.classList.remove("hidden");
        populateFarmerCropOptions();
        restoreInputs(profile);
        farmerPlanLoaded = false;
        loadFarmerPlan();
    }
}

function openPlanningStart() {
    if (planningStart) planningStart.classList.remove("hidden");
    if (farmerPlanContent) farmerPlanContent.classList.add("hidden");
    if (seasonalPlanner) seasonalPlanner.classList.add("hidden");
    document.getElementById("farmerPlanForm")?.classList.add("hidden");
    renderSavedFarmProfile();
}

function showExistingPlan() {
    planningStart?.classList.add("hidden");
    seasonalPlanner?.classList.add("hidden");
    farmerPlanContent?.classList.remove("hidden");
    const form = document.getElementById("farmerPlanForm");
    form?.classList.remove("hidden");
    populateFarmerCropOptions();
    if (!farmerPlanLoaded) loadFarmerPlan();
}

function populateFarmerCropOptions() {
    const crop = document.getElementById("farmerCrop");
    if (!crop || crop.dataset.catalogLoaded || typeof cropPlanningData === "undefined") return;
    const selected = crop.value;
    renderSharedCropOptions(crop, cropPlanningData[selected] ? selected : "rice");
}

function renderSharedCropOptions(select, selectedValue = "") {
    if (!select || typeof cropPlanningData === "undefined") return;
    const groups = {};
    Object.entries(cropPlanningData).forEach(([key, item]) => {
        const group = item.department || "Other crops";
        if (!groups[group]) groups[group] = [];
        groups[group].push(`<option value="${escapeHTML(key)}">${escapeHTML(cropLabel(key, item))}</option>`);
    });
    select.innerHTML = Object.entries(groups)
        .map(([group, options]) => `<optgroup label="${escapeHTML(group)}">${options.join("")}</optgroup>`)
        .join("");
    if (selectedValue && cropPlanningData[selectedValue]) select.value = selectedValue;
    select.dataset.catalogLoaded = "true";
}

function refreshCropOptionLabels() {
    ["farmerCrop", "seasonalCrop"].forEach(id => {
        const select = document.getElementById(id);
        if (!select || !select.value) return;
        const selected = select.value;
        Array.from(select.options).forEach(option => {
            const item = cropPlanningData[option.value];
            if (item) option.textContent = `${cropLabel(option.value, item)} · ${item.department}`;
        });
        select.value = selected;
    });
}

function buildSeasonalPlan() {
    const crop = document.getElementById("seasonalCrop");
    const title = document.getElementById("seasonalPlannerTitle");
    const reason = document.getElementById("seasonalPlannerReason");
    const advice = document.getElementById("currentWeekAdvice");
    const grid = document.getElementById("weeklyPlanGrid");
    if (!crop || !title || !reason || !advice || !grid) return;
    const planningLanguage = document.getElementById("seasonalLanguage")?.value || currentLanguage;
    const monthNumber = new Date().getMonth();
    const season = currentSeason(monthNumber);
    const locale = { en: "en-IN", hi: "hi-IN", gu: "gu-IN", mr: "mr-IN", kn: "kn-IN", ta: "ta-IN", bn: "bn-IN", te: "te-IN" }[planningLanguage] || "en-IN";
    const month = new Date().toLocaleString(locale, { month: "long" });
    const soilType = document.getElementById("seasonalSoilType")?.value || "not given";
    syncBackendSoilMoisture(latestForecast?.current?.soilMoisture);
    const moistureValue = document.getElementById("seasonalSoilMoisture")?.value;
    const moisture = Number(moistureValue);
    const capacity = document.getElementById("seasonalWaterCapacity")?.value || "not given";
    const plantingDate = document.getElementById("seasonalPlantingDate")?.value || "";
    const growthStage = document.getElementById("seasonalGrowthStage")?.value || "not given";
    if (!crop.dataset.catalogLoaded) {
        const requestedCrop = crop.value;
        renderSharedCropOptions(crop, cropPlanningData[requestedCrop] ? requestedCrop : "rice");
    }
    const selected = cropPlanningData[crop.value] || cropPlanningData.rice;
    const localizedAdvice = {
        hi: {
            reason: "यह योजना मौसम और वर्तमान महीने के आधार पर बनाई गई है।",
            prefix: "फसल योजना",
            advice: "मिट्टी की नमी और अगले सात दिनों के मौसम के अनुसार काम करें।"
        },
        gu: { reason: "આ યોજના હવામાન અને વર્તમાન મહિના પર આધારિત છે.", prefix: "પાક યોજના", advice: "જમીનની ભેજ અને આગામી સાત દિવસના હવામાન મુજબ કામ કરો." },
        mr: { reason: "ही योजना हवामान आणि सध्याच्या महिन्यावर आधारित आहे.", prefix: "पीक योजना", advice: "मातीतील ओलावा आणि पुढील सात दिवसांचे हवामान पाहून काम करा." },
        kn: { reason: "ಈ ಯೋಜನೆ ಹವಾಮಾನ ಮತ್ತು ಪ್ರಸ್ತುತ ತಿಂಗಳ ಆಧಾರದ ಮೇಲೆ ಇದೆ.", prefix: "ಬೆಳೆ ಯೋಜನೆ", advice: "ಮಣ್ಣಿನ ತೇವಾಂಶ ಮತ್ತು ಮುಂದಿನ ಏಳು ದಿನಗಳ ಹವಾಮಾನ ನೋಡಿ ಕೆಲಸ ಮಾಡಿ." },
        ta: { reason: "இந்தத் திட்டம் வானிலை மற்றும் தற்போதைய மாதத்தை அடிப்படையாகக் கொண்டது.", prefix: "பயிர் திட்டம்", advice: "மண் ஈரப்பதம் மற்றும் அடுத்த ஏழு நாட்களின் வானிலையைப் பார்த்து செயல்படுங்கள்." },
        bn: { reason: "এই পরিকল্পনা আবহাওয়া এবং বর্তমান মাসের উপর ভিত্তি করে তৈরি।", prefix: "ফসল পরিকল্পনা", advice: "মাটির আর্দ্রতা এবং আগামী সাত দিনের আবহাওয়া দেখে কাজ করুন।" }
    };
    const localized = localizedAdvice[planningLanguage];
    const copy = getSeasonalPlanCopy(planningLanguage);
    const selectedName = cropLabel(crop.value, selected, planningLanguage);
    const seasonFit = selected.seasons.includes(season) || selected.seasons.includes("All seasons") || selected.seasons.includes("Perennial");
    renderDailyPrediction("seasonalTodayPrediction", latestForecast || weatherData, selectedName);
    title.textContent = `${selectedName} ${copy.title} ${month}`;
    reason.textContent = localized?.reason || `${season} season: ${seasonFit ? "this crop fits the current season." : "this crop is outside its usual sowing window; confirm local variety and water before planting."}`;
    advice.textContent = localized?.advice || `For the ${growthStage} stage, use ${soilType} soil, keep moisture near ${Number.isFinite(moisture) ? `${moisture}%` : "the backend reading"} and plan water according to the crop's ${selected.water} requirement. ${copy.mainRisk}: ${selected.risk}.`;
    const readiness = document.getElementById("cropReadiness");
    const countdown = document.getElementById("cropCountdown");
    if (readiness && countdown) {
        if (plantingDate) {
            const readyDate = new Date(new Date(`${plantingDate}T00:00:00`).getTime() + selected.duration * 86400000);
            const daysLeft = Math.ceil((readyDate.getTime() - Date.now()) / 86400000);
            readiness.textContent = `${readyDate.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}`;
            countdown.textContent = daysLeft > 0 ? `${daysLeft} days remaining` : "Expected crop date has passed; check maturity before harvest.";
        } else {
            readiness.textContent = `Approximately ${selected.duration} days after planting`;
            countdown.textContent = "Add planting date for the remaining-day count.";
        }
    }
    const monthCrops = Object.values(cropPlanningData).filter(item => item.months.includes(monthNumber));
    const suggestedCrops = monthCrops.length
        ? monthCrops
        : Object.values(cropPlanningData).filter(item => item.seasons.includes(season) || item.seasons.includes("All seasons") || item.seasons.includes("Perennial"));
    const monthlyList = document.getElementById("monthlyCropList");
    if (monthlyList) {
        monthlyList.innerHTML = `<strong>${escapeHTML(copy.goodCrops)} ${escapeHTML(month)}</strong><p>${suggestedCrops.length ?         suggestedCrops.slice(0, 12).map(item => { const key = Object.keys(cropPlanningData).find(candidate => cropPlanningData[candidate] === item); return `${escapeHTML(cropLabel(key, item, planningLanguage))} (${escapeHTML(item.department)})`; }).join(" · ") : escapeHTML(copy.noWindow)}</p><small>${escapeHTML(copy.capacity)}: ${escapeHTML(capacity)} · ${escapeHTML(copy.moisture)}: ${Number.isFinite(moisture) ? moisture : "—"}%</small>`;
    }
    const weeks = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Week 7", "Week 8"];
    const actions = copy.actions.map(action => action.replace("{soil}", soilType).replace("{crop}", selectedName));
    const weekLabels = weeks.map((_, index) => `${copy.week} ${index + 1}`);
    grid.innerHTML = weeks.map((week, index) => `<button type="button" class="weekly-plan-card${index === 0 ? " expanded" : ""}" aria-expanded="${index === 0}" data-week-detail="${index}"><span>${escapeHTML(weekLabels[index])}</span><strong>${escapeHTML(actions[index])}</strong><small>${escapeHTML(selectedName)} · ${escapeHTML(copy.duration.replace("180", String(selected.duration)))}</small><em>${escapeHTML(copy.tap)}</em><div class="weekly-plan-detail">${escapeHTML(actions[index])}<br><br>${escapeHTML(copy.crop)}: ${escapeHTML(selectedName)}<br>${escapeHTML(copy.stage)}: ${escapeHTML(document.getElementById("seasonalGrowthStage")?.value || "not given")}<br>${escapeHTML(copy.soil)}: ${escapeHTML(soilType)} · ${escapeHTML(copy.moisture)}: ${Number.isFinite(moisture) ? moisture : "—"}%<br>${escapeHTML(copy.capacity)}: ${escapeHTML(capacity)}<br>${escapeHTML(copy.mainRisk)}: ${escapeHTML(selected.risk)}<br>${escapeHTML(copy.checkWeather)}</div></button>`).join("");
    bindWeeklyPlanCards(grid);
    translatePage();
}

document.querySelectorAll("[data-planning-choice]").forEach(button => {
    button.addEventListener("click", () => {
        if (button.dataset.planningChoice === "yes") {
            activeProfileId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            farmerPlanLoaded = false;
            translatePage();
            showExistingPlan();
        }
        else {
            activeProfileId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            planningStart?.classList.add("hidden");
            farmerPlanContent?.classList.add("hidden");
            document.getElementById("farmerPlanForm")?.classList.add("hidden");
            seasonalPlanner?.classList.remove("hidden");
            const title = document.getElementById("seasonalPlannerTitle");
            const reason = document.getElementById("seasonalPlannerReason");
            const advice = document.getElementById("currentWeekAdvice");
            const copy = getSeasonalPlanCopy();
            const detailTitle = {
                en: "Enter crop details",
                hi: "फसल का विवरण दर्ज करें",
                gu: "પાકની વિગતો દાખલ કરો",
                mr: "पिकाची माहिती भरा",
                kn: "ಬೆಳೆ ವಿವರಗಳನ್ನು ನಮೂದಿಸಿ",
                ta: "பயிர் விவரங்களை உள்ளிடவும்",
                bn: "ফসলের বিবরণ লিখুন"
            }[currentLanguage] || "Enter crop details";
            if (title) title.textContent = detailTitle;
            if (reason) reason.textContent = currentLanguage === "en"
                ? "Choose your crop, soil, moisture, growth stage and planting date."
                : copy.checkWeather;
            if (advice) advice.textContent = currentLanguage === "en"
                ? "Tap Analyze plan to create your 8-week plan."
                : `${copy.tap} · ${copy.checkWeather}`;
        }
    });
});

document.querySelectorAll("#farmerPlanForm select, #farmerPlanForm input").forEach(field => {
    field.addEventListener("change", () => {
        if (!farmerPlanContent?.classList.contains("hidden")) loadFarmerPlan();
    });
});

["seasonalCrop", "seasonalSoilType", "seasonalSoilMoisture", "seasonalWaterCapacity", "seasonalGrowthStage", "seasonalPlantingDate"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", () => {
        if (!seasonalPlanner?.classList.contains("hidden")) buildSeasonalPlan();
    });
});

document.getElementById("seasonalAnalyzeButton")?.addEventListener("click", () => {
    saveFarmProfile({
        id: activeProfileId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        mode: "seasonal",
        crop: document.getElementById("seasonalCrop")?.value || "",
        soilType: document.getElementById("seasonalSoilType")?.value || "",
        soilMoisture: document.getElementById("seasonalSoilMoisture")?.value || "",
        waterCapacity: document.getElementById("seasonalWaterCapacity")?.value || "",
        seasonalGrowthStage: document.getElementById("seasonalGrowthStage")?.value || "",
        plantingDate: document.getElementById("seasonalPlantingDate")?.value || ""
    });
    buildSeasonalPlan();
    document.getElementById("seasonalPlanner")?.scrollIntoView({ behavior: "smooth", block: "start" });
});
document.getElementById("seasonalLanguage")?.addEventListener("change", event => {
    setLanguage(event.target.value);
    buildSeasonalPlan();
});

document.getElementById("planningLanguageSelect")?.addEventListener("change", event => {
    setLanguage(event.target.value);
    buildSeasonalPlan();
});
const initialPlanningLanguage = document.getElementById("planningLanguageSelect");
if (initialPlanningLanguage) initialPlanningLanguage.value = currentLanguage;

/* =========================================================
FARMER FORECAST MODE - SEASON INDICATOR
========================================================= */

function initSeasonIndicator() {
    const today = new Date();
    const month = today.getMonth();
    let season, seasonIcon, seasonAdvice;

    // India's seasons: Winter (Nov-Feb), Summer (Mar-May), Monsoon (Jun-Sep), Autumn (Oct)
    if (month >= 2 && month <= 4) {
        season = "Summer Season";
        seasonIcon = "☀️";
        seasonAdvice = "Perfect for heat-resistant crops";
    } else if (month >= 5 && month <= 8) {
        season = "Monsoon Season";
        seasonIcon = "🌧️";
        seasonAdvice = "Great for rainfall-dependent crops";
    } else if (month >= 9 && month <= 10) {
        season = "Autumn Season";
        seasonIcon = "🍂";
        seasonAdvice = "Ideal for winter crop sowing";
    } else {
        season = "Winter Season";
        seasonIcon = "❄️";
        seasonAdvice = "Best for wheat and cool-season crops";
    }

    const seasonLabel = document.getElementById("seasonLabel");
    const seasonDesc = document.getElementById("seasonDesc");
    const seasonAnimation = document.getElementById("seasonAnimation");

    if (seasonLabel) seasonLabel.textContent = season;
    if (seasonDesc) seasonDesc.textContent = seasonAdvice;
    if (seasonAnimation) seasonAnimation.textContent = seasonIcon;
}

/* =========================================================
FARMER CHAT MODE - VOICE & TEXT
========================================================= */

const farmerChatInput = document.getElementById("farmerChatInput");
const farmerSendBtn = document.getElementById("farmerSendBtn");
const farmerVoiceBtn = document.getElementById("farmerVoiceBtn");
const voiceToggleBtn = document.getElementById("voiceToggleBtn");
const farmerChatBody = document.getElementById("farmerChatBody");
const quickQuestions = document.querySelectorAll(".farmer-quick-questions .quick-question");

function setupSingleClickVoice({ button, extraButtons = [], input, onSend, getLanguage }) {
    const buttons = [button, ...extraButtons].filter(Boolean);
    if (!buttons.length) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        buttons.forEach(control => control.addEventListener("click", () => {
            showNotification("🎙️ Speech input is not supported in this browser. Try Chrome or Edge over localhost.");
        }));
        return;
    }

    let recognition = null;
    let listening = false;
    let starting = false;
    const setVisualState = value => {
        listening = value;
        buttons.forEach(control => {
            control.classList.toggle("recording", value);
            control.classList.toggle("active", value && control.classList.contains("voice-toggle"));
            control.setAttribute("aria-label", value ? "Stop listening" : "Use microphone");
            control.setAttribute("aria-pressed", String(value));
        });
    };
    const createRecognition = () => {
        const instance = new SpeechRecognition();
        instance.continuous = false;
        instance.interimResults = false;
        instance.maxAlternatives = 1;
        instance.onstart = () => {
            starting = false;
            setVisualState(true);
        };
        instance.onend = () => {
            starting = false;
            setVisualState(false);
        };
        instance.onerror = event => {
            starting = false;
            setVisualState(false);
            console.warn("Speech recognition error:", event.error);
            if (event.error === "not-allowed" || event.error === "service-not-allowed") {
                showNotification("🎙️ Microphone access was blocked. Allow microphone access and try again.");
            } else if (event.error !== "no-speech" && event.error !== "aborted") {
                showNotification(`🎙️ Speech recognition notice: ${event.error}`);
            }
        };
        instance.onresult = event => {
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join(" ")
                .trim();
            if (transcript && input) {
                input.value = transcript;
                onSend();
            }
        };
        return instance;
    };
    buttons.forEach(control => control.addEventListener("click", event => {
        event.preventDefault();
        if (starting) return;
        if (listening && recognition) {
            recognition.stop();
            return;
        }
        try {
            recognition = recognition || createRecognition();
            recognition.lang = speechLocales[getLanguage()] || "en-IN";
            starting = true;
            recognition.start();
        } catch (error) {
            starting = false;
            setVisualState(false);
            console.warn("Speech recognition start failed:", error);
            recognition = createRecognition();
        }
    }));
}

setupSingleClickVoice({
    button: farmerVoiceBtn,
    extraButtons: [voiceToggleBtn],
    input: farmerChatInput,
    onSend: sendFarmerMessage,
    getLanguage: () => currentLanguage
});

function addThinkingMessage(container, className = "thinking-message") {
    if (!container) return null;
    const thinking = document.createElement("div");
    thinking.className = `${className} weather-thinking-bubble`;
    thinking.innerHTML = `<span class="thinking-cloud">☁️</span><span>Checking the skies</span><span class="thinking-dots">•••</span>`;
    container.appendChild(thinking);
    container.scrollTop = container.scrollHeight;
    return thinking;
}

async function sendFarmerMessage() {
    const message = farmerChatInput.value.trim();
    if (!message) return;

    addFarmerChatMessage("user", message);
    farmerChatHistory.push({ role: "user", content: message });
    farmerChatInput.value = "";
    const thinking = addThinkingMessage(farmerChatBody, "farmer-thinking");
    try {
        const response = await fetch(`${API_BASE}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message,
                language: currentLanguage,
                mode: "farmer",
                currentLocation: farmerLocation,
                history: farmerChatHistory.slice(-8)
            })
        });
        if (!response.ok) throw new Error(`Farmer chat request failed (${response.status})`);
        const result = await response.json();
        const content = result.content || "No farming advice was returned.";
        farmerChatHistory.push({ role: "assistant", content });
        addFarmerChatMessage("bot", content);
    } catch (error) {
        console.error("Farmer chat request failed", error);
        addFarmerChatMessage("bot", "I could not reach the live farming assistant. Please try again.");
    } finally {
        thinking?.remove();
    }
}

function addFarmerChatMessage(type, text) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `farmer-message ${type === "user" ? "user-message" : "farmer-ai-message"}`;

    if (type === "user") {
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-bubble">${formatChatText(text)}</div>
                <small>आप • अभी</small>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-avatar"><img src="farmer_chat_ai_pfp.png" alt="Farmer WeatherGPT"></div>
            <div class="message-content">
                <div class="message-bubble">${formatChatText(text)}</div>
                <div class="message-tools"><small>खेत सहायक • अभी</small><button class="message-speak farmer-speak" type="button" aria-label="Read farming advice aloud">🔊</button></div>
            </div>
        `;
    }

    farmerChatBody.appendChild(messageDiv);
    if (type !== "user") {
        bindSpeakButton(messageDiv.querySelector(".farmer-speak"), text);
    }
    farmerChatBody.scrollTop = farmerChatBody.scrollHeight;
}

farmerSendBtn.addEventListener("click", sendFarmerMessage);
farmerChatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendFarmerMessage();
});

quickQuestions.forEach(btn => {
    btn.addEventListener("click", () => {
        const question = btn.dataset.question;
        farmerChatInput.value = question;
        sendFarmerMessage();
    });
});

/* =========================================================
FARMER ALERT MODE
========================================================= */

function initFarmerAlerts() {
    const filterBtns = document.querySelectorAll(".alert-filter-btn");

    filterBtns.forEach(btn => {
        if (btn.dataset.bound === "true") return;
        btn.dataset.bound = "true";
        btn.addEventListener("click", () => {
            filterBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const filter = btn.dataset.filter;

            document.querySelectorAll("#farmerAlertsList .farmer-alert-item").forEach(item => {
                if (filter === "all") {
                    item.classList.add("visible");
                } else {
                    const alertType = item.dataset.alertType;
                    if (alertType === filter) {
                        item.classList.add("visible");
                    } else {
                        item.classList.remove("visible");
                    }
                }
            });
        });
    });

    loadFarmerAlerts();
}

function requestDeviceNotifications() {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(error => console.warn("Notification permission was not granted", error));
    }
}

function notifyDevice(title, body) {
    showNotification(`🔔 ${title}: ${body}`);
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body, icon: "cloud_pic.png", tag: "weathergpt-alert" });
    }
}

function renderFarmerAlerts(payload) {
    const list = document.getElementById("farmerAlertsList");
    if (!list) return;
    const alerts = Array.isArray(payload?.alerts) ? payload.alerts : [];
    const counts = { critical: 0, warning: 0, info: 0 };
    const normalized = alerts.map(alert => {
        const type = alert.level === "emergency" ? "critical" : alert.level === "warning" ? "warning" : "info";
        counts[type] += 1;
        return { ...alert, type };
    });
    document.getElementById("criticalAlertCount").textContent = String(counts.critical);
    document.getElementById("warningAlertCount").textContent = String(counts.warning);
    document.getElementById("infoAlertCount").textContent = String(counts.info);
    list.innerHTML = normalized.length ? normalized.map(alert => `
        <div class="farmer-alert-item ${alert.type}-alert visible" data-alert-type="${alert.type}">
            <div class="alert-header"><div class="alert-title"><span class="alert-badge">${alert.type === "critical" ? "🔴" : alert.type === "warning" ? "🟡" : "🔵"}</span><strong>${escapeHTML(alert.type || "Weather alert")}: ${escapeHTML(alert.summary || alert.description || "Official weather update")}</strong></div><span class="alert-time">${escapeHTML(alert.issuedAt || "Now")}</span></div>
            <p>${escapeHTML(alert.farmer_advice || alert.ai_explanation || alert.description || alert.summary || "Follow the latest official weather guidance.")}</p>
        </div>
    `).join("") : '<p class="empty-history">No verified alerts for your location.</p>';
    normalized.filter(alert => ["critical", "warning"].includes(alert.type)).forEach(alert => {
        const key = String(alert.id || `${alert.type}:${alert.summary}`);
        if (localStorage.getItem("weatherGptDeviceAlertId") !== key) {
            notifyDevice(alert.type === "critical" ? "Critical weather alert" : "Weather warning", alert.summary || "Check the Alerts screen");
            localStorage.setItem("weatherGptDeviceAlertId", key);
        }
    });
}

async function loadFarmerAlerts() {
    requestDeviceNotifications();
    const list = document.getElementById("farmerAlertsList");
    try {
        const params = new URLSearchParams({ lat: String(farmerLocation.latitude), lon: String(farmerLocation.longitude), name: farmerLocation.name });
        const response = await fetch(`${API_BASE}/api/weather/alerts?${params.toString()}`);
        if (!response.ok) throw new Error(`Alert request failed (${response.status})`);
        renderFarmerAlerts(await response.json());
    } catch (error) {
        console.warn("Farmer alerts are unavailable", error);
        if (list) list.innerHTML = '<p class="empty-history">Live alerts are unavailable. Try refreshing shortly.</p>';
    }
}

/* =========================================================
FORECAST TABS - NORMAL MODE
========================================================= */

const forecastTabs = document.querySelectorAll(".forecast-tab");
hourlyContainer = document.querySelector(".hourly-container");
weekForecast = document.querySelector(".week-forecast");
const sectionTitle = document.querySelectorAll(".section-title");
if (latestForecast) renderNormalForecast(latestForecast);

forecastTabs.forEach((tab, index) => {
    tab.addEventListener("click", function () {
        // Update active tab
        forecastTabs.forEach(t => t.classList.remove("active"));
        this.classList.add("active");

        // Get tab text
        const tabText = this.textContent.trim();
        activeForecastTab = tabText;

        // Hide/Show content based on selected tab
        if (tabText === "Today") {
            hourlyContainer.style.display = "flex";
            weekForecast.style.display = "none";
            if (latestForecast) renderHourlyCards(latestForecast.hourly || [], false);
            
            // Update section title
            const titleSection = hourlyContainer.previousElementSibling;
            if (titleSection && titleSection.classList.contains("section-title")) {
                titleSection.style.display = "block";
                const heading = titleSection.querySelector("h2");
                const label = titleSection.querySelector("span");
                if (heading) heading.textContent = "Hourly Forecast";
                if (label) label.textContent = "Today";
            }
            
            // Hide 7-day title
            sectionTitle.forEach(title => {
                const h2 = title.querySelector("h2");
                if (h2 && h2.textContent.includes("7-Day")) {
                    title.style.display = "none";
                }
            });
        } else if (tabText === "Tomorrow") {
            hourlyContainer.style.display = "flex";
            weekForecast.style.display = "none";
            if (latestForecast) renderHourlyCards(latestForecast.hourly || [], true);
            
            // Show hourly title
            sectionTitle.forEach(title => {
                const h2 = title.querySelector("h2");
                if (h2 && h2.textContent.includes("Hourly")) {
                    title.style.display = "block";
                    h2.textContent = "Tomorrow's Hourly Forecast";
                    const label = title.querySelector("span");
                    if (label) label.textContent = "Tomorrow";
                }
            });
            
            // Hide 7-day title
            sectionTitle.forEach(title => {
                const h2 = title.querySelector("h2");
                if (h2 && h2.textContent.includes("7-Day")) {
                    title.style.display = "none";
                }
            });
            
            showNotification("📅 Showing tomorrow's forecast");
        } else if (tabText === "7 Days") {
            hourlyContainer.style.display = "none";
            weekForecast.style.display = "flex";
            
            // Hide hourly title
            sectionTitle.forEach(title => {
                const h2 = title.querySelector("h2");
                if (h2 && h2.textContent.includes("Hourly")) {
                    title.style.display = "none";
                }
            });
            
            // Show 7-day title
            sectionTitle.forEach(title => {
                const h2 = title.querySelector("h2");
                if (h2 && h2.textContent.includes("7-Day")) {
                    title.style.display = "block";
                }
            });
            
            showNotification("📊 Showing 7-day forecast");
        }
    });
});

/* =========================================================
ALERT FILTERS - NORMAL MODE
========================================================= */

const normalAlertFilters = document.querySelectorAll("#alertsScreen .alert-filter");
const normalAlertCards = document.querySelectorAll("#alertsScreen .alert-card");

normalAlertFilters.forEach((filterBtn) => {
    filterBtn.addEventListener("click", function () {
        // Update active filter button
        normalAlertFilters.forEach(btn => btn.classList.remove("active"));
        this.classList.add("active");

        // Get filter text
        const filterType = this.dataset.alertFilter;

        // Filter alert cards
        normalAlertCards.forEach(card => {
            if (filterType === "all") {
                card.style.display = "block";
            } else if (filterType === "high" && card.classList.contains("high-alert")) {
                card.style.display = "block";
            } else if (filterType === "medium" && card.classList.contains("medium-alert")) {
                card.style.display = "block";
            } else if (filterType === "low" && card.classList.contains("low-alert")) {
                card.style.display = "block";
            } else {
                card.style.display = "none";
            }
        });

        // Show notification
        if (filterType !== "all") {
            showNotification(`⚠️ Showing ${filterType} severity alerts`);
        }
    });
});

document.querySelectorAll("[data-alert-details]").forEach(button => {
    button.addEventListener("click", () => {
        const card = button.closest(".alert-card");
        const title = card?.querySelector("h3")?.textContent.trim() || "Weather alert";
        showNotification(`ℹ️ ${title}: follow the safety guidance shown on this card.`);
        card?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
});

document.querySelectorAll(".alert-action-btn").forEach(button => {
    button.addEventListener("click", () => {
        showNotification(`✅ ${button.textContent.trim()} selected`);
        button.classList.add("selected");
        window.setTimeout(() => button.classList.remove("selected"), 900);
    });
});

/* =========================================================
AI CHAT - NORMAL MODE
========================================================= */

const chatInput = document.getElementById("chatInput");
const sendButton = document.getElementById("sendButton");
const chatBody = document.getElementById("chatBody");
const normalQuickQuestions = document.querySelectorAll("#homeScreen .quick-question");

// AI Chat responses
const aiResponses = {
    "rain": "🌧️ There is a 60% chance of rain today in your area. I recommend carrying an umbrella if you're going outside after 4 PM.",
    "hot": "🌡️ It will be quite warm today with a high of 32°C. Stay hydrated and avoid prolonged sun exposure between 12 PM - 3 PM.",
    "outdoor": "☀️ The weather is mostly sunny today until 4 PM. Perfect for outdoor activities this morning! However, bring an umbrella for the evening as rain is expected.",
    "tomorrow": "📅 Tomorrow will be partly cloudy with temperatures between 24-31°C. There's a 30% chance of rain throughout the day.",
    "default": "I can help with weather information, forecasts, rainfall predictions, temperature updates, and weather alerts. What would you like to know?"
};

function addAIChatMessage(type, text) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${type === "user" ? "user-message" : "ai-message"}`;
    
    if (type === "user") {
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-bubble">
                    <p>${formatChatText(text)}</p>
                </div>
                <small>You • Now</small>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-avatar"><img src="ai-avatar.png" alt="WeatherGPT"></div>
            <div class="message-content">
                <div class="message-bubble">
                    <p>${formatChatText(text)}</p>
                </div>
                <div class="message-tools">
                    <small>WeatherGPT • Now</small>
                    <button class="message-speak" type="button" aria-label="Read this reply aloud">🔊</button>
                </div>
            </div>
        `;
        bindSpeakButton(messageDiv.querySelector(".message-speak"), text);
    }

    chatBody.appendChild(messageDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function formatChatText(text) {
    return escapeHTML(text)
        .replace(/^###\s*(.+)$/gm, "<strong>$1</strong>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>");
}

function getAIResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes("rain")) {
        return aiResponses.rain;
    } else if (lowerMessage.includes("hot") || lowerMessage.includes("temperature")) {
        return aiResponses.hot;
    } else if (lowerMessage.includes("outdoor") || lowerMessage.includes("activities")) {
        return aiResponses.outdoor;
    } else if (lowerMessage.includes("tomorrow")) {
        return aiResponses.tomorrow;
    } else {
        return aiResponses.default;
    }
}

function bindSpeakButton(button, text) {
    if (!button) return;
    button.addEventListener("click", async () => {
        if (button.disabled) return;
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
        button.classList.add("speaking");
        try {
            await speakText(text);
        } finally {
            button.disabled = false;
            button.removeAttribute("aria-busy");
            button.classList.remove("speaking");
        }
    });
}

async function speakText(text) {
    try {
        const response = await fetch(`${API_BASE}/api/tts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, language: currentLanguage })
        });
        if (!response.ok) {
            let detail = `TTS request failed (${response.status})`;
            try {
                const payload = await response.json();
                detail = payload.detail || payload.error || detail;
            } catch {
                // Preserve the HTTP status when the server has no JSON error body.
            }
            throw new Error(detail);
        }
        const audioUrl = URL.createObjectURL(await response.blob());
        const audio = new Audio(audioUrl);
        const release = () => URL.revokeObjectURL(audioUrl);
        audio.addEventListener("ended", release, { once: true });
        audio.addEventListener("error", release, { once: true });
        await audio.play();
    } catch (error) {
        if ("speechSynthesis" in window) {
            const utterance = new SpeechSynthesisUtterance(text.replace(/[*#]/g, ""));
            utterance.lang = speechLocales[currentLanguage] || "en-IN";
            window.speechSynthesis.cancel();
            await new Promise(resolve => {
                utterance.addEventListener("end", resolve, { once: true });
                utterance.addEventListener("error", resolve, { once: true });
                window.speechSynthesis.speak(utterance);
            });
            return;
        }
        showNotification(`🔊 Voice unavailable: ${error.message}`);
    }
}

async function sendAIChatMessage() {
    const message = chatInput.value.trim();
    if (!message) return;
    
    // Add user message
    addAIChatMessage("user", message);
    normalChatHistory.push({ role: "user", content: message });
    chatInput.value = "";
    const thinking = addThinkingMessage(chatBody);
    try {
        const response = await fetch(`${API_BASE}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message,
                language: currentLanguage,
                mode: "normal",
                currentLocation: farmerLocation,
                history: normalChatHistory.slice(-8)
            })
        });
        if (!response.ok) throw new Error(`Chat request failed (${response.status})`);
        const result = await response.json();
        const content = result.content || "No response was returned.";
        normalChatHistory.push({ role: "assistant", content });
        addAIChatMessage("ai", content);
    } catch (error) {
        console.error("AI chat request failed", error);
        addAIChatMessage("ai", "I could not reach the live weather assistant. Please try again.");
    } finally {
        thinking?.remove();
    }
}

async function sendTravelAdvisory() {
    const origin = farmerLocation?.name || "Ahmedabad";
    const destination = origin.toLowerCase() === "pune" ? "Mumbai" : "Pune";
    addAIChatMessage("user", `Plan a weather-safe trip from ${origin} to ${destination}`);
    const thinking = addThinkingMessage(chatBody);
    try {
        const response = await fetch(`${API_BASE}/api/advisory/travel`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ origin, destination })
        });
        if (!response.ok) throw new Error(`Travel advisory request failed (${response.status})`);
        const result = await response.json();
        const recommendations = (result.recommendations || []).map(item => `- ${item}`).join("\n");
        addAIChatMessage("ai", `### 🧳 Weather-safe travel plan\n\n${result.advisoryText || "Travel conditions are being evaluated."}\n\n${recommendations}`);
    } catch (error) {
        console.error("Travel advisory request failed", error);
        addAIChatMessage("ai", "I could not load the live travel advisory. Please check the route weather and try again.");
    } finally {
        thinking?.remove();
    }
}

// Event listeners for AI Chat
if (sendButton) {
    sendButton.addEventListener("click", sendAIChatMessage);
}

if (chatInput) {
    chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            sendAIChatMessage();
        }
    });
}

const voiceInputButton = document.getElementById("voiceInputButton");
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const homeRecognition = SpeechRecognition ? new SpeechRecognition() : null;
if (voiceInputButton) {
    if (!homeRecognition) {
        voiceInputButton.addEventListener("click", () => showNotification("🎙️ Speech input is not supported in this browser. Try Chrome or Edge over localhost."));
    } else {
        homeRecognition.continuous = false;
        homeRecognition.interimResults = false;
        homeRecognition.onstart = () => {
            voiceInputButton.classList.add("recording");
            voiceInputButton.setAttribute("aria-label", "Stop listening");
            voiceInputButton.setAttribute("aria-pressed", "true");
            isRecordingVoice = true;
        };
        homeRecognition.onend = () => {
            voiceInputButton.classList.remove("recording");
            voiceInputButton.setAttribute("aria-label", "Use microphone");
            voiceInputButton.setAttribute("aria-pressed", "false");
            isRecordingVoice = false;
        };
        homeRecognition.onerror = event => {
            console.warn("Speech recognition failed", event.error);
            if (event.error === "not-allowed" || event.error === "service-not-allowed") {
                showNotification("🎙️ Microphone access was blocked. Allow microphone access and try again.");
            }
        };
        homeRecognition.onresult = event => {
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join(" ")
                .trim();
            if (transcript && chatInput) {
                chatInput.value = transcript;
                sendAIChatMessage();
            }
        };
        voiceInputButton.addEventListener("click", () => {
            homeRecognition.lang = speechLocales[currentLanguage] || "en-IN";
            if (isRecordingVoice) homeRecognition.stop();
            else {
                try { homeRecognition.start(); }
                catch (error) { console.warn("Speech recognition could not start", error); }
            }
        });
    }
}

// Quick question buttons for normal mode
normalQuickQuestions.forEach(btn => {
    btn.addEventListener("click", () => {
        if (btn.dataset.travel === "true") {
            sendTravelAdvisory();
            return;
        }
        const question = btn.textContent.trim();
        chatInput.value = question;
        sendAIChatMessage();
    });
});

/* =========================================================
WEATHER MAP - ALL MODES
========================================================= */

const mapCloseBtn = document.getElementById("mapCloseBtn");
const weatherMapModal = document.getElementById("weatherMapModal");
let indiaWeatherMap;
let selectedWeatherMarker;

async function showSelectedLocationWeather(latitude, longitude) {
    if (!indiaWeatherMap || !selectedWeatherMarker) return;
    const status = document.getElementById("weatherMapStatus");
    if (status) status.textContent = "Loading weather for selected location...";
    selectedWeatherMarker.bindPopup("Loading live weather...").openPopup();
    try {
        const params = new URLSearchParams({ lat: latitude, lon: longitude, name: "Selected location" });
        const response = await fetch(`${API_BASE}/api/weather/current?${params}`);
        if (!response.ok) throw new Error(`Selected location request failed (${response.status})`);
        const result = await response.json();
        const current = result.current || {};
        const temperature = current.temperature ?? "--";
        const rain = current.precipitationProbability ?? "--";
        const airQuality = result.airQuality || {};
        const aqi = airQuality.aqi ?? "--";
        selectedWeatherMarker.bindPopup(`<strong>Selected location</strong><br>🌡️ ${temperature}°C<br>🌧️ ${rain}% rain probability<br>💨 AQI: ${aqi} (${escapeHTML(airQuality.status || "Unavailable")})<br><small>${escapeHTML(current.weatherDescription || "Live conditions")}</small>`).openPopup();
        if (status) status.textContent = `Selected location: ${temperature}°C · ${rain}% rain probability.`;
    } catch (error) {
        console.warn("Selected location weather is unavailable", error);
        selectedWeatherMarker.bindPopup("Live weather is temporarily unavailable.").openPopup();
        if (status) status.textContent = "Could not load selected-location weather. Try again.";
    }
}

function setMapText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value ?? "--";
    }

function weatherMapConditionLabel(temperature) {
        return temperature >= 35 ? "Very Hot" : temperature >= 28 ? "Warm" : "Cool";
    }

function renderWeatherMap(data) {
        const current = data?.current || {};
        const dailyPayload = data?.daily || {};
        const daily = Array.isArray(data?.daily) ? data.daily : (dailyPayload.time || []).map((_, index) => ({
            tempMax: dailyPayload.temperature_2m_max?.[index],
            tempMin: dailyPayload.temperature_2m_min?.[index],
            precipitationSum: dailyPayload.precipitation_sum?.[index],
            precipitationProbabilityMax: dailyPayload.precipitation_probability_max?.[index],
            windSpeedMax: dailyPayload.wind_speed_10m_max?.[index],
        }));
        const alerts = Array.isArray(data?.alerts) ? data.alerts : [];
        const location = data?.location || farmerLocation.name || "Current location";
        setMapText("weatherMapLocationName", `${location}, ${farmerLocation.country || "India"}`);
        const temperature = Number(current.temperature);
        const values = [temperature, Number(daily[0]?.tempMax), Number(daily[0]?.tempMin)].filter(Number.isFinite);
        const max = values.length ? Math.max(...values) : null;
        const min = values.length ? Math.min(...values) : null;
        const mid = values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
        setMapText("weatherMapTempHot", max == null ? "--" : `${max}°C`);
        setMapText("weatherMapTempWarm", mid == null ? "--" : `${mid}°C`);
        setMapText("weatherMapTempCool", min == null ? "--" : `${min}°C`);
        setMapText("weatherMapTempHotLabel", max == null ? "Waiting for live data" : weatherMapConditionLabel(max));
        setMapText("weatherMapTempWarmLabel", mid == null ? "Waiting for live data" : weatherMapConditionLabel(mid));
        setMapText("weatherMapTempCoolLabel", min == null ? "Waiting for live data" : weatherMapConditionLabel(min));

        const rainfall = daily.slice(0, 7).map(day => Number(day.precipitationSum) || 0);
        const rainProbability = daily.slice(0, 7).map(day => Number(day.precipitationProbabilityMax) || 0);
        const totalRain = rainfall.reduce((sum, value) => sum + value, 0);
        const maxRainProbability = rainProbability.length ? Math.max(...rainProbability) : Number(current.precipitationProbability) || 0;
        setMapText("weatherMapRainHigh", maxRainProbability >= 60 ? "High Rain" : "No high-risk rain");
        setMapText("weatherMapRainHighAmount", `${totalRain.toFixed(1)} mm / 7 days`);
        setMapText("weatherMapRainHighDetail", `${maxRainProbability}% peak probability in the live forecast`);
        setMapText("weatherMapRainModerate", maxRainProbability >= 30 ? "Moderate Rain" : "Low Rain");
        setMapText("weatherMapRainModerateAmount", `${Math.round(totalRain / Math.max(rainfall.length, 1))} mm average`);
        setMapText("weatherMapRainModerateDetail", "Forecast-derived precipitation outlook");
        setMapText("weatherMapRainLight", "Current outlook");
        setMapText("weatherMapRainLightAmount", `${Number(current.precipitation || 0).toFixed(1)} mm now`);
        setMapText("weatherMapRainLightDetail", `${Number(current.precipitationProbability || 0)}% current probability`);

        const warning = alerts.find(alert => ["warning", "emergency"].includes(String(alert.severity || "").toLowerCase()));
        setMapText("weatherMapAlertCritical", warning ? "🔴 Critical" : "🟢 No critical alert");
        setMapText("weatherMapAlertCriticalDetail", warning ? (warning.headline || warning.event || "Official warning active") : "No verified critical alert");
        setMapText("weatherMapAlertWarning", maxRainProbability >= 60 ? "🟡 Warning" : "🟢 No rain warning");
        setMapText("weatherMapAlertWarningDetail", maxRainProbability >= 60 ? "Heavy rain possible in forecast" : "No significant rain warning");
        setMapText("weatherMapAlertInfo", "🔵 Info");
        setMapText("weatherMapAlertInfoDetail", data?.updatedAt ? `Updated ${new Date(data.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Live feed");
        setMapText("weatherMapWindCurrent", `↗️ ${current.windSpeed ?? "--"} km/h`);
        const maxWind = daily.reduce((maxValue, day) => Math.max(maxValue, Number(day.windSpeedMax) || 0), Number(current.windSpeed) || 0);
        setMapText("weatherMapWindMax", `↗️ ${maxWind || "--"} km/h`);
        const humidity = Number(current.relativeHumidity);
        const humidityLevel = document.getElementById("weatherMapHumidityLevel");
        if (humidityLevel) humidityLevel.style.width = `${Math.max(0, Math.min(100, humidity || 0))}%`;
        setMapText("weatherMapHumidityValue", humidity ? `${humidity}% Humidity` : "--");

        loadNearbyWeatherMapAreas();
    }

function distanceBetweenCoordinates(lat1, lon1, lat2, lon2) {
        const radians = value => value * Math.PI / 180;
        const a = Math.sin(radians(lat2 - lat1) / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(radians(lon2 - lon1) / 2) ** 2;
        return 6371 * 2 * Math.asin(Math.sqrt(a));
    }

async function loadNearbyWeatherMapAreas() {
        const baseLat = Number(farmerLocation.latitude);
        const baseLon = Number(farmerLocation.longitude);
        if (!Number.isFinite(baseLat) || !Number.isFinite(baseLon)) return;
        try {
                const response = await fetch(`${API_BASE}/api/location/nearby?${new URLSearchParams({ lat: String(baseLat), lon: String(baseLon) })}`);
                if (!response.ok) throw new Error("Nearby place lookup failed");
                const places = (await response.json()).slice(0, 3);
                const resolved = await Promise.all(places.map(async place => {
                const lat = Number(place.latitude);
                const lon = Number(place.longitude);
                const name = place.name || "Nearby area";
                const weatherResponse = await fetch(`${API_BASE}/api/weather/current?${new URLSearchParams({ lat: String(lat), lon: String(lon), name })}`);
                if (!weatherResponse.ok) throw new Error("Nearby weather unavailable");
                const weather = await weatherResponse.json();
                return { name, weather, distance: place.distanceKm ?? distanceBetweenCoordinates(baseLat, baseLon, lat, lon) };
            }));
            resolved.forEach((item, index) => {
                const current = item.weather.current || {};
                setMapText(`weatherMapNearbyName${index + 1}`, item.name);
                setMapText(`weatherMapNearbyTemp${index + 1}`, `${current.temperature ?? "--"}°C`);
                setMapText(`weatherMapNearbyDistance${index + 1}`, `${Math.round(item.distance)} km away`);
            });
        } catch (error) {
            console.warn("Nearby map areas are unavailable", error);
            [1, 2, 3].forEach(index => {
                setMapText(`weatherMapNearbyName${index}`, index === 1 ? farmerLocation.name : "Nearby area");
                setMapText(`weatherMapNearbyTemp${index}`, "--");
                setMapText(`weatherMapNearbyDistance${index}`, "Live lookup unavailable");
            });
    }
}

function moveSelectedWeatherMarker(latitude, longitude) {
    if (!indiaWeatherMap) return;
    if (!selectedWeatherMarker) {
        selectedWeatherMarker = L.marker([latitude, longitude], {
            draggable: true,
            zIndexOffset: 1000,
            icon: L.divIcon({ className: "selected-weather-pin", html: "<span></span>", iconSize: [18, 18], iconAnchor: [9, 9] })
        }).addTo(indiaWeatherMap);
        selectedWeatherMarker.on("dragend", event => {
            const position = event.target.getLatLng();
            showSelectedLocationWeather(position.lat, position.lng);
        });
    } else {
        selectedWeatherMarker.setLatLng([latitude, longitude]);
    }
    showSelectedLocationWeather(latitude, longitude);
}

async function loadIndiaWeatherMap() {
    const mapContainer = document.getElementById("mapContainer");
    if (!mapContainer) return;
    if (latestForecast) renderWeatherMap(latestForecast);
    if (!document.getElementById("indiaWeatherMap")) {
        mapContainer.insertAdjacentHTML("afterbegin", `<div id="indiaWeatherMap" class="india-weather-map" aria-label="Live weather map of India"></div><div class="weather-map-legend"><span><i class="legend-selected"></i> Selected location</span><span>Drag the red circle or click the map</span><button type="button" id="refreshWeatherMap">↻ Refresh weather</button></div><p class="weather-map-status" id="weatherMapStatus">Move the red circle to check weather anywhere in India.</p>`);
        document.getElementById("refreshWeatherMap")?.addEventListener("click", () => loadIndiaWeatherMap().catch(console.warn));
    }
    if (!window.L) return;
    const weatherMapStatus = document.getElementById("weatherMapStatus");
    const weatherMapUpdated = document.querySelector("#weatherMapModal .map-header p");
    const weatherMapTitle = document.querySelector("#weatherMapModal .map-header h2");
    if (weatherMapTitle) weatherMapTitle.textContent = "🗺️ India Weather Map";
    if (weatherMapUpdated) weatherMapUpdated.textContent = "Drag the red circle to explore live weather";
    if (!indiaWeatherMap) {
        indiaWeatherMap = L.map("indiaWeatherMap", { zoomControl: true }).setView([22.5, 79], 5);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 10 }).addTo(indiaWeatherMap);
        indiaWeatherMap.on("click", event => moveSelectedWeatherMarker(event.latlng.lat, event.latlng.lng));
    }
    indiaWeatherMap.invalidateSize();
    if (selectedWeatherMarker) {
        const position = selectedWeatherMarker.getLatLng();
        showSelectedLocationWeather(position.lat, position.lng);
    } else {
        moveSelectedWeatherMarker(farmerLocation.latitude, farmerLocation.longitude);
    }
}

if (mapCloseBtn) {
    mapCloseBtn.addEventListener("click", () => {
        weatherMapModal.classList.add("hidden");
        document.body.style.overflow = "auto";
    });
}

document.querySelector('[data-action="map"]')?.addEventListener("click", () => {
    window.setTimeout(() => loadIndiaWeatherMap().catch(error => {
        console.warn("India weather map is unavailable", error);
        const status = document.getElementById("weatherMapStatus");
        if (status) status.textContent = "Live weather is temporarily unavailable. Try refresh again.";
    }), 50);
});

// Close map when clicking outside
if (weatherMapModal) {
    weatherMapModal.addEventListener("click", (e) => {
        if (e.target === weatherMapModal) {
            weatherMapModal.classList.add("hidden");
            document.body.style.overflow = "auto";
        }
    });
}

/* =========================================================
INITIALIZATION
========================================================= */

function renderOnboardingProfile() {
    const profile = readStoredProfile();
    const location = readStoredJson("weatherGptLocation");
    const name = document.getElementById("savedProfileName");
    const savedLocation = document.getElementById("savedProfileLocation");
    const area = document.getElementById("savedProfileArea");
    const language = document.getElementById("savedProfileLanguage");
    const editName = document.getElementById("profileEditName");
    const editVillage = document.getElementById("profileEditVillage");
    const editCity = document.getElementById("profileEditCity");
    const editState = document.getElementById("profileEditState");
    const editCrops = document.getElementById("profileEditCrops");
    const cropsField = document.getElementById("profileEditCropsField");
    const syncStatus = document.getElementById("profileSyncStatus");
    const profileLocation = [profile?.village, profile?.city, profile?.state].filter(Boolean).join(", ");
    if (name) name.textContent = profile?.name || "Weather friend";
    if (savedLocation) savedLocation.textContent = profileLocation || "Add your location to personalize forecasts.";
    if (area) area.textContent = location?.name ? `${location.name}, India` : [profile?.city, profile?.state].filter(Boolean).join(", ") || "Not set";
    if (language) language.textContent = languageNames[currentLanguage] || "English";
    if (editName) editName.value = profile?.name || "";
    if (editVillage) editVillage.value = profile?.village || "";
    if (editCity) editCity.value = profile?.city || "";
    if (editState) editState.value = profile?.state || "";
    if (editCrops) editCrops.value = profile?.cropsInfo || "";
    if (cropsField) cropsField.hidden = profile?.type !== "farmer" && profile?.mode !== "farmer";
    if (syncStatus) syncStatus.textContent = profile?.syncStatus === "synced" ? "Synced with PostgreSQL" : "Saved on this device";
}

document.getElementById("profileEditForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    const fields = {
        name: document.getElementById("profileEditName"),
        village: document.getElementById("profileEditVillage"),
        city: document.getElementById("profileEditCity"),
        state: document.getElementById("profileEditState"),
        cropsInfo: document.getElementById("profileEditCrops")
    };
    const status = document.getElementById("profileEditStatus");
    const locationQuery = [fields.village.value, fields.city.value, fields.state.value, "India"].filter(Boolean).join(", ");
    const submit = document.getElementById("profileEditSubmit");
    submit.disabled = true;
    status.className = "profile-edit-status";
    status.textContent = "Updating your profile location...";
    try {
        const locations = await searchLocation(locationQuery);
        if (!locations.length) throw new Error("We couldn't find that location. Try a nearby city.");
        const result = locations[0];
        const existingProfile = readStoredProfile() || {};
        const profile = {
            ...existingProfile,
            name: fields.name.value.trim(),
            village: fields.village.value.trim(),
            city: fields.city.value.trim(),
            state: fields.state.value.trim(),
            locationQuery,
            cropsInfo: fields.cropsInfo?.value.trim() || existingProfile.cropsInfo || "",
            id: existingProfile.id || getBrowserProfileId(),
            type: existingProfile.type || (existingProfile.mode === "farmer" ? "farmer" : "citizen"),
            language: currentLanguage
        };
        localStorage.setItem("weatherGptProfile", JSON.stringify(profile));
        updateLocationLabels({
            name: result.name || fields.city.value.trim() || fields.village.value.trim(),
            country: result.address?.country || "India",
            latitude: Number(result.lat),
            longitude: Number(result.lon)
        });
        try {
            await syncProfile(profile);
            profile.syncStatus = "synced";
            localStorage.setItem("weatherGptProfile", JSON.stringify(profile));
            status.className = "profile-edit-status success";
            status.textContent = "Profile updated and synced.";
        } catch (error) {
            status.className = "profile-edit-status";
            status.textContent = error.message.includes("unavailable")
                ? "Saved locally — PostgreSQL is not connected. Configure DATABASE_URL to sync."
                : `Saved locally; database sync failed. ${error.message}`;
        }
        renderOnboardingProfile();
    } catch (error) {
        status.textContent = error.message;
    } finally {
        submit.disabled = false;
    }
});

function readStoredJson(key) {
    try {
        return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
        return null;
    }
}

function readStoredProfile() {
    const profile = readStoredJson("weatherGptProfile");
    return profile && typeof profile === "object" ? profile : null;
}

function getBrowserProfileId() {
    let profileId = localStorage.getItem("weatherGptProfileId");
    if (!profileId) {
        profileId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem("weatherGptProfileId", profileId);
    }
    return profileId;
}

function profileLocation(profile) {
    return {
        country: "India",
        location: profile.village || profile.location || "",
        city: profile.city || "",
        state: profile.state || "",
        query: profile.locationQuery || "",
        name: farmerLocation.name || profile.city || profile.village || "",
        country: farmerLocation.country || "India",
        latitude: Number(farmerLocation.latitude),
        longitude: Number(farmerLocation.longitude)
    };
}

async function syncProfile(profile) {
    const profileId = profile.id || getBrowserProfileId();
    const type = profile.type || (profile.mode === "farmer" ? "farmer" : "citizen");
    const response = await fetch(`${API_BASE}/api/profiles/${type}/${encodeURIComponent(profileId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: profile.name || "Weather friend",
            location: profileLocation(profile),
            language: profile.language || currentLanguage,
            crops_info: profile.cropsInfo || ""
        })
    });
    if (!response.ok) {
        let detail = "Profile sync failed";
        try {
            detail = (await response.json()).detail || detail;
        } catch {
            // Keep the HTTP error useful even when the provider returned no JSON.
        }
        throw new Error(detail);
    }
    const saved = await response.json();
    localStorage.setItem("weatherGptProfileId", profileId);
    return saved;
}

async function restoreRemoteProfile() {
    const localProfile = readStoredProfile();
    const profileId = localStorage.getItem("weatherGptProfileId") || localProfile?.id;
    const type = localProfile?.type || (localProfile?.mode === "farmer" ? "farmer" : "citizen");
    if (!profileId || !localProfile?.name) return;
    localStorage.setItem("weatherGptProfileId", profileId);
    try {
        const response = await fetch(`${API_BASE}/api/profiles/${type}/${encodeURIComponent(profileId)}`);
        if (response.status === 404) return;
        if (!response.ok) throw new Error("Profile database is unavailable");
        const saved = await response.json();
        const restored = {
            ...localProfile,
            id: saved.id,
            type,
            name: saved.name,
            cropsInfo: saved.crops_info || localProfile.cropsInfo || "",
            language: saved.language || localProfile.language || currentLanguage,
            village: saved.location?.location || saved.location?.village || localProfile.village || "",
            city: saved.location?.city || localProfile.city || "",
            state: saved.location?.state || localProfile.state || "",
            country: saved.location?.country || "India",
            syncStatus: "synced"
        };
        if (restored.language && languageNames[restored.language]) {
            currentLanguage = restored.language;
            localStorage.setItem("weatherGptLanguage", currentLanguage);
            translatePage();
        }
        localStorage.setItem("weatherGptProfile", JSON.stringify(restored));
        if (saved.location?.name && Number.isFinite(saved.location.latitude) && Number.isFinite(saved.location.longitude)) {
            updateLocationLabels({
                name: saved.location.name,
                country: saved.location.country || "India",
                latitude: Number(saved.location.latitude),
                longitude: Number(saved.location.longitude)
            });
        }
        if (type === "farmer" && !isFarmerMode) enterFarmerMode();
        renderOnboardingProfile();
    } catch (error) {
        console.warn("Could not restore the profile from PostgreSQL", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    showScreen("home");
    console.log("🌾 Farmer Weather App Loaded!");
});

/* =========================================================
   FIRST-RUN ONBOARDING
   ========================================================= */
(() => {
    const onboarding = document.getElementById("onboarding");
    if (!onboarding) return;

    const steps = [...onboarding.querySelectorAll(".onboarding-step")];
    const form = document.getElementById("profileForm");
    const fields = {
        name: document.getElementById("profileName"),
        village: document.getElementById("profileVillage"),
        city: document.getElementById("profileCity"),
        state: document.getElementById("profileState"),
        crop: document.getElementById("profileCrop"),
        plantingDate: document.getElementById("profilePlantingDate"),
    };
    let selectedMode = "normal";
    let profile = {};
    renderSharedCropOptions(fields.crop, "rice");
    const savedProfile = readStoredProfile();
    if (savedProfile) {
        fields.name.value = savedProfile.name || "";
        fields.village.value = savedProfile.village || "";
        fields.city.value = savedProfile.city || "";
        fields.state.value = savedProfile.state || "";
        fields.crop.value = savedProfile.crop || "rice";
        fields.plantingDate.value = savedProfile.plantingDate || "";
        selectedMode = savedProfile.mode || selectedMode;
    }

    const showStep = (name) => {
        steps.forEach(step => step.classList.toggle("active", step.dataset.onboardingStep === name));
        onboarding.scrollTop = 0;
    };
    const finish = (message) => {
        localStorage.setItem("weatherGptOnboarding", "complete");
        if (profile.name) localStorage.setItem("weatherGptProfile", JSON.stringify(profile));
        onboarding.classList.add("is-hidden");
        if (message) {
            const notice = document.createElement("div");
            notice.className = "onboarding-toast";
            notice.textContent = message;
            document.body.appendChild(notice);
            setTimeout(() => notice.remove(), 5000);
        }
    };
    const skip = () => {
        profile = { mode: selectedMode, skipped: true };
        finish("You can personalize WeatherGPT anytime from Profile.");
    };
    if (localStorage.getItem("weatherGptOnboarding") === "complete") onboarding.classList.add("is-hidden");

    onboarding.querySelectorAll("[data-mode]").forEach(button => button.addEventListener("click", () => {
        selectedMode = button.dataset.mode;
        const onboardingCropsField = document.getElementById("onboardingCropsField");
        if (onboardingCropsField) onboardingCropsField.hidden = selectedMode !== "farmer";
        document.getElementById("profileTitle").textContent = selectedMode === "farmer" ? "Let’s set up your farm profile" : "Let’s personalize your weather";
        document.getElementById("profileEyebrow").textContent = selectedMode === "farmer" ? "YOUR FARM PROFILE" : "PERSONAL WEATHER";
        document.getElementById("nameLabel").childNodes[0].textContent = selectedMode === "farmer" ? "Farmer Name" : "Name";
        document.getElementById("profileSubmit").innerHTML = selectedMode === "farmer" ? "Create Farmer Profile <span>→</span>" : "Continue <span>→</span>";
        document.getElementById("profileProgress").style.width = selectedMode === "farmer" ? "55%" : "45%";
        applyOnboardingLanguage(currentLanguage);
        showStep("profile");
    }));
    onboarding.querySelectorAll("[data-onboarding-skip]").forEach(button => button.addEventListener("click", skip));
    onboarding.querySelector("[data-onboarding-back]")?.addEventListener("click", () => showStep("mode"));
    document.getElementById("changeLocation")?.addEventListener("click", () => showStep("profile"));

    const setLocation = (result, source) => {
        const address = result.address || {};
        fields.village.value = address.village || address.town || address.suburb || fields.village.value;
        fields.city.value = address.city || address.city_district || address.county || fields.city.value;
        fields.state.value = address.state || fields.state.value;
        document.getElementById("locationStatus").textContent = source === "gps" ? "Current location added. You can edit it before continuing." : "Location found — please confirm the details.";
        document.getElementById("locationStatus").className = "location-status success";
    };
    const geocode = async (query, source) => {
        const status = document.getElementById("locationStatus");
        status.className = "location-status";
        status.textContent = "Finding your location…";
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&q=${encodeURIComponent(query)}`, { headers: { Accept: "application/json" } });
            if (!response.ok) throw new Error("Location service unavailable");
            const results = await response.json();
            if (!results.length) throw new Error("We couldn't find that location. Try a nearby city.");
            setLocation(results[0], source);
            return true;
        } catch (error) {
            if (error.message.startsWith("We couldn't")) {
                status.textContent = error.message;
                return false;
            }
            status.textContent = "Location service is offline. We’ll use your entered location and sync weather later.";
            status.className = "location-status success";
            return true;
        }
    };
    document.getElementById("useCurrentLocation")?.addEventListener("click", () => {
        const button = document.getElementById("useCurrentLocation");
        if (!navigator.geolocation) { document.getElementById("locationStatus").textContent = "GPS is not available on this device."; return; }
        button.classList.add("loading"); button.textContent = "📍 Detecting location…";
        navigator.geolocation.getCurrentPosition(async position => {
            await geocode(`${position.coords.latitude},${position.coords.longitude}`, "gps");
            button.classList.remove("loading"); button.textContent = "📍 Use Current Location";
        }, () => { button.classList.remove("loading"); button.textContent = "📍 Use Current Location"; document.getElementById("locationStatus").textContent = "Location permission was not granted. You can enter it manually."; });
    });
    form?.addEventListener("submit", async event => {
        event.preventDefault();
        const locationQuery = [fields.village.value, fields.city.value, fields.state.value, "India"].filter(Boolean).join(", ");
        const found = await geocode(locationQuery, "typed");
        if (!found) return;
        profile = Object.fromEntries(Object.entries(fields).map(([key, input]) => [key, input?.value || ""]));
        profile.cropsInfo = profile.crop ? `${profile.crop}${profile.plantingDate ? `; planted ${profile.plantingDate}` : ""}` : "";
        profile.mode = selectedMode; profile.type = selectedMode === "farmer" ? "farmer" : "citizen"; profile.language = currentLanguage; profile.locationQuery = locationQuery;
        document.getElementById("confirmedVillage").textContent = fields.village.value || fields.city.value;
        document.getElementById("confirmedAddress").textContent = [fields.city.value, fields.state.value].filter(Boolean).join(", ");
        showStep("confirm");
    });
    document.getElementById("startWeather")?.addEventListener("click", async () => {
        const city = fields.city.value || fields.village.value || "your area";
        profile.id = getBrowserProfileId();
        profile.type = selectedMode === "farmer" ? "farmer" : "citizen";
        profile.mode = selectedMode;
        profile.language = currentLanguage;
        localStorage.setItem("weatherGptLocation", JSON.stringify({ name: city, country: "India", latitude: 23.0225, longitude: 72.5714 }));
        try {
            await syncProfile(profile);
            profile.syncStatus = "synced";
            finish("Your profile is saved to PostgreSQL.");
        } catch (error) {
            profile.syncStatus = "local";
            finish("Profile saved on this device; PostgreSQL sync is unavailable.");
            console.warn("Could not save the profile to PostgreSQL", error);
        }
        localStorage.setItem("weatherGptProfile", JSON.stringify(profile));
        if (selectedMode === "farmer") enterFarmerMode();
        const locationLabels = document.querySelectorAll("#currentLocationLabel, #homeLocationLabel, #forecastLocationLabel");
        locationLabels.forEach(label => { if (label) label.textContent = `${city}, India`; });
    });
    const languageButton = document.getElementById("onboardingLanguage");
    const languageMenu = document.getElementById("onboardingLanguageMenu");
    renderLanguagePickers();
    const onboardingCopy = {
        en: { title: "How will you use WeatherGPT?", subtitle: "Choose an experience made for you.", profileTitle: "Let’s personalize your weather", farmerTitle: "Let’s set up your farm profile", profileSubtitle: "A few details help us make every forecast local.", skip: "Skip for now", back: "← Back", normal: "Normal User", farmer: "Farmer Mode" },
        hi: { title: "आप WeatherGPT का उपयोग कैसे करेंगे?", subtitle: "अपने लिए सही अनुभव चुनें।", profileTitle: "आइए आपके मौसम को व्यक्तिगत बनाएं", farmerTitle: "आइए आपका खेत प्रोफ़ाइल बनाएं", profileSubtitle: "कुछ जानकारी से हर पूर्वानुमान आपके स्थान के अनुसार होगा।", skip: "अभी छोड़ें", back: "← वापस", normal: "सामान्य उपयोगकर्ता", farmer: "किसान मोड" },
        gu: { title: "તમે WeatherGPT નો ઉપયોગ કેવી રીતે કરશો?", subtitle: "તમારા માટે યોગ્ય અનુભવ પસંદ કરો.", profileTitle: "ચાલો હવામાનને તમારા માટે વ્યક્તિગત બનાવીએ", farmerTitle: "ચાલો તમારી ખેતર પ્રોફાઇલ બનાવીએ", profileSubtitle: "થોડી માહિતીથી દરેક આગાહી તમારા વિસ્તાર માટે યોગ્ય બનશે.", skip: "હમણાં છોડો", back: "← પાછા", normal: "સામાન્ય વપરાશકર્તા", farmer: "ખેડૂત મોડ" }
    };
    const applyOnboardingLanguage = language => {
        const copy = onboardingCopy[language] || onboardingCopy.en;
        document.querySelector('[data-i18n-onboarding="modeTitle"]').textContent = copy.title;
        document.querySelector('[data-i18n-onboarding="modeSubtitle"]').textContent = copy.subtitle;
        document.getElementById("profileTitle").textContent = selectedMode === "farmer" ? copy.farmerTitle : copy.profileTitle;
        const subtitles = onboarding.querySelectorAll(".onboarding-subtitle");
        if (subtitles[1]) subtitles[1].textContent = copy.profileSubtitle;
        document.querySelectorAll("[data-onboarding-skip]").forEach(button => { button.textContent = copy.skip; });
        const back = onboarding.querySelector("[data-onboarding-back]");
        if (back) back.textContent = copy.back;
        const modeLabels = onboarding.querySelectorAll(".mode-card strong");
        if (modeLabels[0]) modeLabels[0].textContent = copy.normal;
        if (modeLabels[1]) modeLabels[1].textContent = copy.farmer;
        renderOnboardingProfile();
    };
    languageButton?.addEventListener("click", () => languageMenu.classList.toggle("hidden"));
    languageMenu?.querySelectorAll("[data-onboarding-language]").forEach(button => button.addEventListener("click", () => {
        const language = button.dataset.onboardingLanguage;
        localStorage.setItem("weatherGptLanguage", language);
        currentLanguage = language;
        languageButton.querySelector("span").textContent = button.textContent;
        languageMenu.classList.add("hidden");
        applyOnboardingLanguage(language);
        translatePage();
    }));
    const initialLanguage = languageNames[currentLanguage] ? currentLanguage : "en";
    languageButton.querySelector("span").textContent = languageNames[initialLanguage];
    applyOnboardingLanguage(initialLanguage);
})();

restoreRemoteProfile();
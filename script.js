
const form = document.getElementById("weatherForm");
const cityInput = document.getElementById("cityInput");
const searchButton = document.getElementById("searchButton");
const message = document.getElementById("message");
const weatherResult = document.getElementById("weatherResult");

const weatherCodes = {
    0: ["Clear sky", "☀️"],
    1: ["Mainly clear", "🌤️"],
    2: ["Partly cloudy", "⛅"],
    3: ["Overcast", "☁️"],
    45: ["Foggy", "🌫️"],
    48: ["Depositing rime fog", "🌫️"],
    51: ["Light drizzle", "🌦️"],
    53: ["Moderate drizzle", "🌦️"],
    55: ["Dense drizzle", "🌧️"],
    56: ["Light freezing drizzle", "🌧️"],
    57: ["Dense freezing drizzle", "🌧️"],
    61: ["Slight rain", "🌦️"],
    63: ["Moderate rain", "🌧️"],
    65: ["Heavy rain", "🌧️"],
    66: ["Light freezing rain", "🌧️"],
    67: ["Heavy freezing rain", "🌧️"],
    71: ["Slight snowfall", "🌨️"],
    73: ["Moderate snowfall", "❄️"],
    75: ["Heavy snowfall", "❄️"],
    77: ["Snow grains", "🌨️"],
    80: ["Slight rain showers", "🌦️"],
    81: ["Moderate rain showers", "🌧️"],
    82: ["Violent rain showers", "⛈️"],
    85: ["Slight snow showers", "🌨️"],
    86: ["Heavy snow showers", "❄️"],
    95: ["Thunderstorm", "⛈️"],
    96: ["Thunderstorm with slight hail", "⛈️"],
    99: ["Thunderstorm with heavy hail", "⛈️"]
};

function setMessage(text) {
    message.textContent = text;
}

async function getWeather(city) {
    city = city.trim();

    if (!city) {
        setMessage("Please enter a city name.");
        cityInput.focus();
        return;
    }

    searchButton.disabled = true;
    searchButton.textContent = "Loading...";
    weatherResult.hidden = true;
    setMessage("Finding city and loading live weather...");

    try {
        // Find the city using Open-Meteo geocoding
        const geoUrl = new URL(
            "https://geocoding-api.open-meteo.com/v1/search"
        );

        geoUrl.search = new URLSearchParams({
            name: city,
            count: "10",
            language: "en",
            format: "json"
        });

        const geoResponse = await fetch(geoUrl);

        if (!geoResponse.ok) {
            throw new Error("City search service is unavailable.");
        }

        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error(
                "City nahi mili. Naam ki spelling check karein."
            );
        }

        // Prefer a city result over a region when possible
        const place = geoData.results.find(
            item => item.feature_code === "PPLC" ||
                    item.feature_code === "PPLA"
        ) || geoData.results[0];

        // Fetch current weather for the selected coordinates
        const weatherUrl = new URL(
            "https://api.open-meteo.com/v1/forecast"
        );

        weatherUrl.search = new URLSearchParams({
            latitude: place.latitude,
            longitude: place.longitude,
            current: [
                "temperature_2m",
                "relative_humidity_2m",
                "apparent_temperature",
                "is_day",
                "precipitation",
                "weather_code",
                "wind_speed_10m"
            ].join(","),
            daily: "sunrise,sunset",
            forecast_days: "1",
            timezone: "auto"
        });

        const weatherResponse = await fetch(weatherUrl);

        if (!weatherResponse.ok) {
            throw new Error("Weather service se data nahi mila.");
        }

        const data = await weatherResponse.json();
        const current = data.current;

        if (!current) {
            throw new Error("Current weather data available nahi hai.");
        }

        // Weather description and icon
        const weather = weatherCodes[current.weather_code] ||
            ["Unknown conditions", "🌍"];

        const icon = current.is_day
            ? weather[1]
            : ([0, 1, 2].includes(current.weather_code)
                ? "🌙"
                : weather[1]);

        document.getElementById("cityName").textContent =
            [place.name, place.admin1, place.country]
                .filter((value, index, array) =>
                    value && array.indexOf(value) === index
                )
                .join(", ");

        document.getElementById("weatherIcon").textContent = icon;
        document.getElementById("weatherIcon").setAttribute(
            "aria-label",
            weather[0]
        );

        document.getElementById("temperature").textContent =
            `${Math.round(current.temperature_2m)}°`;

        document.getElementById("description").textContent =
            weather[0];

        document.getElementById("feelsLike").textContent =
            `Feels like ${Math.round(current.apparent_temperature)}°C`;

        document.getElementById("humidity").textContent =
            `${current.relative_humidity_2m}%`;

        document.getElementById("wind").textContent =
            `${current.wind_speed_10m} km/h`;

        document.getElementById("precipitation").textContent =
            `${current.precipitation} mm`;

        // Show sunrise and sunset in the selected city's time zone
        const sunrise = data.daily?.sunrise?.[0];
        const sunset = data.daily?.sunset?.[0];

        let daylight = "--";

        if (sunrise && sunset) {
            const formatTime = value => value.split("T")[1];
            daylight = `${formatTime(sunrise)} – ${formatTime(sunset)}`;
        }

        document.getElementById("daylight").textContent = daylight;

        // Display local date and time returned by the weather API
        const date = data.current.time.replace("T", " ");

        document.getElementById("localDate").textContent =
            `Local time: ${date} (${data.timezone_abbreviation || data.timezone})`;

        weatherResult.hidden = false;
        setMessage("Weather updated successfully!");

    } catch (error) {
        setMessage(
            error.message ||
            "Kuch ghalat ho gaya. Internet check karke dobara try karein."
        );
    } finally {
        searchButton.disabled = false;
        searchButton.innerHTML = 'Search <span>→</span>';
    }
}

// Search when the form is submitted
form.addEventListener("submit", event => {
    event.preventDefault();
    getWeather(cityInput.value);
});

// Quick search for popular cities
document.querySelectorAll("[data-city]").forEach(button => {
    button.addEventListener("click", () => {
        const city = button.dataset.city;
        cityInput.value = city;
        getWeather(city);
    });
});

const API_BASE_URL = "https://api.lml.live/gigs/query";
const WEEKS_PAST = 10;
const WEEKS_FUTURE = 6;

const currentDate = new Date();
const startDate = new Date(currentDate);
startDate.setDate(currentDate.getDate() - WEEKS_PAST * 7);
const endDate = new Date(currentDate);
endDate.setDate(currentDate.getDate() + WEEKS_FUTURE * 7);

async function fetchGigs(location) {
    const gigs = [];
    let weekStart = new Date(startDate);

    while (weekStart <= endDate) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        const url = `${API_BASE_URL}?location=${location}&date_from=${weekStart.toISOString().split('T')[0]}&date_to=${weekEnd.toISOString().split('T')[0]}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.error(`Failed to fetch data: ${response.statusText}`);
                break;
            }
            const weekGigs = await response.json();
            gigs.push(...weekGigs);
        } catch (error) {
            console.error(`Error fetching data: ${error.message}`);
            break;
        }
        weekStart.setDate(weekStart.getDate() + 7);
    }

    return gigs;
}

function generateWeekLabels() {
    const labels = [];
    let weekStart = new Date(startDate);

    while (weekStart <= endDate) {
        const diffWeeks = Math.round((currentDate - weekStart) / (7 * 24 * 60 * 60 * 1000));
        labels.push(diffWeeks === 0 ? "This week" : diffWeeks > 0 ? `-${diffWeeks}w` : `+${Math.abs(diffWeeks)}w`);
        weekStart.setDate(weekStart.getDate() + 7);
    }
    return labels;
}

function renderTable(gigs, location) {
    const venues = {};
    const weeks = generateWeekLabels();

    gigs.forEach((gig) => {
        const venueId = gig.venue.id;
        const venueName = gig.venue.name;
        const gigDate = new Date(gig.date);

        const weekStart = new Date(gigDate);
        weekStart.setDate(gigDate.getDate() - gigDate.getDay());

        if (!venues[venueId]) {
            venues[venueId] = { name: venueName, weeks: {} };
            weeks.forEach((week) => (venues[venueId].weeks[week] = 0));
        }

        const diffWeeks = Math.round((currentDate - weekStart) / (7 * 24 * 60 * 60 * 1000));
        const label =
            diffWeeks === 0 ? "This week" : diffWeeks > 0 ? `-${diffWeeks}w` : `+${Math.abs(diffWeeks)}w`;

        venues[venueId].weeks[label] = (venues[venueId].weeks[label] || 0) + 1;
    });

    const table = document.createElement("table");
    table.className = "gig-table";

    const headerRow = document.createElement("tr");
    const venueHeader = document.createElement("th");
    venueHeader.textContent = "Venue";
    headerRow.appendChild(venueHeader);
    weeks.forEach((week) => {
        const weekHeader = document.createElement("th");
        weekHeader.textContent = week;
        if (week === "This week") weekHeader.classList.add("highlight-column");
        headerRow.appendChild(weekHeader);
    });
    table.appendChild(headerRow);

    Object.values(venues).forEach((venue, index) => {
        const row = document.createElement("tr");
        row.className = index % 2 === 0 ? "even-row" : "odd-row";
        row.addEventListener("mouseenter", () => row.classList.add("highlight-row"));
        row.addEventListener("mouseleave", () => row.classList.remove("highlight-row"));

        const venueCell = document.createElement("td");
        venueCell.textContent = venue.name;
        row.appendChild(venueCell);

        weeks.forEach((week) => {
            const weekCell = document.createElement("td");
            const count = venue.weeks[week];
            weekCell.textContent = count > 0 ? count : "";
            row.appendChild(weekCell);
        });
        table.appendChild(row);
    });

    const gigTableContainer = document.getElementById("gig-table");
    gigTableContainer.innerHTML = "";
    gigTableContainer.appendChild(table);
}

async function initializeApp() {
    const locationSelect = document.getElementById("location-select");
    const location = locationSelect.value;

    document.getElementById("loading-message").style.display = "block";

    const gigs = await fetchGigs(location);

    document.getElementById("loading-message").style.display = "none";
    if (gigs.length === 0) {
        document.getElementById("error-message").textContent = "No gigs found for the selected location.";
    } else {
        document.getElementById("error-message").textContent = "";
        renderTable(gigs, location);
    }
}

document.getElementById("refresh-button").addEventListener("click", initializeApp);
document.getElementById("clear-filter").addEventListener("click", () => {
    document.getElementById("filter-input").value = "";
    initializeApp();
});

const appHTML = `
<div class="header">
    <img src="logo.png" alt="Logo" class="logo">
    <h1>Live Music Locator QA Visualisation</h1>
    <div class="controls">
        <div>
            <label for="filter-input">Filter by venue name:</label>
            <input type="text" id="filter-input">
            <button id="clear-filter" title="Clear the filter">Clear Filter</button>
        </div>
        <div>
            <label for="location-select">Location:</label>
            <select id="location-select">
                <option value="melbourne">Melbourne</option>
                <option value="goldfields">Goldfields</option>
            </select>
            <button id="refresh-button" title="Refresh the gig data">Refresh</button>
        </div>
    </div>
</div>
<p id="loading-message" class="loading">Loading data, please wait...</p>
<p id="error-message" class="error"></p>
<div id="gig-table" class="gig-table-container"></div>
`;

document.body.innerHTML = appHTML;
initializeApp();

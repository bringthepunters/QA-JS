/***** JavaScript *****/

// Google Sheet CSV URL for "LML Venues" tab
/* Fetch and parse the venue owners CSV, returns a mapping { LML ID: Owner } */
async function fetchVenueOwners() {
    const res = await fetch(getVenueCsvUrl());
    const csv = await res.text();
    const lines = csv.split('\n').filter(line => line.trim().length > 0);
    // Find header row and column indices
    const headers = lines[0].split(',');
    const idIdx = headers.findIndex(h => h.trim().toLowerCase() === "lml id");
    const ownerIdx = headers.findIndex(h => h.trim().toLowerCase() === "owner");
    if (idIdx === -1 || ownerIdx === -1) return {};
    const map = {};
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        const id = cols[idIdx]?.trim();
        const owner = cols[ownerIdx]?.trim();
        if (id) map[id] = owner || "-";
    }
    return map;
}

/** API Settings **/
const API_BASE_URL = "https://api.lml.live/gigs/query";
const WEEKS_PAST = 10;
const WEEKS_FUTURE = 6;

// Subtly obscured Google Sheet CSV URL for "LML Venues" tab
const _v = [
  "https://docs.google.com/",
  "spreadsheets/d/",
  "16-UoFq94SPa-EV7ECb1yyaOrkEjQXpzw2-5bHfwahdo",
  "/gviz/tq?tqx=out:csv&sheet=LML%20Venues"
];
function getVenueCsvUrl() {
  return _v[0] + _v[1] + _v[2] + _v[3];
}

// Helper function to get the start of the week (Monday 4am)
function getWeekStart(date) {
    const result = new Date(date);
    const day = result.getDay();
    const diff = result.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    result.setDate(diff);
    result.setHours(4, 0, 0, 0);
    return result;
}

const currentDate = new Date();
const startDate = getWeekStart(new Date(currentDate));
startDate.setDate(startDate.getDate() - WEEKS_PAST * 7);

const endDate = getWeekStart(new Date(currentDate));
endDate.setDate(endDate.getDate() + WEEKS_FUTURE * 7);

/**
 * Fetch gigs from the API week by week, updating the progress bar as we go.
 */
async function fetchGigs(location) {
    const gigs = [];
    let weekStart = new Date(startDate);

    const progressBar = document.getElementById("progress-bar-fill");
    const progressMessage = document.getElementById("loading-message");
    const progressCount = document.getElementById("progress-count");

    // Show loading message and initialize progress
    progressMessage.style.display = "block";
    let totalWeeks = WEEKS_PAST + WEEKS_FUTURE + 1;
    let loadedWeeks = 0;

    while (weekStart <= endDate) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7); // Full week
        weekEnd.setHours(3, 59, 59, 999); // End at 3:59:59.999am next Monday

        const url = `${API_BASE_URL}?location=${location}&date_from=${weekStart
            .toISOString()
            .split(".")[0]}Z&date_to=${weekEnd.toISOString().split(".")[0]}Z`;

        try {
            const response = await fetch(url);
            if (response.ok) {
                const weekGigs = await response.json();
                gigs.push(...weekGigs);
            }
        } catch (error) {
            console.error("Error fetching data: ", error);
        }

        // Update progress bar and message
        loadedWeeks++;
        const progress = Math.round((loadedWeeks / totalWeeks) * 100);
        progressBar.style.width = `${progress}%`;
        progressCount.textContent = `${progress}%`;

        weekStart.setDate(weekStart.getDate() + 7);
    }

    // Hide loading message after completion
    progressMessage.style.display = "none";
    return gigs;
}

/**
 * Generate the labels for each week from startDate to endDate.
 * e.g., -10w, -9w, ..., <b>This week</b>, +1w, ...
 */
function generateWeekLabels() {
    const labels = [];
    let weekStart = new Date(startDate);
    const currentWeekStart = getWeekStart(currentDate);

    while (weekStart <= endDate) {
        const diffWeeks = Math.round(
            (weekStart - currentWeekStart) / (7 * 24 * 60 * 60 * 1000)
        );
        labels.push(
            diffWeeks === 0
                ? "<b>This week</b>"
                : diffWeeks < 0
                    ? `${diffWeeks}w`
                    : `+${diffWeeks}w`
        );
        weekStart.setDate(weekStart.getDate() + 7);
    }
    return labels;
}

/**
 * Render the gig data in a table format.
 * Each row corresponds to a venue, and columns correspond to each week.
 */
function renderTable(gigs, venueOwnersMap) {
    const venues = {};
    const weeks = generateWeekLabels();
    let maxVenueNameLength = 0;

    // Prepare a structure for each venue to hold gig counts/weeks
    gigs.forEach((gig) => {
        const venueId = gig.venue.id;
        const venueName = gig.venue.name;
        const gigDate = new Date(gig.date);

        // Get the week start (Monday 4am) for this gig
        const weekStart = getWeekStart(gigDate);
        
        maxVenueNameLength = Math.max(maxVenueNameLength, venueName.length);

        // Initialize the venue if it doesn't exist
        if (!venues[venueId]) {
            venues[venueId] = { id: venueId, name: venueName, weeks: {} };
            weeks.forEach((week) => {
                venues[venueId].weeks[week] = { count: 0, gigNames: [], gigs: [] };
            });
        }

        // Determine the label based on the difference from current week
        const currentWeekStart = getWeekStart(currentDate);
        const diffWeeks = Math.round(
            (weekStart - currentWeekStart) / (7 * 24 * 60 * 60 * 1000)
        );
        const label =
            diffWeeks === 0
                ? "<b>This week</b>"
                : diffWeeks < 0
                    ? `${diffWeeks}w`
                    : `+${diffWeeks}w`;

        // If this label exists in the venue's weeks, update it
        if (venues[venueId].weeks[label]) {
            venues[venueId].weeks[label].count++;
            venues[venueId].weeks[label].gigNames.push(gig.name);
            venues[venueId].weeks[label].gigs.push(gig);
        }
    });

    const table = document.createElement("table");
    
    // Add table header
    const headerRow = document.createElement("tr");
    const ownerHeader = document.createElement("th");
    ownerHeader.textContent = "Owner";
    headerRow.appendChild(ownerHeader);

    const venueHeader = document.createElement("th");
    venueHeader.textContent = "Venue";
    venueHeader.classList.add("venue-column");
    venueHeader.style.width = `${maxVenueNameLength * 7 + 20}px`;
    headerRow.appendChild(venueHeader);

    weeks.forEach((week) => {
        const weekHeader = document.createElement("th");
        weekHeader.innerHTML = week;
        headerRow.appendChild(weekHeader);
    });

    const thead = document.createElement("thead");
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Add table rows for each venue
    const tbody = document.createElement("tbody");

    Object.values(venues).forEach((venue) => {
        const row = document.createElement("tr");
        // Owner cell
        const ownerCell = document.createElement("td");
        ownerCell.textContent = (venueOwnersMap && venueOwnersMap[venue.id]) ? venueOwnersMap[venue.id] : "-";
        row.appendChild(ownerCell);
        // Venue cell
        const venueCell = document.createElement("td");
        venueCell.textContent = venue.name;
        venueCell.classList.add("venue-column");
        venueCell.style.whiteSpace = "nowrap";
        row.appendChild(venueCell);

        weeks.forEach((week) => {
            const weekCell = document.createElement("td");
            const weekData = venue.weeks[week];

            weekCell.textContent = weekData.count > 0 ? weekData.count : "";
            weekCell.style.backgroundColor =
                weekData.count > 0 ? "#c8faed" : "white";

            if (week === "<b>This week</b>") {
                weekCell.classList.add("current-week");
                const hasMissingGenres = weekData.gigs.some(
                    (g) => !g.genre_tags || g.genre_tags.length === 0
                );
                if (hasMissingGenres) {
                    weekCell.style.color = "red";
                }
            }

            if (weekData.gigs.length > 0) {
                const tooltipContent = weekData.gigs
                    .map(
                        (gig) =>
                            `<span style="color: ${
                                gig.genre_tags && gig.genre_tags.length > 0 ? "black" : "red"
                            }">${gig.name}</span>`
                    )
                    .join("<br>");
                weekCell.setAttribute("data-tooltip", tooltipContent);
            }

            row.appendChild(weekCell);
        });

        tbody.appendChild(row);
    });

    table.appendChild(tbody);

    // Update DOM
    const gigTableContainer = document.getElementById("gig-table");
    gigTableContainer.innerHTML = "";
    gigTableContainer.appendChild(table);

    // Initialize custom tooltips
    initializeTooltips();
}

// The rest of the code (initializeTooltips, event listeners, etc.) remains the same
/**
 * Initialize custom tooltips using CSS.
 */
function initializeTooltips() {
  document.querySelectorAll("[data-tooltip]").forEach((cell) => {
    cell.addEventListener("mouseover", (event) => {
      const tooltip = document.createElement("div");
      tooltip.className = "custom-tooltip";
      tooltip.innerHTML = event.target.getAttribute("data-tooltip");
      document.body.appendChild(tooltip);

      const rect = event.target.getBoundingClientRect();
      tooltip.style.left = `${rect.left + window.scrollX}px`;
      tooltip.style.top = `${rect.bottom + window.scrollY}px`;

      cell.addEventListener("mouseout", () => {
        tooltip.remove();
      });
    });
  });
}

/**
 * Initialize the app by fetching gigs for the selected location and rendering them.
 */
async function initializeApp() {
  const location = document.getElementById("location-select").value;
  // Fetch owners first
  let venueOwnersMap = {};
  try {
    venueOwnersMap = await fetchVenueOwners();
  } catch (e) {
    console.warn("Could not fetch venue owners:", e);
  }
  const gigs = await fetchGigs(location);
  renderTable(gigs, venueOwnersMap);
}

/**
 * Filter functionality
 */
document.getElementById("filter-input").addEventListener("input", (event) => {
  const filterText = event.target.value.toLowerCase();
  const rows = document.querySelectorAll("tbody tr");
  rows.forEach((row) => {
    const venueName = row.querySelector(".venue-column").textContent.toLowerCase();
    row.style.display = venueName.includes(filterText) ? "" : "none";
  });
});

/**
 * Clear filter button functionality
 */
document.getElementById("clear-filter-button").addEventListener("click", () => {
  document.getElementById("filter-input").value = "";
  const rows = document.querySelectorAll("tbody tr");
  rows.forEach((row) => (row.style.display = ""));
});

/**
 * Refresh button functionality
 */
document.getElementById("refresh-button").addEventListener("click", initializeApp);

/** Initialize the app on page load **/
document.addEventListener("DOMContentLoaded", initializeApp);

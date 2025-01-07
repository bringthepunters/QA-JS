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
  const progressBar = document.getElementById("progress-bar-fill");
  const progressMessage = document.getElementById("loading-message");
  const progressCount = document.getElementById("progress-count");

  // Show loading message and initialize progress
  progressMessage.style.display = "block";
  let totalWeeks = WEEKS_PAST + WEEKS_FUTURE + 1;
  let loadedWeeks = 0;

  while (weekStart <= endDate) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const url = `${API_BASE_URL}?location=${location}&date_from=${weekStart.toISOString().split("T")[0]}&date_to=${weekEnd.toISOString().split("T")[0]}`;
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

function generateWeekLabels() {
  const labels = [];
  let weekStart = new Date(startDate);
  while (weekStart <= endDate) {
    const diffWeeks = Math.round((currentDate - weekStart) / (7 * 24 * 60 * 60 * 1000));
    labels.push(diffWeeks === 0 ? "<b>This week</b>" : diffWeeks > 0 ? `-${diffWeeks}w` : `+${Math.abs(diffWeeks)}w`);
    weekStart.setDate(weekStart.getDate() + 7);
  }
  return labels;
}

function renderTable(gigs) {
  const venues = {};
  const weeks = generateWeekLabels();
  let maxVenueNameLength = 0;

  // Process gigs and organize by venue and week
  gigs.forEach((gig) => {
    const venueId = gig.venue.id;
    const venueName = gig.venue.name;
    const gigDate = new Date(gig.date);
    const weekStart = new Date(gigDate);
    weekStart.setDate(gigDate.getDate() - gigDate.getDay());

    maxVenueNameLength = Math.max(maxVenueNameLength, venueName.length);

    if (!venues[venueId]) {
      venues[venueId] = { name: venueName, weeks: {} };
      weeks.forEach((week) => (venues[venueId].weeks[week] = 0));
    }

    const diffWeeks = Math.round((currentDate - weekStart) / (7 * 24 * 60 * 60 * 1000));
    const label = diffWeeks === 0 ? "<b>This week</b>" : diffWeeks > 0 ? `-${diffWeeks}w` : `+${Math.abs(diffWeeks)}w`;
    venues[venueId].weeks[label] = (venues[venueId].weeks[label] || 0) + 1;
  });

  // Create table structure
  const table = document.createElement("table");

  // Add table header
  const headerRow = document.createElement("tr");
  const venueHeader = document.createElement("th");
  venueHeader.textContent = "Venue";
  venueHeader.classList.add("venue-column");
  venueHeader.style.width = `${maxVenueNameLength * 7 + 20}px`; // Dynamic width
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
    const venueCell = document.createElement("td");
    venueCell.textContent = venue.name;
    venueCell.classList.add("venue-column");
    venueCell.style.whiteSpace = "nowrap"; // Prevent wrapping
    row.appendChild(venueCell);

    weeks.forEach((week) => {
      const weekCell = document.createElement("td");
      const count = venue.weeks[week];
      weekCell.textContent = count > 0 ? count : "";
      weekCell.style.backgroundColor = count > 0 ? "#c8faed" : "white";
      if (week === "<b>This week</b>") {
        weekCell.classList.add("current-week");
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
}

async function initializeApp() {
  const location = document.getElementById("location-select").value;
  const gigs = await fetchGigs(location);
  renderTable(gigs);
}

// Filter functionality
document.getElementById("filter-input").addEventListener("input", (event) => {
  const filterText = event.target.value.toLowerCase();
  const rows = document.querySelectorAll("tbody tr");
  rows.forEach((row) => {
    const venueName = row.querySelector(".venue-column").textContent.toLowerCase();
    row.style.display = venueName.includes(filterText) ? "" : "none";
  });
});

// Clear filter button functionality
document.getElementById("clear-filter-button").addEventListener("click", () => {
  document.getElementById("filter-input").value = "";
  const rows = document.querySelectorAll("tbody tr");
  rows.forEach((row) => (row.style.display = ""));
});

// Attach refresh button functionality
document.getElementById("refresh-button").addEventListener("click", initializeApp);

// Initialize the app on page load
document.addEventListener("DOMContentLoaded", initializeApp);

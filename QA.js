// Define constants for API base URL and date range calculation
const API_BASE_URL = "https://api.lml.live/gigs/query";
const WEEKS_PAST = 10;
const WEEKS_FUTURE = 6;

// Calculate start and end dates
const currentDate = new Date();
const startDate = new Date(currentDate);
startDate.setDate(currentDate.getDate() - WEEKS_PAST * 7);
const endDate = new Date(currentDate);
endDate.setDate(currentDate.getDate() + WEEKS_FUTURE * 7);

// Fetch gigs data from the API
async function fetchGigs(location) {
  const gigs = [];
  let weekStart = new Date(startDate);

  while (weekStart <= endDate) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const url = `${API_BASE_URL}?location=${location}&date_from=${weekStart.toISOString().split('T')[0]}&date_to=${weekEnd.toISOString().split('T')[0]}`;
    console.log(`Fetching data from ${url}`);

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

// Generate week labels
function generateWeekLabels() {
  const labels = [];
  let weekStart = new Date(startDate);

  while (weekStart <= endDate) {
    const diffWeeks = Math.round((currentDate - weekStart) / (7 * 24 * 60 * 60 * 1000));
    labels.push(
      diffWeeks === 0 ? "<b>This week</b>" : diffWeeks > 0 ? `-${diffWeeks}w` : `+${Math.abs(diffWeeks)}w`
    );
    weekStart.setDate(weekStart.getDate() + 7);
  }

  return labels;
}

// Render the table
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
      diffWeeks === 0 ? "<b>This week</b>" : diffWeeks > 0 ? `-${diffWeeks}w` : `+${Math.abs(diffWeeks)}w`;

    venues[venueId].weeks[label] = (venues[venueId].weeks[label] || 0) + 1;
  });

  // Create the HTML table
  const table = document.createElement("table");
  table.style.borderCollapse = "collapse";
  table.style.width = "100%";
  table.style.maxWidth = "100%";
  table.style.overflowX = "auto";

  // Create the header row
  const headerRow = document.createElement("tr");
  const venueHeader = document.createElement("th");
  venueHeader.textContent = "Venue";
  headerRow.appendChild(venueHeader);
  weeks.forEach((week) => {
    const weekHeader = document.createElement("th");
    weekHeader.innerHTML = week;
    headerRow.appendChild(weekHeader);
  });
  table.appendChild(headerRow);

  // Create rows for each venue
  Object.values(venues).forEach((venue) => {
    const row = document.createElement("tr");

    const venueCell = document.createElement("td");
    venueCell.textContent = venue.name;
    row.appendChild(venueCell);

    weeks.forEach((week) => {
      const weekCell = document.createElement("td");
      const count = venue.weeks[week];
      weekCell.textContent = count > 0 ? count : "";
      weekCell.style.backgroundColor = count > 0 ? "#c8faed" : "white";
      row.appendChild(weekCell);
    });

    table.appendChild(row);
  });

  const gigTableContainer = document.getElementById("gig-table");
  gigTableContainer.innerHTML = "";
  gigTableContainer.style.overflowX = "auto";
  gigTableContainer.style.width = "100%";
  gigTableContainer.appendChild(table);
}

// Initialize the app
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

// HTML Structure
const appHTML = `
  <div style="margin: 20px;">
    <h1 style="text-align: center;">Gig Visualisation</h1>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap;">
      <div>
        <label for="location-select">Select Location:</label>
        <select id="location-select">
          <option value="melbourne">Melbourne</option>
          <option value="goldfields">Goldfields</option>
        </select>
      </div>
      <button id="refresh-button" style="padding: 10px;">Refresh</button>
    </div>
    <p id="loading-message" style="display:none; color:blue;">Loading data, please wait...</p>
    <p id="error-message" style="color:red;"></p>
    <div id="gig-table" style="overflow-x: auto; width: 100%;"></div>
  </div>
`;

document.body.innerHTML = appHTML;
initializeApp();

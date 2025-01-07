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
  const loadingMessage = document.getElementById("loading-message");
  loadingMessage.classList.remove("hidden");

  let weekStart = new Date(startDate);
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
    weekStart.setDate(weekStart.getDate() + 7);
  }

  loadingMessage.classList.add("hidden");
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

function renderTable(gigs) {
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
    const label = diffWeeks === 0 ? "This week" : diffWeeks > 0 ? `-${diffWeeks}w` : `+${Math.abs(diffWeeks)}w`;
    venues[venueId].weeks[label] = (venues[venueId].weeks[label] || 0) + 1;
  });

  const table = document.createElement("table");

  const headerRow = document.createElement("tr");
  const venueHeader = document.createElement("th");
  venueHeader.textContent = "Venue";
  venueHeader.style.textAlign = "left";
  headerRow.appendChild(venueHeader);

  weeks.forEach((week) => {
    const weekHeader = document.createElement("th");
    weekHeader.innerText = week;
    headerRow.appendChild(weekHeader);
  });

  table.appendChild(headerRow);

  Object.values(venues).forEach((venue) => {
    const row = document.createElement("tr");
    const venueCell = document.createElement("td");
    venueCell.textContent = venue.name;
    venueCell.style.textAlign = "left";
    row.appendChild(venueCell);

    weeks.forEach((week) => {
      const weekCell = document.createElement("td");
      const count = venue.weeks[week];
      weekCell.textContent = count > 0 ? count : "";
      weekCell.style.backgroundColor = count > 0 ? "#c8faed" : "white";
      if (week === "This week") {
        weekCell.classList.add("current-week");
      }
      row.appendChild(weekCell);
    });

    table.appendChild(row);
  });

  const gigTableContainer = document.getElementById("gig-table");
  gigTableContainer.innerHTML = "";
  gigTableContainer.appendChild(table);
}

async function initializeApp() {
  const location = document.getElementById("location-select").value;
  const gigs = await fetchGigs(location);
  renderTable(gigs);
}

document.getElementById("refresh-button").addEventListener("click", initializeApp);

document.getElementById("filter-input").addEventListener("input", (event) => {
  const filterText = event.target.value.toLowerCase();
  const rows = document.querySelectorAll("tbody tr");
  rows.forEach((row) => {
    const venueName = row.cells[0].textContent.toLowerCase();
    row.style.display = venueName.includes(filterText) ? "" : "none";
  });
});

document.getElementById("clear-filter-button").addEventListener("click", () => {
  document.getElementById("filter-input").value = "";
  const rows = document.querySelectorAll("tbody tr");
  rows.forEach((row) => (row.style.display = ""));
});

initializeApp();

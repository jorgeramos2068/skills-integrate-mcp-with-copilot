document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const searchInput = document.getElementById("search-input");
  const categoryFilter = document.getElementById("category-filter");
  const sortBy = document.getElementById("sort-by");
  const clearFiltersButton = document.getElementById("clear-filters");
  const resultsSummary = document.getElementById("results-summary");
  let allActivities = {};

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function populateActivitySelect(activities) {
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

    Object.keys(activities)
      .sort((a, b) => a.localeCompare(b))
      .forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
  }

  function populateCategoryFilter(activities) {
    const previousSelection = categoryFilter.value || "all";
    const categories = new Set();

    Object.values(activities).forEach((details) => {
      if (details.category) {
        categories.add(details.category);
      }
    });

    categoryFilter.innerHTML = '<option value="all">All categories</option>';
    [...categories]
      .sort((a, b) => a.localeCompare(b))
      .forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
      });

    if (
      [...categoryFilter.options].some((option) => option.value === previousSelection)
    ) {
      categoryFilter.value = previousSelection;
    } else {
      categoryFilter.value = "all";
    }
  }

  function getVisibleActivities() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const selectedCategory = categoryFilter.value;
    const selectedSort = sortBy.value;

    const entries = Object.entries(allActivities).filter(([name, details]) => {
      const matchesCategory =
        selectedCategory === "all" || details.category === selectedCategory;

      const matchesSearch =
        searchTerm.length === 0 ||
        name.toLowerCase().includes(searchTerm) ||
        details.description.toLowerCase().includes(searchTerm) ||
        details.schedule.toLowerCase().includes(searchTerm);

      return matchesCategory && matchesSearch;
    });

    entries.sort(([nameA, detailsA], [nameB, detailsB]) => {
      if (selectedSort === "name-desc") {
        return nameB.localeCompare(nameA);
      }

      if (selectedSort === "time-asc") {
        return (detailsA.schedule_order || 9999) - (detailsB.schedule_order || 9999);
      }

      if (selectedSort === "time-desc") {
        return (detailsB.schedule_order || 0) - (detailsA.schedule_order || 0);
      }

      return nameA.localeCompare(nameB);
    });

    return entries;
  }

  function renderActivities() {
    const visibleActivities = getVisibleActivities();
    activitiesList.innerHTML = "";

    resultsSummary.textContent =
      visibleActivities.length === 1
        ? "Showing 1 activity"
        : `Showing ${visibleActivities.length} activities`;

    if (visibleActivities.length === 0) {
      activitiesList.innerHTML =
        "<p>No activities match your current search and filters.</p>";
      return;
    }

    visibleActivities.forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft = details.max_participants - details.participants.length;

      const participantsHTML =
        details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
          : `<p><em>No participants yet</em></p>`;

      activityCard.innerHTML = `
        <h4>${name}</h4>
        <p>${details.description}</p>
        <p><strong>Category:</strong> ${details.category || "General"}</p>
        <p><strong>Schedule:</strong> ${details.schedule}</p>
        <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        <div class="participants-container">
          ${participantsHTML}
        </div>
      `;

      activitiesList.appendChild(activityCard);
    });

    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      allActivities = await response.json();
      populateActivitySelect(allActivities);
      populateCategoryFilter(allActivities);
      renderActivities();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  searchInput.addEventListener("input", renderActivities);
  categoryFilter.addEventListener("change", renderActivities);
  sortBy.addEventListener("change", renderActivities);
  clearFiltersButton.addEventListener("click", () => {
    searchInput.value = "";
    categoryFilter.value = "all";
    sortBy.value = "name-asc";
    renderActivities();
  });

  // Initialize app
  fetchActivities();
});

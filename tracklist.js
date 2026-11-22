import { LISTS as STATIC_LISTS } from "./main/data.js";

var statusKey = "portfolio-tracklist-status-v1",
  statuses = ["Want to", "In progress", "Completed", "Paused"],
  allItems = [],
  activeCategory = "All",
  activeStatus = "All",
  savedStatuses = {};

try {
  savedStatuses = JSON.parse(localStorage.getItem(statusKey)) || {};
} catch (e) {}

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function itemKey(category, title) {
  return category + "::" + title;
}

function normalizeLists(data) {
  if (data && Array.isArray(data.lists)) {
    return data.lists.map(function (list) {
      return [
        list.name,
        (list.items || []).map(function (item) {
          return [
            item.t,
            item.s,
            item.c || "#dfe8cf",
            item.c2 || "#d9a066",
            item.ink || "#1d2d0b",
            item.img || "",
          ];
        }),
      ];
    });
  }
  return STATIC_LISTS;
}

function load() {
  return fetch("./cms/d0.json")
    .then(function (response) { return response.ok ? response.json() : null; })
    .then(function (defaults) {
      var data = defaults;
      try {
        var saved = localStorage.getItem("portfolio-cms-v1");
        if (saved) data = JSON.parse(saved);
      } catch (e) {}
      var lists = normalizeLists(data);
      allItems = [];
      lists.forEach(function (list) {
        (list[1] || []).forEach(function (item) {
          allItems.push({
            category: list[0],
            title: item[0],
            creator: item[1],
            color: item[2],
            accent: item[3],
            ink: item[4],
            image: item[5],
          });
        });
      });
      renderControls(lists);
      render();
    })
    .catch(function () {
      allItems = [];
      STATIC_LISTS.forEach(function (list) {
        (list[1] || []).forEach(function (item) {
          allItems.push({
            category: list[0],
            title: item[0],
            creator: item[1],
            color: item[2],
            accent: item[3],
            ink: item[4],
            image: item[5],
          });
        });
      });
      renderControls(STATIC_LISTS);
      render();
    });
}

function renderControls(lists) {
  var categoryFilters = document.getElementById("category-filters");
  var statusFilters = document.getElementById("status-filters");
  var categoryNames = ["All"].concat(lists.map(function (list) { return list[0]; }));
  categoryFilters.innerHTML = categoryNames.map(function (name) {
    return '<button type="button" data-category="' + esc(name) + '">' + esc(name) + "</button>";
  }).join("");
  statusFilters.innerHTML = ["All"].concat(statuses).map(function (name) {
    return '<button type="button" data-status="' + esc(name) + '">' + esc(name) + "</button>";
  }).join("");
  updateActiveButtons();

  Array.prototype.forEach.call(categoryFilters.querySelectorAll("button"), function (button) {
    button.addEventListener("click", function () {
      activeCategory = button.getAttribute("data-category");
      updateActiveButtons();
      render();
    });
  });
  Array.prototype.forEach.call(statusFilters.querySelectorAll("button"), function (button) {
    button.addEventListener("click", function () {
      activeStatus = button.getAttribute("data-status");
      updateActiveButtons();
      render();
    });
  });
  document.getElementById("track-search").oninput = render;
}

function updateActiveButtons() {
  Array.prototype.forEach.call(document.querySelectorAll("[data-category]"), function (button) {
    button.classList.toggle("active", button.getAttribute("data-category") === activeCategory);
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-status]"), function (button) {
    button.classList.toggle("active", button.getAttribute("data-status") === activeStatus);
  });
}

function render() {
  var query = document.getElementById("track-search").value.trim().toLowerCase();
  var visible = allItems.filter(function (item) {
    var key = itemKey(item.category, item.title);
    var status = savedStatuses[key] || "Want to";
    return (activeCategory === "All" || item.category === activeCategory) &&
      (activeStatus === "All" || status === activeStatus) &&
      (!query || item.title.toLowerCase().indexOf(query) !== -1 ||
        item.creator.toLowerCase().indexOf(query) !== -1);
  });
  var completed = allItems.filter(function (item) {
    return (savedStatuses[itemKey(item.category, item.title)] || "Want to") === "Completed";
  }).length;
  var inProgress = allItems.filter(function (item) {
    return (savedStatuses[itemKey(item.category, item.title)] || "Want to") === "In progress";
  }).length;
  document.getElementById("tracklist-stats").innerHTML =
    "<span>" + allItems.length + " items</span>" +
    "<span>" + inProgress + " in progress</span>" +
    "<span>" + completed + " completed</span>";

  var grid = document.getElementById("tracklist-grid");
  grid.innerHTML = visible.length ? visible.map(function (item) {
    var key = itemKey(item.category, item.title);
    var status = savedStatuses[key] || "Want to";
    var poster = item.image
      ? '<img src="' + esc(item.image) + '" alt="' + esc(item.title) + ' poster">'
      : '<div class="track-poster-fallback"><b>' + esc(item.title) + '</b><small>' + esc(item.creator) + "</small></div>";
    return (
      '<article class="track-card">' +
      '<div class="track-poster" style="--c:' + esc(item.color) + ';color:' + esc(item.ink) + '">' +
      poster +
      '<button class="track-status-tag" type="button" data-key="' + esc(key) + '">' + esc(status) + "</button>" +
      "</div>" +
      '<div class="track-meta"><h2>' + esc(item.title) + "</h2>" +
      '<p>' + esc(item.category) + " · " + esc(item.creator) + "</p></div></article>"
    );
  }).join("") : '<div class="track-empty">No items match these filters.</div>';

  Array.prototype.forEach.call(grid.querySelectorAll(".track-status-tag"), function (button) {
    button.addEventListener("click", function (event) {
      event.stopPropagation();
      var key = button.getAttribute("data-key");
      var current = savedStatuses[key] || "Want to";
      var next = statuses[(statuses.indexOf(current) + 1) % statuses.length];
      savedStatuses[key] = next;
      try {
        localStorage.setItem(statusKey, JSON.stringify(savedStatuses));
      } catch (e) {}
      render();
    });
  });

}

load();

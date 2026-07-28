"use strict";

/**
 * Chrome for the redesigned shell. Everything here is CausalPath's own UI —
 * the landing flow and the frames around the canvas. It never touches newt:
 * the three entry points are still the original <input>s / #display-demo-graphs,
 * this file just gives them the new surface to be clicked from.
 *
 * Graph-side labels (file name, node/relation counts) live in
 * javascript/newt/cp-chrome.js, because they need the active cytoscape
 * instance and that's only reachable from inside the browserify bundle.
 */
(function () {
	/* -------------------------------------------------- landing: mode state */

	var MODES = ["new", "open", "demo"];
	var mode = "new";
	var demosLoaded = false;

	function segItems() {
		return document.querySelectorAll(".cp-seg-item[data-cp-mode]");
	}

	function setMode(next) {
		if (MODES.indexOf(next) === -1) return;
		mode = next;

		segItems().forEach(function (btn) {
			var on = btn.getAttribute("data-cp-mode") === mode;
			btn.classList.toggle("is-active", on);
			btn.setAttribute("aria-selected", on ? "true" : "false");
		});

		document.querySelectorAll(".cp-mode[data-cp-panel]").forEach(function (panel) {
			panel.hidden = panel.getAttribute("data-cp-panel") !== mode;
		});

		if (mode === "demo") loadDemoChips();
	}

	segItems().forEach(function (btn) {
		btn.addEventListener("click", function () {
			setMode(btn.getAttribute("data-cp-mode"));
		});
	});

	/* ------------------------------------------- landing: file-picker relays */

	// "Continue to analysis" / "Open results" open the same picker the dropzone
	// does, so there's one way in per mode no matter which control is clicked.
	document.querySelectorAll("[data-cp-picks]").forEach(function (btn) {
		btn.addEventListener("click", function () {
			var input = document.getElementById(btn.getAttribute("data-cp-picks"));
			if (input) input.click();
		});
	});

	// the nav button runs whatever the current mode's action is
	var navLoad = document.getElementById("cp-nav-load");
	if (navLoad) {
		navLoad.addEventListener("click", function () {
			var target =
				mode === "new"
					? document.getElementById("file-analysis-input")
					: mode === "open"
					? document.getElementById("picker")
					: document.getElementById("display-demo-graphs");
			if (target) target.click();
		});
	}

	/* --------------------------------------------- landing: dropzone feedback */

	document.querySelectorAll(".cp-drop").forEach(function (zone) {
		var depth = 0; // dragenter/leave fire per child, so count instead of toggling

		zone.addEventListener("dragenter", function () {
			depth++;
			zone.classList.add("drag-and-drop-file");
		});
		zone.addEventListener("dragleave", function () {
			depth = Math.max(0, depth - 1);
			if (depth === 0) zone.classList.remove("drag-and-drop-file");
		});
		zone.addEventListener("drop", function () {
			depth = 0;
			zone.classList.remove("drag-and-drop-file");
		});
	});

	/* ------------------------------------------------- landing: demo chips */

	// one chip per bundled sample. clicking any of them runs the existing demo
	// flow by proxying to #display-demo-graphs, whose handler index.js owns.
	function loadDemoChips() {
		if (demosLoaded) return;
		var grid = document.getElementById("cp-demo-grid");
		var trigger = document.getElementById("display-demo-graphs");
		if (!grid || !trigger) return;
		demosLoaded = true;

		fetch("/api/displayDemoGraphs")
			.then(function (res) {
				if (!res.ok) throw new Error(res.status + " - " + res.statusText);
				return res.text();
			})
			.then(function (list) {
				var names = list
					.trim()
					.split("\n")
					.map(function (n) {
						return n.trim();
					})
					.filter(Boolean);

				if (!names.length) {
					grid.innerHTML = "";
					return;
				}

				grid.innerHTML = "";
				names.forEach(function (name) {
					var label = name.replace(/\.[^.]+$/, "");
					var chip = document.createElement("button");
					chip.type = "button";
					chip.className = "cp-demo-chip";
					chip.title = name;

					var dot = document.createElement("span");
					dot.className = "cp-demo-dot";

					var text = document.createElement("span");
					text.className = "cp-demo-name";
					text.textContent = label;

					chip.appendChild(dot);
					chip.appendChild(text);
					chip.addEventListener("click", function () {
						trigger.click();
					});
					grid.appendChild(chip);
				});
			})
			.catch(function () {
				// the list is a nicety; the single entry point still works
				demosLoaded = false;
				grid.innerHTML =
					'<button type="button" class="cp-demo-chip" id="cp-demo-fallback">' +
					'<span class="cp-demo-dot"></span><span class="cp-demo-name">Load demo graphs</span></button>';
				var fallback = document.getElementById("cp-demo-fallback");
				if (fallback) {
					fallback.addEventListener("click", function () {
						trigger.click();
					});
				}
			});
	}

	/* ------------------------------------------------ graph: tree tooltips */

	// the sidebar ellipsises names that don't fit at depth, and jstree doesn't
	// set a title of its own — so fill one in on hover. delegated, so it covers
	// rows added when a folder is expanded later.
	document.addEventListener(
		"mouseover",
		function (e) {
			var anchor = e.target.closest && e.target.closest("#folder-tree-container .jstree-anchor");
			if (!anchor || anchor.getAttribute("title")) return;
			var name = (anchor.textContent || "").trim();
			if (name) anchor.setAttribute("title", name);
		},
		true
	);

	/* -------------------------------------------------- graph: top bar load */

	// "Load data" in the workspace goes back to the landing flow, same as the
	// sidebar button — reuse it so newt's own clear-graph handler still runs.
	var topbarLoad = document.getElementById("cp-topbar-load");
	if (topbarLoad) {
		topbarLoad.addEventListener("click", function () {
			var back = document.getElementById("back_button_label");
			if (back) back.click();
		});
	}

	setMode("new");
})();

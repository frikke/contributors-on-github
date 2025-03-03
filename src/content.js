/* global getSyncStorage, setStorage, getStorage, STORAGE_KEYS */

// Define key selectors as constants for easier maintenance
const SELECTORS = {
	// Pull request selectors
	PR_TIMELINE_COMMENT: ".timeline-comment-header>h3",
	FIRST_CONTRIBUTOR_PR: ".timeline-comment a.author",
	
	// Issue selectors
	ISSUE_HEADER: ".js-issue-title, [data-testid='issue-body']",
	FIRST_CONTRIBUTOR_ISSUE: "[data-testid='issue-body-header-author'], .js-issue-header-byline .author",
	
	// Common selectors
	CURRENT_USER_IMG: ".Header-link img",
	PRIVATE_LABEL: ".Label"
};

// Use GitHub's current icon styling
const ICONS = {
	PR: `<svg aria-hidden="true" class="octicon octicon-git-pull-request" height="16" width="16" viewBox="0 0 16 16" version="1.1" role="img" fill="currentColor" style="display: inline-block; user-select: none; vertical-align: text-bottom; overflow: visible;"><path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z"></path></svg>`,
	ISSUE: `<svg aria-hidden="true" class="octicon octicon-issue-opened" height="16" width="16" viewBox="0 0 16 16" version="1.1" role="img" fill="currentColor" style="display: inline-block; user-select: none; vertical-align: text-bottom; overflow: visible;"><path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path></svg>`,
	SYNC: `<svg aria-hidden="true" class="octicon octicon-sync" height="16" width="16" viewBox="0 0 16 16" version="1.1" role="img" fill="currentColor" style="display: inline-block; user-select: none; vertical-align: text-bottom; overflow: visible;"><path d="M8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.001 7.001 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.501 5.501 0 0 0 8 2.5ZM1.705 8.005a.75.75 0 0 1 .834.656 5.501 5.501 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.001 7.001 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834Z"></path></svg>`,
};

const ELEMENT_IDS = {
	CONTAINER: "gce-container",
	HOVER_PANEL: "gce-hover-panel",
	PR_COUNT: "gce-num-prs",
	ISSUE_COUNT: "gce-num-issues",
	SYNC_BUTTON: "gce-sync-button",
	UPDATE_TIME: "gce-update-time",
};

// Configuration constants
const CONFIG = {
	CACHE_EXPIRATION: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
	HOVER_DELAY: 100, // milliseconds to wait before hiding panel
	STAT_PADDING: 3, // number of digits to pad stats to
};

// Path and user detection helpers
const isPR = (path) => /^\/[^/]+\/[^/]+\/pull\/\d+/.test(path);
const isIssue = (path) => /^\/[^/]+\/[^/]+\/issues\/\d+/.test(path);
const getCurrentUser = () =>
	document
		.querySelector(SELECTORS.CURRENT_USER_IMG)
		?.getAttribute("alt")
		?.slice(1) || "";
const isPrivate = () =>
	document.querySelector(SELECTORS.PRIVATE_LABEL)?.innerText === "Private";

// Get the username of the first contributor *in the DOM* of the page
function getFirstContributor() {
	// Try PR selector first, then issue selector
	return isPR(location.pathname) 
		? document.querySelector(SELECTORS.FIRST_CONTRIBUTOR_PR)?.innerText 
		: document.querySelector(SELECTORS.FIRST_CONTRIBUTOR_ISSUE)?.innerText;
}

// Get all comment authors on the page
function getAllCommentAuthors() {
	const authors = new Set();
	
	// Add the first contributor (issue/PR creator)
	const firstContributor = getFirstContributor();
	if (firstContributor) {
		authors.add(firstContributor);
	}
	
	return Array.from(authors);
}

function getPathInfo() {
	// "/babel/babel-eslint/pull/1"
	const pathNameArr = location.pathname.split("/");
	const org = pathNameArr[1]; // babel
	const repo = pathNameArr[2]; // babel-eslint
	const currentNum = pathNameArr[4]; // 3390
	const repoPath = `${org}/${repo}`; // babel/babel-eslint
	const contributor = getFirstContributor();

	return {
		contributor,
		currentNum,
		repoPath,
		org,
	};
}

function buildUrl({
	base,
	q: { type, filterUser, author, repo, user, created },
	sort,
	order,
	per_page,
}) {
	let query = `${base}?q=`;
	query += `${author ? `+author:${author}` : ""}`;
	query += `${repo ? `+repo:${repo}` : ""}`;
	query += `${user ? `+user:${user}` : ""}`;
	query += `${type ? `+type:${type}` : ""}`;
	query += `${filterUser ? `+-user:${filterUser}` : ""}`;
	query += `${created ? `+created:${created}` : ""}`;
	query += `${order ? `&order=${order}` : ""}`;
	query += `${per_page ? `&per_page=${per_page}` : ""}`;
	query += `${sort ? `&sort=${sort}` : ""}`;

	return query;
}

async function contributorCount({
	access_token,
	contributor,
	user,
	repoPath,
	old = {},
	type,
	scope
}) {
	let repo = repoPath;

	// Handle different scopes
	if (scope === "org" || scope === "account") {
		repo = undefined;
	}

	const searchURL = buildUrl({
		base: "https://api.github.com/search/issues",
		order: "asc",
		per_page: "1",
		q: {
			type,
			repo,
			author: contributor,
			user: user
		},
		sort: "created",
	});

	try {
		const response = await fetch(searchURL, {
			headers: {
				Authorization: `token ${access_token}`,
			},
		});
		const json = await response.json();

		if (json.errors || json.message) {
			return json;
		}

		let obj = {
			lastUpdate: Date.now()
		};

		if (type === "pr") {
			obj.prs = json.total_count;
		} else if (type === "issue") {
			obj.issues = json.total_count;
		}

		if (json.items?.length) {
			obj[`first${type[0].toUpperCase() + type.slice(1)}Number`] =
				json.items[0].number;
		}

		obj = Object.assign(old, obj);

		setStorage(contributor, repoPath, obj);

		return obj;
	} catch (error) {
		console.error(error);
	}
}

function formatText(count, firstNumber, currentNum, scope) {
	if (count === undefined) return "..";
	
	if (firstNumber === currentNum && scope !== "account") {
		const isFirst = count === 1 ? "First" : "1st";
		const countText = count > 1 ? ` of ${count}` : "";
		return `${isFirst}${countText}`;
	}
	
	return `${count}`;
}

function issueOrPrLink(type, repoPath, contributor) {
	const end = `${
		type === "pr" ? "pulls" : "issues"
	}?utf8=%E2%9C%93&q=is:${type}+author:${contributor}`;

	// repo
	if (repoPath.split("/").length === 2) {
		return `/${repoPath}/${end}`;
		// account
	}
	if (repoPath === "__self") {
		return `https://github.com/${end}`;
	}

	// org
	return `https://github.com/${end}+user:${repoPath}`;
}

function createStatRow(scope, label, contributor, repoPath) {
	return `
    <div class="d-flex flex-items-center py-1">
      <div class="gce-scope-label">
        <span class="f6 color-fg-muted">${label}</span>
      </div>
      <div class="d-flex flex-items-center ml-auto">
        <div class="d-inline-flex flex-items-center mr-2">
          ${ICONS.PR}<a href="${issueOrPrLink("pr", scope === "repo" ? repoPath : scope === "org" ? repoPath : "__self", contributor)}" class="ml-1 gce-stat-number gce-text Link--secondary" id="gce-${scope}-pr-count">...</a>
        </div>
        <div class="d-inline-flex flex-items-center">
          ${ICONS.ISSUE}<a href="${issueOrPrLink("issue", scope === "repo" ? repoPath : scope === "org" ? repoPath : "__self", contributor)}" class="ml-1 gce-stat-number gce-text Link--secondary" id="gce-${scope}-issue-count">...</a>
        </div>
      </div>
    </div>
  `;
}

function injectStyles() {
	const styleEl = document.createElement('style');
	styleEl.id = 'gce-responsive-styles';
	styleEl.textContent = `
		[id^="${ELEMENT_IDS.CONTAINER}"] {
			margin-right: 8px;
			align-items: center;
			display: inline-flex;
			margin-left: 8px;
			position: relative;
			z-index: 101; /* Ensure container has higher z-index */
		}
		[id^="${ELEMENT_IDS.CONTAINER}"] svg {
			vertical-align: text-bottom;
		}
		.gce-hover-panel {
			box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
			border: 1px solid var(--color-border-default);
			z-index: 101;
			position: fixed; /* Change to fixed positioning */
			min-width: 250px;
			margin-top: 4px;
		}
		.gce-text {
			font-size: 12px;
			line-height: 1.5;
		}
		.gce-scope-label {
			width: 90px;
			flex-shrink: 0;
		}
		.gce-stat-number {
			min-width: 30px;
			display: inline-block;
			text-align: right;
			font-variant-numeric: tabular-nums;
			text-decoration: none;
		}
		.gce-stat-number:hover {
			text-decoration: underline;
			color: var(--color-accent-fg);
		}
		.gce-sync-button {
			padding: 2px 0;
		}
		@media (max-width: 768px) {
			.timeline-comment-header {
				flex-wrap: wrap;
			}
			[id^="${ELEMENT_IDS.CONTAINER}"] {
				margin-top: 4px;
			}
		}
	`;
	document.head.appendChild(styleEl);
}

function injectInitialUI({ contributor, repoPath, currentNum, org }) {
	// Don't inject if already present
	if (document.getElementById(ELEMENT_IDS.PR_COUNT)) return;
	
	// Get the appropriate container element based on whether we're on a PR or issue page
	let $elem;
	if (isPR(location.pathname)) {
		$elem = document.querySelector(SELECTORS.PR_TIMELINE_COMMENT);
	} else if (isIssue(location.pathname)) {
		$elem = document.querySelector(SELECTORS.ISSUE_HEADER);
	}
	
	// If we can't find a suitable container, exit
	if (!$elem) {
		console.warn("GitHub Contributors Extension: Could not find a suitable container element");
		return;
	}

	// Create the main container with GitHub utility classes
	const containerHTML = `
		<div class="d-flex flex-items-center position-relative" id="${ELEMENT_IDS.CONTAINER}" data-username="${contributor}">
			<div class="d-flex flex-items-center position-relative">
				<a href="${issueOrPrLink("pr", repoPath, contributor)}" 
					id="${ELEMENT_IDS.PR_COUNT}" 
					class="Link--secondary color-fg-muted d-inline-flex flex-items-center no-underline mr-2" 
					aria-label="Pull requests by this user">
					${ICONS.PR}<span class="ml-1 gce-text">${"..."}</span>
				</a>
				<a href="${issueOrPrLink("issue", repoPath, contributor)}" 
					id="${ELEMENT_IDS.ISSUE_COUNT}" 
					class="Link--secondary color-fg-muted d-inline-flex flex-items-center no-underline" 
					aria-label="Issues by this user">
					${ICONS.ISSUE}<span class="ml-1 gce-text">${"..."}</span>
				</a>
				
				<div id="${ELEMENT_IDS.HOVER_PANEL}" class="gce-hover-panel Box color-shadow-medium rounded-2 p-2" style="display: none;">
					<!-- Stats rows -->
					${createStatRow("repo", "In this repo:", contributor, repoPath)}
					${createStatRow("org", "In this org:", contributor, org)}
					${createStatRow("account", "In this account:", contributor, "__self")}
					
					<div class="border-top mt-1 mb-1"></div>
					<div class="d-flex flex-items-center">
						<button id="${ELEMENT_IDS.SYNC_BUTTON}" class="btn-link Link--secondary d-flex flex-items-center color-fg-muted" data-username="${contributor}">
							${ICONS.SYNC}
							<span class="ml-1 f6">refresh</span>
						</button>
						<span class="color-fg-subtle f6 ml-auto" id="${ELEMENT_IDS.UPDATE_TIME}"></span>
					</div>
				</div>
			</div>
		</div>
	`;
	
	// Insert the container in the appropriate location based on page type
	if (isPR(location.pathname)) {
		$elem.insertAdjacentHTML("beforebegin", containerHTML);
	} else if (isIssue(location.pathname)) {
		// For issues, we need to find a better insertion point within the issue header
		const issueHeader = document.querySelector(SELECTORS.FIRST_CONTRIBUTOR_ISSUE);
		if (issueHeader) {
			// Insert after the author element
			issueHeader.insertAdjacentHTML("afterend", containerHTML);
		} else {
			// Fallback to inserting at the beginning of the issue body
			$elem.insertAdjacentHTML("afterbegin", containerHTML);
		}
	}

	injectStyles();
	setupGlobalEventHandlers({ repoPath, currentNum, org });
	
	// Initial fetch of all stats
	fetchAllStats({ contributor, repoPath, currentNum, org });
}

// Set up global event handlers using event delegation
function setupGlobalEventHandlers({ repoPath, currentNum, org }) {
	// Only set up once
	if (window.gceEventHandlersInitialized) return;
	window.gceEventHandlersInitialized = true;
	
	const container = document.getElementById(ELEMENT_IDS.CONTAINER);
	const hoverPanel = document.getElementById(ELEMENT_IDS.HOVER_PANEL);
	const syncButton = document.getElementById(ELEMENT_IDS.SYNC_BUTTON);
	
	if (!container || !hoverPanel) return;
	
	// Handle hover events for the container
	container.addEventListener('mouseenter', () => {
		// Position the panel relative to the container
		const rect = container.getBoundingClientRect();
		hoverPanel.style.top = `${rect.bottom}px`;
		hoverPanel.style.left = `${rect.left}px`;
		hoverPanel.style.display = 'block';
	});
	
	container.addEventListener('mouseleave', () => {
		// Hide after a short delay to allow moving to the panel
		setTimeout(() => {
			// Only hide if not hovering the panel
			if (!hoverPanel.matches(':hover') && !container.matches(':hover')) {
				hoverPanel.style.display = 'none';
			}
		}, CONFIG.HOVER_DELAY);
	});
	
	// Handle hover events for the panel
	hoverPanel.addEventListener('mouseleave', () => {
		// Hide after a short delay
		setTimeout(() => {
			// Only hide if not hovering the container or panel
			if (!hoverPanel.matches(':hover') && !container.matches(':hover')) {
				hoverPanel.style.display = 'none';
			}
		}, CONFIG.HOVER_DELAY);
	});
	
	// Handle clicks outside the panel to close it
	document.addEventListener('click', (e) => {
		if (hoverPanel.style.display === 'block' && 
			!container.contains(e.target) && 
			!hoverPanel.contains(e.target)) {
			hoverPanel.style.display = 'none';
		}
	});
	
	// Handle sync button click
	if (syncButton) {
		syncButton.addEventListener('click', () => {
			const username = container.dataset.username;
			if (!username) return;
			
			// Clear local cache for this contributor
			clearContributorCache(username);
			
			// Fetch all scopes for this contributor
			fetchAllStats({ 
				contributor: username, 
				repoPath, 
				currentNum, 
				org
			});
		});
	}
}

// Clear cache for a specific contributor
function clearContributorCache(contributor) {
	try {
		for (const key of Object.keys(localStorage)) {
			if (key.startsWith('gce-cache-') && key.includes(contributor)) {
				localStorage.removeItem(key);
			}
		}
	} catch (e) {
		console.error("Error clearing contributor cache:", e);
	}
}

// Check if cache is expired
function isCacheExpired(lastUpdate) {
	if (!lastUpdate) return true;
	
	const now = Date.now();
	return now - lastUpdate > CONFIG.CACHE_EXPIRATION;
}

// Fetch stats for all scopes (repo, org, account)
function fetchAllStats({ contributor, repoPath, currentNum, org }) {
	// Fetch repo stats
	fetchStats({ contributor, repoPath, currentNum, scope: "repo" });
	
	// Fetch org stats
	fetchStats({ contributor, repoPath: org, currentNum, scope: "org", user: org });
	
	// Fetch account stats
	fetchStats({ contributor, repoPath: "__self", currentNum, scope: "account" });
}

// Update stats display for a specific container
function updateStatsDisplay({ prText, issueText, scope, lastUpdate }) {
	// Update the main display (always shows repo stats)
	if (scope === "repo") {
		const prNode = document.getElementById(ELEMENT_IDS.PR_COUNT);
		if (prNode) {
			const spanNode = prNode.querySelector("span");
			if (spanNode) {
				spanNode.textContent = prText;
			}
		}

		const issueNode = document.getElementById(ELEMENT_IDS.ISSUE_COUNT);
		if (issueNode) {
			const spanNode = issueNode.querySelector("span");
			if (spanNode) {
				spanNode.textContent = issueText;
			}
		}
	}
	
	// Update the hover panel stats based on scope
	const prScopeNode = document.getElementById(`gce-${scope}-pr-count`);
	if (prScopeNode) {
		prScopeNode.textContent = padNumber(prText);
	}
	
	const issueScopeNode = document.getElementById(`gce-${scope}-issue-count`);
	if (issueScopeNode) {
		issueScopeNode.textContent = padNumber(issueText);
	}

	// Update timestamp
	const updateTimeNode = document.getElementById(ELEMENT_IDS.UPDATE_TIME);
	if (updateTimeNode && typeof lastUpdate === "number") {
		updateTimeNode.textContent = formatTimestamp(lastUpdate);
	}
}

// Format timestamp for display
function formatTimestamp(lastUpdate) {
	// Format the time in a more compact way
	const now = new Date();
	const updated = new Date(lastUpdate);
	const diffMs = now - updated;
	const diffMins = Math.round(diffMs / 60000);
	const diffHours = Math.round(diffMs / 3600000);
	const diffDays = Math.round(diffMs / 86400000);

	let timeText = "";
	if (diffMins < 60) {
		timeText = `${diffMins}m`;
	} else if (diffHours < 24) {
		timeText = `${diffHours}h`;
	} else {
		timeText = `${diffDays}d`;
	}

	return `${timeText} ago`;
}

// Handle API errors and update UI accordingly
function handleApiError(repoInfo, scope) {
	if (repoInfo.errors) {
		const errorMessage = repoInfo.errors[0].message;
		updateStatsDisplay({ prText: "Error", issueText: "Error", scope });
		showToast(`API Error: ${errorMessage}`);
		return true;
	}

	if (repoInfo.message) {
		// API rate limit exceeded for hzoo.
		if (
			repoInfo.message.indexOf(
				`API rate limit exceeded for ${getCurrentUser()}`,
			) >= 0
		) {
			updateStatsDisplay({
				prText: "Rate limited",
				issueText: "Rate limited",
				scope
			});
			showToast(
				"API rate limit exceeded. Try again later or add an access token in the [Contributors on Github] settings.",
				"warning",
			);
			return true;
		}

		// Bad credentials error
		if (repoInfo.message === "Bad credentials") {
			updateStatsDisplay({
				prText: "Auth error",
				issueText: "Auth error",
				scope
			});
			showToast(
				"Your GitHub token is invalid or has expired. Please update it in the [Contributors on Github] options.",
				"warning",
			);
			return true;
		}

		// API rate limit exceeded for x.x.x.x.
		if (repoInfo.message.indexOf("the good news") >= 0) {
			updateStatsDisplay({
				prText: "Auth needed",
				issueText: "Auth needed",
				scope
			});
			showToast(
				"GitHub API rate limit reached. Please add an access token in the [Contributors on Github] settings.",
				"warning",
			);
			return true;
		}

		// Generic error
		updateStatsDisplay({ prText: "Error", issueText: "Error", scope });
		showToast(`GitHub API Error: ${repoInfo.message}`);
		return true;
	}

	return false;
}

// Fetch stats for a specific scope
function fetchStats({ contributor, repoPath, currentNum, scope, user }) {
	getStorage(contributor, repoPath).then((storage) => {
		const storageKey = `${contributor}|${user || repoPath}`;
		const storageRes = storage[storageKey] || {};
		
		// Check if we have valid data that's not expired
		if ((storageRes.prs !== undefined || storageRes.issues !== undefined) && 
			!isCacheExpired(storageRes.lastUpdate)) {
			// Format the text for display
			const prText = formatText(storageRes.prs, storageRes.firstPrNumber, currentNum, scope);
			const issueText = formatText(storageRes.issues, storageRes.firstIssueNumber, currentNum, scope);
			
			updateStatsDisplay({ prText, issueText, scope, lastUpdate: storageRes.lastUpdate });
		} else {
			// If cache is expired or no data, fetch fresh data
			getSyncStorage({ [STORAGE_KEYS.ACCESS_TOKEN]: null }).then((res) => {
				Promise.all([
					contributorCount({
						old: storageRes,
						user,
						access_token: res[STORAGE_KEYS.ACCESS_TOKEN],
						type: "pr",
						contributor,
						repoPath,
						scope
					}),
					contributorCount({
						old: storageRes,
						user,
						access_token: res[STORAGE_KEYS.ACCESS_TOKEN],
						type: "issue",
						contributor,
						repoPath,
						scope
					}),
				])
					.then(([prInfo, issueInfo]) => {
						const repoInfo = Object.assign(prInfo, issueInfo);

						if (handleApiError(repoInfo, scope)) {
							return;
						}

						// Format the text for display
						const prText = formatText(repoInfo.prs, repoInfo.firstPrNumber, currentNum, scope);
						const issueText = formatText(repoInfo.issues, repoInfo.firstIssueNumber, currentNum, scope);
						
						updateStatsDisplay({ 
							prText, 
							issueText, 
							scope, 
							lastUpdate: repoInfo.lastUpdate
						});
					})
					.catch((error) => {
						console.error("GitHub Contributors Extension error:", error);
						updateStatsDisplay({ prText: "Error", issueText: "Error", scope });
						showToast(
							"Failed to fetch contributor data. Check console for details.",
						);
					});
			});
		}
	});
}

// Pad numbers for consistent width
function padNumber(text) {
	// Only pad if it's a number
	const num = Number(text);
	if (!Number.isNaN(num) && text !== "...") {
		// Right-align with space padding
		return text.toString().padStart(CONFIG.STAT_PADDING, ' ');
	}
	return text;
}

// Improved error handling with toast notifications
function showToast(message, type = "error") {
	// Remove existing toast if any
	const existingToast = document.getElementById("gce-toast");
	if (existingToast) {
		existingToast.remove();
	}

	// Create toast element
	const toast = document.createElement("div");
	toast.id = "gce-toast";

	// Set base styles
	toast.style.position = "fixed";
	toast.style.bottom = "20px";
	toast.style.right = "20px";
	toast.style.padding = "12px 16px";
	toast.style.borderRadius = "6px";
	toast.style.zIndex = "100";
	toast.style.maxWidth = "300px";
	toast.style.boxShadow = "0 3px 6px rgba(0, 0, 0, 0.16)";
	toast.style.fontSize = "14px";

	// Set type-specific styles
	if (type === "warning") {
		toast.style.backgroundColor = "#fff3cd";
		toast.style.color = "#856404";
		toast.style.border = "1px solid #ffeeba";
	} else if (type === "error") {
		toast.style.backgroundColor = "#f8d7da";
		toast.style.color = "#721c24";
		toast.style.border = "1px solid #f5c6cb";
	} else {
		toast.style.backgroundColor = "#d4edda";
		toast.style.color = "#155724";
		toast.style.border = "1px solid #c3e6cb";
	}

	toast.innerHTML = `
    <div>
      <span>${message}</span>
    </div>
  `;

	document.body.appendChild(toast);

	// Auto-remove after 5 seconds
	setTimeout(() => {
		toast.style.opacity = "0";
		toast.style.transition = "opacity 0.5s ease";
		setTimeout(() => toast.remove(), 500);
	}, 5000);
}

// Main initialization function
function initializeContributorStats() {
	if (isPR(location.pathname) || isIssue(location.pathname)) {
		getSyncStorage({ [STORAGE_KEYS.SHOW_PRIVATE_REPOS]: null }).then(
			(result) => {
				if (!result[STORAGE_KEYS.SHOW_PRIVATE_REPOS] && isPrivate()) return;

				// Process the main issue/PR author
				setTimeout(() => {
					const contributor = getFirstContributor();
					const pathInfo = getPathInfo();
					
					if (contributor) {
						// Process the first contributor (issue/PR creator)
						injectInitialUI(pathInfo);
					} else {
						console.warn("GitHub Contributors Extension: Could not find contributor");
					}
				}, 500);
			},
		);
	}
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
	// Check if gitHubInjection is available
	if (typeof gitHubInjection === 'function') {
		gitHubInjection(initializeContributorStats);
	} else {
		// Fallback to direct initialization
		initializeContributorStats();
		
		// Set up a mutation observer to detect when GitHub's dynamic content loads
		setupMutationObserver();
	}
});

// Set up a mutation observer to detect when GitHub's dynamic content loads
function setupMutationObserver() {
	// Create a mutation observer to watch for changes to the DOM
	const observer = new MutationObserver((mutations) => {
		// Check if we're on a PR or issue page
		if (!isPR(location.pathname) && !isIssue(location.pathname)) return;
		
		// Check if the first contributor element is now available
		const contributor = getFirstContributor();
		if (contributor) {
			const pathInfo = getPathInfo();
			
			// If we found the contributor and our UI isn't injected yet, inject it
			if (!document.getElementById(ELEMENT_IDS.CONTAINER)) {
				// Process the first contributor (issue/PR creator)
				injectInitialUI(pathInfo);
				
				// No need to keep observing for the main contributor
				observer.disconnect();
			}
		}
	});
	
	// Start observing the document with the configured parameters
	observer.observe(document.body, { 
		childList: true, 
		subtree: true 
	});
}

// Also handle navigation events for single-page app behavior
document.addEventListener("pjax:end", initializeContributorStats);
document.addEventListener("turbo:render", initializeContributorStats);

/**
 * GroupSync - Core Frontend Logic
 * Handles API fetch requests, local state, local fallback engine, and date calculations.
 */

// --- API Configuration ---
// Paste your deployed Google Apps Script Web App URL here!
// Example: "https://script.google.com/macros/s/AKfycbz.../exec"
export const API_URL = "https://script.google.com/macros/s/AKfycbycnZZjjixHrvGHsh6H9agMT88wxzeOY3zMnXstTBPMXnDSyxgj38_Qj2xUJlwmpCQ/exec";

// Check if we are running in local mock fallback mode
export const isMockMode = !API_URL || API_URL.startsWith("YOUR_GOOGLE_APPS_SCRIPT_URL");

// Mock delay helper to simulate network requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- Date Helpers ---

/**
 * Calculates the next N weekends starting from the current date.
 * A weekend is defined as Friday, Saturday, and Sunday.
 * Returns an array of objects representing each weekend option.
 */
export function getUpcomingWeekends(count = 12) {
  const weekends = [];
  const today = new Date();
  
  // Start searching from today
  let current = new Date(today);
  
  // Normalize time to midnight
  current.setHours(0, 0, 0, 0);
  
  // Find the first Friday
  while (current.getDay() !== 5) { // 5 is Friday
    current.setDate(current.getDate() + 1);
  }
  
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fullMonthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  for (let i = 0; i < count; i++) {
    const fri = new Date(current);
    
    const sat = new Date(current);
    sat.setDate(current.getDate() + 1);
    
    const sun = new Date(current);
    sun.setDate(current.getDate() + 2);
    
    // Format the date range
    let dateStr = "";
    const friYear = fri.getFullYear();
    const friMonth = monthNames[fri.getMonth()];
    const friDate = fri.getDate();
    
    const sunMonth = monthNames[sun.getMonth()];
    const sunDate = sun.getDate();
    
    // E.g. "Jun 19 - 21, 2026" or "Jun 28 - Jul 1, 2026"
    if (fri.getMonth() === sun.getMonth()) {
      dateStr = `${friMonth} ${friDate} - ${sunDate}, ${friYear}`;
    } else {
      dateStr = `${friMonth} ${friDate} - ${sunMonth} ${sunDate}, ${friYear}`;
    }
    
    // Unique ID for the option (use ISO date of Friday)
    const id = fri.toISOString().split('T')[0];
    
    weekends.push({
      id: id,
      formattedDate: dateStr,
      month: fullMonthNames[fri.getMonth()],
      year: friYear,
      dates: {
        friday: new Date(fri),
        saturday: new Date(sat),
        sunday: new Date(sun)
      }
    });
    
    // Move to the next Friday (7 days ahead)
    current.setDate(current.getDate() + 7);
  }
  
  return weekends;
}

/**
 * Generate a cryptographically secure-ish random poll ID
 */
export function generatePollId() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// --- Local Storage Poll Trackers ---

/**
 * Saves a poll reference to local storage so users can find recent polls
 */
export function saveRecentPoll(pollId, title, isOrganizer = false) {
  try {
    const listKey = "groupsync_recent_polls";
    const recent = JSON.parse(localStorage.getItem(listKey) || "[]");
    
    // Remove if already exists to bump it to top
    const filtered = recent.filter(p => p.id !== pollId);
    
    filtered.unshift({
      id: pollId,
      title: title,
      isOrganizer: isOrganizer,
      timestamp: new Date().getTime()
    });
    
    // Keep last 10 polls
    localStorage.setItem(listKey, JSON.stringify(filtered.slice(0, 10)));
  } catch (e) {
    console.error("Failed to save recent poll to localStorage", e);
  }
}

/**
 * Retrieves the list of recent polls
 */
export function getRecentPolls() {
  try {
    return JSON.parse(localStorage.getItem("groupsync_recent_polls") || "[]");
  } catch (e) {
    console.error("Failed to get recent polls", e);
    return [];
  }
}

// --- API Request Layer ---

/**
 * Fetches poll definition and all votes
 */
export async function fetchPollData(pollId) {
  if (isMockMode) {
    await delay(600); // Simulate network latency
    
    const pollStr = localStorage.getItem(`gs_mock_poll_${pollId}`);
    if (!pollStr) {
      throw new Error("Poll not found in mock database.");
    }
    
    const poll = JSON.parse(pollStr);
    const votes = JSON.parse(localStorage.getItem(`gs_mock_votes_${pollId}`) || "[]");
    
    return { poll, votes };
  }
  
  // Real network request to Google Sheets via Apps Script
  const url = `${API_URL}?pollId=${encodeURIComponent(pollId)}`;
  const response = await fetch(url, {
    method: "GET",
    mode: "cors",
    redirect: "follow"
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
  
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  
  return data;
}

/**
 * Creates a new poll
 */
export async function apiCreatePoll(pollId, title, options, participants) {
  const payload = {
    action: "createPoll",
    pollId,
    title,
    options,
    participants
  };
  
  if (isMockMode) {
    await delay(800);
    // Save to local storage mock database
    localStorage.setItem(`gs_mock_poll_${pollId}`, JSON.stringify({
      id: pollId,
      title: title,
      options: options,
      participants: participants,
      createdAt: new Date().toISOString()
    }));
    
    saveRecentPoll(pollId, title, true);
    return { success: true, pollId };
  }
  
  // Real Network POST Request
  // Crucial: Use text/plain Content-Type to bypass CORS OPTIONS preflight
  const response = await fetch(API_URL, {
    method: "POST",
    mode: "cors",
    redirect: "follow",
    headers: {
      "Content-Type": "text/plain"
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create poll. Status: ${response.status}`);
  }
  
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  
  saveRecentPoll(pollId, title, true);
  return data;
}

/**
 * Submits or updates a vote, returns the full updated poll & votes data
 */
export async function apiSubmitVote(pollId, name, responses, comment) {
  const payload = {
    action: "submitVote",
    pollId,
    name,
    responses,
    comment
  };
  
  if (isMockMode) {
    await delay(700);
    
    // Save to local storage mock votes
    const votesKey = `gs_mock_votes_${pollId}`;
    const votes = JSON.parse(localStorage.getItem(votesKey) || "[]");
    
    const existingIndex = votes.findIndex(v => v.name.toLowerCase() === name.toLowerCase());
    const voteData = {
      voteId: existingIndex >= 0 ? votes[existingIndex].voteId : Math.random().toString(36).substring(2, 9),
      name: name,
      responses: responses,
      comment: comment || "",
      timestamp: new Date().toISOString()
    };
    
    if (existingIndex >= 0) {
      votes[existingIndex] = voteData;
    } else {
      votes.push(voteData);
    }
    
    localStorage.setItem(votesKey, JSON.stringify(votes));
    
    const poll = JSON.parse(localStorage.getItem(`gs_mock_poll_${pollId}`));
    saveRecentPoll(pollId, poll.title, false);
    
    return { success: true, poll, votes };
  }
  
  // Real Network POST Request
  // Crucial: Use text/plain Content-Type to bypass CORS OPTIONS preflight
  const response = await fetch(API_URL, {
    method: "POST",
    mode: "cors",
    redirect: "follow",
    headers: {
      "Content-Type": "text/plain"
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to submit vote. Status: ${response.status}`);
  }
  
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  
  saveRecentPoll(pollId, data.poll.title, false);
  return data;
}

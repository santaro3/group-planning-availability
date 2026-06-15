/**
 * GroupSync - Google Apps Script Backend
 * 
 * Paste this script into Extensions -> Apps Script in your Google Spreadsheet.
 * Deploy it as a Web App:
 * 1. Click "Deploy" -> "New deployment"
 * 2. Select type: "Web app"
 * 3. Description: "GroupSync Backend"
 * 4. Execute as: "Me"
 * 5. Who has access: "Anyone"
 * 6. Click Deploy and copy the Web App URL!
 */

// Initialize sheets if they do not exist
function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  let pollsSheet = ss.getSheetByName("Polls");
  if (!pollsSheet) {
    pollsSheet = ss.insertSheet("Polls");
    pollsSheet.appendRow(["pollId", "title", "options", "participants", "createdAt"]);
    pollsSheet.getRange(1, 1, 1, 5).setFontWeight("bold");
    pollsSheet.setFrozenRows(1);
  }
  
  let votesSheet = ss.getSheetByName("Votes");
  if (!votesSheet) {
    votesSheet = ss.insertSheet("Votes");
    votesSheet.appendRow(["voteId", "pollId", "name", "responses", "comment", "timestamp"]);
    votesSheet.getRange(1, 1, 1, 6).setFontWeight("bold");
    votesSheet.setFrozenRows(1);
  }
}

// Helper to send JSON responses with CORS headers enabled
function makeResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// GET handler: Fetch poll details and aggregated votes
function doGet(e) {
  try {
    initSheets();
    const pollId = e.parameter.pollId;
    
    if (!pollId) {
      return makeResponse({ status: "ok", message: "GroupSync Backend Active. Provide a pollId parameter to load data." });
    }
    
    const data = getPollAndVotes(pollId);
    if (!data) {
      return makeResponse({ error: "Poll not found" });
    }
    
    return makeResponse(data);
  } catch (error) {
    return makeResponse({ error: error.toString() });
  }
}

// POST handler: Create poll or submit vote
function doPost(e) {
  try {
    initSheets();
    
    // Google Apps Script doesn't support preflight OPTIONS for application/json,
    // so we receive requests as text/plain and parse the body manually.
    if (!e.postData || !e.postData.contents) {
      return makeResponse({ error: "No post data received" });
    }
    
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    
    if (action === "createPoll") {
      const { pollId, title, options, participants } = payload;
      if (!pollId || !title || !options) {
        return makeResponse({ error: "Missing required fields for createPoll" });
      }
      
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName("Polls");
      sheet.appendRow([
        pollId,
        title,
        JSON.stringify(options),
        JSON.stringify(participants || []),
        new Date()
      ]);
      
      return makeResponse({ success: true, pollId: pollId });
    } 
    
    else if (action === "submitVote") {
      const { pollId, name, responses, comment } = payload;
      if (!pollId || !name || !responses) {
        return makeResponse({ error: "Missing required fields for submitVote" });
      }
      
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName("Votes");
      const data = sheet.getDataRange().getValues();
      
      let existingRowIndex = -1;
      
      // Search for existing vote by this user (case-insensitive name comparison) for this poll
      for (let i = 1; i < data.length; i++) {
        if (data[i][1] === pollId && data[i][2].toString().toLowerCase() === name.toLowerCase()) {
          existingRowIndex = i + 1; // 1-indexed row number
          break;
        }
      }
      
      if (existingRowIndex > 0) {
        // Update existing vote: columns responses (4), comment (5), timestamp (6)
        sheet.getRange(existingRowIndex, 4).setValue(JSON.stringify(responses));
        sheet.getRange(existingRowIndex, 5).setValue(comment || "");
        sheet.getRange(existingRowIndex, 6).setValue(new Date());
      } else {
        // Append new vote
        const voteId = Utilities.getUuid();
        sheet.appendRow([
          voteId,
          pollId,
          name,
          JSON.stringify(responses),
          comment || "",
          new Date()
        ]);
      }
      
      // Return the updated state immediately so the frontend doesn't need another GET request
      const updatedData = getPollAndVotes(pollId);
      return makeResponse({ success: true, ...updatedData });
    }
    
    return makeResponse({ error: "Invalid action" });
  } catch (error) {
    return makeResponse({ error: error.toString() });
  }
}

// Helper to fetch poll and votes from spreadsheet
function getPollAndVotes(pollId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Get Poll Details
  const pollsSheet = ss.getSheetByName("Polls");
  const pollsData = pollsSheet.getDataRange().getValues();
  let pollRow = null;
  
  for (let i = 1; i < pollsData.length; i++) {
    if (pollsData[i][0] === pollId) {
      pollRow = pollsData[i];
      break;
    }
  }
  
  if (!pollRow) {
    return null;
  }
  
  const poll = {
    id: pollRow[0],
    title: pollRow[1],
    options: JSON.parse(pollRow[2]),
    participants: JSON.parse(pollRow[3] || "[]"),
    createdAt: pollRow[4]
  };
  
  // 2. Get Votes for this Poll
  const votesSheet = ss.getSheetByName("Votes");
  const votesData = votesSheet.getDataRange().getValues();
  const votes = [];
  
  for (let i = 1; i < votesData.length; i++) {
    if (votesData[i][1] === pollId) {
      votes.push({
        voteId: votesData[i][0],
        name: votesData[i][2],
        responses: JSON.parse(votesData[i][3]),
        comment: votesData[i][4],
        timestamp: votesData[i][5]
      });
    }
  }
  
  return { poll, votes };
}


/**
 * Google Sheets Integration Service
 * Target Sheet: https://docs.google.com/spreadsheets/d/1ba58Smp8innXmfYOs7BnxH3lHKKm-lY-aEc_IrNRsWs/edit
 */

// REPLACE THIS with your deployed Google Apps Script Web App URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYED_SCRIPT_ID/exec';

export interface SheetStatus {
  acceptance: boolean;
  paused: boolean;
  status: string;
}

/**
 * Syncs user registration and status to Google Sheets
 */
export const syncToGoogleSheet = async (data: {
  instituteName: string;
  mobile: string;
  status: string;
  requestSent: boolean;
}) => {
  try {
    const payload = {
      action: 'syncUser',
      instituteName: data.instituteName,
      mobile: data.mobile,
      subscriptionStatus: data.status,
      requestStatus: data.requestSent ? 'send request' : 'not send request',
      acceptance: 'False', // Default
      pause: 'No' // Default
    };

    // Use no-cors if just sending, but for status we need a response
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', // POSTing to Apps Script usually requires no-cors if not using a proxy
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    return true;
  } catch (error) {
    console.error("Google Sheets Sync Error:", error);
    return false;
  }
};

/**
 * Fetches the latest subscription and pause status from the sheet for a specific mobile number
 */
export const checkSheetStatus = async (mobile: string): Promise<SheetStatus | null> => {
  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getStatus&mobile=${mobile}`);
    if (!response.ok) return null;
    
    const data = await response.json();
    return {
      acceptance: data.acceptance === 'True' || data.acceptance === true,
      paused: data.pause === 'Yes' || data.pause === true,
      status: data.subscriptionStatus
    };
  } catch (error) {
    console.warn("Failed to fetch status from Google Sheets. Using local data.");
    return null;
  }
};

/**
 * Update request status specifically when user clicks 'Request Lifetime Access'
 */
export const sendRequestToSheet = async (mobile: string, instituteName: string) => {
  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({
        action: 'updateRequest',
        mobile,
        instituteName,
        requestStatus: 'send request'
      })
    });
  } catch (e) {
    console.error("Failed to update request in sheet");
  }
};

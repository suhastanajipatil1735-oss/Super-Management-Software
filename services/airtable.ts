
/**
 * Airtable Integration Service
 */

// IMPORTANT: User must ensure these values match their Airtable setup
const AIRTABLE_API_KEY = 'patY8pY8pY8pY8pY8.xxxxxxxxxxxx'; // Replace with your actual Personal Access Token
const AIRTABLE_BASE_ID = 'appXXXXXXXXXXXXXX'; // Replace with your Base ID
const AIRTABLE_TABLE_NAME = 'Profiles'; // Replace with your Table Name

const headers = {
  'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
  'Content-Type': 'application/json'
};

export interface AirtableStatus {
  acceptance: boolean;
  paused: boolean;
}

/**
 * Syncs user data to Airtable. 
 * Checks if mobile exists; if yes, updates. If no, creates.
 */
export const syncToAirtable = async (data: {
  instituteName: string;
  mobile: string;
}) => {
  try {
    // Correctly encode the formula for columns with spaces
    const formula = encodeURIComponent(`{Mobile Number}='${data.mobile}'`);
    const searchUrl = `https://api.airtable.com/v1/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?filterByFormula=${formula}`;
    
    const searchRes = await fetch(searchUrl, { headers });
    const searchData = await searchRes.json();

    const fields = {
      'Institute / Academy Name': data.instituteName,
      'Mobile Number': data.mobile,
      // 'Acceptance' is handled by Admin in Airtable
    };

    if (searchData.records && searchData.records.length > 0) {
      // Update existing record
      const recordId = searchData.records[0].id;
      await fetch(`https://api.airtable.com/v1/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${recordId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields })
      });
    } else {
      // Create new record with default False values
      await fetch(`https://api.airtable.com/v1/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          records: [{
            fields: {
              ...fields,
              'Acceptance': 'False',
              'Subscription Request': 'No Request',
              'Subscription Pause': 'No'
            }
          }]
        })
      });
    }
    return true;
  } catch (error) {
    console.error("Airtable Sync Error:", error);
    return false;
  }
};

/**
 * Specifically updates the 'Subscription Request' column
 */
export const sendRequestToAirtable = async (mobile: string, instituteName: string) => {
  try {
    const formula = encodeURIComponent(`{Mobile Number}='${mobile}'`);
    const searchUrl = `https://api.airtable.com/v1/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?filterByFormula=${formula}`;
    
    const searchRes = await fetch(searchUrl, { headers });
    const searchData = await searchRes.json();

    if (searchData.records && searchData.records.length > 0) {
      const recordId = searchData.records[0].id;
      const res = await fetch(`https://api.airtable.com/v1/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${recordId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          fields: {
            'Institute / Academy Name': instituteName,
            'Subscription Request': 'Subscription Request Send'
          }
        })
      });
      return res.ok;
    }
    return false;
  } catch (e) {
    console.error("Airtable Request Update Error:", e);
    return false;
  }
};

/**
 * Polls Airtable for the 'Acceptance' and 'Pause' status
 */
export const checkAirtableStatus = async (mobile: string): Promise<AirtableStatus | null> => {
  try {
    const formula = encodeURIComponent(`{Mobile Number}='${mobile}'`);
    const searchUrl = `https://api.airtable.com/v1/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?filterByFormula=${formula}`;
    
    const res = await fetch(searchUrl, { headers });
    const data = await res.json();

    if (data.records && data.records.length > 0) {
      const fields = data.records[0].fields;
      return {
        // Handle both string "True" and boolean true from Airtable
        acceptance: fields['Acceptance'] === 'True' || fields['Acceptance'] === true,
        paused: fields['Subscription Pause'] === 'Yes' || fields['Subscription Pause'] === true
      };
    }
    return null;
  } catch (e) {
    console.error("Airtable Status Check Error:", e);
    return null;
  }
};

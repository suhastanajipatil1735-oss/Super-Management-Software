
/**
 * Airtable Integration Service
 * Target Base: User specified 
 */

// User needs to fill these from their Airtable account
const AIRTABLE_API_KEY = 'patY8pY8pY8pY8pY8.xxxxxxxxxxxx'; // Replace with personal access token
const AIRTABLE_BASE_ID = 'appXXXXXXXXXXXXXX'; // Replace with Base ID
const AIRTABLE_TABLE_NAME = 'Profiles'; // Table Name

const headers = {
  'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
  'Content-Type': 'application/json'
};

export interface AirtableStatus {
  acceptance: boolean;
  paused: boolean;
}

/**
 * Register or update user info in Airtable
 */
export const syncToAirtable = async (data: {
  instituteName: string;
  mobile: string;
}) => {
  try {
    // 1. Check if user exists
    const searchUrl = `https://api.airtable.com/v1/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?filterByFormula={Mobile Number}='${data.mobile}'`;
    const searchRes = await fetch(searchUrl, { headers });
    const searchData = await searchRes.json();

    const payload = {
      fields: {
        'Institute / Academy Name': data.instituteName,
        'Mobile Number': data.mobile,
        'Acceptance': 'False', // Default
        'Subscription Pause': 'No' // Default
      }
    };

    if (searchData.records && searchData.records.length > 0) {
      // Update existing
      const recordId = searchData.records[0].id;
      await fetch(`https://api.airtable.com/v1/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${recordId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      });
    } else {
      // Create new
      await fetch(`https://api.airtable.com/v1/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ records: [payload] })
      });
    }
    return true;
  } catch (error) {
    console.error("Airtable Sync Error:", error);
    return false;
  }
};

/**
 * Update request status specifically when user clicks 'Request Lifetime Access'
 */
export const sendRequestToAirtable = async (mobile: string) => {
  try {
    const searchUrl = `https://api.airtable.com/v1/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?filterByFormula={Mobile Number}='${mobile}'`;
    const searchRes = await fetch(searchUrl, { headers });
    const searchData = await searchRes.json();

    if (searchData.records && searchData.records.length > 0) {
      const recordId = searchData.records[0].id;
      await fetch(`https://api.airtable.com/v1/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${recordId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          fields: {
            'Subscription Request': 'Subscription Request Send'
          }
        })
      });
    }
  } catch (e) {
    console.error("Failed to update request in Airtable");
  }
};

/**
 * Check if Admin has set Acceptance to True
 */
export const checkAirtableStatus = async (mobile: string): Promise<AirtableStatus | null> => {
  try {
    const searchUrl = `https://api.airtable.com/v1/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?filterByFormula={Mobile Number}='${mobile}'`;
    const res = await fetch(searchUrl, { headers });
    const data = await res.json();

    if (data.records && data.records.length > 0) {
      const fields = data.records[0].fields;
      return {
        acceptance: fields['Acceptance'] === 'True' || fields['Acceptance'] === true,
        paused: fields['Subscription Pause'] === 'Yes' || fields['Subscription Pause'] === true
      };
    }
    return null;
  } catch (e) {
    return null;
  }
};

/**
 * Google Apps Script — Nextel Employees Sales Form Webhook
 * 
 * HOW TO SET UP:
 * 1. Open your Google Form → click the three-dot menu → "Script editor"
 * 2. Paste this entire script into the editor
 * 3. Set BACKEND_URL to your deployed backend URL (e.g. https://your-app.onrender.com)
 * 4. Set WEBHOOK_SECRET to the value of GOOGLE_FORM_WEBHOOK_SECRET in your .env
 * 5. Save the script (Ctrl+S)
 * 6. Click "Triggers" (clock icon) → Add Trigger:
 *      - Function: onFormSubmit
 *      - Event source: From form
 *      - Event type: On form submit
 * 7. Click Save and authorize permissions
 *
 * GOOGLE FORM FIELDS (create these questions in your form — exact titles matter):
 *   - "Your Name"                (Short answer)  — CSR / Agent full name
 *   - "Customer First Name"      (Short answer)
 *   - "Customer Last Name"       (Short answer)
 *   - "Customer Phone"           (Short answer)
 *   - "Customer State / Province" (Short answer or dropdown)
 *   - "Customer ZIP / Postal Code" (Short answer)
 *   - "DIDs"                     (Short answer)
 *   - "Closer Name"              (Short answer)
 *   - "Sale Date"                (Date  — optional, defaults to today)
 */

// ── CONFIGURATION ────────────────────────────────────────────────────────────
var BACKEND_URL = 'https://your-backend.onrender.com'; // ← change this
var WEBHOOK_SECRET = '';                                // ← set GOOGLE_FORM_WEBHOOK_SECRET value here (or leave blank to skip)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps a Google Form response to the backend field names.
 * Keys are the EXACT question titles from your Google Form.
 */
var FIELD_MAP = {
  'Your Name':                     'agentName',
  'Customer First Name':           'customerFirstName',
  'Customer Last Name':            'customerLastName',
  'Customer Phone':                'customerPhone',
  'Customer State / Province':     'customerState',
  'Customer ZIP / Postal Code':    'customerZipCode',
  'DIDs':                          'dids',
  'Closer Name':                   'closer',
  'Sale Date':                     'saleDate'
};

/**
 * Triggered automatically on every form submission.
 */
function onFormSubmit(e) {
  try {
    var responses = e.response.getItemResponses();
    var payload = {};

    responses.forEach(function(itemResponse) {
      var question = itemResponse.getItem().getTitle().trim();
      var answer   = itemResponse.getResponse();
      var field    = FIELD_MAP[question];
      if (field) {
        payload[field] = typeof answer === 'string' ? answer.trim() : answer;
      }
    });

    // Validate minimum required fields before sending
    var required = ['agentName', 'customerFirstName', 'customerLastName',
                    'customerPhone', 'customerState', 'customerZipCode',
                    'dids', 'closer'];
    var missing = required.filter(function(f) { return !payload[f]; });
    if (missing.length > 0) {
      Logger.log('❌ Missing required fields: ' + missing.join(', '));
      sendErrorEmail('Missing fields: ' + missing.join(', '), JSON.stringify(payload));
      return;
    }

    // Default saleDate to today if not provided
    if (!payload.saleDate) {
      payload.saleDate = new Date().toISOString().split('T')[0];
    }

    // Build request options
    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      headers: {
        'x-webhook-secret': WEBHOOK_SECRET
      },
      muteHttpExceptions: true
    };

    var url = BACKEND_URL + '/api/sales-submissions/google-form-webhook';
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    var body = response.getContentText();

    if (code === 201) {
      Logger.log('✅ Sale submitted successfully: ' + body);
    } else {
      Logger.log('⚠️ Backend returned ' + code + ': ' + body);
      sendErrorEmail('Backend error ' + code, body);
    }
  } catch (err) {
    Logger.log('❌ Script error: ' + err.toString());
    sendErrorEmail('Script exception', err.toString());
  }
}

/**
 * Optional: sends an alert email to the form owner if submission fails.
 */
function sendErrorEmail(subject, details) {
  try {
    var owner = Session.getActiveUser().getEmail();
    if (owner) {
      MailApp.sendEmail({
        to: owner,
        subject: '[Nextel Sales Form] Error: ' + subject,
        body: 'A sale submission failed to reach the backend.\n\nDetails:\n' + details
      });
    }
  } catch (e) {
    Logger.log('Could not send error email: ' + e.toString());
  }
}

/**
 * Run this function manually to test the webhook with dummy data.
 */
function testWebhook() {
  var testPayload = {
    agentName:         'John Doe',
    customerFirstName: 'Jane',
    customerLastName:  'Smith',
    customerPhone:     '03001234567',
    customerState:     'Punjab',
    customerZipCode:   '54000',
    dids:              'DID-12345',
    closer:            'Ali Khan',
    saleDate:          new Date().toISOString().split('T')[0]
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(testPayload),
    headers: { 'x-webhook-secret': WEBHOOK_SECRET },
    muteHttpExceptions: true
  };

  var url = BACKEND_URL + '/api/sales-submissions/google-form-webhook';
  var response = UrlFetchApp.fetch(url, options);
  Logger.log('Test response (' + response.getResponseCode() + '): ' + response.getContentText());
}


/* =========================================================
   UNILIFE OS — GOOGLE CALENDAR OAUTH
   Per-user OAuth connection
   Storage: Script Properties
   ========================================================= */

var UL_CALENDAR = {
  SCOPE: 'https://www.googleapis.com/auth/calendar.events.owned',
  AUTH_URL: 'https://accounts.google.com/o/oauth2/v2/auth',
  TOKEN_URL: 'https://oauth2.googleapis.com/token',
  SERVICE_PREFIX: 'ULCAL_'
};

// Validate internal UniLife user ID.
function calendarValidUid_(uid) {
  return typeof uid === 'string' &&
    /^u[A-Za-z0-9_-]{8,64}$/.test(uid);
}

// Create isolated OAuth service for each UniLife user.
function getCalendarService_(uid) {
  if (!calendarValidUid_(uid)) {
    throw fail('invalid');
  }

  var clientId = prop('UL_GOOGLE_CLIENT_ID');
  var clientSecret = prop('UL_GOOGLE_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw fail('calendarConfig');
  }

  return OAuth2.createService(
    UL_CALENDAR.SERVICE_PREFIX + uid
  )
    .setAuthorizationBaseUrl(UL_CALENDAR.AUTH_URL)
    .setTokenUrl(UL_CALENDAR.TOKEN_URL)
    .setClientId(clientId)
    .setClientSecret(clientSecret)
    .setCallbackFunction('calendarAuthCallback')
    .setPropertyStore(
      PropertiesService.getScriptProperties()
    )
    .setScope(UL_CALENDAR.SCOPE)
    .setParam('access_type', 'offline')
    .setParam('prompt', 'consent');
}

// Generate authorization URL.
function calendarConnectUrl_(uid) {
  var service = getCalendarService_(uid);

  return {
    url: service.getAuthorizationUrl({
      uid: uid
    })
  };
}

// Simple OAuth result page.
function calendarOAuthPage_(title, message, icon, color) {
  var appUrl =
    'https://fazleyabdulaziz-beep.github.io/unilife-os/';

  var html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">

      <title>UniLife OS</title>

      <style>
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: #f5f6f8;
          font-family: Arial, sans-serif;
          color: #333;
        }

        .card {
          background: #ffffff;
          width: 100%;
          max-width: 380px;
          padding: 34px 26px;
          border-radius: 12px;
          text-align: center;
          box-shadow: 0 3px 15px rgba(0,0,0,.05);
        }

        .icon {
          width: 54px;
          height: 54px;
          margin: 0 auto 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: ${color}15;
          color: ${color};
          font-size: 27px;
          font-weight: 700;
        }

        h2 {
          font-size: 20px;
          font-weight: 600;
          margin: 0 0 10px;
        }

        p {
          color: #777777;
          font-size: 14px;
          line-height: 1.6;
          margin: 0 0 25px;
        }

        .button {
          display: block;
          width: 100%;
          background: #333333;
          color: #ffffff;
          text-decoration: none;
          padding: 13px 18px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          transition: background .2s;
        }

        .button:hover {
          background: #555555;
        }

        @media (prefers-color-scheme: dark) {
          body {
            background: #181818;
            color: #eeeeee;
          }

          .card {
            background: #242424;
          }

          p {
            color: #aaaaaa;
          }

          .button {
            background: #eeeeee;
            color: #222222;
          }

          .button:hover {
            background: #dddddd;
          }
        }
      </style>
    </head>

    <body>
      <div class="card">

        <div class="icon">${icon}</div>

        <h2>${title}</h2>

        <p>${message}</p>

        <a class="button"
           href="${appUrl}"
           target="_top">
          Return to UniLife OS
        </a>

      </div>
    </body>
    </html>
  `;

  return HtmlService.createHtmlOutput(html)
    .setTitle('UniLife OS');
}

// OAuth callback.
function calendarAuthCallback(request) {
  try {
    var params = request && request.parameter
      ? request.parameter
      : {};

    var uid = params.uid || '';
    var serviceName = params.serviceName || '';

    if (!calendarValidUid_(uid)) {
      throw new Error('Invalid user');
    }

    var expectedName =
      UL_CALENDAR.SERVICE_PREFIX + uid;

    if (serviceName !== expectedName) {
      throw new Error('Invalid OAuth service');
    }

    var service = getCalendarService_(uid);

    var authorized = service.handleCallback(request);

    if (!authorized) {
      return calendarOAuthPage_(
        'Authorization cancelled',
        'Google Calendar was not connected. You can return to UniLife OS and try again.',
        '↩',
        '#888888'
      );
    }

    return calendarOAuthPage_(
      'Google Calendar connected!',
      'Your Google Calendar is now successfully connected. You can return to UniLife OS.',
      '✓',
      '#16a34a'
    );

  } catch (err) {
    console.error(
      'Calendar OAuth callback:',
      err && err.stack ? err.stack : err
    );

    return calendarOAuthPage_(
      'Connection unsuccessful',
      'Something went wrong. Please return to UniLife OS and try again.',
      '✕',
      '#dc2626'
    );
  }
}

// Check Google Calendar connection.
function calendarConnectionStatus_(uid) {
  var service = getCalendarService_(uid);

  return {
    connected: service.hasAccess()
  };
}

// Disconnect only this UniLife user's connection.
function calendarDisconnect_(uid) {
  var service = getCalendarService_(uid);

  service.reset();

  return {
    connected: false
  };
}

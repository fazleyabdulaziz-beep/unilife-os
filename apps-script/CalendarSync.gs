
/* =========================================================
   UNILIFE OS — GOOGLE CALENDAR SYNC ENGINE
   Phase 1: Timetable
   Calendar: Primary only
   ========================================================= */

var UL_CAL_API = 'https://www.googleapis.com/calendar/v3';

// Google Calendar API request.
function calendarRequest_(uid, method, path, payload) {
  var service = getCalendarService_(uid);

  if (!service.hasAccess()) {
    throw fail('calendarNotConnected');
  }

  var options = {
    method: method,
    headers: {
      Authorization: 'Bearer ' + service.getAccessToken()
    },
    muteHttpExceptions: true
  };

  if (payload !== undefined && payload !== null) {
    options.contentType = 'application/json';
    options.payload = JSON.stringify(payload);
  }

  var response = UrlFetchApp.fetch(
    UL_CAL_API + '/calendars/primary/' + path,
    options
  );

  var code = response.getResponseCode();
  var body = response.getContentText();

  if (code >= 200 && code < 300) {
    return body ? JSON.parse(body) : {};
  }

  if (code === 404 || code === 410) {
    return { notFound: true };
  }

  console.error('Calendar API error:', code, body);
  throw new Error('Google Calendar API error: ' + code);
}

// Get the user's timezone.
function calendarUserTimezone_(uid) {
  var user = table('Users').rows.filter(
    function(r) { return r.id === uid; }
  )[0];

  return user && user.timezone
    ? String(user.timezone)
    : Session.getScriptTimeZone();
}

// Calculate the next date for a recurring weekday.
function calendarNextWeekday_(day, timezone) {
  var days = {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6
  };

  if (days[day] === undefined) {
    throw fail('invalid');
  }

  var today = Utilities.formatDate(
    new Date(),
    timezone,
    'yyyy-MM-dd'
  );

  var parts = today.split('-').map(Number);

  var current = new Date(Date.UTC(
    parts[0], parts[1] - 1, parts[2]
  ));

  var difference =
    (days[day] - current.getUTCDay() + 7) % 7;

  current.setUTCDate(current.getUTCDate() + difference);

  return current.toISOString().slice(0, 10);
}

// Build a Google Calendar event from a UniLife class.
function calendarBuildClassEvent_(item, timezone) {
  var date = item.schedule_type === 'one_time'
    ? item.date
    : calendarNextWeekday_(item.day, timezone);

  if (!date) {
    throw fail('invalid');
  }

  var event = {
    summary: 'Class: ' + item.course,
    location: item.room || '',
    description:
      'Created by UniLife OS\n' +
      'Lecturer: ' + (item.lecturer || '') + '\n' +
      'Source: UniLife OS Timetable',
    start: {
      dateTime: date + 'T' + item.start + ':00',
      timeZone: timezone
    },
    end: {
      dateTime: date + 'T' + item.end + ':00',
      timeZone: timezone
    }
  };

  if (item.schedule_type === 'recurring') {
    var weekdays = {
      mon: 'MO',
      tue: 'TU',
      wed: 'WE',
      thu: 'TH',
      fri: 'FR',
      sat: 'SA',
      sun: 'SU'
    };

    event.recurrence = [
      'RRULE:FREQ=WEEKLY;BYDAY=' + weekdays[item.day]
    ];
  }

  return event;
}

// Find mapping row for a timetable record.
function calendarFindMapping_(uid, sourceId) {
  return table('CalendarEvents').rows.filter(
    function(r) {
      return r.user_id === uid &&
        r.source_type === 'timetable' &&
        r.source_id === sourceId;
    }
  )[0] || null;
}

// Save or update the mapping.
function calendarSaveMapping_(uid, sourceId, eventId) {
  var t = table('CalendarEvents');
  var existing = calendarFindMapping_(uid, sourceId);

  var row = {
    id: existing ? existing.id : newId(),
    user_id: uid,
    source_type: 'timetable',
    source_id: sourceId,
    google_event_id: eventId,
    updated_at: new Date().toISOString()
  };

  if (existing) {
    t.s.getRange(
      existing._r, 1, 1, t.h.length
    ).setValues([
      t.h.map(function(k) {
        return row[k] !== undefined ? row[k] : existing[k];
      })
    ]);
  } else {
    append('CalendarEvents', row);
  }
}

// Remove only the mapping belonging to this user and source.
function calendarRemoveMapping_(uid, mappingId) {
  var t = table('CalendarEvents');

  var row = t.rows.filter(function(r) {
    return r.id === mappingId && r.user_id === uid;
  })[0];

  if (row) {
    t.s.deleteRow(row._r);
  }
}

// Synchronize all timetable records for one user.
function calendarSyncTimetable_(uid) {
  var timezone = calendarUserTimezone_(uid);

  var classes = table('Timetable').rows.filter(
    function(r) {
      return r.user_id === uid;
    }
  );

  var mappings = table('CalendarEvents').rows.filter(
    function(r) {
      return r.user_id === uid &&
        r.source_type === 'timetable';
    }
  );

  var created = 0;
  var updated = 0;
  var deleted = 0;

  var activeIds = {};

  classes.forEach(function(item) {
    var sourceId = String(item.id);
    activeIds[sourceId] = true;

    var event = calendarBuildClassEvent_(item, timezone);
    var mapping = calendarFindMapping_(uid, sourceId);

    if (mapping) {
      var result = calendarRequest_(
        uid,
        'patch',
        'events/' + encodeURIComponent(mapping.google_event_id),
        event
      );

      if (!result.notFound) {
        updated++;
        calendarSaveMapping_(uid, sourceId, result.id);
        return;
      }
    }

    var createdEvent = calendarRequest_(
      uid,
      'post',
      'events',
      event
    );

    if (!createdEvent.id) {
      throw new Error('Google Calendar did not return an event ID.');
    }

    calendarSaveMapping_(uid, sourceId, createdEvent.id);
    created++;
  });

  // Delete only UniLife OS timetable events whose source
  // records no longer exist.
  mappings.forEach(function(mapping) {
    if (activeIds[String(mapping.source_id)]) return;

    calendarRequest_(
      uid,
      'delete',
      'events/' + encodeURIComponent(mapping.google_event_id)
    );

    calendarRemoveMapping_(uid, mapping.id);
    deleted++;
  });

  return {
    success: true,
    created: created,
    updated: updated,
    deleted: deleted,
    total: classes.length,
    timezone: timezone
  };
}


/* =========================================================
   UNILIFE OS — ASSIGNMENT GOOGLE CALENDAR SYNC
   All-day events
   ========================================================= */

// Normalize Google Sheets date into yyyy-MM-dd.
function calendarAssignmentDate_(value, timezone) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, timezone, 'yyyy-MM-dd');
  }

  var date = String(value || '').trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw fail('invalid');
  }

  return date;
}

// Calculate exclusive end date for Google all-day event.
function calendarAssignmentEndDate_(date) {
  var parts = date.split('-').map(Number);
  var next = new Date(Date.UTC(
    parts[0], parts[1] - 1, parts[2] + 1
  ));

  return next.toISOString().slice(0, 10);
}

// Find assignment mapping.
function calendarFindAssignmentMapping_(uid, sourceId) {
  return table('CalendarEvents').rows.filter(function(r) {
    return r.user_id === uid &&
      r.source_type === 'assignment' &&
      String(r.source_id) === String(sourceId);
  })[0] || null;
}

// Save assignment mapping.
function calendarSaveAssignmentMapping_(uid, sourceId, eventId) {
  var t = table('CalendarEvents');
  var existing = calendarFindAssignmentMapping_(uid, sourceId);

  var row = {
    id: existing ? existing.id : newId(),
    user_id: uid,
    source_type: 'assignment',
    source_id: String(sourceId),
    google_event_id: eventId,
    updated_at: new Date().toISOString()
  };

  if (existing) {
    t.s.getRange(existing._r, 1, 1, t.h.length).setValues([
      t.h.map(function(k) {
        return row[k] !== undefined ? row[k] : existing[k];
      })
    ]);
  } else {
    append('CalendarEvents', row);
  }
}

// Build assignment all-day event.
function calendarBuildAssignmentEvent_(item, timezone) {
  var due = calendarAssignmentDate_(item.due, timezone);

  var description = [
    'Created by UniLife OS',
    'Course: ' + (item.course || ''),
    'Priority: ' + (item.priority || ''),
    'Status: ' + (item.status || ''),
    'Notes / Submission URL: ' + (item.notes || ''),
    'Source: UniLife OS Assignments'
  ].join('\n');

  return {
    summary: 'Assignment: ' +
      (item.course || '') + ' – ' + (item.title || 'Assignment'),
    description: description,
    start: { date: due },
    end: { date: calendarAssignmentEndDate_(due) }
  };
}

// Sync all assignments belonging to one user.
function calendarSyncAssignments_(uid) {
  var timezone = calendarUserTimezone_(uid);

  var assignments = table('Assignments').rows.filter(function(r) {
    return r.user_id === uid;
  });

  var mappings = table('CalendarEvents').rows.filter(function(r) {
    return r.user_id === uid &&
      r.source_type === 'assignment';
  });

  var created = 0;
  var updated = 0;
  var deleted = 0;
  var skipped = 0;
  var activeIds = {};

  assignments.forEach(function(item) {
    var sourceId = String(item.id);
    activeIds[sourceId] = true;

    if (!item.due) {
      skipped++;
      return;
    }

    var event = calendarBuildAssignmentEvent_(item, timezone);
    var mapping = calendarFindAssignmentMapping_(uid, sourceId);

    if (mapping) {
      var result = calendarRequest_(
        uid,
        'patch',
        'events/' + encodeURIComponent(mapping.google_event_id),
        event
      );

      if (!result.notFound) {
        updated++;
        calendarSaveAssignmentMapping_(uid, sourceId, result.id);
        return;
      }
    }

    var createdEvent = calendarRequest_(
      uid,
      'post',
      'events',
      event
    );

    if (!createdEvent.id) {
      throw new Error('Google Calendar did not return an event ID.');
    }

    calendarSaveAssignmentMapping_(uid, sourceId, createdEvent.id);
    created++;
  });

  // Delete only UniLife OS assignment events whose
  // corresponding assignment records no longer exist.
  mappings.forEach(function(mapping) {
    if (activeIds[String(mapping.source_id)]) return;

    calendarRequest_(
      uid,
      'delete',
      'events/' + encodeURIComponent(mapping.google_event_id)
    );

    calendarRemoveMapping_(uid, mapping.id);
    deleted++;
  });

  return {
    success: true,
    created: created,
    updated: updated,
    deleted: deleted,
    skipped: skipped,
    total: assignments.length,
    timezone: timezone
  };
}


/* =========================================================
   UNILIFE OS — EXAMINATION GOOGLE CALENDAR SYNC
   All-day events
   ========================================================= */

function calendarFindExamMapping_(uid, sourceId) {
  return table('CalendarEvents').rows.filter(function(r) {
    return r.user_id === uid &&
      r.source_type === 'examination' &&
      String(r.source_id) === String(sourceId);
  })[0] || null;
}

function calendarSaveExamMapping_(uid, sourceId, eventId) {
  var t = table('CalendarEvents');
  var existing = calendarFindExamMapping_(uid, sourceId);

  var row = {
    id: existing ? existing.id : newId(),
    user_id: uid,
    source_type: 'examination',
    source_id: String(sourceId),
    google_event_id: eventId,
    updated_at: new Date().toISOString()
  };

  if (existing) {
    t.s.getRange(existing._r, 1, 1, t.h.length).setValues([
      t.h.map(function(k) {
        return row[k] !== undefined ? row[k] : existing[k];
      })
    ]);
  } else {
    append('CalendarEvents', row);
  }
}

function calendarBuildExamEvent_(item, timezone) {
  var date = calendarAssignmentDate_(item.date, timezone);

  var description = [
    'Created by UniLife OS',
    'Course: ' + (item.course || ''),
    'Examination Time: ' + (item.time || 'Not specified'),
    'Venue: ' + (item.venue || 'Not specified'),
    'Revision: ' + (item.revision || ''),
    'Source: UniLife OS Examinations'
  ].join('\n');

  return {
    summary: 'Examination: ' + (item.course || 'Exam'),
    description: description,
    location: item.venue || '',
    start: { date: date },
    end: { date: calendarAssignmentEndDate_(date) }
  };
}

function calendarSyncExaminations_(uid) {
  var timezone = calendarUserTimezone_(uid);

  var exams = table('Examinations').rows.filter(function(r) {
    return r.user_id === uid;
  });

  var mappings = table('CalendarEvents').rows.filter(function(r) {
    return r.user_id === uid &&
      r.source_type === 'examination';
  });

  var created = 0;
  var updated = 0;
  var deleted = 0;
  var skipped = 0;
  var activeIds = {};

  exams.forEach(function(item) {
    var sourceId = String(item.id);
    activeIds[sourceId] = true;

    if (!item.date) {
      skipped++;
      return;
    }

    var event = calendarBuildExamEvent_(item, timezone);
    var mapping = calendarFindExamMapping_(uid, sourceId);

    if (mapping) {
      var result = calendarRequest_(
        uid,
        'patch',
        'events/' + encodeURIComponent(mapping.google_event_id),
        event
      );

      if (!result.notFound) {
        updated++;
        calendarSaveExamMapping_(uid, sourceId, result.id);
        return;
      }
    }

    var createdEvent = calendarRequest_(
      uid,
      'post',
      'events',
      event
    );

    if (!createdEvent.id) {
      throw new Error('Google Calendar did not return an event ID.');
    }

    calendarSaveExamMapping_(uid, sourceId, createdEvent.id);
    created++;
  });

  mappings.forEach(function(mapping) {
    if (activeIds[String(mapping.source_id)]) return;

    calendarRequest_(
      uid,
      'delete',
      'events/' + encodeURIComponent(mapping.google_event_id)
    );

    calendarRemoveMapping_(uid, mapping.id);
    deleted++;
  });

  return {
    success: true,
    created: created,
    updated: updated,
    deleted: deleted,
    skipped: skipped,
    total: exams.length,
    timezone: timezone
  };
}

/* =========================================================
   UNILIFE OS — SYNC ALL CALENDAR MODULES
   ========================================================= */

function calendarSyncAll_(uid) {
  var timetable = calendarSyncTimetable_(uid);
  var assignments = calendarSyncAssignments_(uid);
  var examinations = calendarSyncExaminations_(uid);

  return {
    success: true,
    timetable: timetable,
    assignments: assignments,
    examinations: examinations,
    synced_at: new Date().toISOString()
  };
}


/* =========================================================
   UNILIFE OS — AUTOMATIC GOOGLE CALENDAR SYNC
   Triggered after successful database mutations.
   ========================================================= */

function calendarAutoSync_(uid, collection) {
  var sourceMap = {
    classes: 'timetable',
    assignments: 'assignment',
    exams: 'examination'
  };

  var sourceType = sourceMap[collection];

  // Ignore collections that are not calendar-enabled.
  if (!sourceType) return;

  try {
    // Do not sync when Google Calendar is disconnected.
    var status = calendarConnectionStatus_(uid);

    if (!status.connected) {
      return;
    }

    // Run the relevant sync after the database operation.
    locked(function() {
      if (sourceType === 'timetable') {
        return calendarSyncTimetable_(uid);
      }

      if (sourceType === 'assignment') {
        return calendarSyncAssignments_(uid);
      }

      if (sourceType === 'examination') {
        return calendarSyncExaminations_(uid);
      }
    });

  } catch (err) {
    // Calendar failure must not undo a successful UniLife save.
    console.error(
      'Automatic Calendar Sync failed:',
      collection,
      err && err.stack ? err.stack : err
    );
  }
}

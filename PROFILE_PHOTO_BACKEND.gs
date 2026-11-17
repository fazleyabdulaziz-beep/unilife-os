/**
 * UniLife OS — Profile photo storage (Google Apps Script)
 *
 * Stores a compressed JPEG in a dedicated Drive folder and keeps a mapping
 * in the ProfilePhotos sheet. The frontend calls:
 *   action: "saveProfilePhoto", data: { dataUrl: "data:image/jpeg;base64,..." }
 *
 * IMPORTANT: The image link is shared as "anyone with the link can view".
 * Profile photos are therefore not private. Do not use sensitive images.
 */
const PROFILE_PHOTO_FOLDER_NAME = 'UniLife OS Profile Photos';
const PROFILE_PHOTO_SHEET_NAME = 'ProfilePhotos';
const PROFILE_PHOTO_MAX_BYTES = 180 * 1024; // compressed frontend image should be well below this

function saveProfilePhoto_(userId, dataUrl) {
  if (!userId) throw new Error('auth');
  if (typeof dataUrl !== 'string' || !/^data:image\/jpeg;base64,/.test(dataUrl)) {
    throw new Error('invalid_image');
  }

  const base64 = dataUrl.split(',')[1] || '';
  const bytes = Utilities.base64Decode(base64);
  if (!bytes.length || bytes.length > PROFILE_PHOTO_MAX_BYTES) throw new Error('image_too_large');

  const blob = Utilities.newBlob(bytes, 'image/jpeg', 'profile-' + userId + '.jpg');
  const folder = getOrCreateProfilePhotoFolder_();
  const sheet = getOrCreateProfilePhotoSheet_();

  // Replace previous photo for this user.
  const rows = sheet.getDataRange().getValues();
  let oldFileId = '';
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(userId)) {
      oldFileId = String(rows[i][1] || '');
      sheet.deleteRow(i + 1);
      break;
    }
  }
  if (oldFileId) {
    try { DriveApp.getFileById(oldFileId).setTrashed(true); } catch (e) {}
  }

  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const url = 'https://drive.google.com/uc?export=view&id=' + file.getId();

  sheet.appendRow([String(userId), file.getId(), url, new Date()]);
  return { avatar_url: url };
}

function getProfilePhotoUrl_(userId) {
  if (!userId) return '';
  const sheet = getOrCreateProfilePhotoSheet_();
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(userId)) return String(rows[i][2] || '');
  }
  return '';
}

function getOrCreateProfilePhotoFolder_() {
  const props = PropertiesService.getScriptProperties();
  const savedId = props.getProperty('UL_PROFILE_PHOTO_FOLDER_ID');
  if (savedId) {
    try { return DriveApp.getFolderById(savedId); } catch (e) {}
  }
  const it = DriveApp.getFoldersByName(PROFILE_PHOTO_FOLDER_NAME);
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder(PROFILE_PHOTO_FOLDER_NAME);
  props.setProperty('UL_PROFILE_PHOTO_FOLDER_ID', folder.getId());
  return folder;
}

function getOrCreateProfilePhotoSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(PROFILE_PHOTO_SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(PROFILE_PHOTO_SHEET_NAME);
    sh.appendRow(['user_id', 'drive_file_id', 'avatar_url', 'updated_at']);
  }
  return sh;
}

/**
 * ROUTER INTEGRATION:
 * In your existing authenticated handle(action, data, token) router,
 * AFTER token validation has produced the authenticated user object `user`,
 * add this case/branch:
 *
 *   if (action === 'saveProfilePhoto') {
 *     return saveProfilePhoto_(user.id, data.dataUrl);
 *   }
 *
 * In bootstrap/userOut, include:
 *   avatar_url: getProfilePhotoUrl_(user.id)
 *
 * Adapt `user.id` to the actual authenticated user ID property in your Code.gs.
 */

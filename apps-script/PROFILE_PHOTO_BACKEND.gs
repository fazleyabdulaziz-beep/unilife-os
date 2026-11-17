const PROFILE_PHOTO_FOLDER_NAME='UniLife OS Profile Photos';
const PROFILE_PHOTO_SHEET_NAME='ProfilePhotos';
const PROFILE_PHOTO_MAX_BYTES=180*1024;
function saveProfilePhoto_(userId,dataUrl){
  if(!userId)throw fail('auth');
  if(typeof dataUrl!=='string'||!/^data:image\/jpeg;base64,/.test(dataUrl))throw fail('invalid_image');
  var base64=dataUrl.split(',')[1]||'',bytes;
  try{bytes=Utilities.base64Decode(base64);}catch(e){throw fail('invalid_image');}
  if(!bytes.length||bytes.length>PROFILE_PHOTO_MAX_BYTES)throw fail('image_too_large');
  var blob=Utilities.newBlob(bytes,'image/jpeg','profile-'+userId+'.jpg');
  var folder=getOrCreateProfilePhotoFolder_(),sheet=getOrCreateProfilePhotoSheet_();
  var rows=sheet.getDataRange().getValues(),oldFileId='';
  for(var i=1;i<rows.length;i++){
    if(String(rows[i][0])===String(userId)){oldFileId=String(rows[i][1]||'');sheet.deleteRow(i+1);break;}
  }
  if(oldFileId){try{DriveApp.getFileById(oldFileId).setTrashed(true);}catch(e){}}
  var file=folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);
  const url = 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w500';
  sheet.appendRow([String(userId),file.getId(),url,new Date()]);
  return{avatar_url:url};
}
function getProfilePhotoUrl_(userId){
  if(!userId)return'';
  var sheet=SS().getSheetByName(PROFILE_PHOTO_SHEET_NAME);
  if(!sheet||sheet.getLastRow()<2)return'';
  var rows=sheet.getDataRange().getValues();
  for(var i=1;i<rows.length;i++)if(String(rows[i][0])===String(userId))return String(rows[i][2]||'');
  return'';
}
function getOrCreateProfilePhotoFolder_(){
  var props=PropertiesService.getScriptProperties(),savedId=props.getProperty('UL_PROFILE_PHOTO_FOLDER_ID');
  if(savedId){try{return DriveApp.getFolderById(savedId);}catch(e){}}
  var it=DriveApp.getFoldersByName(PROFILE_PHOTO_FOLDER_NAME);
  var folder=it.hasNext()?it.next():DriveApp.createFolder(PROFILE_PHOTO_FOLDER_NAME);
  props.setProperty('UL_PROFILE_PHOTO_FOLDER_ID',folder.getId());return folder;
}
function getOrCreateProfilePhotoSheet_(){
  var ss=SS(),sh=ss.getSheetByName(PROFILE_PHOTO_SHEET_NAME);
  if(!sh){sh=ss.insertSheet(PROFILE_PHOTO_SHEET_NAME);sh.appendRow(['user_id','drive_file_id','avatar_url','updated_at']);}
  return sh;
}
/* =========================================================
   AI STUDY HUB — PDF document library (Phase 3)
   The browser extracts PDF text with PDF.js. Only extracted text
   is stored in the user's private spreadsheet rows; the source PDF
   itself is not uploaded or retained by the backend.
========================================================= */
var AI_DOCUMENTS = {
  MAX_PER_USER: 20,
  MAX_PDF_BYTES: 8 * 1024 * 1024,
  MAX_PAGES: 50,
  MAX_TEXT_CHARS: 60000,
  CHUNK_CHARS: 8000,
  MAX_CHUNKS: 8,
  MAX_NAME: 160
};

function aiStudyHubDocument_(uid, id) {
  if (typeof id !== 'string' || !/^[a-f0-9]{12,40}$/i.test(id)) throw fail('invalid');
  var row = table('AIDocuments').rows.filter(function(r) {
    return r.id === id && r.user_id === uid;
  })[0];
  if (!row) throw fail('notFound');
  return row;
}

function aiStudyHubListDocuments_(uid) {
  var docs = table('AIDocuments').rows.filter(function(r) {
    return r.user_id === uid && r.status === 'ready';
  }).sort(function(a,b) {
    return String(b.updated_at).localeCompare(String(a.updated_at));
  }).map(function(r) {
    return {
      id:String(r.id),name:String(r.name),mime_type:String(r.mime_type),
      size_bytes:Number(r.size_bytes)||0,page_count:Number(r.page_count)||0,
      text_length:Number(r.text_length)||0,created_at:String(r.created_at||''),
      updated_at:String(r.updated_at||''),status:String(r.status||'ready')
    };
  });
  return {documents:docs};
}

function aiStudyHubStartDocumentUpload_(uid, data) {
  data = data || {};
  var name = String(data.name || '').trim().replace(/[\\\\/:*?"<>|]/g,'_').slice(0,AI_DOCUMENTS.MAX_NAME);
  var mime = String(data.mime_type || '').toLowerCase();
  var size = Number(data.size_bytes);
  var pages = Number(data.page_count);
  var chunks = Number(data.chunk_count);
  if (!name || mime !== 'application/pdf' || !isFinite(size) || size < 1 || size > AI_DOCUMENTS.MAX_PDF_BYTES ||
      !Number.isInteger(pages) || pages < 1 || pages > AI_DOCUMENTS.MAX_PAGES ||
      !Number.isInteger(chunks) || chunks < 1 || chunks > AI_DOCUMENTS.MAX_CHUNKS) throw fail('invalid');
  var now = new Date().toISOString();
  var doc = {
    id:newId(),user_id:uid,name:name,mime_type:mime,size_bytes:size,
    page_count:pages,chunk_count:chunks,text_length:0,status:'uploading',
    created_at:now,updated_at:now
  };
  locked(function() {
    var userDocs = table('AIDocuments').rows.filter(function(r) {
      return r.user_id === uid && r.status !== 'deleted';
    });
    if (userDocs.length >= AI_DOCUMENTS.MAX_PER_USER) throw fail('aiDocumentLimit');
    append('AIDocuments',doc);
  });
  return {document:{id:doc.id,name:doc.name,page_count:pages,status:doc.status}};
}

function aiStudyHubSaveDocumentChunk_(uid, data) {
  data = data || {};
  var doc = aiStudyHubDocument_(uid,String(data.document_id||''));
  if (doc.status !== 'uploading') throw fail('invalid');
  var index = Number(data.chunk_index);
  var content = String(data.content || '');
  if (!Number.isInteger(index) || index < 0 || index >= Number(doc.chunk_count) ||
      !content || content.length > AI_DOCUMENTS.CHUNK_CHARS) throw fail('invalid');
  locked(function() {
    var freshDoc = aiStudyHubDocument_(uid,doc.id);
    if (freshDoc.status !== 'uploading') throw fail('invalid');
    var existing = table('AIDocumentChunks').rows.filter(function(r) {
      return r.document_id === doc.id && r.user_id === uid && Number(r.chunk_index) === index;
    })[0];
    if (existing) {
      var sh = SS().getSheetByName('AIDocumentChunks');
      var headers = sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0];
      var col = headers.indexOf('content') + 1;
      if (col < 1) throw fail('server');
      sh.getRange(existing._r,col).setNumberFormat('@').setValue(content);
    } else {
      append('AIDocumentChunks',{id:newId(),document_id:doc.id,user_id:uid,
        chunk_index:index,content:content,created_at:new Date().toISOString()});
    }
  });
  return {saved:true,index:index};
}

function aiStudyHubCompleteDocumentUpload_(uid, data) {
  data = data || {};
  var doc = aiStudyHubDocument_(uid,String(data.document_id||''));
  var chunks = table('AIDocumentChunks').rows.filter(function(r) {
    return r.document_id === doc.id && r.user_id === uid;
  }).sort(function(a,b) { return Number(a.chunk_index)-Number(b.chunk_index); });
  if (chunks.length !== Number(doc.chunk_count)) throw fail('aiDocumentIncomplete');
  for (var i=0;i<chunks.length;i++) {
    if (Number(chunks[i].chunk_index) !== i || !String(chunks[i].content||'')) throw fail('aiDocumentIncomplete');
  }
  var total = chunks.reduce(function(n,r) { return n + String(r.content||'').length; },0);
  if (total > AI_DOCUMENTS.MAX_TEXT_CHARS) throw fail('invalid');
  var now = new Date().toISOString();
  locked(function() {
    var fresh = aiStudyHubDocument_(uid,doc.id);
    aiStudyHubSetCell_('AIDocuments',fresh._r,'text_length',total);
    aiStudyHubSetCell_('AIDocuments',fresh._r,'status','ready');
    aiStudyHubSetCell_('AIDocuments',fresh._r,'updated_at',now);
  });
  return {document:{id:doc.id,name:doc.name,page_count:Number(doc.page_count),text_length:total,status:'ready'}};
}

function aiStudyHubDocumentText_(uid, id) {
  var doc = aiStudyHubDocument_(uid,id);
  if (doc.status !== 'ready') throw fail('aiDocumentNotReady');
  var chunks = table('AIDocumentChunks').rows.filter(function(r) {
    return r.document_id === doc.id && r.user_id === uid;
  }).sort(function(a,b) { return Number(a.chunk_index)-Number(b.chunk_index); });
  return chunks.map(function(r) { return String(r.content||''); }).join('');
}

function aiStudyHubDeleteDocument_(uid, data) {
  data = data || {};
  var doc = aiStudyHubDocument_(uid,String(data.document_id||''));
  locked(function() {
    var chunks = table('AIDocumentChunks').rows.filter(function(r) {
      return r.document_id === doc.id && r.user_id === uid;
    }).sort(function(a,b) { return b._r-a._r; });
    var chunkSheet = SS().getSheetByName('AIDocumentChunks');
    chunks.forEach(function(r) { chunkSheet.deleteRow(r._r); });
    // Remove document association from this user's conversations before deleting the library entry.
    var convs = table('AIConversations').rows.filter(function(r) {
      return r.user_id === uid && r.document_id === doc.id;
    });
    convs.forEach(function(r) { aiStudyHubSetCell_('AIConversations',r._r,'document_id',''); });
    var docs = table('AIDocuments').rows.filter(function(r) {
      return r.id === doc.id && r.user_id === uid;
    })[0];
    if (docs) SS().getSheetByName('AIDocuments').deleteRow(docs._r);
  });
  return {deleted:true};
}

function aiStudyHubCreateDocumentConversation_(uid, data) {
  data = data || {};
  var doc = aiStudyHubDocument_(uid,String(data.document_id||''));
  if (doc.status !== 'ready') throw fail('aiDocumentNotReady');
  var now = new Date().toISOString();
  var title = String(data.title || ('Study: ' + doc.name)).slice(0,100);
  var item = {id:newId(),user_id:uid,title:title,created_at:now,updated_at:now,document_id:doc.id};
  locked(function() {
    var fresh = aiStudyHubDocument_(uid,doc.id);
    if (fresh.status !== 'ready') throw fail('aiDocumentNotReady');
    append('AIConversations',item);
  });
  return {conversation:{id:item.id,title:item.title,created_at:now,updated_at:now,document_id:doc.id}};
}

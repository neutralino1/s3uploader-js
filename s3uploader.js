function getValue(id){
  var el = document.getElementById(id);
  if (el)
    return el.value;
  else
    return null;
};

function getFile(fileInput){
  if (Object.prototype.toString.call(fileInput) == '[object File]')
    return fileInput;
  if (Object.prototype.toString.call(fileInput) == '[object HTMLInputElement]')
    return fileInput.files[0];
  if (Object.prototype.toString.call(fileInput) == '[object Object]')
    return fileInput[0].files[0];
  if (typeof(fileInput) == 'string');
    return document.getElementById(fileInput).files[0];
}

S3Uploader = {
  onStart: function(){},
  onProgress: function(){},
  onComplete: function(){},
  onError: function(){},
  onAbort: function(){},

  settings: {
    chunckSize: 5 * 1024 * 1024,
    maxRetries: 5,
    maxConcurrent: 3
  },

  upload: function(fileInput){
    this.file = getFile(fileInput);
    if (this.file == 'undefined')
      throw "No file to upload.";
    this.onStart();
    this.setKey();
    this.initiateUpload();
  },

  setKey: function(){
    var key = getValue('s3_key');
    var path = getValue('path');
    if (key != 'undefined' && key != null){
      this.key = key;
    }else{
      if (path != 'undefined' && path != null){
        if (path[path.length - 1] != '/') path += '/';
        this.key = path + this.file.name;
      }else{
        throw "No key or path specified.";
      }
    }
    if (this.key[0] != '/') this.key = '/' + this.key;
  },

  sign: function(params){
    t = [];
    for(p in params)
      t.push(p + "=" + encodeURIComponent(params[p]));
    var signXhr = new XMLHttpRequest();
    signXhr.open('GET', '/sign?' + t.join("&"), false);
    signXhr.send();
    return JSON.parse(signXhr.responseText);
  },

  initiateUpload: function() {
    var response = this.sign({method:'POST', path: this.key + '?uploads'});
    this.request({
      method: 'POST',
      url: response.url,
      headers: {
        'x-amz-date': response.date,
        'Authorization': response.signature
      },
      onLoad: this.uploadParts.bind(this)
    });
  },

  request: function(params){
    var xhr = new XMLHttpRequest();
    if (params.onLoad) xhr.addEventListener("load", params.onLoad, false);
    if (params.onUploadStart) xhr.upload.onloadstart = params.onUploadStart;
    if (params.onUploadProgress) xhr.upload.onprogress = params.onUploadProgress;
    xhr.open(params.method, params.url, true);
    for (h in params.headers)
      xhr.setRequestHeader(h, params.headers[h]);
    xhr.send(params.body);
  },

  uploadParts: function(e) {
    this.uploadId = e.target.responseXML.getElementsByTagName("UploadId")[0];
    if (!this.uploadId) return false;
    this.uploadId = this.uploadId.childNodes[0].nodeValue;
    this.total = this.file.size;
    if (this.file.slice){
      this.steps = Math.ceil(this.total / this.settings.chunckSize);
    }else{
      this.steps = 1;
      this.settings.chunckSize = this.total;
    }
    this.progressArray = [];
    for (var i = 1; i <= this.steps; i++) {
      this.progressArray[i - 1] = {part: i, retries: 0, progress: 0};
      if (i <= this.settings.maxConcurrent)
        this.uploadPart(i, true);
    }
  },

  uploadPart: function(partNumber, queue) {
    this.progressArray[partNumber - 1].progress = 0;
    this.nextToStart = partNumber + 1;
    if (this.progressArray[partNumber - 1].retries >= this.settings.maxRetries){
      this.onError();
      return;
    }
    this.progressArray[partNumber - 1].retries++;
    var path = this.key + '?partNumber=' + partNumber + '&uploadId=' + this.uploadId;
    var response = this.sign({method:'PUT', path: path});
    var start = (partNumber - 1) * this.settings.chunckSize;
    var end = partNumber == this.steps ? this.file.size : start + this.settings.chunckSize;
    var body = this.file.slice ? this.file.slice(start, end) : this.file;
    this.request({
      method: 'PUT',
      url: response.url,
      headers: {
        'x-amz-date': response.date,
        'Authorization': response.signature
      },
      body: body,
      onUploadStart: function(){ 
        this.index = partNumber - 1; 
        this.queue = queue;
      },
      onLoad: this.finalizePartUpload.bind(this),
      onError: this.partUploadError.bind(this),
      onUploadProgress: this.partUploadProgress.bind(this)
    });
  },

  partUploadProgress: function(f){
    this.progressArray[f.target.index].progress = f.loaded / f.total;
    totalProgess = 0;
    for (var i in this.progressArray)
      totalProgess += this.progressArray[i].progress; 
    totalProgess = totalProgess / this.steps;
    this.onProgress(totalProgess);
  },

  partUploadError: function(e){
    this.onError('There ws an error uploading part ' + e.target.upload.index + 1);
    this.uploadPart(e.target.upload.index + 1, true);
  },

  finalizePartUpload: function(e){
    if (!e.target.getResponseHeader("ETag") && e.target.status != 200){
      return this.uploadPart(e.target.upload.index + 1, true);
    }else{
      this.progressArray[e.target.upload.index].progress = 1;
      this.progressArray[e.target.upload.index].eTag = e.target.getResponseHeader("ETag");
      if (this.nextToStart <= this.steps && e.target.upload.queue)
        return this.uploadPart(this.nextToStart, true);
      allComplete = true;
      for (var i in this.progressArray)
        allComplete = (allComplete && (this.progressArray[i].progress == 1));
      if (allComplete) this.finalizeUpload();
    }
  },

  buildMultipartXML: function(){
    var body = "<CompleteMultipartUpload>";
    for (var i in this.progressArray){
      body += "<Part>";
      body += "<PartNumber>" + this.progressArray[i].part + "</PartNumber>";
      body += "<ETag>" + this.progressArray[i].eTag + "</ETag>";
      body += "</Part>";
    }
    return body + "</CompleteMultipartUpload>";
  },

  finalizeUpload: function() {
    var path = this.key + '?uploadId=' + this.uploadId;
    var response = this.sign({method: 'POST', contenttype: 'application/xml; charset=UTF-8', path: path});

    this.request({
      method: 'POST',
      url: response.url,
      headers:{
        'x-amz-date': response.date,
        'Content-Type': 'application/xml; charset=UTF-8',
        'Authorization': response.signature
      },
      body: this.buildMultipartXML(),
      onError: function(){ this.onError('error merging'); },
      onLoad: this.retryFailedParts.bind(this)
    });
  },

  retryFailedParts: function(e){
    if (e.target.status == 400){
      failedPart = parseInt(e.target.responseXML.getElementsByTagName("PartNumber")[0].childNodes[0].nodeValue);
      this.uploadPart(failedPart, false);
    }
    if (e.target.status == 200) this.onComplete();
  }
};

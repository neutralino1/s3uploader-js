function getValue(id){
  return document.getElementById(id).value;
};

function initForm(file, key){
  fd = new FormData();
  fd.append('key', key);
  fd.append('acl', getValue('acl')); 
  fd.append('Content-Type', file.type);      
  fd.append('AWSAccessKeyId', getValue('access_key_id'));
  fd.append('policy', getValue('policy'));
  fd.append('signature', getValue('signature'));
  fd.append("file", file);
  return fd;
};

function getFile(fileInput){
  if (Object.prototype.toString.call(fileInput) == '[object File]')
    return fileInput;
  if (Object.prototype.toString.call(fileInput) == '[HTMLInputElement]')
    return fileInput.files[0];
  if (typdeof(fileInput) == 'string');
    return document.getElementById(fileInput).files[0];
}

function S3Uploader(){
  this.onStart = function(){};
  this.onProgress = function(){};
  this.onComplete = function(){};
  this.onError = function(){};
  this.onAbort = function(){};
}

S3Uploader.prototype.progress = function(event){
  this.onProgress(Math.round(event.loaded*100/event.total));
}

S3Uploader.prototype.upload = function(fileInput, keyPrefix){
  this.file = getFile(fileInput);
  if (this.file == 'undefined')
    return false;
  var key = keyPrefix + this.file.name;
  var formData = initForm(this.file, key);
  this.onStart();
  var xhr = new XMLHttpRequest();

  xhr.upload.addEventListener("progress", this.progress.bind(this), false);
  xhr.addEventListener("load", this.onComplete, false);
  xhr.addEventListener("error", this.onError, false);
  xhr.addEventListener("abort", this.onAbort, false);

  xhr.open('POST', 'https://' + getValue('bucket') + '.s3.amazonaws.com/', true); //MUST BE LAST LINE BEFORE YOU SEND 

  xhr.send(formData);
};
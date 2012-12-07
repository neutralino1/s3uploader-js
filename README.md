Amazon S3 Ajax uploader
=======================

This is a simple Javascript library to upload a file to Amazon S3 asynchronously.

## Usage

### Markup

    <html>
      <head>
        <script type='text/javascript' src='s3uploader.js'></script>
      <head>
      <body>
        <input type='hidden' id='bucket' value='YourBucket'>
        <input type='hidden' id='key' value='AKey'>
        <input type='hidden' id='acl' value='YourACL'>
        <input type='hidden' id='AWSAccessKeyId' value='YourAWSAccessKeyId'>
        <input type='hidden' id='policy' value='Base64Encodedpolicy'>
        <input type='hidden' id='signature' value='Base64EncodedSignature'>
        <input name="template" type="file">
        <button id='submit'>Upload</button>
      </body>
    </html>

### Javascript

    file = document.getElementById('submit').files[0];
    uploader = new S3Uploader();
    uploader.onStart = myStartCallback;
    uploader.onProcess = myProgressCallback; // passes the completion fraction as argument
    uploader.onComplete = myCompleteCallback;
    uploader.onError = myErrorCallback;
    uploader.upload(file);

## Support

Tweet me up at [@neutralino1](http://twitter.com/neutralino1) for questions and requests.
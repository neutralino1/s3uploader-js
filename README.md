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

    uploader = new S3Uploader();
    uploader.upload(file);

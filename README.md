Amazon S3 multi-chunk asynchronous uploader
=======================

This is a Javascript library to securely upload large files (multi-GB) to a private S3 bucket straight from the client (think wetransfer). The large file is chopped in slices of configurable sizes (5MB by default). Then each slice is signed by a request to your back-end and then uploaded concurrently and asynchronously to your private S3 bucket.

## Usage

### Markup

```HTML
    <html>
      <head>
        <script type='text/javascript' src='s3uploader.js'></script>
      <head>
      <body>
        <input type='hidden' id='path' value='path'>
        <input name="template" type="file">
        <button id='submit'>Upload</button>
      </body>
    </html>
```
### Javascript
```javascript
    file = document.getElementById('submit').files[0];
    uploader = new S3Uploader();
    uploader.onStart = myStartCallback;
    uploader.onProgress = myProgressCallback; // passes the completion fraction as argument
    uploader.onComplete = myCompleteCallback;
    uploader.onError = myErrorCallback;
    uploader.settings.chunkSize = 10 * 1024 * 1024; // optional chunk size
    uploader.settings.maxRetries = 5; // optional max retries for failed chunk uploads
    uploader.settings.maxConcurrent = 3; // optional maximum number of concurrent uploads
    uploader.upload(file);
```

### Back-end
Your server-side app needs to have a `/sign` end-point to sign each file slice.
In Rails in can look something like
```ruby
class ApplicationController < ActionController::Base

  def sign
    render_404 unless check_domain!
    date = Time.now.httpdate
    query = params[:path].split('?')[-1]
    filename = params[:path].split('/')[-1].split('?')[0]
    path = params[:path].split(filename)[0]
    params[:path] = path + ERB::Util.url_encode(filename) + '?' + query
    "".tap do |signature|
      signature << "#{params[:method].upcase}\n"
      signature << "\n"
      signature << "#{params[:contenttype]}\n" 
      signature << "\n"
      signature << "x-amz-acl:#{params[:acl]}\n" if params[:acl]
      signature << "x-amz-date:#{date}\n"
      signature << "/#{S3_CONFIG[:bucket]}#{params[:path]}"
      signature = Base64.encode64(OpenSSL::HMAC.digest(OpenSSL::Digest::Digest.new('sha1'), 
                                  S3_CONFIG[:secret_access_key], signature)).gsub("\n","")
      {
        signature: "AWS #{S3_CONFIG[:access_key_id]}:#{signature}", 
        date: date,
        url: "https://#{:S3_CONFIG[:bucket]}.s3-eu-west-1.amazonaws.com#{params[:path]}"
      }.tap do |response|
        response[:acl] = params[:acl] if params[:acl]
        render json: response
      end
    end
  end

  def check_domain!
    DOMAINS.any? { |domain| match_domain?(domain, request.referer) }
  end

  def match_domain?(domains, url)
    domains.split(',').any? { |domain| /\Ahttps?:\/\/(www.)?#{domain}\//.match(url) }
  end
end
```
## Support

Tweet me up at [@neutralino1](http://twitter.com/neutralino1) for questions and requests.
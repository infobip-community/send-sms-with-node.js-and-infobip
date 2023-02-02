# Send an SMS message with Node.js and Infobip

In this blog post, we will use Node.js to build a simple library (Node.js) package that will enable us to send SMS messages over Infobip API using a single function call. The developed library can then be used in any number of projects to send any number of basic SMS text messages, with a minimum amount of configuration needed.

We also have a [Node.js SDK](https://github.com/infobip-community/infobip-api-node-sdk) which should get you up and running in no time. Note that the example below creates a Node.js project from scratch with no packages or libraries.

## Prerequisites

- [Infobip account](https://www.infobip.com/signup)
- Working [Node.js](https://nodejs.org/) evironment, including [npm](https://www.npmjs.com/)

## Difficulty level

This post assumes basic knowledge of JavaScript, Node.js, and HTTP.

## Set up an empty Node.js project

We will begin by setting up an empty Node.js project.
Inside an empty directory (let's call it `sendsms`), run the `npm init` command to initialize a new Node.js project. You will need to answer a few questions that will be asked by `npm`, like the name and the version of the project. You can accept all the defaults suggested by `npm`, or fill out some information according to your preferences. In the end, `npm` will generate a `package.json` file containing something like:

```bash
{
  "name": "sendsms",
  "version": "1.0.0",
  "description": "a simple Node.js project to send SMS messages",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "",
  "license": "ISC"
}
```

## Add dependencies

Our project will be very simple - we will only need one dependency. We'll add a popular open-source HTTP client library called [Axios](https://github.com/axios/axios).
Inside your project directory, run

```javascript
npm install axios
```

You'll notice that `axios` was added under `dependencies` inside your `package.json` file.

## Add the Send SMS API call

Our goal is to create a function with a signature.

```javascript
sendSms(config, destinationNumber, message)
```

Which we could use to send a single SMS message at a time.

The parameters to use:
- `config` is an object with data, needed to execute the actual HTTP request against Infobip API.\
- your custom Infobip API domain, `baseUrl` (e.g. `8935q9.api.infobip.com`) and your Infobip `APIkey` that you can access from within your Infobip account. You would typically store such information somewhere in your application's configuration.\
- `destinationNumber` is the phone number (MSISDN) of the handset to which you want to send an SMS message. It must be in international format - that is, prefixed with the country and network prefix.
- `message` is the actual text of the SMS message that you want to send.

The function will need to do the appropriate HTTP POST call to [Infobip Send SMS API](https://www.infobip.com/docs/api/channels/sms/sms-messaging/outbound-sms/send-sms-message) in order to send the SMS message. To implement it, we will split the work into three parts: constructing the URL, constructing request headers, and constructing the request body.

### Construct a URL

The URL will always look like this: `https://<your-custom-domain>/sms/2/text/advanced`.  We can create a helper function that will use the custom domain from the configuration to build the correct URL:

```javascript
    const buildUrl = (domain) => {  
        return `https://${domain}/sms/2/text/advanced`;  
    }
```

### Construct request headers

The request to Infobip API needs to contain appropriate HTTP headers for authentication purposes, as described in the [documentation](https://www.infobip.com/docs/essentials/api-authentication). We will use the "API Key Header" authentication method, placing the API key into the `Authentication` header. We'll also provide a header for the content type - we'll be using `JSON`.

```javascript
    const buildHeaders = (apiKey) => {  
       return {  
          'Content-Type': 'application/json',  
	      'Authorization': `App ${apiKey}`  
      };  
    }
```

### Construct a request body

The `/sms/2/text/advanced` endpoint expects SMS message properties to be provided in the HTTP request body. We only need two properties for the basic case, the destination phone number and the message text. Following the format for the message body provided in the [documentation](https://www.infobip.com/docs/api/channels/sms/sms-messaging/outbound-sms/send-sms-message), we can make a helper function for that, too:

```javascript
    const buildRequestBody = (destinationNumber, message) => {  
           const destinationObject = {  
              to: destinationNumber  
           };  
    	   const messageObject = {  
              destinations: [destinationObject],  
    	      text: message  
           };  
           return {  
              messages: [messageObject]  
           }  
    }
```

### Handling API responses

Once the HTTP request is executed, the response body will differ depending on whether the request was a success or a failure. Here, we'll parse the response from the Axios HTTP client to a simple object containing a `success` boolean flag and message status information in case of success, or the error message in case of failure.

```javascript
    const parseSuccessResponse = (axiosResponse) => {  
    	const responseBody = axiosResponse.data;  
    	const singleMessageResponse = responseBody.messages[0];  
	    return {  
            success: true,  
            messageId: singleMessageResponse.messageId,  
            status: singleMessageResponse.status.name,  
            category: singleMessageResponse.status.groupName  
    	  };  
    }  
 
    const parseFailedResponse = (axiosError) => {  
    	if (axiosError.response) {  
    	    const responseBody = axiosError.response.data;  
    		return {  
                success: false,  
                errorMessage: responseBody.requestError.serviceException.text,  
                errorDetails: responseBody  
    		}; 
    	}  
    	return {  
    	     success: false,  
    		 errorMessage: axiosError.message  
    	};  
    } 
```

### Add helper functions

We'll add two more helper functions. One is to serve as a validation helper, to ensure that the `sendSms` function is called with the correct arguments. The other one is a helper function that wraps HTTP headers in an object as required by Axios's `POST` function.

```javascript
    const validateNotEmpty = (value, fieldName) => {
        if (!value) {
            throw `${fieldName} parameter is mandatory`;
        }
    }

    const buildAxiosConfig = (apiKey) => {
        return {
            headers: buildHeaders(apiKey)
        };
    }
```


## Send an SMS message

Finally, we have everything needed to put together for the `sendSms` function. The code itself is very straightforward:

```javascript
    const sendSms = (config, destinationNumber, message) => {
        validateNotEmpty(config.domain, 'config.domain');
        validateNotEmpty(config.apiKey, 'config.apiKey');
        validateNotEmpty(destinationNumber, 'destinationNumber');
        validateNotEmpty(message, 'message');
    
        const url = buildUrl(config.domain);
        const requestBody = buildRequestBody(destinationNumber, message);
        const axiosConfig = buildAxiosConfig(config.apiKey);

        return axios.post(url, requestBody, axiosConfig)
            .then(res => parseSuccessResponse(res))
            .catch(err => parseFailedResponse(err));
    }
```

To test out the code, we can put all the functions described so far in a single file called `send.js` in the root of our project.
We want to export the `sendSms()` function to use it elsewhere, so place the export at the end of the file:

```bash
    module.exports = sendSms;
```

Now, create a file `index.js` inside the same directory (project root). We can import the `send` module and use it to send an SMS. We'll just log the results to the console. Remember that if your Infobip account is in free trial mode, you can only send SMS to the phone number you used to create your Infobip account.

```javascript
    const sendSms = require('./send.js');    
    const config = {  
      	 domain: '<your-domain-here>', 
       	 apiKey: '<your-api-key-here>'
    };
    sendSms(config,'<your-phone-number-here>', `hello world` ).then(result => console.log(result));
```

Replace the placeholders with your actual API key, domain, and phone number, and that's it, you can now run `node index.js` to send an SMS message!

__Note:__ You can also download the completed project source files [here](link_to_zip_file_with_source_code)).

Here is an example output in case of success, indicating that the message was accepted and is pending delivery:

```javascript
    {
      success: true,
      messageId: '36807858316207371400',
      status: 'PENDING_ACCEPTED',
      category: 'PENDING'
    }
```

## Common errors

Here, is an example response returned in the case that the provided API key is invalid:

```javascript
    {
      success: false,
      errorMessage: 'Invalid login details',
      errorDetails: { requestError: { serviceException: [Object] } }
    }
```

For more details on status and error codes, visit [documentation](https://www.infobip.com/docs/essentials/response-status-and-error-codes).
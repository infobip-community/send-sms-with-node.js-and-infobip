const sendSms = require('./send.js');

const config = {
	domain: '<your-domain-here>',
	apiKey: '<your-api-key-here>'
}

sendSms(config,'<your-phone-number-here>', `hello world at ${new Date()}` ).then(result => console.log(result));
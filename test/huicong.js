const { listUrl } = require('../config');
const request = require('request-promise');
const uaFactory = require('../lib/uaFactory');
const iconv = require('iconv-lite');
const fs = require('fs');

const proxy = 'http://116.199.115.78:80';
const ua = uaFactory.getUa();
const options = {
	method: 'get',
	url: listUrl + '&af=3',
	headers: {
		'User-Agent': ua
	},
	encoding: null,
	resolveWithFullResponse: true
};
const rp = request.defaults({ proxy });

rp(options).then((resp) => {
	console.log('-----------1------------');
	const html = iconv.decode(resp.body, 'gbk');
	fs.writeFileSync(`${__dirname}/page1-af3.html`, html);
}).catch((e) => {
	console.log(e);
});


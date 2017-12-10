const { listUrl } = require('../config');
const request = require('request-promise');
const uaFactory = require('../lib/uaFactory');
const iconv = require('iconv-lite');
const fs = require('fs');

const url = 'https://cfqj.b2b.hc360.com/shop/company.html';
const proxy = 'http://121.35.243.157:8080';
const ua = uaFactory.getUa();
const options = {
	method: 'get',
	url,
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
	fs.writeFileSync(`${__dirname}/contactUs11.html`, html);
}).catch((e) => {
	console.log(e);
});


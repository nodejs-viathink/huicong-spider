const { listUrl } = require('../config');
const request = require('request-promise');
const uaFactory = require('../lib/uaFactory');
const iconv = require('iconv-lite');
const fs = require('fs');
const cheerio = require('cheerio');
const logger = require('../lib/logger').getLogger('huicong');
const Promise = require('bluebird');

const listBaseHeaders = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
	'Referer': 'http://s.hc360.com/',
	'Host': 's.hc360.com',
	'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive'
};

const detailBaseHeaders = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
	'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive'
};

const getProxy = () => {
	let proxyList = [];
	let index = -1;
	return () => {
		if (proxyList.length === 0) {
			// proxyList = JSON.parse(fs.readFileSync(`${__dirname}/okProxy.json`));
			proxyList = JSON.parse(fs.readFileSync(`${__dirname}/xiciOkProxy.json`));			
			index += 1;
			return proxyList[index];
		}
		if (index >= proxyList.length - 1) {
			index = 0;
			return proxyList[index];
		}
		index += 1;
		return proxyList[index];
	};
};
const getOneProxy = getProxy();
const getProxyUrl = () => {
	const p = getOneProxy();
	return `http://${p.ip}:${p.port}`
};
const httpGet= async(url, proxy, headers) => {
	logger.debug('httpGet params: ', url, proxy, headers);
	const options = {
		method: 'get',
		url: url,
		headers: headers,
		encoding: null,
		resolveWithFullResponse: true,
		timeout: 10000
	};
	const rp = request.defaults({ proxy });
	return rp(options);
};

const getHtmlWithRetry = async(url, headers) => {
	const ua = uaFactory.getUa();
	const tryNum = 500; // 代理重试次数
	let html = null;	
	for (let i = 1; i <= tryNum; i += 1) {
		try {
			const proxy = getProxyUrl();
			headers = Object.assign({
				'User-Agent': ua
			}, headers); 
			const resp = await httpGet(url, proxy, headers);
			if (resp.body) {
				html = resp.body;
				break;
			}
		} catch(e) {
			logger.warn(`getHtmlWithRetry url: ${url} 失败，即将进行第 ${i + 1} 次...`);
			// logger.error('getHtmlWithRetry error: ', e);			
		}
	}
	logger.debug('getHtmlWithRetry buffer: ', html);
	return html;
};

const getCompanyList = async(page) => {
	const part1Url = `${listUrl}&ee=${page}`;
	logger.info(`getCompanyList 开始获取列表：第${page}页 第一部分, url: ${part1Url}`);	
	const buff1 = await getHtmlWithRetry(part1Url, listBaseHeaders);
	const part2Url = `${listUrl}&ee=${page}&af=3`;
	logger.info(`getCompanyList 开始获取列表：第${page}页 第二部分, url: ${part2Url}`);	
	const buff2 = await getHtmlWithRetry(part2Url, listBaseHeaders);
	logger.info(`getCompanyList 开始解析列表 第${page}页 HTML`);
	const list = [];
	if (buff1) {
		const html1 = iconv.decode(buff1, 'gbk');
		const $ = cheerio.load(html1);
		$('.til').find('a').each(function(index, elem){
			if ($(this).attr('title').trim()) {
				logger.debug('getCompanyList-part1', index, $(this).attr('title'), $(this).attr('href'));  
				list.push({
					company: $(this).attr('title'),
					url: $(this).attr('href'),
					parentUrl: part1Url
				});    
			}
		});
	}
	if (buff2) {
		const html2 = iconv.decode(buff2, 'gbk');
		const $ = cheerio.load(html2);
		$('.til').find('a').each(function(index){
			if ($(this).attr('title').trim()) {
				logger.debug('getCompanyList-part1', index, $(this).attr('title'), $(this).attr('href'));  
				list.push({
					company: $(this).attr('title'),
					url: $(this).attr('href'),
					parentUrl: part1Url
				});    
			}
		});
	}
	logger.info(`getCompanyList 列表第一页共获取公司 ${list.length} 个...`);
	return list;
};

const getCompanyDetail = async({ company, url }) => {
	const detailUrl = `${url}shop/company.html`;
	logger.info(`getCompanyDetail 开始公司详情：${company}, url: ${url}`);	
	const headers = Object.assign({
		Referer: url
	}, detailBaseHeaders);
	const buff = await getHtmlWithRetry(detailUrl, headers);
	logger.info(`getCompanyDetail 开始解析公司数据：${company}, url: ${url}`);
	const html = iconv.decode(buff, 'gbk');	
	const $ = cheerio.load(html);	
	const detail = {
		memyear: '',
		businessRegist: '',
		linkman: '',
		telephone: '',
		mobile: '',
		fax: '',
		address: '',
		website: ''
	};
	const titleMap = {
		'联系人': 'linkman',
		'电话': 'telephone',
		'手机': 'mobile',
		'传真': 'fax',
		'地址': 'address',
		'公司主页': 'website'
	};
	$('.memyear').find('b').each(function(index){
		if ($(this).text().trim()) {
			logger.debug('getCompanyDetail memyear:', index, $(this).text().trim()); 
			detail.memyear = $(this).text().trim();       
		}
	});
	$('.rnzz').find('a').each(function(index){
		if ($(this).text().trim()) {
			logger.debug('getCompanyDetail businessRegist:', index, $(this).text().trim()); 
			detail.businessRegist = $(this).text().trim();       
		}
	});
	const labelArr = [];
	const valueArr = [];
	$('.con3Left').find('span').each(function(index){
		if ($(this).text().trim()) {
			logger.debug('getCompanyDetail con3Left', index, $(this).text().trim()); 
			labelArr.push($(this).text().trim())       
		}
	});
	
	$('.con3Rig').each(function(index){
		if ($(this).text().trim()) {
			if (index === 0) {
				$(this).find('span').each(function(sIndex) {
					if(sIndex === 0 ){
						logger.debug('getCompanyDetail con3Rig:', index, $(this).text().trim());  
						valueArr.push($(this).text().trim());
					}                             
				});  
			} else {
				logger.debug('getCompanyDetail con3Rig:', index, $(this).text().trim()); 
				valueArr.push($(this).text().trim());				
			}
		}
	});
	labelArr.forEach((label, index) => {
		if (titleMap[label]) {
			detail[titleMap[label]] = valueArr[index];
		}
	});
	return detail;
};

const main = async(pageCount) => {
	try{
		const resultFile = `${__dirname}/result.json`;
		let resultDetailArr = [];
		logger.info(`main 开始爬取数据共 ${pageCount} 页...`);
		for(let i = 1; i <= pageCount; i += 1) {
			const companyList = await getCompanyList(i);
			const detailList = await Promise.mapSeries(companyList, async(company) => {
				return await getCompanyDetail(company);
			});
			resultDetailArr = resultDetailArr.concat(detailList);
			logger.info(`main 列表第 ${i} 页读取完成，写入文件 ${resultFile} ...`);
			fs.writeFileSync(resultFile, JSON.stringify(resultDetailArr));
		}
		logger.info(`main 开始爬取数据完成共 ${pageCount} 页...`);
	} catch(e) {
		logger.error('main 爬去数据失败', pageCount, e);
	}
};

main(1).then().catch((e) => {
	logger.error('eee: ', e);
});

// const testUrl = 'http://s.hc360.com/?w=%CE%E5%BD%F0&mc=enterprise&ee=1';
// const testProxy = 'http://121.35.243.157:8080';
// const testHeaders =  {
// 	'User-Agent': 'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9.0.8) Gecko Fedora/1.9.0.8-1.fc10 Kazehakase/0.5.6',
// 	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
// 	Referer: 'http://s.hc360.com/',
// 	Host: 's.hc360.com',
// 	'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
// 	'Cache-Control': 'max-age=0',
// 	Connection: 'keep-alive'
// };
// httpGet(testUrl, testProxy, testHeaders).then((b) => {
// 	console.log('success....');
// }).catch((e) => {
// 	console.log('e: ', e);
// });
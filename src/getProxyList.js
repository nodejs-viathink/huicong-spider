const { proxyListUrl } = require('../config');
const request = require('request-promise');
const logger = require('../lib/logger').getLogger('proxyList');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const { spawn } = require('child_process');
const Promise = require('bluebird');
const fs = require('fs');
const uaFactory = require('../lib/uaFactory');

const getProxyPage = async(page) => {
    try {
        const pageUrl = `${proxyListUrl}/${page}.html`;
        const ua = uaFactory.getUa();
	    const options = {
		    method: 'get',
		    url: pageUrl,
		    headers: {
			    'User-Agent': ua,
			    'Referer': 'http://www.ip181.com/',
			    'Host': 'www.ip181.com',
			    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
			},
			encoding: null,
		    resolveWithFullResponse: true
	    };
	    const resp = await request(options);

        if (resp.statusCode >= 200) {
            logger.info(`获取代理IP第 ${page} 页数据成功...`);
			return iconv.decode(resp.body, 'gbk');
        }
        logger.warn(`获取代理IP第 ${page} 页数据失败..`);
        return false;
    } catch (e) {
        logger.warn(`获取代理IP第 ${page} 页数据失败..`, e);
        return false;
    }
};


const getTdContent = (html) => {
	const $ = cheerio.load(html);
	const rows = [];
	$('tr').each(function (trIndex) {
		if (trIndex > 0) {
			const trObj = {};
			$(this).children('td').each(function (i) {
				switch (i) {
					case 0: 
						trObj.ip = $(this).text();
						break;
					case 1: 
						trObj.port = $(this).text();
						break;	
					case 2: 
						trObj.level = $(this).text();
						break;
					case 3: 
						trObj.type = $(this).text();
						break;
					case 4: 
						trObj.time = $(this).text();
						break;
					default:
				}
			});
			rows.push(trObj);
		}
	});
	logger.debug('proxy list: ', rows);
	return rows;
};

const checkProxy = async(ip, port) => {
	return Promise.fromCallback((cb) => {
		const child = spawn('telnet', [ip, port]);
		const timer = setTimeout(() => {
			child.kill('SIGHUP');
			logger.warn(`ip: ${ip}, port: ${port}, 超时...`);
			cb(null, false);
		}, 7000);
		child.stdout.on('data', (data) => {
			if (data.indexOf('Escape character') > -1) {
				logger.debug(`stdout: ${data}`);				
				child.stdin.write('^]');
				clearTimeout(timer);	
				cb(null, true);				
			}
		});
	
		child.on('close', (code) => {
			logger.debug(`ip: ${ip}, port: ${port}, 子进程退出码：${code}`);
		});
	});
};

const getOkProxyArr = async(page, rows) => {
	const okProxyArr = [];	
	try {
		for(let i = 0; i <= rows.length -1; i += 1) {
			logger.info(`正在检查第 ${page} 页，第 ${i} 个代理...`);
			const proxyObj = rows[i];
			const isOk = await checkProxy(proxyObj.ip, proxyObj.port);
			if (isOk) {
				okProxyArr.push(proxyObj);
			}
		}
		return okProxyArr;
	} catch (e) {
		logger.warn('getOkProxyArr error: ', e);
		return okProxyArr;
	}
};

const echoProxy = async() => {
	logger.info('开始获取可用代理IP....');
	const wantProxyNum = 20;
	const pageLimit = 700;
	let allProxyArr = [];
	for (let p = 1; p <= pageLimit; p += 1) {
		const html = await getProxyPage(p);
		if (html) {
			const rows = getTdContent(html);
			const pageOkProxyArr = await getOkProxyArr(p, rows);
			allProxyArr = allProxyArr.concat(pageOkProxyArr);
			if (allProxyArr.length >= wantProxyNum) {
				break;
			}
		}	
	}
	
	await Promise.fromCallback((cb) => {
		fs.writeFile(`${__dirname}/okProxy.json`, JSON.stringify(allProxyArr), cb);
	});
	logger.info(`获取代理IP完成, 总数: ${allProxyArr.length}`);
};

echoProxy().then(() => {
	process.exit(0);
}).catch(e => {
	console.log(e);
	process.exit(0);
});
//checkProxy('106.39.179.244', 90);

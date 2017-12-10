const fs = require('fs');
const cheerio = require('cheerio');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, './contactUs.html'));

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
// $('.mem').find('a').each(function(index, elem){
//     if ($(this).attr('title').trim()) {
//         console.log('index-', index, $(this).attr('title'), $(this).attr('href'));        
//     }
// });
$('.memyear').find('b').each(function(index, elem){
    if ($(this).text().trim()) {
        console.log('memyear-', index, $(this).text().trim()); 
        detail.memyear = $(this).text().trim();       
    }
});
$('.rnzz').find('a').each(function(index, elem){
    if ($(this).text().trim()) {
        console.log('businessRegist-', index, $(this).text().trim()); 
        detail.businessRegist = $(this).text().trim();       
    }
});

$('.con3Left').find('span').each(function(index, elem){
    if ($(this).text().trim()) {
        console.log('con3Left-span-', index, $(this).text().trim()); 
        detail.businessRegist = $(this).text().trim();       
    }
});

$('.con3Rig').each(function(index, elem){
    if ($(this).text().trim()) {
        if (index === 0) {
            $(this).find('span').each(function(sIndex, sElem) {
                if(sIndex === 0 ){
                    console.log('con3Rig-', index, $(this).text().trim());  
                    detail.businessRegist = $(this).text().trim();
                }                             
            });  
        } else {
            console.log('con3Rig-', index, $(this).text().trim()); 
            detail.businessRegist = $(this).text().trim(); 
        }
    }
});

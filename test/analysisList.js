const fs = require('fs');
const cheerio = require('cheerio');
const path = require('path');

// const html = fs.readFileSync(path.join(__dirname, '../src/page1.html'));
const html = fs.readFileSync(path.join(__dirname, '../src/page1-af3.html'));

const $ = cheerio.load(html);

// $('.cont-left').find('.col').each(function(index, elem){
//     console.log('index-', index)
// });

$('.til').find('a').each(function(index, elem){
    if ($(this).attr('title').trim()) {
        console.log('index-', index, $(this).attr('title'), $(this).attr('href'));        
    }
});
const {Builder,By} = require('selenium-webdriver');
const {chrome} = require('selenium-webdriver/chrome');
const { BitlyClient } = require('bitly');
const bitly = new BitlyClient('a95f9bdf51629b6343ecb5203153b47810e896df', {});


const theBaselineUrl = 'https://assets-dev.static-upwork.com/ui-packages/release/REL20190319/3/@upwork/global-components/docs/';

let driver = new Builder()
    .forBrowser('chrome')
    .build();

let parent = [];


let pagePrms = driver.get(theBaselineUrl);
pagePrms.then(async () => {
    let menuitems = await findAllMenuItems(driver);
    menuitems.map(async (item) => {await discoverItem(item, parent )});

});
setTimeout(()=>
{
    console.log('Something');
    parent.forEach(item => printResult(item))
    },60000)

function printResult(parentHere,subNode = false){
    console.log(((subNode)?'\t':'')+parentHere.value)
    if ( parentHere.hasOwnProperty('child') ){
        parentHere.child.forEach((sItem)=>{
            switch (sItem.type){
                case 'menuitem': {
                    printResult(sItem,true);
                    break;
                }
                case 'href':{
                        console.log('\t\t'+sItem.text+': '+ sItem.shortUrl)
                    break;
                }
            }
        })
    }
}

async function discoverItem(webItem,parent){
    let tt = await webItem.getAttribute('data-name')
        .then(menuItem)
        .catch(error => {
            return webItem.getAttribute('href')
                                        .then(hrefItem) })
        .then(
            async (value) => {
                return await handleItem(value,webItem,parent)}
        );
}
async function handleItem(value, webItem, parent){
    parent.push(value);
    switch( value.type ){
        case 'menuitem':
            return await hadnleMenuItem(webItem, parent);
        case 'href':
            return await hadnleHrefItem(webItem, parent);
    }
}

function hadnleHrefItem(webItem, parent){
    let i = parent.length - 1;
    return webItem.getAttribute('innerText')
        .then( (text) => {
            parent[i].text = text
       }
    ).then( () =>
        bitly.shorten(parent[i].value).then((sUrl) => {
            parent[i].shortUrl = sUrl.url
        })
    )

}

function hadnleMenuItem(webItem, parent) {
    let i = parent.length - 1;
    return new Promise((resolve, reject) => {
        //click and wait
        setTimeout(()=> {
            driver.executeScript("arguments[0].scrollIntoView()", webItem)
            .then(() => {
                setTimeout(()=>{
                    webItem.click().then(() => {
                        //after wait find menuitems, hrefs
                        // after finding
                        driver.findElement(By.js("return arguments[0].nextElementSibling", webItem))
                            .then(nextSubling => {
                                let allMenuItemsprms = findAllMenuItems(nextSubling);
                                let allHrefsprms = findHrefs(nextSubling);
                                Promise.all([allMenuItemsprms, allHrefsprms]).then((allMenuItems, allHrefs) => {
                                    parent[i].child = [];
                                    allMenuItems
                                        .filter((el) => {
                                            return el.length !== 0
                                        })
                                        .concat(allHrefs)
                                        .filter(Boolean)[0]
                                        .forEach((value) => {
                                            discoverItem(value, parent[i].child).then(resolve())
                                        });
                                })
                            })
                    })
                },1000)
                })
            }, i * 1000 )
    })
}

async function findHrefs(webEl){
    return await webEl.findElements(By.css('div a'))
}
async function findAllMenuItems(webEl) {
    return await webEl.findElements(By.css('[role=menuitem]'))
}
function menuItem(value)
{
    if ( value != null ) {
        return {
            type: 'menuitem',
            value: value
        }
    } else
    {
        return Promise.reject()
    }
}
function hrefItem(value){
    if ( value != null ) {
        return {
            type: 'href',
            value: value
        }
    }else
    {
        return Promise.reject()
    }
}

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
pagePrms.then(() => {
    findOpenNodes(driver)
        .then((openEls) => {
            openEls.reverse();
            openEls.forEach(async(el) => {await el.click()})
        }).
        then(async ()=>{
            let menuitems = await findAllMenuItems(driver);
            let menuitemsPrmss = menuitems.map((item) => {return discoverItem(item, parent )});
            Promise.all(menuitemsPrmss)
                .then((value) =>
                    console.log('in then'))
                .finally((value) =>{
                    console.log('in finally');
                    parent.forEach(item => printResult(item))
                })
        })
});
// setTimeout(()=>
// {
//     console.log('Something');
//     parent.forEach(item => printResult(item))
//     },60000)
//
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

function discoverItem(webItem,parent){
    return new Promise((resolve,reject)=> {
        webItem.getAttribute('data-name')
            .then(
                menuItem
            )
            .catch(error => {
                return webItem.getAttribute('href')
                    .then(hrefItem)
            })
            .then((value) => {
                    return handleItem(value, webItem, parent)
                        .then( (value)=>
                            resolve(value)
                        )
                }
            )
            .catch(error =>
            {
                console.log('Error from discoverItem: '+error);
                reject(0)
            });
    })
}
function handleItem(value, webItem, parent){
    parent.push(value);
    switch( value.type ){
        case 'menuitem': {
            let tt = hadnleMenuItem(webItem, parent);
            return tt
        }
        case 'href':
            return hadnleHrefItem(webItem, parent);
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
                                    let allMenuItemsPrmss = allMenuItems
                                        .filter((el) => {
                                            return el.length !== 0
                                        })
                                        .concat(allHrefs)
                                        .filter(Boolean)[0]
                                        .map((value) => {
                                            return discoverItem(value, parent[i].child)
                                        });
                                    Promise.all(allMenuItemsPrmss)
                                        .then(value => resolve(2))
                                        .catch((error)=>{console.log('Here 2')})
                                })
                                    .catch((error)=>{console.log('Here 1')})
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
async function findOpenNodes(webEl) {
    return await webEl.findElements(By.css('[style*="transform: rotateZ(90deg)"]'))
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

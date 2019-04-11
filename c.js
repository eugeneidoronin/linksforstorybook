const {Builder,By} = require('selenium-webdriver');
const {chrome} = require('selenium-webdriver/chrome');
const { BitlyClient } = require('bitly');
const url = require('url');


//REPLACE this link to the right link to the story book
const theBaselineUrl = 'https://assets-dev.static-upwork.com/ui-packages/release/REL20190319/3/@upwork/global-components/docs/';

let driver = new Builder()
    .forBrowser('chrome')
    .build();

let parent = [];

//getting the page
let pagePrms = driver.get(theBaselineUrl);
pagePrms.then(() => {
    findOpenNodes(driver)
        .then((openEls) => {
            // closing open nodes. otherwise it screw all the result
            openEls.reverse();
            openEls.forEach(el => el.click())
        }).
        then(()=>{
        // after closing the open nodes - let's wait for couple seconds to have DOM refreshed
        setTimeout(() => {
            //find all top level nodes
            findAllMenuItems(driver).then((menuitems) => {
                let menuitemsPrmss = menuitems.map((item) => {
                    // and process all top level nodes
                    return discoverItem(item, parent)
                });
                Promise.all(menuitemsPrmss)
                    .then((value) =>
                        // print the result
                        parent.forEach(item => printResult(item))
                    )
                    .finally((value) =>
                        console.log('Have a nice day!'));
            })
        }, 2 * 1000) // Wait for two seconds after closing open nodes
        })
});

function printResult(parentHere,subNode = false){
    // tab if it is subNode
    console.log(((subNode)?'\t':'')+parentHere.value)
    if ( parentHere.hasOwnProperty('child') ){
        parentHere.child.forEach((sItem)=>{
            switch (sItem.type){
                case 'menuitem': {
                    printResult(sItem,true);
                    break;
                }
                case 'href':{
                    // tab again for href node
                    console.log('\t\t'+sItem.text+': '+ sItem.shortUrl)
                    break;
                }
            }
        })
    }
}

function discoverItem(webItem,parent){
    return new Promise((resolve,reject)=> {
        // look for a folder node
        webItem.getAttribute('data-name')
            .then(
                // prcess it if found
                menuItem
            )
            .catch(error => {
                // if not then look for href node
                return webItem.getAttribute('href')
                    // and process it if found
                    .then(hrefItem)
            })
            .then((value) => {
                    // process the found item
                    return handleItem(value, webItem, parent)
                        .then( (value)=>
                            resolve(value)
                        )
                }
            )
            .catch(error =>
            {
                // what the heck !?
                console.log('Error from discoverItem: '+error);
                reject(0)
            });
    })
}
function handleItem(value, webItem, parent){
    parent.push(value);
    switch( value.type ){
        case 'menuitem': {
            return hadnleMenuItem(webItem, parent);
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
    ).then( () => {
            //shorten the URL. Remember of limits of free bitly account 60 per minutes/500 per hour (if I'm not mistaken)
            let myURL = new URL(parent[i].value);
            let iFrameUrl = myURL.origin + myURL.pathname + 'iframe.html' + myURL.search;
            bitly.shorten(iFrameUrl).then((sUrl) => {
                parent[i].shortUrl = sUrl.url
            })
        }
    )

}

function hadnleMenuItem(webItem, parent) {
    let i = parent.length - 1;
    return new Promise((resolve, reject) => {
        // we need to act on the node at different time. set timer for each = i * 1000
        setTimeout(()=> {
            driver.executeScript("arguments[0].scrollIntoView()", webItem)
            .then(() => {
                //wait for a second and click on the node
                setTimeout(()=>{
                    webItem.click().then(() => {
                        // find next(sibling) elements
                        driver.findElement(By.js("return arguments[0].nextElementSibling", webItem))
                            .then(nextSubling => {
                                //search for folder nodes or hrefs
                                let allMenuItemsprms = findAllMenuItems(nextSubling);
                                let allHrefsprms = findHrefs(nextSubling);
                                Promise.all([allMenuItemsprms, allHrefsprms]).then((allMenuItems, allHrefs) => {
                                    parent[i].child = [];
                                    // don't ask me what for all of the follwoing tweaks are needed.
                                    let allMenuItemsPrmss = allMenuItems
                                        .filter((el) => {
                                            return el.length !== 0
                                        })
                                        .concat(allHrefs)
                                        .filter(Boolean)[0]
                                        .map((value) => {
                                            // if you've breakthrough the arrays tweaks: process what's been found.
                                            return discoverItem(value, parent[i].child)
                                        });
                                    Promise.all(allMenuItemsPrmss)
                                        .then(value => resolve())
                                        .catch((error)=>{console.log('Something goes wrong 1:' + error); reject()})
                                })
                                    .catch((error)=>{console.log('Something goes wrong 2: '+error); reject()})
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

//this is my private key for bitly
// once you read it I will have to kill you :) (joking)
const bitly = new BitlyClient('a95f9bdf51629b6343ecb5203153b47810e896df', {});


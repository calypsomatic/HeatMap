export function GetElementsByAttribute(doc, tag, attr, attrValue) {
    //Get elements and convert to array
    var elems = Array.prototype.slice.call(doc.getElementsByTagName(tag), 0);

    //Matches an element by its attribute and attribute value
    var matcher = function(el) {
        return el.getAttribute(attr) == attrValue;
    };
    return elems.filter(matcher);
}

export function getElementsValueByXPath(xpath, parent)
{
    let results = [];
    let query = parent.evaluate(xpath, parent || document,
        null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (let i = 0, length = query.snapshotLength; i < length; ++i) {
        results.push(query.snapshotItem(i).nodeValue);
    }
    return results;
}

const async = require('async');
const amazon = require('amazon-product-api');
var amazon_client = amazon.createClient({
    awsId: process.env.AWS_ID,
    awsSecret: process.env.AWS_SECRET,
    awsTag: process.env.AWS_TAG
});

const set_nums = [
    "B000OTF4CQ", //cafe corner
    "B001345RSW", //market street
    "B009OJGLR4", //bwing ucs
]

//Given an Amazon ASIN number, returns the images, attributes, and offer summary
//if error, returns null and logs error
function getPrice(asin, callback) {
    amazon_client.itemLookup({
        itemId: asin,
        responseGroup: 'ItemAttributes, OfferSummary, Images'
    }, function (err, results, response) {
        if (err) {
            console.log('ERRRORORR:' + err.message);
            callback(err, null);
        } else {
            //console.log(JSON.stringify(results, null, 2));
            var ret_json = JSON.parse(JSON.stringify(results, null, 2));
            //console.log(ret_json);
            var newPrice = ret_json[0].OfferSummary[0].LowestNewPrice[0].FormattedPrice[0];
            var newPriceRaw = ret_json[0].OfferSummary[0].LowestNewPrice[0].Amount[0]; //integer price
            var originPrice = "1";
            var originPriceRaw = "1";
            try {
                originPrice = ret_json[0].ItemAttributes[0].ListPrice[0].FormattedPrice[0];
                originPriceRaw = ret_json[0].ItemAttributes[0].ListPrice[0].Amount[0];
            }
            catch (err) {
                //TODO: Eventually have a backup lookup here when Amazon doesn't have the data
                originPrice = "1";
            }
            parsed_results = {
                ASIN: ret_json[0].ASIN[0],
                URL: ret_json[0].DetailPageURL[0],
                NewPrice: newPrice,
                NewPriceRaw: newPriceRaw,
                Image: ret_json[0].MediumImage[0].URL[0],
                OriginPrice:originPrice,
                Profit: (parseInt(newPriceRaw) / 100.0) - (parseInt(originPriceRaw) / 100.0),
                ROI: Math.round((parseInt(newPriceRaw) / 100.0) / (parseInt(originPriceRaw) / 100.0))
            };
            //console.log(parsed_results);
            callback(null, parsed_results);
        }
    });
}

/**
 * GET /
 * Home page.
 */
exports.index = (req, res) => {
    async.parallel(
        //this magic makes an array of curried getPrice functions that all already have the callback
        set_nums.map((num) => { return (callback) => { getPrice(num, callback) }}),
    function (err, results) {
        //console.log(JSON.stringify(results, null, 2));
        console.log(parseFloat(results.newPrice));

        res.render('home', {
            title: 'Nick is Awesome',
            error: err,
            data: results
        });
    })
};

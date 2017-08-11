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
        responseGroup: 'OfferSummary, Images'
    }, function (err, results, response) {
        if (err) {
            console.log('ERRRORORR:' + err.message);
            callback(err, null);
        } else {
            console.log(JSON.stringify(results, null, 2));
            var ret_json = JSON.parse(JSON.stringify(results, null, 2));
            //console.log(ret_json);
            parsed_results = {
                ASIN: ret_json[0].ASIN[0],
                NewPrice: ret_json[0].OfferSummary[0].LowestNewPrice[0].FormattedPrice[0],
                Image: ret_json[0].SmallImage[0].URL[0]
            };
            //console.log(parsed_results);
            callback(null, parsed_results);
        }
    });
}

/*
var result = getPrice(set_nums[0]);
console.log(JSON.stringify(result, null, 2));

var investment_data = [];
for (set in set_nums) {
    var result = getPrice(set);
    if (result == null)
        continue;
    else {
        investment_data.push(result);
        console.log(JSON.stringify(result, null, 2));
    }
}
*/

/**
 * GET /
 * Home page.
 */
exports.index = (req, res) => {
    async.parallel([
        function (callback) {
            getPrice(set_nums[0], callback);
        }
    ], function (err, results) {
        console.log(JSON.stringify(results, null, 2));

        res.render('home', {
            title: 'Nick is Awesome',
            error: err,
            data: results
        });
    })
};

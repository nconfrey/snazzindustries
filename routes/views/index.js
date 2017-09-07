var keystone = require('keystone');
var async = require('async');
var Post = keystone.list('Post');
var PostCategory = keystone.list('PostCategory');
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
                OriginPrice: originPrice,
                Profit: (parseInt(newPriceRaw) / 100.0) - (parseInt(originPriceRaw) / 100.0),
                ROI: Math.round((parseInt(newPriceRaw) / 100.0) / (parseInt(originPriceRaw) / 100.0))
            };
            //console.log(parsed_results);
            callback(null, parsed_results);
        }
    });
}

exports = module.exports = function (req, res) {

    var view = new keystone.View(req, res);
    var locals = res.locals;

    // Init locals
    locals.section = 'blog';
    locals.filters = {
        category: req.params.category,
    };
    locals.posts = [];
    locals.categories = [];

    locals.moment = require('moment');

    // Load all categories
    view.on('init', function (next) {

        PostCategory.model.find().sort('name').exec(function (err, results) {

            if (err || !results.length) {
                return next(err);
            }

            locals.categories = results;

            // Load the counts for each category
            async.each(locals.categories, function (category, next) {

                keystone.list('Post').model.count().where('state', 'published').where('categories').in([category.id]).exec(function (err, count) {
                    category.postCount = count;
                    next(err);
                });

            }, function (err) {
                next(err);
            });

        });

    });

    // Load the current category filter
    view.on('init', function (next) {
        if (req.params.category) {
            PostCategory.model.findOne({ key: locals.filters.category }).exec(function (err, result) {
                locals.category = result;
                next(err);
            });
        } else {
            next();
        }
    });

    // Load the posts
    view.on('init', function (next) {

        var q = Post.paginate({
            page: req.query.page || 1,
            perPage: 10,
            maxPages: 10,
        })
			.where('state', 'published')
			.sort('-publishedDate')
			.populate('author categories');

        if (locals.category) {
            q.where('categories').in([locals.category]);
        }

        q.exec(function (err, results) {
            locals.posts = results;
            next(err);
        });

    });

    //Call amazon API for price info
    async.parallel(
        //this magic makes an array of curried getPrice functions that all already have the callback
        set_nums.map((num) => { return (callback) => { getPrice(num, callback) } }),
    function (err, results) {
        //console.log(JSON.stringify(results, null, 2));
        console.log(parseFloat(results.newPrice));
        view.render('index', {
            section: 'home',
            error: err,
            data: results
        });
    });

}

// Express docs: http://expressjs.com/en/api.html
const express = require("express");
// Passport docs: http://www.passportjs.org/docs/
const passport = require("passport");

// pull in Mongoose model for snowboards
const Snowboard = require("../models/snowboard");

// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require("../../lib/custom_errors");

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404;
// we'll use this function to send 401 when a user tries to modify a resource
// that's owned by someone else
const requireOwnership = customErrors.requireOwnership;

// this is middleware that will remove blank fields from `req.body`, e.g.
// { example: { title: '', text: 'foo' } } -> { example: { text: 'foo' } }
const removeBlanks = require("../../lib/remove_blank_fields");
// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `req.user`
const requireToken = passport.authenticate("bearer", { session: false });

// instantiate a router (mini app that only handles routes)
const router = express.Router();

// INDEX
// GET /snowboards
router.get("/snowboards", user, (req, res, next) => {
  //we want anyone to see snowboards so no requireToken
  //if we wanted to protect resources we could add that back in between
  //route and callback as second argument
  Snowboard.find()
    .then((snowboards) => {
      // `snowboards` will be an array of Mongoose documents
      // we want to convert each one to a POJO, so we use `.map` to
      // apply `.toObject` to each one
      return snowboards.map((snowboard) => snowboard.toObject());
    })
    // respond with status 200 and JSON of the snowboards
    .then((snowboards) => res.status(200).json({ snowboards: snowboards }))
    // if an error occurs, pass it to the handler
    .catch(next);
});

// SHOW
// GET /snowboards/5a7db6c74d55bc51bdf39793
router.get("/snowboards/:id", (req, res, next) => {
  // req.params.id will be set based on the `:id` in the route
  Snowboard.findById(req.params.id)
 
    .then(handle404)
    // if `findById` is succesful, respond with 200 and "snowboard" JSON
    .then((snowboard) =>
      res.status(200).json({ snowboard: snowboard.toObject() })
    )
    // if an error occurs, pass it to the handler
    .catch(next);
});

// CREATE
// POST /snowboards
router.post("/snowboards", requireToken, (req, res, next) => {
	console.log('hit')
  // set owner of new snowboard to be current user
  req.body.snowboard.owner = req.user.id;
  Snowboard.create(req.body.snowboard)
    // respond to succesful `create` with status 201 and JSON of new "snowboard"
    .then((snowboard) => {
      res.status(201).json({ snowboard: snowboard.toObject() });
    })
    .catch(next);
});

// UPDATE
// PATCH /snowboards/5a7db6c74d55bc51bdf39793
router.patch(
  "/snowboards/:id",
  requireToken,
  removeBlanks,
  (req, res, next) => {
    // if the client attempts to change the `owner` property by including a new
    // owner, prevent that by deleting that key/value pair
    delete req.body.snowboard.owner;

    Snowboard.findById(req.params.id)
      .then(handle404)
      .then((snowboard) => {
        // pass the `req` object and the Mongoose record to `requireOwnership`
        // it will throw an error if the current user isn't the owner
        requireOwnership(req, snowboard);

        // pass the result of Mongoose's `.update` to the next `.then`
        return snowboard.updateOne(req.body.snowboard);
      })
      // if that succeeded, return 204 and no JSON
      .then(() => res.sendStatus(204))
      // if an error occurs, pass it to the handler
      .catch(next);
  }
);

// DESTROY
// DELETE /snowboards/5a7db6c74d55bc51bdf39793
router.delete("/snowboards/:id", requireToken, (req, res, next) => {
  Snowboard.findById(req.params.id)
    .then(handle404)
    .then((snowboard) => {
      // throw an error if current user doesn't own `snowboard`
      requireOwnership(req, snowboard);
      // delete the snowboard ONLY IF the above didn't throw
      snowboard.deleteOne();
    })
    // send back 204 and no content if the deletion succeeded
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next);
});

module.exports = router;

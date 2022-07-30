const mongoose = require("mongoose");


const { Schema, model } = mongoose;

const snerberdSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  length: {
    type: Number,
    required: true,
  },
  channelBindings: {
    type: Boolean,
    required: true,
  },
  owner: {
      //this works without mongoose on front because of destructuring up top
    type: Schema.Types.ObjectId,
    ref: "User",
  },
}, {
    timestamps: true
}
);


module.exports = model("Snerberd", snerberdSchema);

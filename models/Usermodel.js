const mongoose = require('mongoose');

var Schema = mongoose.Schema;

var userSchema = new Schema({
  image:  String,
  name:  String,
  email: {
    type: String,
    unique: true
  },
  contact: {
    type: Number,
    required: true
  },
  password: String,
});

//var User = ;

module.exports = mongoose.model('User', userSchema);

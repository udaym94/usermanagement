var mongoose = require('mongoose');
var bcrypt = require('bcrypt');

var AdminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String
  },
  email: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  username: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  contactno: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  passwordConf: {
    type: String,
    required: true,
  }
});

//hashing a password before saving it to the database
AdminSchema.pre('save', function (next) {
  var admin = this;
  bcrypt.hash(admin.password, 10, function (err, hash){
    if (err) {
      return next(err);
    }
    admin.password = hash;
    next();
  })
});

var Admin = mongoose.model('Admin', AdminSchema);
module.exports = Admin;

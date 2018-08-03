const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const cors = require('cors');

const mongoose = require('mongoose');

// db Schema
mongoose.connect(process.env.MONGO_URI);
const Schema = mongoose.Schema;
// userSchema
const userSchema = new Schema({
  username: {type: String, required: true}
});
const User = mongoose.model('User', userSchema);
// exercise Schema
const exerciseSchema = new Schema({
  userId: {type: String, ref:'User', required: true},
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: {type: Date, default: Date.now},
  username: String
});
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.use(cors());

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// POST /api/exercise/new-user
app.post("/api/exercise/new-user", function(req, res){
  User.findOne({username: req.body.username}, function(err, data){
    if (err) return;
    if (data) {
      res.send("username already taken");
    }
    else {
      const newUser = new User({username: req.body.username});
      newUser.save();
      res.json({username: req.body.username, _id: newUser._id});
    }
  })
});

// Get all users data
app.get('/api/exercise/users', function(req, res){
  User.find({}, function(err, data){
    if (err) return;
    res.json(data);
  });
});

//POST /api/exercise/add
app.post("/api/exercise/add", function(req, res, next){
  User.findById(req.body.userId, function(err, data) {
    if (err) return next(err);
    if (!data) {
      return next({status: 400, message: 'unknown userId'});
    }
    else {
      const newExercise = new Exercise(req.body);
      if (!req.body.date) {
        newExercise.date = new Date();
      }
      newExercise.save(function(err, data){
        if (err) return next(err);
        res.json({username: newExercise.username,
                userId: newExercise.userId,
                description: newExercise.description,
                duration: newExercise.duration,
                date: newExercise.date.toString()});
      }); 
    }
  });
});

//GET users's exercise log
app.get("/api/exercise/log", function(req, res, next){
  let date_to = req.query.to ? new Date(req.query.to) : new Date(2999,12,31);
  let date_from = req.query.from ? new Date(req.query.from) : 0;
  let limit = req.query.limit;
  Exercise.find({userId: req.query.userId, date: {$lt: date_to, $gt: date_from}}, function(err, data) {
    if (err) return next(err);
    let log = data.map(function(obj){
      return {
        description: obj.description,
        duration: obj.duration,
        date: new Date(obj.date).toString().slice(0, 15)
      }
    });
    if (limit) { 
      res.json({username: data[0].username, _id: data[0].userId, count:limit, log: log.slice(0,limit)});
    } else {
    res.json({username: data[0].username, _id: data[0].userId, count:log.length, log: log});
    }
  });
});


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});

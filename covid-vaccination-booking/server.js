const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const { check, validationResult } = require('express-validator');

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'secret-key',
  resave: true,
  saveUninitialized: true
}));

mongoose.set('strictQuery', false);

mongoose.connect('mongodb+srv://<username>:<password>@cluster0.jikeuia.mongodb.net/?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('Connected to MongoDB Atlas');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB Atlas:', error);
  });
  

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const User = mongoose.model('User', userSchema);

const adminSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: String,
});

const Admin = mongoose.model('Admin', adminSchema);

const centreSchema = new mongoose.Schema({
  name: String,
  workingHours: String,
});

const Centre = mongoose.model('Centre', centreSchema);

const bookingSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  centreId: mongoose.Schema.Types.ObjectId,
  date: String,
});

const Booking = mongoose.model('Booking', bookingSchema);

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/signup', [
  check('username', 'Username is required').notEmpty(),
  check('password', 'Password must be at least 6 characters').isLength({ min: 6 })
], async (req, res) => {
  const { username, password } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    return res.render('signup', { errors: errorMessages });
  }

  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.render('signup', { error: 'Username already exists' });
  }

  const newUser = new User({
    username,
    password: await bcrypt.hash(password, 10),
  });
  await newUser.save();

  res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', [
    check('username', 'Username is required').notEmpty(),
    check('password', 'Password is required').notEmpty()
  ], async (req, res) => {
    const { username, password } = req.body;
  
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(error => error.msg);
      return res.render('login', { errors: errorMessages });
    }
  
    const user = await User.findOne({ username });
    if (!user) {
      return res.render('login', { error: 'Invalid username or password' });
    }
  
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.render('login', { error: 'Invalid password' });
    }
  
    req.session.userId = user._id;
  
    res.redirect('/dashboard');
  });
  
app.get('/dashboard', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  const user = await User.findById(req.session.userId);
  if (!user) {
    return res.redirect('/login');
  }

  let centres = [];
  const { search } = req.query;

  if (search && search.trim() !== '') {
    centres = await Centre.find({ name: { $regex: search, $options: 'i' } });
  } else {
    centres = await Centre.find();
  }

  res.render('user-dashboard', { username: user.username, centres, search });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.get('/vaccination-centers', async (req, res) => {
  const { search } = req.query;
  let centres = [];

  if (search) {
    centres = await Centre.find({ name: { $regex: search, $options: 'i' } });
  } else {
    centres = await Centre.find();
  }

  res.render('vaccination-centers', { centres, search });
});

app.get('/vaccine-booking', async (req, res) => {
  const { centreId } = req.query;

  if (!req.session.userId) {
    return res.redirect('/login');
  }

  const user = await User.findById(req.session.userId);
  if (!user) {
    return res.redirect('/login');
  }

  const centre = await Centre.findById(centreId);
  if (!centre) {
    return res.redirect('/vaccination-centers');
  }

  const bookingCount = await Booking.countDocuments({ centreId, date: new Date().toISOString().slice(0, 10) });
  if (bookingCount >= 10) {
    return res.render('user-dashboard', { username: user.username, error: 'No available slots for the selected center' });
  }

  res.render('vaccine-booking', { centre });
});

app.post('/vaccine-booking', async (req, res) => {
  const { centreId } = req.body;

  if (!req.session.userId) {
    return res.redirect('/login');
  }

  const user = await User.findById(req.session.userId);
  if (!user) {
    return res.redirect('/login');
  }

  const centre = await Centre.findById(centreId);
  if (!centre) {
    return res.redirect('/vaccination-centers');
  }

  const bookingCount = await Booking.countDocuments({ centreId, date: new Date().toISOString().slice(0, 10) });
  if (bookingCount >= 10) {
    return res.render('user-dashboard', { username: user.username, error: 'No available slots for the selected center' });
  }

  const booking = new Booking({
    userId: user._id,
    centreId,
    date: new Date().toISOString().slice(0, 10),
  });

  await booking.save();

  res.redirect('/dashboard');
});

// Admin routes

app.get('/admin/login', (req, res) => {
  res.render('admin-login');
});

app.post('/admin/login', [
  check('username', 'Username is required').notEmpty(),
  check('password', 'Password is required').notEmpty()
], async (req, res) => {
  const { username, password } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    return res.render('admin-login', { errors: errorMessages });
  }

  const admin = await Admin.findOne({ username });
  if (!admin) {
    return res.render('admin-login', { error: 'Invalid username or password' });
  }

  const isPasswordValid = await bcrypt.compare(password, admin.password);
  if (!isPasswordValid) {
    return res.render('admin-login', { error: 'Invalid password' });
  }

  req.session.adminId = admin._id;

  res.redirect('/admin/dashboard');
});

app.get('/admin/dashboard', async (req, res) => {
  if (!req.session.adminId) {
    return res.redirect('/admin/login');
  }

  const admin = await Admin.findById(req.session.adminId);
  if (!admin) {
    return res.redirect('/admin/login');
  }

  const centres = await Centre.find();

  res.render('admin-dashboard', { username: admin.username, centres });
});

app.get('/admin/vaccination-centres', async (req, res) => {
  if (!req.session.adminId) {
    return res.redirect('/admin/login');
  }

  const admin = await Admin.findById(req.session.adminId);
  if (!admin) {
    return res.redirect('/admin/login');
  }

  const centres = await Centre.find();

  res.render('admin-vaccination-centres', { centres });
});

app.post('/admin/vaccination-centres', async (req, res) => {
  if (!req.session.adminId) {
    return res.redirect('/admin/login');
  }

  const admin = await Admin.findById(req.session.adminId);
  if (!admin) {
    return res.redirect('/admin/login');
  }

  const { name, workingHours } = req.body;

  const centre = new Centre({
    name,
    workingHours,
  });

  await centre.save();

  res.redirect('/admin/vaccination-centres');
});

app.post('/admin/vaccination-centres/delete', async (req, res) => {
  if (!req.session.adminId) {
    return res.redirect('/admin/login');
  }

  const admin = await Admin.findById(req.session.adminId);
  if (!admin) {
    return res.redirect('/admin/login');
  }

  const { centreId } = req.body;

  await Centre.findByIdAndDelete(centreId);

  res.redirect('/admin/vaccination-centres');
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});

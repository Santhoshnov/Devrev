const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const session = require('express-session');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

app.use(session({
  secret: 'your-secret-key',
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
  email: {
    type: String,
    unique: true,
    required: true,
  },
  phone: {
    type: String,
    required: true
  },
  password: String,
});

const adminSchema = new mongoose.Schema({
  username: String,
  password: String,
});



const centreSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  workingHours: {
    type: String,
    required: true,
  },

  slotsAvailable: {
    type: Number,
    default: 10,
  },
});

const User = mongoose.model('User', userSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Centre = mongoose.model('Centre', centreSchema);

app.get('/centers', async (req, res) => {
  try {
    const { search } = req.query;
    const query = {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
      ],
    };
    const centers = await Centre.find(query);

    const formattedCenters = centers.map((center) => {
      const { name, address, workingHours, slotsAvailable } = center;

      return {
        name,
        address,
        workingHours,
        slotsAvailable,
      };
    });

    res.json({ centers: formattedCenters });
  } catch (error) {
    console.error('Error searching for vaccination centers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



app.post('/slots', async (req, res) => {
  try {
    const { name, age, centerName, centerAddress } = req.body;

    const centre = await Centre.findOne({ name: centerName, address: centerAddress });

    if (!centre) {
      return res.status(404).json({ error: 'Vaccination center not found' });
    }

    if (centre.slotsAvailable === 0) {
      return res.status(400).json({ error: 'No slots available' });
    }

    const maxSlotsPerDay = 10;
    const currentDate = new Date().setHours(0, 0, 0, 0);
    const slotsBookedToday = await Centre.countDocuments({
      name: centerName,
      address: centerAddress,
      bookedDate: { $gte: currentDate },
    });

    if (slotsBookedToday >= maxSlotsPerDay) {
      return res.status(400).json({ error: 'Maximum slots reached for today' });
    }

    centre.slotsAvailable--;
    centre.bookedDate = new Date();
    await centre.save();

    console.log('Vaccination slot booked successfully');
    res.json({ message: 'Vaccination slot booked successfully' });
  } catch (error) {
    console.error('Error booking vaccination slot:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});














const setupAdmin = async () => {
  try {
    const admin = await Admin.findOne({ username: 'admin' });
    if (!admin) {
      const hashedPassword = await bcrypt.hash('shiro@sandy', 10);
      await Admin.create({ username: 'admin', password: hashedPassword });
      console.log('Admin account created successfully.');
    } else {
      console.log('Admin account already exists.');
    }
  } catch (error) {
    console.error('Error during admin setup:', error);
  }
};

setupAdmin();





app.post('/admin-login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.redirect('/admin-login?error=InvalidCredentials');
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.redirect('/admin-login?error=InvalidCredentials');
    }

    req.session.isAdmin = true;
    return res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Error during admin login:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const isAdmin = (req, res, next) => {
  if (req.session.isAdmin) {
    next();
  } else {
    res.redirect('/admin-login');
  }
};

app.post('/admin/addCentre', isAdmin, async (req, res) => {
  const { name, address, workingHours,} = req.body;
  try {
    const newCentre = new Centre({ name, address, workingHours,slotsAvailable: 10 });
    await newCentre.save();
    console.log('Vaccination centre added successfully!');
    res.send('Vaccination centre added successfully!');
  } catch (error) {
    console.error('Error adding vaccination centre:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.post('/admin/removeCentre', isAdmin, async (req, res) => {
  const { name, address } = req.body;
  console.log('Name:', name);
  console.log('Address:', address);

  try {
    const deletedResult = await Centre.deleteOne({ name, address });

    if (deletedResult.deletedCount === 1) {
      console.log('Vaccination centre removed successfully!');
      return res.json({ message: 'Vaccination centre removed successfully!' });
    } else {
      console.error('Error removing vaccination centre');
      return res.status(500).json({ error: 'Failed to remove vaccination centre. Please try again later.' });
    }
  } catch (error) {
    console.error('Error removing vaccination centre:', error);
    return res.status(500).json({ error: 'Failed to remove vaccination centre. Please try again later.' });
  }
});


















app.get('/admin/dosageDetails', isAdmin, async (req, res) => {
  try {
    const dosageDetails = await Centre.aggregate([
      {
        $group: {
          _id: {
            name: '$name',
            address: '$address',
            workingHours: '$workingHours',
          },
          slotsAvailable: { $sum: '$slotsAvailable' },
        },
      },
      {
        $project: {
          _id: 0,
          name: '$_id.name',
          address: '$_id.address',
          workingHours: '$_id.workingHours',
          slotsAvailable: 1,
        },
      },
    ]);

    console.log('Fetched dosage details successfully');
    res.json({ dosageDetails });
  } catch (error) {
    console.error('Error retrieving dosage details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});













app.get('/admin/dashboard', isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'admin_dashboard.html'));
});

app.get('/admin/logout', (req, res) => {
  req.session.isAdmin = false;
  req.session.adminId = null; 
  res.redirect('/admin-login');
});


app.get('/admin-login', (req, res) => {
  if (req.session.isAdmin) {
    return res.redirect('/admin/dashboard');
  }
  res.sendFile(path.join(__dirname, '..', 'frontend', 'admin_login.html'));
});







app.post('/api/signup', [
  check('email', 'Valid email is required').isEmail(),
  check('password', 'Password must be at least 8 characters and contain alphabets, special symbols, and numbers').matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/),
  check('phone', 'Phone number must be 10 digits').isLength({ min: 10, max: 10 })
], async (req, res) => {
  const { email, password, phone } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const newUser = new User({
      email,
      password: await bcrypt.hash(password, 10),
      phone
    });
    await newUser.save();

    req.session.userId = newUser._id;

    return res.json({ message: 'Signup successful' });
  } catch (error) {
    console.error('Error during signup:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/login', [
  check('email', 'Valid email is required').isEmail(),
  check('password', 'Password is required').notEmpty()
], async (req, res) => {
  const { email, password } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401)    .json({ error: 'Invalid password' });
    }

    req.session.userId = user._id;

    return res.json({ message: 'Login successful' });
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/dashboard', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  res.sendFile(path.join(__dirname, '..', 'frontend', 'dashboard.html'));
});



app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.get('/admin/script.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, '..', 'frontend', 'script.js'));
});


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'login.html'));
});


app.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, '..', 'frontend', 'login.html'));
});

app.get('/signup', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, '..', 'frontend', 'signup.html'));
});


app.listen(3000, () => {
  console.log('Server started on port 3000');
});


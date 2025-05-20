const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    required: true,
    enum: ['clinic', 'hospital', 'opd_admin', 'master']
  }
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

async function createAdmin() {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  const username = 'admin';
  const password = 'admin';
  const role = 'opd_admin';
  const existing = await User.findOne({ username });
  if (existing) {
    console.log('Admin user already exists.');
    process.exit(0);
  }
  await User.create({ username, password, role });
  console.log('Admin user created.');
  process.exit(0);
}

createAdmin().catch(e => { console.error(e); process.exit(1); });

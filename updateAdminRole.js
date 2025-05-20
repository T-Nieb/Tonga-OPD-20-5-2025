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

async function updateAdminRole() {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  const username = 'admin';
  const user = await User.findOne({ username });
  if (!user) {
    console.log('Admin user not found.');
    process.exit(1);
  }
  user.role = 'master';
  await user.save();
  console.log('Admin user role updated to master.');
  process.exit(0);
}

updateAdminRole().catch(e => { console.error(e); process.exit(1); });

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
const User = (await import('./models/User.js')).default;
const Table = (await import('./models/Table.js')).default;
const Vendor = (await import('./models/Vendor.js')).default;

const users = await User.find({}).select('email role vendorId');
console.log('USERS:');
users.forEach(u => console.log(`  ${u.email} | ${u.role} | vendorId: ${u.vendorId}`));

const vendors = await Vendor.find({}).select('restaurantName ownerId');
console.log('VENDORS:');
vendors.forEach(v => console.log(`  ${v.restaurantName} | _id: ${v._id} | ownerId: ${v.ownerId}`));

const tables = await Table.find({}).select('tableNumber vendorId qrUrl');
console.log('TABLES:');
tables.forEach(t => console.log(`  ${t.tableNumber} | vendorId: ${t.vendorId} | hasQr: ${!!t.qrCode} | qrUrl: ${t.qrUrl || 'NONE'}`));

await mongoose.disconnect();
process.exit(0);

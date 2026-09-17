const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/User');
const Product = require('../models/Product');

const seedData = async () => {
  try {
    const mongoUri =
      process.env.MONGODB_URI ||
      'mongodb://teahouse:teahouse@ac-mkzvkfe-shard-00-00.iti6uao.mongodb.net:27017,ac-mkzvkfe-shard-00-01.iti6uao.mongodb.net:27017,ac-mkzvkfe-shard-00-02.iti6uao.mongodb.net:27017/teahouse_db?ssl=true&replicaSet=atlas-12dq5k-shard-0&authSource=admin&retryWrites=true&w=majority';

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing users with admin/demo email
    await User.deleteMany({ email: { $in: ['shimul181163@gmail.com', 'admin@teahouse.com', 'user@teahouse.com'] } });

    // Seed Admin
    const adminPasswordHash = await bcrypt.hash('12345678', 10);
    const adminUser = await User.create({
      name: 'Shimul Islam (Admin)',
      email: 'shimul181163@gmail.com',
      password: adminPasswordHash,
      role: 'admin',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    });
    console.log('Seeded Admin:', adminUser.email);

    // Seed Demo User
    const userPasswordHash = await bcrypt.hash('user123456', 10);
    const demoUser = await User.create({
      name: 'Shimul Islam',
      email: 'user@teahouse.com',
      password: userPasswordHash,
      role: 'user',
      image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    });
    console.log('Seeded Demo User:', demoUser.email);

    // Seed Products
    const products = [
      {
        name: 'Milk Tea',
        description: 'Creamer could be replaced by fresh milk. Handcrafted with traditional black tea and creamy goodness.',
        price: 220,
        image: '/assests/tea-1.png',
        category: 'Milk Tea',
        rating: 4.9,
        stock: 50,
        featured: true,
      },
      {
        name: 'Black Tea',
        description: 'Creamer could be replaced by fresh milk. High-elevation Darjeeling estate leaves with rich malt undertones.',
        price: 250,
        image: '/assests/tea-2.png',
        category: 'Black Tea',
        rating: 4.8,
        stock: 45,
        featured: true,
      },
      {
        name: 'Lemon Tea',
        description: 'Creamer could be replaced by fresh milk. Tangy zesty real lemon infused with vibrant sun-dried tea leaves.',
        price: 240,
        image: '/assests/tea-3.png',
        category: 'Lemon Tea',
        rating: 4.7,
        stock: 60,
        featured: true,
      },
      {
        name: 'Green Tea',
        description: 'Creamer could be replaced by fresh milk. First flush organic antioxidant-rich green tea leaves.',
        price: 280,
        image: '/assests/tea-4.png',
        category: 'Green Tea',
        rating: 5.0,
        stock: 35,
        featured: true,
      },
      {
        name: 'Royal Masala Chai',
        description: 'Slow-simmered Assam tea brewed with crushed cardamom, cinnamon, cloves, and spicy ginger roots.',
        price: 260,
        image: '/assests/tea-1.png',
        category: 'Masala Tea',
        rating: 4.9,
        stock: 40,
        featured: true,
      },
      {
        name: 'Ayurvedic Herbal Bliss',
        description: 'Naturally caffeine-free botanical infusion with tulsi, chamomile flowers, and soothing lemongrass.',
        price: 310,
        image: '/assests/tea-3.png',
        category: 'Herbal Tea',
        rating: 4.8,
        stock: 25,
        featured: false,
      },
      {
        name: 'Silver Needle White Tea',
        description: 'Prized single-bud spring harvest with subtle sweet honeysuckle and melon notes.',
        price: 520,
        image: '/assests/tea-2.png',
        category: 'Premium Tea',
        rating: 5.0,
        stock: 20,
        featured: true,
      },
      {
        name: 'Earl Grey Supreme',
        description: 'Ceylon black tea flavored with 100% natural cold-pressed Italian bergamot oil.',
        price: 330,
        image: '/assests/tea-4.png',
        category: 'Black Tea',
        rating: 4.8,
        stock: 30,
        featured: false,
      },
      {
        name: 'Jasmine Blossom Green Tea',
        description: 'Tender green tea gently scented overnight over five consecutive rounds with night-blooming jasmine.',
        price: 350,
        image: '/assests/tea-1.png',
        category: 'Green Tea',
        rating: 4.9,
        stock: 28,
        featured: false,
      },
      {
        name: 'Ginger Honey Lemon Tea',
        description: 'Soothing immunity-boosting brew with raw forest honey and cold-pressed spicy ginger juice.',
        price: 270,
        image: '/assests/tea-3.png',
        category: 'Lemon Tea',
        rating: 4.9,
        stock: 40,
        featured: false,
      },
    ];

    await Product.insertMany(products);
    console.log(`Successfully seeded ${products.length} products.`);

    process.exit(0);
  } catch (error) {
    console.error('Seeding Error:', error);
    process.exit(1);
  }
};

seedData();

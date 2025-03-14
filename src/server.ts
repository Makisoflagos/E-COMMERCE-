import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import userRoutes from './routes/userRoutes';


dotenv.config();


const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:5000/ecommerce';

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Routes placeholder (to be implemented later)
// app.use('/api/auth', require('./routes/auth'));
app.use('/users', userRoutes); // Use your user routes;
// app.use('/api/products', require('./routes/products'));
// app.use('/api/categories', require('./routes/categories'));
// app.use('/api/stores', require('./routes/stores'));
// app.use('/api/cart', require('./routes/cart'));
// app.use('/api/orders', require('./routes/orders'));


// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;

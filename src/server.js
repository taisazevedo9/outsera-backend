require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./config/swagger');
const awardsRoutes = require('./routes/awards');
const { errorHandler } = require('./middlewares/errorHandler');
const { importBuffer } = require('./utils/csvBuffer');
const movieRepository = require('./repositories/movieRepository');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the RESTful API!',
    documentation: `http://localhost:${PORT}/docs`
  });
});

app.use('/api/awards', awardsRoutes);

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  const csvPath = process.env.CSV_PATH || path.resolve(__dirname, '../uploads/movielist.csv');
  const buffer = fs.readFileSync(csvPath);

  movieRepository.clear();
  console.log('Memory cleared before import');

  importBuffer(buffer, true, true)
    .then((count) => {
      console.log(`Movie import process completed: ${count} movies imported from buffer`);
    })
    .catch((error) => {
      console.error('Error during movie import:', error);
    });
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Swagger documentation available at: http://localhost:${PORT}/docs`);
  });
}

module.exports = app;

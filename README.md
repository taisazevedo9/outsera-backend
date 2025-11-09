# Golden Raspberry Awards - RESTful API

RESTful API for reading the list of nominees and winners of the **Worst Picture** category from the Golden Raspberry Awards.

## About the Project

This API was developed to meet the following requirements:

- Read CSV file of movies and insert data into a database on application startup
- Get the producer with the longest interval between two consecutive awards
- Get the producer who obtained two awards the fastest
- Integration tests ensuring compliance with provided data
- **SQLite embedded database** (in-memory) - no external installation required

##  Technologies

- **Node.js** - JavaScript Runtime
- **Express 4.18.2** - Web Framework
- **SQLite3 5.1.6** - Embedded Database
- **Swagger UI Express 5.0.0** - Interactive API Documentation
- **Jest 29.7.0** - Testing Framework
- **Supertest 6.3.3** - HTTP Integration Testing
- **csv-parser 3.2.0** - CSV File Reading

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd outsera-backend

# Install dependencies
npm install
```

##  How to Run the Project

### Production Mode

```bash
npm start
```

### Development Mode (with nodemon - auto-reload)

```bash
npm run dev
```

The server will start on port **3000** by default.

**Expected output:**

```
Server running on port 3000
Swagger documentation available at: http://localhost:3000/docs
Connected to SQLite database
✅ X movie(s) successfully imported from CSV
Movie import process completed
```

## Run Integration Tests

```bash
# Run all tests with coverage
npm test

**Expected result:**
- ✅ **43 integration tests passing**
- 3 test suites (awards, csvImporter, errorHandler)
- Code coverage: ~78%

## API Documentation (Swagger)

After starting the server, access the interactive documentation at:

```

http://localhost:3000/docs

````

**Criteria:**
- Considers only **winning** movies (winner = "yes")
- Calculates intervals between **consecutive** awards for the same producer
- Supports multiple producers (separated by comma or "and")
- Returns only producers with **2 or more wins**

## CSV Structure

The CSV file must have the following structure with semicolon (`;`) as separator:

**Fields:**
- `year` - Movie year (integer)
- `title` - Movie title (required)
- `studios` - Production studios
- `producers` - Producers (separated by comma or "and")
- `winner` - "yes" for winners, empty for nominees

## Database

- **DBMS:** SQLite3 (embedded)
- **File:** `database.sqlite` (automatically created in root)
- **Type:** In-memory during tests, persisted to file in production
- **Import:** Automatic on application startup (from file `uploads/movielist.csv`)

**Table: movies**
```sql
CREATE TABLE movies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER,
  title TEXT NOT NULL,
  studios TEXT,
  producers TEXT,
  winner TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
````

### ✅ Resources

- Distinct URIs for each resource: `/api/awards`
- Unique resource identification: `/api/awards/producers-intervals`

### ✅ Appropriate HTTP Verbs

- **GET** - Data reading (idempotent, safe)

### ✅ Correct HTTP Status Codes

- **200 OK** - Success in read operations
- **500 Internal Server Error** - Internal server error



##  Environment Variables

Create a `.env` file in the project root (use `.env.example` as reference):

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_PATH=./database.sqlite

# CSV Import Configuration
CSV_PATH=./uploads/movielist.csv

# CORS Configuration
CORS_ORIGIN=*
```

## 📊 Usage Examples

### Get producer award intervals

```bash
curl http://localhost:3000/api/awards/producers-intervals
```

### Access API documentation

```bash
# Open in browser
http://localhost:3000/docs
```

### Health check

```bash
curl http://localhost:3000/
```

**Response:**

```json
{
  "message": "Welcome to the RESTful API!",
  "documentation": "http://localhost:3000/docs"
}
```

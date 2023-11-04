const {Client} = require('pg');
const express = require('express');
const cors = require('cors');
const app = express();
const bcrypt = require('bcryptjs');
const anios = require('axios');
require("dotenv").config();
const axios = require('axios');

app.use(express.json());

app.use(cors()); 

const port = 3030; 

app.get('/', (req, res) => {
    res.send('Hello World!')
})

//Predict future 
//Good with insom
app.get('/getFuture', async (req, res) => {
  try {
    const countryName = req.query.countryName;

    const apiUrl = `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/rates_of_exchange?fields=exchange_rate,record_date&filter=country_currency_desc:in:(${countryName})&sort=-record_date`

    const response = await axios.get(apiUrl);
    


    // Send the JSON data to the frontend
    res.json(response.data);
  } catch (error) {
    // Handle errors and send an error response if necessary
    console.error(error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

//works
app.get('/gettingHistory', async (req, res) => {
  try {
    const client = new Client({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      port: process.env.DATABASE_PORT,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME
    });

    await client.connect();
    const id = req.query.id; // Assuming you pass email as a query parameter

    const insertQuery = `SELECT "usAmount", "fAmount", "currencyName", "when"
	                  FROM public."userHistory"
                    WHERE "id" = $1`;
    const values = [id];


   const result = await client.query(insertQuery, values);
 // Use parameterized query to avoid SQL injection
    
    const data = result.rows;

    console.log(result.rows);

    client.end();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//pretty sure this is pointless  check later 
app.get('/placingHistory', async (req, res) => {
  const client = new Client({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    port: process.env.DATABASE_PORT,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME
  });

  try {
    await client.connect();

    const insertQuery = `
      INSERT INTO public."userHistory" ("usAmount", "fAmount", "currencyName", "when",id)
      VALUES ($1, $2, $3, $4, $5)
    `;

    //for (const entry of data) {
      const {usAmount, fAmount, currencyName, date, id } = req.query;
      const values = [email, usAmount, fAmount, currencyName, date];
      await client.query(insertQuery, values);
    //}

    // Send a success response
    res.status(200).json({ message: 'Data successfully inserted.' });
  } catch (error) {
    console.error(error);
    // Send an error response
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    await client.end();
  }
});

//This gets currenies and send it back to front end 
//works
app.get('/exchangeRates', async (req, res) => {
  try {
    const client = new Client({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      port: process.env.DATABASE_PORT,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME
    });
    client.connect();
    console.log(req.query);

    // Get the list of countries from the query parameters
    const { countries, currencies, id } = req.query;
    // List of currencies that will be changed
    // Email
    // Date
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    if (!countries) {
      return res.status(400).json({ error: 'Countries parameter is required' });
    }
    // Split the countries string into an array
    const countryList = countries.split(',');
    const currencyList = currencies.split(',');

    // Initialize an object to store exchange rates
    const exchangeRates = {};

    // whereInCurrencyList
    whereInCurrencyList = 0;
    // Loop through the list of countries and make API requests for each
    for (const country of countryList) {
      const apiUrl = `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/rates_of_exchange?fields=country_currency_desc,exchange_rate,record_date&filter=country_currency_desc:in:(${country}),record_date:gte:2023-09-15`;

      const response = await axios.get(apiUrl);
      const exchangeRate = response.data.data[0].exchange_rate;
      const name = response.data.data[0].country_currency_desc;

      const newMoney = (currencyList[whereInCurrencyList] * exchangeRate).toFixed(2);

      if (id == 0) {
        console.log('Skipping insertion because id is 0');
      } else {
  
        const usAmount = currencyList[whereInCurrencyList];

        const insertQuery = `
          INSERT INTO public."userHistory" ("usAmount", "fAmount", "currencyName", "when", id, "firstCurrencyName")
          VALUES ($1, $2, $3, $4, $5,$6)`;
        const values = [usAmount, newMoney, name, formattedDate, id,"UNITED STATES-DOLLAR"];

        console.log(insertQuery, values);

        await client.query(insertQuery, values);
      }

      // Extract the exchange rate from the API response and store it in the object
      exchangeRates[country] = { newMoney, name };
      whereInCurrencyList++;
    }

    console.log(exchangeRates);
    // Respond with the exchange rates
    res.json(exchangeRates);
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/eachangeRatesToUS',async(req,res) =>{
  try {
    const client = new Client({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      port: process.env.DATABASE_PORT,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME
    });
    client.connect();
    console.log(req.query);

    // Get the list of countries from the query parameters
    const { countries, currencies, id } = req.query;
    // List of currencies that will be changed
    // Email
    // Date
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    if (!countries) {
      return res.status(400).json({ error: 'Countries parameter is required' });
    }
    // Split the countries string into an array
    const countryList = countries.split(',');
    const currencyList = currencies.split(',');

    // Initialize an object to store exchange rates
    const exchangeRates = {};

    // whereInCurrencyList
    whereInCurrencyList = 0;
    // Loop through the list of countries and make API requests for each
    for (const country of countryList) {
      const apiUrl = `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/rates_of_exchange?fields=country_currency_desc,exchange_rate,record_date&filter=country_currency_desc:in:(${country}),record_date:gte:2023-09-15`;

      const response = await axios.get(apiUrl);
      const exchangeRate = response.data.data[0].exchange_rate;
      const name = response.data.data[0].country_currency_desc;

      const newMoney = (currencyList[whereInCurrencyList] / exchangeRate).toFixed(2);

      if (id == 0) {
        console.log('Skipping insertion because id is 0');
      } else {
  
        const usAmount = currencyList[whereInCurrencyList];

        const insertQuery = `
          INSERT INTO public."userHistory" ("usAmount", "fAmount", "currencyName", "when", id, "firstCurrencyName")
          VALUES ($1, $2, $3, $4, $5,$6)`;
        const values = [usAmount, newMoney,"UNITED STATES-DOLLAR", formattedDate, id,name];

        console.log(insertQuery, values);

        await client.query(insertQuery, values);
      }

      // Extract the exchange rate from the API response and store it in the object
      exchangeRates[country] = { newMoney, name };
      whereInCurrencyList++;
    }

    console.log(exchangeRates);
    // Respond with the exchange rates
    res.json(exchangeRates);
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})


//works: getting currency name 
app.get('/apiCallGettingCurrency', async (req, res) => {
  try {
    const apiUrl = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/rates_of_exchange?fields=country_currency_desc&page[size]=167&filter=record_date:gte:2023-09-15'; // Replace with the actual API URL

    // Make a GET request to the external API
    const response = await axios.get(apiUrl);
    console.log(response.data);

    if (response.status === 200) {
      // Return the data from the API response
      res.json(response.data);
    } else {
      res.status(response.status).json({ error: 'API request failed' });
    }
  } catch (error) {
    console.error('Error fetching data from the API:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//works
app.post('/login', async (req, res) => {
  try {
    const { userName, passwordAttempt } = req.body; // Parse incoming JSON data

    const client = new Client({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      port: process.env.DATABASE_PORT,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME
    });

    await client.connect();

    

    // Check if the user exists in the database
    const userQuery = `SELECT "userName", "password", "salt", id FROM users WHERE "userName" = $1`;
    const userResult = await client.query(userQuery, [userName]);

    if (userResult.rows.length === 0) {
      // User does not exist
      res.status(401).json({ message: 'User not found' });
      return;
    }

    const storedPassword = userResult.rows[0].password;
    const salt = userResult.rows[0].salt;
    const id = userResult.rows[0].id;

    // Hash the passwordAttempt with the retrieved salt
    const hashedPasswordAttempt = await bcrypt.hash(passwordAttempt, salt);

    // Compare the hashed passwordAttempt with the stored hashed password
    if (hashedPasswordAttempt === storedPassword) {
      // Passwords match, user is authenticated
      res.status(200).json({ message: 'Authentication successful', id: id });
    } else {
      // Passwords do not match, authentication failed
      res.status(401).json({ message: 'Authentication failed' });
    }

    client.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//works
app.post('/storingUser', async (req, res) => {
  const client = new Client({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    port: process.env.DATABASE_PORT,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME
  });

  try {
    await client.connect();
  

    // Retrieve data from the request body
    const { userName, email, password } = req.body;

    // Check if the username is already in use
    const checkUsernameQuery = 'SELECT COUNT(*) FROM users WHERE "userName" = $1';
    const usernameResult = await client.query(checkUsernameQuery, [userName]);
    const existingUsernameCount = usernameResult.rows[0].count;

    // Check if the email is already in use
    const checkEmailQuery = 'SELECT COUNT(*) FROM users WHERE email = $1';
    const emailResult = await client.query(checkEmailQuery, [email]);
    const existingEmailCount = emailResult.rows[0].count;

    if (existingUsernameCount > 0) {
      // Username is already in use
      return res.status(400).json({ error: 'Username already exists.' });
    }

    if (existingEmailCount > 0) {
      // Email is already in use
      return res.status(400).json({ error: 'Email already in use.' });
    }

    const salt = await bcrypt.genSalt(10); // Generate salt
    const hashedPassword = await bcrypt.hash(password, salt); // Hash the password

    const insertQuery = `
      INSERT INTO users ("userName", email, salt, password)
      VALUES ($1, $2, $3, $4)
    `;

    const values = [userName, email, salt, hashedPassword];
    await client.query(insertQuery, values);

    res.status(200).json({ message: 'User successfully inserted.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    await client.end(); // Close the database connection
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

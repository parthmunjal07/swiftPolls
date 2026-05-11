import dotenv from 'dotenv'
import express from "express"
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';

dotenv.config()

const app = express()
app.use(express.json())

const port = process.env.PORT || 8079

app.get('/', (req, res) => {
    res.json({message: `Server is running on port: ${port}`})
})

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});
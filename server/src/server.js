const app = require("./app");
const { port } = require("./config/env");
const { connectDatabase } = require("./config/db");

async function startServer() {
  try { await connectDatabase(); app.listen(port, () => console.log(`Darby's Pastries API listening on http://localhost:${port}`)); }
  catch (error) { console.error("Unable to start API because MongoDB is unavailable:", error.message); process.exitCode = 1; }
}
startServer();

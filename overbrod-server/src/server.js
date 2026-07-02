import { createApp } from "./app.js";

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";

createApp().listen(PORT, HOST, () => {
  console.log(`OVERBRØD server listening on http://${HOST}:${PORT}`);
});

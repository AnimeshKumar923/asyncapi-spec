// Function to log document to a file
function logDocument(document, name, stage) {
  const filePath = `./logs/${name}-${stage}.json`;
  fs.writeFileSync(filePath, JSON.stringify(document, null, 2));
  console.log(`${filePath}`);
}
// Create logs directory if it doesn't exist
if (!fs.existsSync('./logs')) {
  fs.mkdirSync('./logs');
}


logDocument(updatedDocument, item.name, `${item.format}-format`);
const fs = require('fs');
const path = require('path');
const { JSONPath } = require('jsonpath-plus');

// Read the markdown file
const markdownContent = fs.readFileSync('examples.md', 'utf8');

// Function to extract comments with example metadata
function extractComments(content) {
  const commentRegex = /<!-- asyncapi-example-tester:(\{.*?\}) -->/g;
  let match;
  const comments = [];
  
  while ((match = commentRegex.exec(content)) !== null) {
    comments.push(JSON.parse(match[1]));
  }
  
  return comments;
}

// Extract comments from the markdown file
const comments = extractComments(markdownContent);

// Read the base AsyncAPI document
const baseDoc = JSON.parse(fs.readFileSync('base_asyncapi.json', 'utf8'));

// Function to read example data
function readExampleData(testName) {
  const exampleFileName = `${testName.toLowerCase().replace(/\s+/g, '_')}.json`;
  const exampleFilePath = path.join(__dirname, exampleFileName);
  return JSON.parse(fs.readFileSync(exampleFilePath, 'utf8'));
}

// Function to apply updates using JSONPath
function applyUpdates(doc, updates) {
  updates.forEach(update => {
    const results = JSONPath({ path: update.json_path, json: doc, resultType: 'all' });
    results.forEach(result => {
      const parent = result.parent;
      const parentProperty = result.parentProperty;
      parent[parentProperty] = update.data;
    });
  });
}

// Create updates array from comments
const updates = comments.map(comment => ({
  json_path: comment.json_path,
  data: readExampleData(comment.test)
}));

// Apply updates
applyUpdates(baseDoc, updates);

// Save the updated document
fs.writeFileSync('updated_asyncapi.json', JSON.stringify(baseDoc, null, 2), 'utf8');

console.log('AsyncAPI document updated successfully!');

const fs = require('fs');
const yaml = require('js-yaml');
const { Parser } = require('@asyncapi/parser');
const mergePatch = require('json-merge-patch');
const jsonpointer = require('jsonpointer');
const parser = new Parser();

// Read the markdown file
const markdownContent = fs.readFileSync('../../spec/asyncapi.md', 'utf8');

// Function to extract comments and examples from the markdown content
function extractCommentsAndExamples(content) {
  const combinedRegex = /<!--\s*asyncapi-example-tester:\s*({.*?})\s*-->\s*\n```(.*)?\n([\s\S]*?)\n```/g;
  let match;
  const combinedData = [];

  while ((match = combinedRegex.exec(content)) !== null) {
    try {
      const json = JSON.parse(match[1]);
      const format = match[2].trim();
      const exampleContent = match[3].trim();

      let example;
      if (format === 'json') {
        example = JSON.parse(exampleContent);
      } else if (format === 'yaml') {
        example = yaml.load(exampleContent);
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }

      combinedData.push({
        name: json.name,
        json_pointer: json.json_pointer,
        example: example,
        format: format,
      });
    } catch (e) {
      console.error("Failed to parse comment JSON or example:", match[1], e);
    }
  }

  return combinedData;
}

// Extract comments and examples from the markdown file
const combinedData = extractCommentsAndExamples(markdownContent);

// Function to apply JSON Merge Patch updates to the document
function applyUpdates(updates, baseDoc) {
  updates.forEach(update => {
    try {
      const jsonPointerPath = update.json_pointer;
      const parentPath = jsonPointerPath.replace(/\/[^/]+$/, '') || '/';
      const targetKey = jsonPointerPath.split('/').pop();
      const parentObject = jsonpointer.get(baseDoc, parentPath) || {};

      // Check if the target key is "examples" and handle it as an array
      if (targetKey === "examples") {
        if (!Array.isArray(parentObject[targetKey])) {
          parentObject[targetKey] = [];
        }
        parentObject[targetKey].push(update.example);
      } else {
        if (jsonPointerPath === "") {
          baseDoc = mergePatch.apply(baseDoc, update.example);
        } else {
          parentObject[targetKey] = mergePatch.apply(parentObject[targetKey] || {}, update.example);
        }
      }

      jsonpointer.set(baseDoc, parentPath, parentObject);
    } catch (e) {
      console.error(`\nError processing update for '${update.name}' at path '${update.json_pointer}'`, e);
    }
  });
  return baseDoc;
}

// Function to validate a document using AsyncAPI parser
async function validateParser(document, name) {
  try {
    const diagnostics = await parser.validate(document);

    if (diagnostics.length > 0) {
      diagnostics.forEach(diagnostic => {
        if (diagnostic.level === 'error') {
          console.error(`\x1b[31mError in ${name}: ${diagnostic.message}\x1b[0m`);
        } else {
          console.log(`\x1b[31mWarning in ${name}: ${diagnostic.message}\x1b[0m`);
        }
      });
    } else {
      console.log(`${name} is valid.`);
    }
  } catch (error) {
    console.error(`\x1b[31mValidation failed for ${name}: ${error.message}\x1b[0m`);
  }
}

// Function to log document to a file
function logDocument(document, name, stage) {
  const filePath = `./embed-logs/${name}-${stage}.json`;
  fs.writeFileSync(filePath, JSON.stringify(document, null, 2));
  console.log(`${filePath}`);
}

// Create logs directory if it doesn't exist
if (!fs.existsSync('./embed-logs')) {
  fs.mkdirSync('./embed-logs');
}

// Iterate over the combinedData array, apply updates, and validate each document
const baseDocPath = './base-doc.json';
const baseDocSecuritySchemePath = './base-doc-security-scheme-object.json';

const baseDoc = JSON.parse(fs.readFileSync(baseDocPath, 'utf8'));
const baseDocSecurityScheme = JSON.parse(fs.readFileSync(baseDocSecuritySchemePath, 'utf8'));

const validationPromises = combinedData.map(async (item) => {
  const baseDocument = item.name && item.name.includes("Security Scheme Object")
    ? JSON.parse(JSON.stringify(baseDocSecurityScheme)) // Deep copy for each iteration
    : JSON.parse(JSON.stringify(baseDoc)); // Deep copy for each iteration

  const updatedDocument = applyUpdates([item], baseDocument);

  logDocument(updatedDocument, item.name, `${item.format}-format`);

  const documentString = JSON.stringify(updatedDocument, null, 2);
  await validateParser(documentString, `${item.name}-${item.format}-format`);
});

console.log(`\nNumber of examples extracted: ${combinedData.length}\n`);

Promise.all(validationPromises)
  .then(() => {
    console.log('\n\nAll examples validated successfully!');
  })
  .catch((error) => {
    console.error('Error during validations:', error);
  });

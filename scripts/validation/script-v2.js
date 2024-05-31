const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { execSync } = require('child_process');

// Path to the Markdown file
const mdPath = '../../spec/asyncapi.md';
// const mdPath = './test-document.md';

// Function to create a full AsyncAPI document from an example
function createFullDocument(example) {
  return {
    asyncapi: '3.0.0',
    info: {
      title: 'Sample Document',
      version: '0.0.0'
    },
    ...example
  };
}

// Extract AsyncAPI YAML snippets from the markdown file and track their line numbers
function extractAsyncAPISnippetsWithLineNumbers(mdContent) {
  const snippets = [];
  const lines = mdContent.split('\n');
  const codeBlockRegex = /^```yaml$/;
  let inCodeBlock = false;
  let codeBlockStart = null;
  let codeLines = [];

  lines.forEach((line, index) => {
    if (codeBlockRegex.test(line.trim())) {
      if (inCodeBlock) {
        // End of a code block
        const yamlContent = codeLines.join('\n').trim();
        try {
          const parsedYaml = yaml.load(yamlContent);
          snippets.push({
            content: parsedYaml,
            startLine: codeBlockStart + 1,
            endLine: index + 1
          });
        } catch (error) {
          console.error(`Failed to parse YAML from lines ${codeBlockStart + 1}-${index + 1}:`, error);
        }
        codeLines = [];
        inCodeBlock = false;
      } else {
        // Start of a code block
        codeBlockStart = index;
        inCodeBlock = true;
      }
    } else if (inCodeBlock) {
      codeLines.push(line);
    }
  });

  return snippets;
}

// Save each full document as a temporary file and validate using AsyncAPI CLI
async function validateExamples(mdPath) {
  const mdContent = fs.readFileSync(mdPath, 'utf8');
  const snippets = extractAsyncAPISnippetsWithLineNumbers(mdContent);
  const tempDir = fs.mkdtempSync(path.join(__dirname, 'temp-'));

  try {
    for (const [index, snippet] of snippets.entries()) {
      const fullDoc = createFullDocument(snippet.content);
      const tempFilePath = path.join(tempDir, `snippet-${index + 1}.yaml`);
      fs.writeFileSync(tempFilePath, yaml.dump(fullDoc));

      try {
        execSync(`npx asyncapi validate ${tempFilePath}`, { stdio: 'inherit' });
        console.log(`\nValidation successful for snippet from lines ${snippet.startLine} to ${snippet.endLine}`);
      } catch (error) {
        console.error(`Validation failed for snippet from lines ${snippet.startLine} to ${snippet.endLine}`);
        process.exit(1);  // Exit with an error code to fail the CI job
      }
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

validateExamples(mdPath).catch((error) => {
  console.error('Validation script failed:', error);
  process.exit(1);  // Exit with an error code to fail the CI job
});

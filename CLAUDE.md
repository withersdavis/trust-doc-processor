# S3 Trust Document Processing Application - Session Summary

## GitHub Repository
- **Repository**: https://github.com/withersdavis/trust-doc-processor
- **Description**: Trust document processor using LangExtract with citation linking

## Important Development Guidelines

### Document Processing Rules
1. **ONLY use LangExtract for document analysis** - When analyzing a document to create the summary/citations, always ONLY use LangExtract. Do not use any pre nor post processing via other LLMs, etc.
2. **All content must come from LangExtract** - No external processing or content generation outside of what LangExtract provides

### Git Commit Guidelines
1. **Selective commits only** - When asked, commit updates to GitHub. Do not commit every change to GitHub.
2. **User-requested commits** - Only commit when explicitly requested by the user
3. **Meaningful commit messages** - Include clear descriptions of changes when committing

### Debugging and Problem Analysis
1. **Focus on most recent test run** - When analyzing problems or debugging, ONLY look at the most recent test run and its logs, unless explicitly asked to look at earlier runs
2. **Don't mix log data** - Avoid confusion by not mixing data from different test runs when troubleshooting

## Current Implementation Status

### Overview
Created a full-stack application that processes trust documents using LangExtract with Gemini. The app extracts structured information following the trust_template.json structure with three sections: KEY_FIELDS, SUMMARY_PARAGRAPHS, and DETAILS.

### Key Implementation Details

#### 1. LangExtract Integration
- **Uses ONLY LangExtract** - All content is extracted via LangExtract, no separate API calls
- **Model**: Gemini 1.5 Flash (switched from Claude per user request)
- **All content has citations** - Every piece of information is traceable to source document

#### 2. SUMMARY_PARAGRAPHS Implementation
- Extracts key sentences/passages from document (not generating new text)
- Creates condensed summaries (up to 1000 chars) with citation references
- Format: `extracted text [citation_key]` where `[citation_key]` links to full text in citations array
- Example: `"The Trustee shall distribute..." [distribution_income]`

#### 3. Current LangExtract Parameters (hardcoded in standardLangExtractService.ts)
```javascript
{
  modelType: 'gemini',
  modelId: 'gemini-1.5-flash',
  apiKey: process.env.GEMINI_API_KEY,
  formatType: FormatType.JSON,
  temperature: 0.1,
  fenceOutput: true,
  useSchemaConstraints: false,
  maxCharBuffer: 8000,
  maxTokens: 4096,
  debug: false,
  extractionPasses: 1
}
```

**Note**: The `/lib/langExtract_params.json` file exists but its parameters are NOT being used (except for `fill_missing`). Parameters are hardcoded instead.

#### 4. File Structure
- **Frontend**: `/client` - React with TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: `/server` - Express.js with TypeScript
- **Templates**: `/lib/trust_template.json` - Defines extraction structure
- **Parameters**: `/lib/langExtract_params.json` - Currently mostly unused
- **Main Service**: `/server/src/services/standardLangExtractService.ts`

### Key Functions in standardLangExtractService.ts

1. **processDocumentWithStandardLangExtract** (lines 73-351)
   - Main function that calls LangExtract
   - Handles Gemini markdown-wrapped JSON responses
   - Organizes extractions into template structure

2. **processSummaryParagraphs** (lines 529-588)
   - Creates condensed summaries with citations
   - Maps extraction classes to summary sections
   - Truncates to 1000 chars with citation references

3. **Extraction Approach**
   - Extracts key sentences for each topic (not full paragraphs)
   - Examples: `trust_creation`, `distribution_income`, `trustee_investment_powers`
   - Combines related extractions into summary paragraphs

### Recent Changes & User Requirements

1. **Must use ONLY LangExtract** - No separate Gemini API calls for summaries
2. **All content must have citations** - Every piece of text traceable to source
3. **Paragraph summaries should be condensed** - Not raw full text from document
4. **Extended to 1000 char limit** for paragraph summaries (was 150)
5. **Template structure must be respected** - Three sections as defined

### Test Results
- Successfully processes Jerry Simons Trust document
- Generates structured output with all three sections populated
- SUMMARY_PARAGRAPHS contains condensed text with citation references
- All extracted content has corresponding citations with document locations

### Potential Improvements to Consider
1. Use parameters from `/lib/langExtract_params.json` instead of hardcoding
2. Add configuration for summary length limits
3. Implement client-side citation linking/highlighting
4. Add support for multiple document types/templates

### Environment Variables Required
- `GEMINI_API_KEY` - Google Gemini API key for LangExtract

### How to Run
1. Backend: `cd /Users/w/Downloads/apps/s3/server && npm run dev`
2. Frontend: `cd /Users/w/Downloads/apps/s3/client && npm start`
3. Access at: http://localhost:3000

### API Endpoints
- POST `/api/upload` - Upload document (field name: "file")
- POST `/api/process/:fileId` - Process uploaded document
- Results saved to `/results` folder

## Last Working State
- Application fully functional with LangExtract + Gemini
- SUMMARY_PARAGRAPHS populated with condensed text and citations
- All content traceable through citations array
- 1000 character limit for summary paragraphs
# S3 Trust Document Processing Application

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
Full-stack application that processes trust documents using LangExtract with Gemini. 
- **Template Structure**: Three sections - Basic_Information, Summary, Details
- **Model**: Gemini 2.5 Flash with optimized parameters
- **Python Service**: `/python/langextract_service.py` handles all extraction
- **Few-Shot Examples**: 10 comprehensive examples guide extraction quality

### Key Configuration
- **See LANGEXTRACT_CONFIG.md** for complete LangExtract configuration details
- **Template**: `/lib/trust_template_new.json`
- **Few-shot examples**: `/lib/langextract_few_shot_examples.json`
- **Parameters**: Configured directly in Python service (10 workers, 3 passes)

### How to Run
1. Backend: `cd server && npm run dev`
2. Frontend: `cd client && npm start`
3. Access at: http://localhost:3000

### API Endpoints
- POST `/api/upload` - Upload document
- POST `/api/process/:fileId` - Process uploaded document
- Results saved to `/results` folder

## Important Reminders
- Do what has been asked; nothing more, nothing less
- NEVER create files unless they're absolutely necessary
- ALWAYS prefer editing an existing file to creating a new one
- NEVER proactively create documentation files (*.md) or README files unless explicitly requested
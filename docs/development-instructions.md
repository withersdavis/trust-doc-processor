# Development Instructions

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- API key for Claude/Anthropic

### Initial Setup
1. Clone/navigate to project directory
2. Install dependencies: `npm install`
3. Set up environment variables
4. Run development servers

## Environment Configuration

Create `.env` files in both client and server directories:

### Server `.env`:
```
PORT=3001
CLAUDE_API_KEY=your-claude-api-key
NODE_ENV=development
# Or use ANTHROPIC_API_KEY if you prefer
# ANTHROPIC_API_KEY=your-anthropic-api-key
```

### Client `.env`:
```
REACT_APP_API_URL=http://localhost:3001
```

## Development Commands

### Frontend (React)
```bash
cd client
npm start          # Start dev server on port 3000
npm run build     # Build for production
npm test          # Run tests
```

### Backend (Express)
```bash
cd server
npm run dev       # Start with nodemon on port 3001
npm start         # Production start
```

## LangExtract with Claude Configuration

### Template Structure (trust_template.json)
The template defines three main sections:
1. **KEY_FIELDS**: Basic trust information
2. **SUMMARY_PARAGRAPHS**: Narrative summaries with citations
3. **DETAILS**: Specific provisions and clauses

### Processing Parameters (langExtract_params.json)
- `return_format`: "json"
- `granularity`: "paragraph"
- `include_citations`: "inline"
- `hallucination_guard`: "strict"
- `max_tokens_per_field`: 600

## File Upload Guidelines

### Supported Formats
- PDF documents
- DOCX files
- TXT files
- Maximum size: 10MB

### Processing Flow
1. File uploaded to `/api/upload`
2. Temporary storage in server memory/disk
3. LangExtract processing initiated
4. Results saved to `/results/[timestamp]_[filename].json`
5. Original file deleted after processing

## Results Storage

### Naming Convention
```
/results/
  └── 2024-01-20_143022_trust_document.json
  └── 2024-01-20_145512_estate_plan.json
```

### Result Structure
```json
{
  "metadata": {
    "processed_date": "ISO-8601",
    "original_filename": "string",
    "processing_time_ms": "number"
  },
  "extraction": {
    "KEY_FIELDS": {...},
    "SUMMARY_PARAGRAPHS": {...},
    "DETAILS": {...}
  },
  "citations": [...]
}
```

## UI Component Guidelines

### Using shadcn/ui
```bash
# Add new components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add upload
```

### Tailwind Classes Priority
1. Use shadcn/ui components when available
2. Apply Tailwind utility classes for customization
3. Create custom components only when necessary

## Error Handling

### Frontend Errors
- Display user-friendly error messages
- Log detailed errors to console in dev
- Implement retry mechanisms for network failures

### Backend Errors
- Validate file types before processing
- Handle LangExtract API errors gracefully
- Return structured error responses

### Common Error Codes
- 400: Invalid file type
- 413: File too large
- 500: LangExtract processing failed
- 503: API key not configured

## Testing Guidelines

### Frontend Tests
```javascript
// Test file upload component
// Test results display
// Test error states
```

### Backend Tests
```javascript
// Test file validation
// Test LangExtract integration
// Test results storage
```

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Results folder has write permissions
- [ ] API rate limits configured
- [ ] Error logging enabled
- [ ] CORS settings updated
- [ ] File size limits enforced

## Maintenance Tasks

### Regular Tasks
- Clear old results files (>30 days)
- Monitor API usage and costs
- Update LangExtract library
- Review error logs

### Monitoring
- Track processing times
- Monitor success/failure rates
- Check disk usage for results folder

## Troubleshooting

### LangExtract Issues
- Verify API key is valid
- Check network connectivity
- Ensure template format is correct
- Monitor rate limits

### File Processing Issues
- Verify file is not corrupted
- Check file size limits
- Ensure proper encoding
- Validate mime types

## Security Considerations

- Never expose API keys in frontend
- Sanitize filenames before storage
- Implement rate limiting
- Validate all user inputs
- Use HTTPS in production
- Implement authentication if needed

## Version Control

### Git Workflow
```bash
# Never commit:
- .env files
- /results folder contents
- node_modules
- API keys or secrets

# Always commit:
- Source code changes
- Documentation updates
- Configuration templates
```